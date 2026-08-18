// src/app/api/flashcards/generate/route.ts
// API endpoint to generate a flashcard set using OpenAI and save it

import { NextRequest, NextResponse, after } from "next/server"
import { createRouteClient } from "@/lib/supabase/server"
import { createPendingSet, finalizeSet, failSet } from "@/lib/data/flashcards"
import {
  FLASHCARD_CSV_HEADER,
  parseFlashcardCsv,
  deduplicateFlashcards,
} from "@/lib/flashcards/csv"
import { tryGenerateDeckImage } from "@/lib/images/deck-image"
import { z } from "zod"
import OpenAI from "openai"

// Constructed on first use, not at module scope: the OpenAI constructor throws
// when the key is missing, which crashed the build during page-data collection
// before the handler's own key check could return a useful error.
let openaiClient: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return openaiClient
}

const bodySchema = z.object({
  name: z.string().min(1, "Set name is required"),
  count: z.number().int().min(10).max(100).default(100),
  // English words/phrases to seed the deck with. The model supplies the
  // Traditional Chinese and Jyutping for each — the learner shouldn't have to
  // know the Cantonese in order to ask for it.
  words: z.array(z.string().min(1).max(100)).max(100).optional()
})

// Model preference, newest first. Reasoning models bill thinking against the
// completion budget and reject `temperature`/`max_tokens`, so they need
// different parameters — getting this wrong made every gpt-5 call 400 and fall
// through to gpt-4o silently.
const MODEL_CANDIDATES = [
  { model: "gpt-5", reasoning: true },
  { model: "gpt-4o", reasoning: false },
  { model: "gpt-4o-mini", reasoning: false },
] as const

// A finished row costs ~28 tokens for terse cards and more once the example
// sentences read naturally. 70/row plus slack keeps a 100-card deck clear of
// the ceiling — the old `min(4000, count * 35)` capped a 100-card deck at 3500,
// right at the point where the response gets cut off mid-row.
function outputBudget(count: number): number {
  return Math.min(16000, count * 70 + 200)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
    }

    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }
    const { name, count } = parsed.data
    const words = (parsed.data.words ?? [])
      .map(w => w.trim())
      .filter(Boolean)

    // Reserve the deck before generating anything. The decks list renders a
    // shimmering placeholder off this row, which is what lets the user leave
    // the page — and what makes the placeholder survive a refresh.
    const pendingSet = await createPendingSet(supabase, user.id, { name })

    // Runs after the response below is sent. The Supabase client still holds
    // this user's JWT, so RLS scopes every write here to them.
    after(async () => {
      try {
        // Build user instruction and constraints
        const seedSection = words.length > 0
          ? `Include one card for each of these English words or phrases, translating each into the most natural everyday Cantonese (Traditional characters) with its exact Jyutping:\n${words.map(w => `- ${w}`).join('\n')}\nThen fill the remaining rows to reach ${count} unique cards, staying on the theme of the deck title.`
          : `Create ${count} unique cards appropriate for beginner-to-intermediate learners.`

        const systemPrompt = `You are a Cantonese flashcard creator.
Generate exactly ${count} unique rows of CSV data for the requested deck.
CRITICAL CSV RULES:
- Use EXACTLY this header line:
${FLASHCARD_CSV_HEADER}
- Use Traditional Chinese for Chinese Word and for the Chinese example sentence.
- Use Jyutping for Pronunciation.
- If a field contains a comma, wrap that field in double quotes. Never leave a bare comma inside a field.
- Do NOT include any additional commentary; output CSV only.
- Keep examples short and natural.`

        const userPrompt = `Deck title: "${name}"
${seedSection}`

        const messages = [
          { role: "system" as const, content: systemPrompt },
          { role: "user" as const, content: userPrompt },
        ]

        // Every deck gets cover art. Kick it off now so it overlaps card
        // generation rather than adding to it, and let it fail soft — losing the
        // image must not cost the user the deck they just waited on.
        const imagePromise = tryGenerateDeckImage(name)

        const budget = outputBudget(count)
        let csvOutput: string | null = null
        let usedModel: string | null = null
        let truncated = false
        const failures: string[] = []

        for (const candidate of MODEL_CANDIDATES) {
          try {
            const resp = await getOpenAI().chat.completions.create(
              candidate.reasoning
                ? {
                    model: candidate.model,
                    messages,
                    // Reasoning tokens come out of this budget too, so leave room
                    // for them on top of the CSV itself.
                    max_completion_tokens: Math.min(32000, budget + 6000),
                  }
                : {
                    model: candidate.model,
                    messages,
                    temperature: 0.4,
                    max_tokens: budget,
                  }
            )

            const choice = resp.choices?.[0]
            const content = choice?.message?.content?.trim()
            if (!content) {
              failures.push(`${candidate.model}: empty response`)
              continue
            }

            csvOutput = content
            usedModel = candidate.model
            truncated = choice?.finish_reason === "length"
            break
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            failures.push(`${candidate.model}: ${message}`)
          }
        }

        if (!csvOutput) {
          console.error("OpenAI generation failed:", failures)
          throw new Error(`Could not generate cards. ${failures.join("; ")}`)
        }

        if (failures.length > 0) {
          console.warn(`Fell back to ${usedModel} after: ${failures.join("; ")}`)
        }

        // A truncated response ends mid-row. That partial row would otherwise parse
        // as a card with a half-written pronunciation, so drop it outright.
        if (truncated) {
          console.warn(
            `${usedModel} hit the ${budget}-token output cap; dropping the partial final row`
          )
          csvOutput = csvOutput.split("\n").slice(0, -1).join("\n")
        }

        // Parse into structured flashcards. Malformed rows are skipped and
        // reported rather than failing the whole deck.
        let flashcards
        let skipped
        try {
          ;({ flashcards, skipped } = parseFlashcardCsv(csvOutput))
        } catch (err) {
          const message = err instanceof Error ? err.message : "Could not parse the generated CSV"
          console.error(`Parse failure from ${usedModel}: ${message}`, {
            head: csvOutput.slice(0, 500),
          })
          throw new Error(message)
        }

        if (skipped.length > 0) {
          console.warn(
            `Skipped ${skipped.length} malformed row(s) from ${usedModel}:`,
            skipped.slice(0, 5)
          )
        }

        // Deduplicate
        const parsedCount = flashcards.length
        flashcards = deduplicateFlashcards(flashcards)
        const duplicatesRemoved = parsedCount - flashcards.length
        if (duplicatesRemoved > 0) {
          console.log(`Removed ${duplicatesRemoved} duplicate cards`)
        }

        if (flashcards.length === 0) {
          throw new Error("The model returned no usable cards")
        }

        await finalizeSet(supabase, user.id, pendingSet.id, {
          imageUrl: await imagePromise,
          flashcards,
        })

        console.log(`Deck ${pendingSet.id}: saved ${flashcards.length} cards`)
      } catch (error) {
        console.error(`Deck ${pendingSet.id}: generation failed`, error)
        await failSet(
          supabase,
          pendingSet.id,
          error instanceof Error ? error.message : "Generation failed"
        )
      }
    })

    return NextResponse.json({
      message: "Deck created; cards are generating",
      flashcardSet: {
        id: pendingSet.id,
        name: pendingSet.name,
        status: pendingSet.status,
        createdAt: pendingSet.createdAt,
      },
      requestedCount: count,
    })

  } catch (error) {
    console.error("Flashcard generation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

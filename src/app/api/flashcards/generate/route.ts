// src/app/api/flashcards/generate/route.ts
// API endpoint to generate a flashcard set using OpenAI and save it

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"
import OpenAI from "openai"

// Initialize OpenAI client once
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const seedWordSchema = z.object({
  traditional: z.string().min(1),
  jyutping: z.string().min(1)
})

const bodySchema = z.object({
  name: z.string().min(1, "Set name is required"),
  count: z.number().int().min(10).max(100).default(100),
  seedWords: z.array(seedWordSchema).max(100).optional(),
  imageUrl: z.string().url().optional().nullable()
})

// Simple CSV parser matching the strict format we prompt for (no commas inside fields)
function parseStrictCsv(csv: string) {
  const lines = csv.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) {
    throw new Error("CSV must include a header and at least 1 row")
  }
  const header = lines[0]
  const expectedHeader = "Chinese Word,English Translation,Pronunciation,Example Sentence (English),Example Sentence (Chinese)"
  if (header.replace(/\s+/g, " ") !== expectedHeader) {
    throw new Error("Unexpected CSV header from AI")
  }
  const rows = lines.slice(1)
  const flashcards = rows.map((row, idx) => {
    const cols = row.split(',')
    if (cols.length !== 5) {
      throw new Error(`Invalid CSV row ${idx + 2}: expected 5 columns`)
    }
    const [chineseWord, englishTranslation, pronunciation, exampleSentenceEnglish, exampleSentenceChinese] = cols.map(c => c.trim())
    return {
      chineseWord,
      englishTranslation,
      pronunciation: pronunciation || null,
      exampleSentenceEnglish: exampleSentenceEnglish || null,
      exampleSentenceChinese: exampleSentenceChinese || null,
    }
  })
  return flashcards
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
    }

    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }
    const { name, count, seedWords, imageUrl } = parsed.data

    // Build user instruction and constraints
    const seedSection = seedWords && seedWords.length > 0
      ? `Prioritize including these Cantonese words (use Traditional characters; ensure exact Jyutping):\n${seedWords.map(w => `- ${w.traditional} — ${w.jyutping}`).join('\n')}\nFill the remaining to reach ${count} unique cards.`
      : `Create ${count} unique cards appropriate for beginner-to-intermediate learners.`

    const systemPrompt = `You are a Cantonese flashcard creator.
Generate exactly ${count} unique rows of CSV data for the requested deck.
CRITICAL CSV RULES:
- Use EXACTLY this header line:
Chinese Word,English Translation,Pronunciation,Example Sentence (English),Example Sentence (Chinese)
- Use Traditional Chinese for Chinese Word and for the Chinese example sentence.
- Use Jyutping for Pronunciation.
- Do NOT include commas in any field. Replace commas with semicolons.
- Do NOT quote fields.
- Do NOT include any additional commentary; output CSV only.
- Keep examples short and natural.`

    const userPrompt = `Deck title: "${name}"
${seedSection}`

    // Try model preference with graceful fallback
    const modelCandidates = [
      "gpt-5", // requested
      "gpt-4o",
      "gpt-4o-mini"
    ]

    let csvOutput: string | null = null
    let lastError: unknown = null

    for (const model of modelCandidates) {
      try {
        const resp = await openai.chat.completions.create({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.4,
          max_tokens: Math.min(4000, count * 35),
        })
        csvOutput = resp.choices?.[0]?.message?.content?.trim() || null
        if (csvOutput) break
      } catch (err) {
        lastError = err
        continue
      }
    }

    if (!csvOutput) {
      console.error("OpenAI generation failed:", lastError)
      return NextResponse.json({ error: "Failed to generate flashcards" }, { status: 502 })
    }

    // Ensure code block wrappers removed if present
    csvOutput = csvOutput.replace(/^```[a-zA-Z]*\n?|```$/g, '').trim()

    // Parse into structured flashcards
    const flashcards = parseStrictCsv(csvOutput)

    // Create the set in DB
    const created = await db.flashcardSet.create({
      data: {
        name,
        userId: session.user.id,
        imageUrl: imageUrl || null,
        flashcards: {
          create: flashcards.map(fc => ({
            chineseWord: fc.chineseWord,
            englishTranslation: fc.englishTranslation,
            pronunciation: fc.pronunciation,
            exampleSentenceEnglish: fc.exampleSentenceEnglish,
            exampleSentenceChinese: fc.exampleSentenceChinese,
          }))
        }
      },
      include: { flashcards: { select: { id: true } } }
    })

    return NextResponse.json({
      message: "Flashcard set generated and saved",
      flashcardSet: {
        id: created.id,
        name: created.name,
        flashcardCount: created.flashcards.length,
        createdAt: created.createdAt
      },
      previewCards: flashcards.slice(0, 3)
    })

  } catch (error) {
    console.error("Flashcard generation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}



// POST /api/articles/ocr — extract article text from photographed pages.
//
// The iOS app's "Add via camera" flow sends 1–10 JPEG pages (base64, in reading
// order). OpenAI vision reads them in a single call so the suggested title reflects the
// whole piece. Source text is transcribed verbatim so the reader can keep the
// original alongside its Cantonese translation. The client prefills the new-read
// form with the result — translation and creation go through POST /api/articles.
import { NextRequest, NextResponse } from "next/server"
import { createRouteClient } from "@/lib/supabase/server"
import { z } from "zod"
import OpenAI from "openai"

let openaiClient: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return openaiClient
}

const bodySchema = z.object({
  // base64-encoded JPEGs, in the order the pages should be read
  images: z.array(z.string().min(1)).min(1).max(10),
})

// The client budgets its upload under Vercel's 4.5 MB body cap; this is the
// server-side backstop.
const MAX_TOTAL_BASE64_BYTES = 3_800_000

// Same preference order and parameter split as flashcards/generate: reasoning
// models reject `temperature`/`max_tokens` and bill thinking against the
// completion budget.
const MODEL_CANDIDATES = [
  { model: "gpt-5", reasoning: true },
  { model: "gpt-4o", reasoning: false },
  { model: "gpt-4o-mini", reasoning: false },
] as const

const SYSTEM_PROMPT = `You are an OCR assistant for a Cantonese reading app.
The user sends photos of an article or book's pages, in reading order.

Extract ALL body text across the photos, in reading order:
- Transcribe the source text VERBATIM in its original language and characters, including punctuation. Do not translate or rephrase it: a later step creates the Cantonese translation, and needs the original text.
- If it mixes languages, preserve each passage exactly as printed.
- Return a pages array with EXACTLY one string per photo, in the same order. Keep paragraphs and verse line breaks inside that page's string. Never merge text from different photos.
- Use an empty string for a page without body text, so every photo keeps its place. Do not omit short passages or invent text for pages that are not shown.
- Skip page numbers, running headers/footers, watermarks, and unrelated ads or captions.
- Suggest a short title in Traditional Chinese (at most 15 characters): use the printed headline if there is one, otherwise summarize.

Respond with STRICT JSON and nothing else:
{"title": "...", "pages": ["verbatim text from photo 1", "verbatim text from photo 2"]}`

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
    const { images } = parsed.data
    if (images.reduce((n, s) => n + s.length, 0) > MAX_TOTAL_BASE64_BYTES) {
      return NextResponse.json({ error: "Images too large" }, { status: 413 })
    }

    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      {
        role: "user" as const,
        content: [
          {
            type: "text" as const,
            text: `Here are ${images.length} photo(s) of the pages, in reading order.`,
          },
          ...images.map((b64) => ({
            type: "image_url" as const,
            image_url: { url: `data:image/jpeg;base64,${b64}`, detail: "high" as const },
          })),
        ],
      },
    ]

    let result: { title?: string; pages: string[] } | null = null
    let usedModel: string | null = null
    const failures: string[] = []

    for (const candidate of MODEL_CANDIDATES) {
      try {
        const resp = await getOpenAI().chat.completions.create(
          candidate.reasoning
            ? {
                model: candidate.model,
                messages,
                // Reasoning tokens come out of this budget too.
                max_completion_tokens: 16000,
              }
            : {
                model: candidate.model,
                messages,
                temperature: 0.2,
                max_tokens: 8000,
                response_format: { type: "json_object" },
              }
        )

        const content = resp.choices?.[0]?.message?.content?.trim()
        if (!content) {
          failures.push(`${candidate.model}: empty response`)
          continue
        }

        const jsonText = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
        const parsedJson = JSON.parse(jsonText)
        if (!Array.isArray(parsedJson.pages) || parsedJson.pages.length !== images.length ||
            !parsedJson.pages.every((page: unknown) => typeof page === 'string') ||
            !parsedJson.pages.some((page: string) => page.trim().length > 0)) {
          failures.push(`${candidate.model}: missing or mismatched page text`)
          continue
        }

        result = parsedJson
        usedModel = candidate.model
        break
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        failures.push(`${candidate.model}: ${message}`)
      }
    }

    if (!result) {
      console.error("OCR failed:", failures)
      return NextResponse.json(
        { error: "Could not read text from the photos" },
        { status: 502 }
      )
    }
    if (failures.length > 0) {
      console.warn(`OCR fell back to ${usedModel} after: ${failures.join("; ")}`)
    }

    return NextResponse.json({
      success: true,
      title: typeof result.title === "string" ? result.title.trim() : null,
      pages: result.pages.map(page => page.trim()),
      // Keep the combined field for older app builds.
      content: result.pages.join('\n\n').trim(),
    })
  } catch (error) {
    console.error("Failed to OCR article photos:", error)
    return NextResponse.json({ error: "Failed to process photos" }, { status: 500 })
  }
}

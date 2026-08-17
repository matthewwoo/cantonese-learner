// src/lib/images/deck-image.ts
// Deck cover art. Shared by the deck generator (which makes a cover for every
// new deck) and the /api/images/generate endpoint.

import OpenAI from 'openai'

// dall-e-3 was retired and is no longer served — requests for it now fail with
// "Unknown parameter: 'style'", because the current image API has no such
// parameter. The gpt-image-* line replaces it, dropping `style` and
// `response_format` (it always returns base64) and adding output format
// control. Unpinned on purpose: a dated snapshot is what goes stale and gets
// retired out from under us, which is exactly how dall-e-3 broke.
const IMAGE_MODEL = 'gpt-image-2'

// Covers render at ~192px tall in a card, so `low` is ample. WebP at 80 keeps
// a cover around 45KB instead of ~1.5MB of PNG — these are persisted inline as
// data URLs and re-fetched for every deck in the list, so the size matters.
const IMAGE_QUALITY = 'low'
const OUTPUT_FORMAT = 'webp'
const OUTPUT_COMPRESSION = 80

// Lazy: the OpenAI constructor throws when the key is missing, and at module
// scope that crashes the build during Next's page-data collection.
let client: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return client
}

export interface GeneratedImage {
  /** A `data:image/webp;base64,...` URL, ready to persist on the set. */
  imageUrl: string
  /** The prompt used — the model's revision when it returns one, else ours. */
  prompt: string
}

/** Generate cover art for `subject`. Throws on failure. */
export async function generateDeckImage(
  subject: string
): Promise<GeneratedImage> {
  const sanitizedPrompt = subject.trim().slice(0, 100) // Limit length
  // No lettering: the deck title is already shown next to the cover, and the
  // model will otherwise render the subject as text across the image.
  const imagePrompt = `A simple, flat illustration of a single object with a white background representing: ${sanitizedPrompt}. Only illustrate one object. Do not include any text, letters, or words in the image.`

  const response = await getOpenAI().images.generate({
    model: IMAGE_MODEL,
    prompt: imagePrompt,
    n: 1,
    size: '1024x1024',
    quality: IMAGE_QUALITY,
    output_format: OUTPUT_FORMAT,
    output_compression: OUTPUT_COMPRESSION,
  })

  const image = response.data?.[0]
  if (!image?.b64_json) {
    throw new Error('Failed to generate image - no image returned')
  }

  return {
    // MIME derived from the requested format so the two can't drift apart
    imageUrl: `data:image/${OUTPUT_FORMAT};base64,${image.b64_json}`,
    // gpt-image-1 doesn't return a revised prompt; fall back to what we sent
    prompt: image.revised_prompt ?? imagePrompt,
  }
}

/**
 * Best-effort variant for flows where the image is a nice-to-have. Cover art
 * failing must never cost the user a deck they just waited on, so this logs
 * and resolves to null instead of throwing.
 */
export async function tryGenerateDeckImage(
  subject: string
): Promise<string | null> {
  try {
    const { imageUrl } = await generateDeckImage(subject)
    return imageUrl
  } catch (error) {
    console.error('Deck image generation failed; continuing without one:', error)
    return null
  }
}

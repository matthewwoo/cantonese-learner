// src/app/api/chat/route.ts
// API endpoint for AI chat functionality
// This handles communication between our frontend and AI services (OpenAI/Claude)
//
// A turn is either spoken text, a photo, or both. Photos arrive as a base64
// JPEG and go to a vision model; the tutor describes the scene and teaches
// any Chinese or English text it finds. Only the text side of a turn is
// persisted — the image itself is not stored, so history sees "[Photo]".

import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

// Define the structure of a chat message. Content is plain text for history
// and a part list for the current turn when a photo is attached.
type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; base64: string }

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | ContentPart[]
}

// Define the request body structure
interface ChatRequest {
  message?: string
  sessionId?: string
  theme?: string
  targetWords?: string[]
  /** base64-encoded JPEGs, without the data: prefix (in the order to read them) */
  images?: string[]
  /** Legacy single-photo field; folded into `images`. */
  image?: string
}

// The client budgets its upload under Vercel's 4.5 MB body cap; this is the
// server-side backstop (same as articles/ocr).
const MAX_IMAGES_BASE64_BYTES = 3_800_000
const MAX_IMAGES_PER_TURN = 4

/** What gets stored (and shown in history) for a photo-only turn. */
const PHOTO_PLACEHOLDER = '[Photo]'

let openaiClient: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return openaiClient
}

export async function POST(request: NextRequest) {
  try {
    console.log('Chat API: Request received')
    
    // 1. AUTHENTICATION CHECK
    // Always verify the user is logged in before processing chat requests
    const supabase = await createRouteClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (!user) {
      console.warn('Chat API: auth rejected:', authError?.message ?? 'no user')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // 2. PARSE REQUEST DATA
    // Extract the chat message and session info from the request
    const body: ChatRequest = await request.json()
    const { sessionId, theme, targetWords } = body
    const message = (body.message ?? '').trim()
    const images = [
      ...(Array.isArray(body.images) ? body.images : []),
      ...(typeof body.image === 'string' ? [body.image] : []),
    ].filter((s): s is string => typeof s === 'string' && s.length > 0)
    console.log('Chat API: Request body parsed:', { message: message.substring(0, 50) + '...', sessionId, theme, images: images.length })

    // Basic validation - a turn needs either words or a photo
    if (!message && images.length === 0) {
      console.log('Chat API: Message validation failed - empty message')
      return NextResponse.json(
        { error: 'Message or image is required' },
        { status: 400 }
      )
    }
    if (images.length > MAX_IMAGES_PER_TURN) {
      return NextResponse.json({ error: `At most ${MAX_IMAGES_PER_TURN} photos per message` }, { status: 400 })
    }
    if (images.reduce((n, s) => n + s.length, 0) > MAX_IMAGES_BASE64_BYTES) {
      return NextResponse.json({ error: 'Images too large' }, { status: 413 })
    }

    // 3. GET OR CREATE CHAT SESSION
    // If no sessionId provided, create a new chat session in the database.
    // All queries run as the user (RLS scopes rows to them).
    type ChatSessionWithMessages = {
      id: string
      theme: string
      target_words: unknown
      messages: { role: string; content: string }[]
    }

    let chatSession: ChatSessionWithMessages | null = null
    if (sessionId) {
      const { data: existing, error: findError } = await supabase
        .from('chat_sessions')
        .select('id, theme, target_words, messages:chat_messages(role, content, created_at)')
        .eq('id', sessionId)
        .order('created_at', { referencedTable: 'chat_messages', ascending: true })
        .limit(20, { referencedTable: 'chat_messages' }) // last 20 messages for context
        .maybeSingle()
      if (findError) throw findError
      chatSession = existing
    }

    // If no existing session found, create a new one
    if (!chatSession) {
      const { data: created, error: createError } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          theme: theme || 'general',
          target_words: targetWords || [],
        })
        .select('id, theme, target_words')
        .single()
      if (createError) throw createError
      chatSession = { ...created, messages: [] }
    }

    // 4. BUILD CONVERSATION CONTEXT
    // Create the conversation history for the AI to understand context
    const photoNote =
      images.length === 1
        ? 'a photo'
        : `${images.length} photos, in order`
    const userTurn: ChatMessage = images.length > 0
      ? {
          role: 'user',
          content: [
            {
              type: 'text',
              text: message
                ? `${message}\n\n[The user attached ${photoNote}. Follow the photo instructions.]`
                : `[The user sent ${photoNote} without saying anything. Follow the photo instructions.]`,
            },
            ...images.map(base64 => ({ type: 'image' as const, base64 })),
          ],
        }
      : { role: 'user', content: message }

    const conversationHistory: ChatMessage[] = [
      {
        role: 'system',
        content: createSystemPrompt()
      },
      // Add previous messages from this chat session
      ...chatSession.messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      // Add the new user message
      userTurn,
    ]
    console.log('Chat API: Conversation history built with', conversationHistory.length, 'messages')

    // 5. CALL AI SERVICE
    // Here we'll call OpenAI or Claude API
    console.log('Chat API: Calling AI service')
    const aiResponse = await callAIService(conversationHistory)
    console.log('Chat API: AI response received:', aiResponse.substring(0, 50) + '...')

    // 6. PARSE AI RESPONSE
    // Separate Chinese content and English translations
    const { chineseContent, englishTranslation } = parseAIResponse(aiResponse)
    console.log('Chat API: Parsed response - Chinese:', chineseContent.substring(0, 30) + '...', 'English:', englishTranslation)

    // 7. SAVE MESSAGES TO DATABASE
    // Store both user message and AI response with separated content
    const { error: saveError } = await supabase.from('chat_messages').insert([
      {
        user_id: user.id,
        chat_session_id: chatSession.id,
        role: 'user',
        content: message || (images.length > 1 ? `[${images.length} photos]` : PHOTO_PLACEHOLDER),
      },
      {
        user_id: user.id,
        chat_session_id: chatSession.id,
        role: 'assistant',
        content: chineseContent,
        translation: englishTranslation,
      },
    ])
    if (saveError) throw saveError

    // 8. RETURN RESPONSE
    console.log('Chat API: Returning success response')
    return NextResponse.json({
      success: true,
      sessionId: chatSession.id,
      message: chineseContent,
      translation: englishTranslation,
      theme: chatSession.theme,
      targetWords: chatSession.target_words
    })

  } catch (error) {
    // Error handling - log the error and return user-friendly message
    console.error('Chat API error:', error)
    console.error('Chat API error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Failed to process chat message', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// HELPER FUNCTION: Create system prompt for AI
function createSystemPrompt(): string {
  return `你是一個廣東話導師 (You are a Cantonese language tutor). 

Your role:
- Help the user practice Cantonese conversation
- Respond primarily in Traditional Chinese (繁體中文)
- Provide helpful corrections and suggestions
- Keep conversations engaging and educational

Guidelines:
- Use natural, colloquial Cantonese expressions
- When the user makes mistakes, gently correct them
- Ask follow-up questions to keep the conversation flowing
- Mix Chinese and English explanations when helpful for learning
- If the user uses an English word (for example because they don't know the Cantonese), acknowledge that English word and teach them how to say it in Cantonese. Give the Cantonese word in the Chinese part of your response, and put the English word it corresponds to in parentheses right after it, e.g. 「蘋果」(apple). Then continue the conversation using the Cantonese word

Photos:
The user is a parent learning Cantonese so they can speak it with their young child. When the user sends one or more photos:
- First describe what is going on in the photo(s) in natural, spoken Cantonese, the way a parent might narrate it to their child. If there are several photos, treat them as one scene or sequence and go through them in order
- If the photo contains Chinese text, transcribe it in Traditional characters and tell the user how to say it out loud in Cantonese. If the written form is formal or Mandarin-style, also give the colloquial Cantonese way of saying it
- If the photo contains English text, do NOT copy the English into your Chinese sentences. Instead give the natural spoken Cantonese a parent would actually say to their child, then put the original English in parentheses right after it, e.g. 快啲洗手啦 (Please wash your hands)
- Pick out one to three useful words or phrases from the photo and teach each one in the 「詞語」(English) format, e.g. 「洗手」(wash hands), so the user can reuse them
- Do not mention that you are an AI or describe the image technically; talk about it like a tutor sitting next to them

IMPORTANT: Format your responses as follows:
- Write your main response in Traditional Chinese (繁體中文)
- If you include English translations or explanations, put them in parentheses like this: (English translation here)
- Keep the Chinese content and English content clearly separated: never put Chinese inside parentheses, and never put English outside of parentheses
- Use plain ASCII parentheses ( ) for the English, never full-width （ ）

Start the conversation with a friendly greeting.`
}

// Text-only view of a message, for providers/paths that cannot take images.
function textOf(content: ChatMessage['content']): string {
  if (typeof content === 'string') return content
  return content.map(p => (p.type === 'text' ? p.text : '')).join('\n').trim()
}

// HELPER FUNCTION: Call AI service (OpenAI/Claude)
async function callAIService(messages: ChatMessage[]): Promise<string> {
  try {
    // Check if we have API credentials
    const openaiApiKey = process.env.OPENAI_API_KEY
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY

    console.log('AI Service: Checking API keys - OpenAI:', !!openaiApiKey, 'Anthropic:', !!anthropicApiKey)

    // For now, we'll use a mock response if no API key is configured
    if (!openaiApiKey && !anthropicApiKey) {
      console.warn('AI Service: No AI API key configured - using mock response')
      return generateMockResponse(textOf(messages[messages.length - 1].content))
    }

  // Option 1: OpenAI Integration
  // gpt-4o accepts images, which photo turns need; it is also a better
  // Cantonese speaker than the gpt-3.5-turbo this route started on.
  if (openaiApiKey) {
    try {
      const response = await getOpenAI().chat.completions.create({
        model: 'gpt-4o',
        messages: messages.map(msg => {
          if (typeof msg.content === 'string') {
            return { role: msg.role, content: msg.content }
          }
          return {
            role: 'user' as const,
            content: msg.content.map(part =>
              part.type === 'text'
                ? { type: 'text' as const, text: part.text }
                : {
                    type: 'image_url' as const,
                    image_url: { url: `data:image/jpeg;base64,${part.base64}`, detail: 'high' as const },
                  }
            ),
          }
        }),
        max_tokens: 700,
        temperature: 0.7, // Slightly creative but focused responses
      })

      return response.choices[0]?.message?.content || 'Sorry, I could not generate a response.'
    } catch (error) {
      console.error('OpenAI API error:', error)
      throw error
    }
  }

  // Option 2: Anthropic (Claude) Integration
  if (anthropicApiKey) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicApiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 700,
          // Claude handles the system message separately
          messages: messages
            .filter(msg => msg.role !== 'system')
            .map(msg => ({
              role: msg.role,
              content:
                typeof msg.content === 'string'
                  ? msg.content
                  : msg.content.map(part =>
                      part.type === 'text'
                        ? { type: 'text', text: part.text }
                        : {
                            type: 'image',
                            source: { type: 'base64', media_type: 'image/jpeg', data: part.base64 },
                          }
                    ),
            })),
          system: textOf(messages.find(msg => msg.role === 'system')?.content ?? ''),
        }),
      })

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`)
      }

      const data = await response.json()
      return data.content[0]?.text || 'Sorry, I could not generate a response.'
    } catch (error) {
      console.error('Anthropic API error:', error)
      throw error
    }
  }

    throw new Error('No AI service configured')
  } catch (error) {
    console.error('AI Service error:', error)
    // Fallback to mock response if AI service fails
    console.log('AI Service: Falling back to mock response due to error')
    return generateMockResponse(textOf(messages[messages.length - 1].content))
  }
}

// HELPER FUNCTION: Parse AI response to separate Chinese and English content
function parseAIResponse(response: string): { chineseContent: string; englishTranslation: string | null } {
  // Extract English translations from parentheses
  const englishMatches = response.match(/\(([^)]+)\)/g)
  let englishTranslation = null
  
  if (englishMatches) {
    // Join all English translations with spaces
    englishTranslation = englishMatches
      .map(match => match.slice(1, -1)) // Remove parentheses
      .join(' ')
  }
  
  // Remove English translations from the response to get clean Chinese content
  const chineseContent = response.replace(/\([^)]+\)/g, '').trim()
  
  return { chineseContent, englishTranslation }
}

// MOCK RESPONSE for development/testing without API keys
function generateMockResponse(userMessage: string): string {
  const responses = [
    "你好！我哋今日講吓咩好呢？(Hello! What should we talk about today?)",
    "好好！你講得唔錯喎！(Very good! You're speaking well!)",
    "試吓用多啲廣東話啦！(Try using more Cantonese!)",
    "呢個詞語用得好好！(You used that word very well!)",
    "我明白你想講咩，不如我哋繼續傾偈啦！(I understand what you want to say, let's continue chatting!)",
    "你今日想學咩廣東話呢？(What Cantonese would you like to learn today?)",
    "記住要多練習，慢慢就會進步！(Remember to practice more, you'll improve gradually!)",
    "呢個發音要再準確啲。(This pronunciation needs to be more accurate.)",
    "好嘢！你已經掌握咗呢個表達方式。(Great! You've already mastered this expression.)",
    "不如我哋練習吓日常對話？(How about we practice some daily conversation?)"
  ]
  
  // Simple logic to pick a response based on user message length
  const index = userMessage.length % responses.length
  return responses[index]
}

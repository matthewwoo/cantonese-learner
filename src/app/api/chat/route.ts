// src/app/api/chat/route.ts
// API endpoint for AI chat functionality
// This handles communication between our frontend and AI services (OpenAI/Claude)

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { Session } from 'next-auth'
import { z } from 'zod'

// Define the structure of a chat message
interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// Request body validation schema
const chatRequestSchema = z.object({
  message: z.string().trim().min(1, 'Message is required'),
  sessionId: z.string().optional(),
  theme: z.string().optional(),
  targetWords: z.array(z.string()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    
    // 1. AUTHENTICATION CHECK
    // Always verify the user is logged in before processing chat requests
    const session = await getServerSession(authOptions) as Session | null
    
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // 2. PARSE & VALIDATE REQUEST DATA
    const { message, sessionId, theme, targetWords } = chatRequestSchema.parse(
      await request.json()
    )

    // 3. GET OR CREATE CHAT SESSION
    // If no sessionId provided, create a new chat session in the database
    let chatSession
    if (sessionId) {
      // Find existing session
      chatSession = await db.chatSession.findFirst({
        where: {
          id: sessionId,
          user: { email: session.user.email }
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 20 // Limit to last 20 messages for context
          }
        }
      })
    }

    // If no existing session found, create a new one
    if (!chatSession) {
      const user = await db.user.findUnique({
        where: { email: session.user.email }
      })

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      chatSession = await db.chatSession.create({
        data: {
          userId: user.id,
          theme: theme || 'general',
          targetWords: targetWords || []
        },
        include: {
          messages: true
        }
      })
    }

    // 4. BUILD CONVERSATION CONTEXT
    // Create the conversation history for the AI to understand context
    const conversationHistory: ChatMessage[] = [
      {
        role: 'system',
        content: createSystemPrompt(chatSession.theme, chatSession.targetWords as string[])
      },
      // Add previous messages from this chat session
      ...chatSession.messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      // Add the new user message
      {
        role: 'user',
        content: message
      }
    ]

    // 5. CALL AI SERVICE
    // Here we'll call OpenAI or Claude API
    const aiResponse = await callAIService(conversationHistory)

    // 6. PARSE AI RESPONSE
    // Separate Chinese content and English translations
    const { chineseContent, englishTranslation } = parseAIResponse(aiResponse)

    // 7. SAVE MESSAGES TO DATABASE
    // Store both user message and AI response with separated content
    await db.chatMessage.createMany({
      data: [
        {
          chatSessionId: chatSession.id,
          role: 'user',
          content: message
        },
        {
          chatSessionId: chatSession.id,
          role: 'assistant',
          content: chineseContent,
          translation: englishTranslation
        }
      ]
    })

    // 8. RETURN RESPONSE
    return NextResponse.json({
      success: true,
      sessionId: chatSession.id,
      message: chineseContent,
      translation: englishTranslation,
      theme: chatSession.theme,
      targetWords: chatSession.targetWords
    })

  } catch (error) {
    // Error handling - log the error and return user-friendly message
    console.error('Chat API error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
}

// HELPER FUNCTION: Create system prompt for AI
function createSystemPrompt(theme: string, targetWords: string[]): string {
  return `你是一個廣東話導師 (You are a Cantonese language tutor). 

Your role:
- Help the user practice Cantonese conversation
- Focus on the theme: "${theme}"
- Encourage use of these target words: ${targetWords.join(', ')}
- Respond primarily in Traditional Chinese (繁體中文)
- Provide helpful corrections and suggestions
- Keep conversations engaging and educational

Guidelines:
- Use natural, colloquial Cantonese expressions
- When the user makes mistakes, gently correct them
- Ask follow-up questions to keep the conversation flowing
- If the user uses any target words, acknowledge and reinforce their usage
- Mix Chinese and English explanations when helpful for learning

IMPORTANT: Format your responses as follows:
- Write your main response in Traditional Chinese (繁體中文)
- If you include English translations or explanations, put them in parentheses like this: (English translation here)
- Keep the Chinese content and English content clearly separated

Start the conversation with a friendly greeting related to the theme "${theme}".`
}

// HELPER FUNCTION: Call AI service (OpenAI/Claude)
async function callAIService(messages: ChatMessage[]): Promise<string> {
  try {
    // Check if we have API credentials
    const openaiApiKey = process.env.OPENAI_API_KEY
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY


    // For now, we'll use a mock response if no API key is configured
    if (!openaiApiKey && !anthropicApiKey) {
      console.warn('AI Service: No AI API key configured - using mock response')
      return generateMockResponse(messages[messages.length - 1].content)
    }

  // Option 1: OpenAI Integration
  if (openaiApiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo', // or 'gpt-4' for better quality
          messages: messages,
          max_tokens: 500,
          temperature: 0.7, // Slightly creative but focused responses
        }),
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`)
      }

      const data = await response.json()
      return data.choices[0]?.message?.content || 'Sorry, I could not generate a response.'
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
          max_tokens: 500,
          messages: messages.filter(msg => msg.role !== 'system'), // Claude handles system message differently
          system: messages.find(msg => msg.role === 'system')?.content || '',
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
    return generateMockResponse(messages[messages.length - 1].content)
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
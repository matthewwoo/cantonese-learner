# Cantonese Learner App

Learn Cantonese through flashcards and AI conversations.

## Features

### 🎯 Core Learning Tools
- **Smart Flashcards**: Spaced repetition (SM-2) with Traditional Chinese support
- **AI Conversations**: Practice real conversations with an AI tutor
- **Article Reading**: English articles automatically translated to Traditional Chinese
- **Progress Tracking**: Monitor your learning journey

### 📚 Article Translation Feature
- **Automatic Translation**: English articles translated to Traditional Chinese line by line
- **Interactive Reading**: Tap Chinese words for definitions and pronunciation
- **TTS Support**: Text-to-speech for pronunciation practice

### 🤖 AI-Powered Features
- **Speech-to-Text**: OpenAI Whisper
- **Text-to-Speech**: Natural Cantonese pronunciation
- **Deck Generation**: AI-generated flashcard decks and cover images

## Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project (database + auth)
- OpenAI API key (AI conversations, translation, TTS/STT, image generation)

### Quick Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd cantonese-app
   npm install
   ```

2. **Set up environment variables** in `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   OPENAI_API_KEY=<openai key>
   # Optional fallback for article translation:
   # GOOGLE_TRANSLATE_API_KEY=<google key>
   ```

3. **Set up the database:** run the SQL in
   [`supabase/migrations/`](./supabase/migrations) against your Supabase
   project (SQL editor, or `supabase db push` with the CLI). This creates all
   tables, Row Level Security policies, and triggers.

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000)** to see the app

### Regenerating database types

```bash
SUPABASE_PROJECT_ID=<project-ref> npm run types:gen
```

## iOS app

A native SwiftUI client lives in [`ios/`](./ios) — same Supabase project and
`/api/*` routes (Bearer-token auth). See [`ios/README.md`](./ios/README.md) for
setup (XcodeGen + `Config/Secrets.xcconfig`).

## Architecture

- **CRUD goes straight to Supabase** from the client (`src/lib/data/`),
  protected by Row Level Security — the same tables/policies a future iOS
  app (supabase-swift) would use.
- **API routes exist only for AI features** that need server-side secrets:
  chat, flashcard generation, translation, TTS/Whisper, image generation,
  article fetching. They authenticate via the Supabase session (cookies, or
  `Authorization: Bearer` for native clients) and write as the user.
- **SM-2 spaced repetition** is a pure TypeScript util (`src/lib/srs/sm2.ts`)
  executed client-side — portable to Swift for iOS.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Backend**: Supabase (Postgres + Auth + RLS), Next.js API routes for AI
- **AI Services**: OpenAI (chat, Whisper, TTS, DALL·E), Anthropic (chat fallback)
- **Translation**: OpenAI GPT, Google Translate (fallback)

## License

This project is licensed under the MIT License.

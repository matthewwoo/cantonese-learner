# Cantonese Learner App

<!-- Deployment test - checking environment variables -->

Learn Cantonese through flashcards and AI conversations.

## Features

### 🎯 Core Learning Tools
- **Smart Flashcards**: Spaced repetition learning with Traditional Chinese support
- **AI Conversations**: Practice real conversations with AI tutor
- **Article Reading**: English articles automatically translated to Traditional Chinese
- **Progress Tracking**: Monitor your learning journey with detailed analytics

### 📚 Article Translation Feature
- **Automatic Translation**: English articles translated to Traditional Chinese line by line
- **Interactive Reading**: Click Chinese characters for definitions and pronunciation
- **TTS Support**: Text-to-speech for proper pronunciation practice
- **Reading Progress**: Track your position and reading speed

### 🤖 AI-Powered Features
- **Speech-to-Text**: Multiple options (Web Speech API, OpenAI Whisper, Google Cloud STT)
- **Text-to-Speech**: Natural pronunciation for Cantonese learning
- **Smart Corrections**: AI-powered feedback on conversations

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project (Postgres database + Auth)
- Translation API key (Google Translate or OpenAI)

### Quick Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd cantonese-app
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Set up the database:**
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   # then run supabase/auth-setup.sql in the Supabase SQL editor
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000)** to see the app

## Environment Variables

See [SETUP.md](./SETUP.md) for detailed environment variable configuration.

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase Auth
- `DATABASE_URL`: pooled Supabase Postgres connection (runtime)
- `DIRECT_URL`: direct Supabase Postgres connection (migrations)
- `OPENAI_API_KEY`: AI conversations, TTS, Whisper, image/flashcard generation

Optional (for enhanced features):
- `GOOGLE_TRANSLATE_API_KEY`: For article translation

## Documentation

- [Setup Guide](./SETUP.md) - Complete setup instructions
- [Article Translation Feature](./docs/TRANSLATION_FEATURE.md) - Detailed translation feature documentation
- [Articles Feature](./docs/ARTICLES_FEATURE.md) - Article reading functionality
- [TTS Troubleshooting](./docs/TTS_TROUBLESHOOTING.md) - Speech synthesis help

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: Supabase Postgres
- **Authentication**: Supabase Auth
- **AI Services**: OpenAI API, Google Cloud APIs
- **Translation**: Google Translate API, OpenAI GPT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

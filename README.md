# Cantonese Learner App

A comprehensive language learning platform for mastering Cantonese through AI-powered conversations, smart flashcards, and article reading with automatic translation.

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
- PostgreSQL database
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
   npx prisma db push
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000)** to see the app

## Environment Variables

See [SETUP.md](./SETUP.md) for detailed environment variable configuration.

Required variables:
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_URL`: Your app URL
- `NEXTAUTH_SECRET`: Authentication secret key

Optional (for enhanced features):
- `OPENAI_API_KEY`: For AI conversations and translation
- `GOOGLE_TRANSLATE_API_KEY`: For article translation
- `GOOGLE_APPLICATION_CREDENTIALS`: For speech recognition

## Documentation

- [Setup Guide](./SETUP.md) - Complete setup instructions
- [Article Translation Feature](./TRANSLATION_FEATURE.md) - Detailed translation feature documentation
- [Articles Feature](./ARTICLES_FEATURE.md) - Article reading functionality
- [TTS Troubleshooting](./TTS_TROUBLESHOOTING.md) - Speech synthesis help

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js
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

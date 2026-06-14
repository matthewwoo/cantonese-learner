# Article Translation Feature

## Overview

The Cantonese Learner app now includes a comprehensive article translation feature that automatically translates English articles into Traditional Chinese and displays them line by line for effective language learning.

## How It Works

### 1. Article Creation Process

When a user creates a new article:

1. **Content Input**: User provides English article content (either by pasting text or providing a URL)
2. **Loading State**: A beautiful loading overlay appears showing translation progress
3. **Content Processing**: The content is split into individual lines/paragraphs
4. **Translation**: Each line is automatically translated to Traditional Chinese using the configured translation service
5. **Vocabulary Extraction**: Chinese characters are extracted and definitions are generated
6. **Storage**: Both original English and translated Chinese content are stored in the database
7. **Success Feedback**: User receives confirmation and is redirected to the translated article

### 2. Display Format

Articles are displayed with:
- **Traditional Chinese text** (primary display)
- **English translation** (shown below each Chinese line)
- **Interactive features**: Click on Chinese characters to see definitions
- **TTS support**: Text-to-speech for pronunciation practice

## Technical Implementation

### Database Schema

The `Article` model stores:
- `originalContent`: JSON array of English text lines
- `translatedContent`: JSON array of Traditional Chinese text lines
- `wordDefinitions`: JSON object mapping Chinese characters to their definitions

### API Endpoints

#### Article Creation
- **POST** `/api/articles`
- Creates article and triggers translation process
- Returns article ID for immediate navigation

#### Translation Service
- **POST** `/api/translate`
- Supports English ↔ Traditional Chinese translation
- Uses Google Translate API or OpenAI API

#### Article Display
- **GET** `/api/articles/[id]`
- Returns article with both original and translated content
- Includes reading session data

### Translation Services

The app supports multiple translation services:

#### Google Translate API (Recommended)
- Best quality for Traditional Chinese
- Requires `GOOGLE_TRANSLATE_API_KEY` environment variable
- Supports Traditional Chinese (zh-TW) specifically

#### OpenAI API (Alternative)
- Good quality translation
- Requires `OPENAI_API_KEY` environment variable
- Uses GPT models for translation

#### Fallback Mode
- Mock translation for development/testing
- No API keys required
- Shows placeholder translations

## Setup Instructions

### 1. Environment Variables

Add to your `.env.local` file:

```bash
# For Google Translate (recommended)
GOOGLE_TRANSLATE_API_KEY="your-google-translate-api-key-here"

# For OpenAI (alternative)
OPENAI_API_KEY="your-openai-api-key-here"

# Required for all setups
DATABASE_URL="postgresql://username:password@localhost:5432/cantonese_learner"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
```

### 2. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push
```

### 3. Translation API Keys

#### Google Translate API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Cloud Translation API
4. Create credentials (API key)
5. Add the API key to your environment variables

#### OpenAI API
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an account and get an API key
3. Add the API key to your environment variables

## Usage Guide

### Creating Articles

1. **Sign in** to your account
2. **Navigate** to the Articles page (`/articles`)
3. **Click** "Add New Article"
4. **Enter** article title and content (or URL)
5. **Click** "Create Article"
6. **Wait** for translation to complete
7. **Start reading** the translated article

### Reading Articles

1. **View** the article with Chinese text prominently displayed
2. **Toggle** English translations using the "Show/Hide English" button
3. **Click** on Chinese characters to see definitions
4. **Use** OpenAI Cantonese TTS for high-quality pronunciation practice
5. **Control** playback speed and navigation

### Features

- **Line-by-line display**: Each English line has its Chinese translation below
- **Interactive vocabulary**: Click Chinese characters for definitions
- **OpenAI Cantonese TTS**: High-quality Cantonese pronunciation using OpenAI's TTS API
- **Reading progress**: Track your reading position
- **Speed control**: Adjust TTS playback speed
- **Fullscreen mode**: Immersive reading experience
- **Loading states**: Beautiful loading overlays during translation
- **Error handling**: Graceful fallbacks when translation services are unavailable

## Code Structure

### Key Files

```
src/app/api/articles/route.ts          # Article creation with translation
src/app/api/translate/route.ts          # Translation service
src/app/articles/[id]/page.tsx          # Article display page
src/app/articles/page.tsx               # Article list page
prisma/schema.prisma                    # Database schema
```

### Translation Flow

1. **Content Processing**: `translateLines()` function in `articles/route.ts`
2. **Direct Translation**: `translateWithService()` function with multiple service support
3. **Loading States**: Beautiful UI feedback during translation process
4. **Display Logic**: Article reading page with line-by-line rendering
5. **Vocabulary**: `extractWordDefinitions()` for Chinese character definitions

## Testing

### Manual Testing

1. Set up environment variables
2. Create a user account
3. Create an article with English content
4. Verify translation appears correctly
5. Test interactive features (TTS, definitions)

### Automated Testing

Run the test scripts:
```bash
node test-translation.js
node test-article-creation.js
```

## Troubleshooting

### Common Issues

1. **Translation not working**
   - Check API keys are set correctly
   - Verify translation service is enabled
   - Check network connectivity

2. **Authentication errors**
   - Ensure user is signed in
   - Check session configuration

3. **Database errors**
   - Run `npx prisma db push` to update schema
   - Check database connection

4. **TTS not working**
   - Check browser supports speech synthesis
   - Verify Chinese language support

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=* npm run dev
```

## Future Enhancements

- **Offline translation**: Cache translations for offline use
- **Batch processing**: Translate multiple articles at once
- **Custom dictionaries**: User-defined vocabulary
- **Reading analytics**: Track reading speed and comprehension
- **Export features**: Export articles as flashcards
- **Collaborative features**: Share articles with other learners

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the code comments
3. Test with different translation services
4. Verify environment setup

The translation feature is designed to provide a seamless learning experience for Cantonese learners, making English articles accessible and educational through proper Traditional Chinese translations.

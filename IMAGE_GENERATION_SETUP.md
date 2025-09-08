# Image Generation Setup

## Overview
The flashcard upload form now includes AI-powered image generation using OpenAI's DALL-E 3 API. Users can generate custom anime-inspired illustrations for their flashcard decks.

## Features
- **AI Image Generation**: Generate custom images based on deck titles
- **Anime Style**: Images are generated in a simple, anime-inspired, flat illustration style
- **Preview & Regenerate**: Users can preview generated images and regenerate if needed
- **Optional Feature**: Image generation is completely optional - users can skip it
- **Database Integration**: Generated images are stored and displayed on deck cards

## Setup Requirements

### 1. Environment Variables
Add the following to your `.env` file:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

### 2. Database Migration
The database schema has been updated to include an `imageUrl` field in the `FlashcardSet` model. Run the migration:

```bash
npx prisma migrate dev
```

### 3. API Endpoint
The image generation API is available at:
```
POST /api/images/generate
```

**Request Body:**
```json
{
  "prompt": "Deck title or description"
}
```

**Response:**
```json
{
  "success": true,
  "imageUrl": "https://oaidalleapiprodscus.blob.core.windows.net/...",
  "prompt": "Revised prompt used for generation"
}
```

## Usage

### In Upload Form
1. Enter a deck name
2. Click "Generate AI Image for Deck" button
3. Wait for image generation (may take 10-30 seconds)
4. Preview the generated image
5. Optionally regenerate with "Regenerate" button
6. Continue with CSV upload

### Image Display
- Generated images appear as circular thumbnails on deck cards
- Fallback to default illustration if no image is generated
- Images are optimized using Next.js Image component

## Technical Details

### Image Generation Prompt
The system uses this prompt template:
```
Generate a simple, anime inspired, flat illustration that is based on the title: "{deck_title}". The image should be colorful, clean, and suitable for a flashcard deck. Style: flat design, anime-inspired, simple shapes, bright colors.
```

### DALL-E 3 Settings
- Model: `dall-e-3`
- Size: `1024x1024`
- Quality: `standard`
- Style: `vivid`
- Number of images: `1`

### Error Handling
- API key validation
- Network error handling
- User-friendly error messages
- Graceful fallbacks

## Cost Considerations
- DALL-E 3 costs approximately $0.04 per image
- Images are generated on-demand
- Consider implementing rate limiting for production use

## Security Notes
- API key is stored securely in environment variables
- No user data is sent to OpenAI beyond the deck title
- Generated images are hosted by OpenAI (temporary URLs)

## Future Enhancements
- Image caching and storage
- Multiple style options
- Batch image generation
- User preference settings
- Image editing capabilities

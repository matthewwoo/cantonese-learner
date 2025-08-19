# 📚 Article Reading Feature - Documentation

## Overview
The Article Reading feature allows users to learn Traditional Chinese (繁體中文) by reading English articles with line-by-line translations. It includes interactive Text-to-Speech (TTS), word definitions, and progress tracking.

## Features Implemented

### ✅ Core Features
1. **Article Management**
   - Add articles via URL or manual text input
   - Automatic content extraction from web pages
   - Article title and source URL tracking
   - Delete articles functionality

2. **Translation System**
   - Line-by-line translation from English to Traditional Chinese
   - Toggle between showing/hiding translations
   - Support for multiple translation APIs (Google, OpenAI, mock)

3. **Text-to-Speech (TTS)**
   - Read entire article aloud in Chinese
   - Click any line to hear pronunciation
   - Adjustable playback speed (0.5x, 1x, 1.5x, 2x)
   - Visual highlighting of current line being read
   - Play/pause controls

4. **Interactive Learning**
   - Click any Chinese character to see definition
   - Pinyin and English translations for words
   - Individual character pronunciation
   - Hover highlighting for clickable characters

5. **Reading Progress**
   - Track current position in article
   - Save reading speed preferences
   - Show/hide translation preferences
   - Reading session management

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── articles/
│   │   │   ├── route.ts              # Main articles API (GET, POST)
│   │   │   ├── [id]/
│   │   │   │   └── route.ts          # Single article API (GET, DELETE)
│   │   │   └── fetch/
│   │   │       └── route.ts          # URL content extraction
│   │   └── translate/
│   │       └── route.ts              # Translation service
│   └── articles/
│       ├── page.tsx                  # Articles list page
│       └── [id]/
│           └── page.tsx               # Article reading page
```

## Database Schema

### Articles Table
```prisma
model Article {
  id                String   @id @default(cuid())
  userId            String
  title             String
  sourceUrl         String?
  originalContent   Json     // English lines array
  translatedContent Json     // Chinese lines array
  wordDefinitions   Json?    // Word dictionary
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

### Reading Sessions Table
```prisma
model ReadingSession {
  id                String   @id @default(cuid())
  userId            String
  articleId         String
  currentPosition   Int      @default(0)
  readingSpeed      Float    @default(1.0)
  showTranslation   Boolean  @default(true)
  startedAt         DateTime @default(now())
  lastReadAt        DateTime @updatedAt
  completedAt       DateTime?
  totalReadingTime  Int      @default(0)
}
```

## Setup Instructions

### 1. Apply Database Migration
```bash
# Generate and apply the migration
npx prisma migrate dev --name add-articles-feature

# Generate Prisma client
npx prisma generate
```

### 2. Configure Translation API (Optional)
Add one of these to your `.env` file:

#### Option A: Google Translate
```env
GOOGLE_TRANSLATE_API_KEY=your_google_api_key_here
```

#### Option B: OpenAI
```env
OPENAI_API_KEY=your_openai_api_key_here
```

If no API key is provided, the app will use mock translations for development.

### 3. Test the Feature
1. Navigate to `/dashboard` and click "Browse Articles"
2. Click "Add New Article"
3. Either:
   - Paste a URL and click "Fetch" to extract content
   - Manually enter article title and content
4. Click "Create Article" to save and translate
5. Start reading with interactive features!

## API Endpoints

### Articles Management
- `GET /api/articles` - Get all user's articles
- `POST /api/articles` - Create new article with translation
- `GET /api/articles/[id]` - Get specific article with reading session
- `DELETE /api/articles/[id]` - Delete an article

### Article Processing
- `POST /api/articles/fetch` - Extract content from URL
- `POST /api/translate` - Translate text

## UI Components

### Articles List Page (`/articles`)
- Grid view of all articles
- Add new article modal
- URL fetching capability
- Delete article option
- Navigation to reading page

### Article Reading Page (`/articles/[id]`)
- **Top Control Bar**
  - Back navigation
  - Article title
  - Translation toggle
  - TTS play/pause
  - Speed controls
  - Progress indicator

- **Content Area**
  - Line-by-line display
  - Chinese text (clickable characters)
  - English translation (toggleable)
  - Line numbers
  - Individual line TTS

- **Word Definition Modal**
  - Character display
  - Pinyin pronunciation
  - English meaning
  - Play pronunciation button

- **Floating Actions**
  - Scroll to top
  - Fullscreen mode

## Styling Features
- **Duolingo-inspired design**
  - Colorful gradients
  - Playful animations
  - Card-based layouts
  - Interactive hover effects

- **Visual Feedback**
  - Current line highlighting during TTS
  - Hover effects on clickable elements
  - Loading states
  - Success/error toasts

## Future Enhancements

### To Be Implemented
1. **Advanced TTS Features**
   - Word-level highlighting during playback
   - Bookmark positions
   - Continue from last position

2. **Learning Analytics**
   - Track words clicked
   - Time spent reading
   - Completion rates
   - Vocabulary building from articles

3. **Content Enhancement**
   - Better article extraction algorithms
   - Support for more content types (PDFs, etc.)
   - Batch article import
   - Article categories/tags

4. **Dictionary Integration**
   - Comprehensive Cantonese dictionary
   - Example sentences
   - Word frequency data
   - Related words suggestions

5. **Social Features**
   - Share articles with other users
   - Public article library
   - Reading challenges
   - Progress sharing

## Troubleshooting

### Common Issues

1. **TTS Not Working**
   - Check browser supports Web Speech API
   - Ensure Chinese (zh-TW) voice is available
   - Try different browsers (Chrome recommended)

2. **Translation Not Working**
   - Check API keys in `.env`
   - Verify API quotas/limits
   - Check network connectivity

3. **Article Extraction Issues**
   - Some websites block scraping
   - Try copying text manually
   - Check CORS policies

4. **Database Errors**
   - Run `npx prisma migrate dev` to sync schema
   - Check DATABASE_URL in `.env`
   - Verify PostgreSQL is running

## Development Notes

### Key Technologies Used
- **Next.js 15** - App router, API routes
- **Prisma** - Database ORM
- **Web Speech API** - TTS functionality
- **Tailwind CSS** - Styling
- **React Hooks** - State management

### Code Quality
- TypeScript for type safety
- Comprehensive comments in Chinese & English
- Error handling throughout
- Loading states for all async operations
- Responsive design for all screen sizes

## Testing Checklist
- [ ] Add article from URL
- [ ] Add article with manual text
- [ ] Play TTS for entire article
- [ ] Click individual lines for TTS
- [ ] Change playback speed
- [ ] Toggle translation visibility
- [ ] Click Chinese characters for definitions
- [ ] Delete articles
- [ ] Test on mobile devices
- [ ] Test fullscreen mode

## Credits
Built as part of the Cantonese Learning App project.
Designed to make language learning fun and interactive! 🎉
# Cantonese Learner App Setup Guide

## Environment Variables Required

To run this application, you need to set up the following environment variables. Create a `.env.local` file in the root directory with:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/cantonese_learner"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-make-it-long-and-random"

# OpenAI (Optional - for enhanced speech-to-text and translation)
OPENAI_API_KEY="your-openai-api-key-here"

# Google Cloud (Optional - for best Cantonese speech recognition)
GOOGLE_APPLICATION_CREDENTIALS="./summer-health-prod-4cfa9958cb62.json"
```

## Quick Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up your database:**
   - Install PostgreSQL if you haven't already
   - Create a database named `cantonese_learner`
   - Update the `DATABASE_URL` in your `.env.local` file

3. **Generate Prisma client:**
   ```bash
   npx prisma generate
   ```

4. **Run database migrations:**
   ```bash
   npx prisma db push
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

## Common Issues

### "Error: connect ECONNREFUSED" or Database Connection Issues
- Make sure PostgreSQL is running
- Verify your `DATABASE_URL` is correct
- Check that the database exists

### "NEXTAUTH_SECRET is not set" Error
- Add a strong secret key to your `.env.local` file
- You can generate one with: `openssl rand -base64 32`

### "Module not found" Errors
- Run `npm install` to install dependencies
- Run `npx prisma generate` to generate the Prisma client

## Testing the Setup

1. Visit `http://localhost:3000` - you should see the homepage
2. Click "Sign Up" or visit `http://localhost:3000/auth/signup`
3. Try creating an account with a test email and password

## Speech-to-Text Features

The app now supports three speech-to-text methods:

### Web Speech API (Default)
- Works offline
- Limited Cantonese support
- No translation

### OpenAI Whisper (Enhanced)
- Better accuracy for Cantonese
- Real-time English translation
- Requires `OPENAI_API_KEY` environment variable

### Google Cloud Speech-to-Text (Best Cantonese Support)
- Excellent Cantonese dialect recognition
- Real-time English translation
- Requires Google Cloud service account JSON file

To test the enhanced options:
1. Add your API keys to `.env.local`
2. Go to the chat page
3. Click "Show STT Options" in the input area
4. Select "OpenAI Whisper" or "Google Cloud STT"
5. Click the microphone button and speak in Cantonese

If you encounter any specific errors, please share the error message for further assistance.

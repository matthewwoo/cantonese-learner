# Cantonese Learner App Setup Guide

## Environment Variables Required

This app uses **Supabase** for authentication and the Postgres database. Copy
`.env.example` to `.env.local` and fill in the values (see variable reference
there). The key ones:

```bash
# Supabase Auth (public)
NEXT_PUBLIC_SUPABASE_URL="https://YOUR-PROJECT-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-public-key"

# Database (secret) — pooled for runtime, direct for migrations
DATABASE_URL="postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://...pooler.supabase.com:5432/postgres"

# OpenAI (required for chat, TTS, Whisper, image/flashcard generation)
OPENAI_API_KEY="your-openai-api-key-here"

# Google Translate (optional fallback for article translation)
GOOGLE_TRANSLATE_API_KEY="your-google-translate-api-key-here"
```

## Quick Setup

1. **Create a Supabase project** at https://supabase.com. Then:
   - Settings → API: copy the Project URL and anon public key.
   - Settings → Database → Connection string: copy the pooled (6543) and direct
     (5432) connection strings.
   - Authentication → Providers → Email: turn **off** "Confirm email" (this app
     signs users in immediately on sign-up).

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure env:** copy `.env.example` → `.env.local` and fill in the values.

4. **Apply the database schema** (uses `DIRECT_URL`):
   ```bash
   npx prisma migrate deploy
   ```

5. **Apply the Supabase auth setup** (profile-sync trigger + RLS): open
   `supabase/auth-setup.sql` and run it in the Supabase SQL editor.

6. **Start the development server:**
   ```bash
   npm run dev
   ```

## Common Issues

### Database Connection Issues
- Verify `DATABASE_URL` (pooled, 6543) and `DIRECT_URL` (direct, 5432) are correct.
- `prisma migrate` must use the direct connection (`DIRECT_URL`).

### Signed up but no profile row appears
- Make sure you ran `supabase/auth-setup.sql` — the `handle_new_user` trigger
  is what mirrors `auth.users` into `public.users`.

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

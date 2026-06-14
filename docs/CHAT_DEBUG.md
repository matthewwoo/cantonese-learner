# Chat Debug Guide

## Common Issues and Solutions

### 1. Authentication Issues
**Symptoms:** "Authentication required" error
**Solution:** Make sure you're logged in. The chat requires authentication.

### 2. Database Connection Issues
**Symptoms:** "User not found" or database errors
**Solution:** 
- Check if your database is running
- Run `npx prisma db push` to sync schema
- Check your `DATABASE_URL` environment variable

### 3. AI Service Issues
**Symptoms:** "Failed to process chat message" or no AI responses
**Solution:**
- Add either `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` to your `.env` file
- Without API keys, the system will use mock responses

### 4. Environment Variables Needed
Create a `.env.local` file with:
```
DATABASE_URL="your_database_connection_string"
NEXTAUTH_SECRET="your_nextauth_secret"
NEXTAUTH_URL="http://localhost:3000"
OPENAI_API_KEY="your_openai_key"  # Optional
ANTHROPIC_API_KEY="your_anthropic_key"  # Optional
```

## Testing Steps

1. **Check Authentication:**
   - Go to `/auth/signin` and log in
   - Verify you can access `/dashboard`

2. **Test Chat API Directly:**
   ```bash
   curl -X POST http://localhost:3000/api/chat \
     -H "Content-Type: application/json" \
     -H "Cookie: your_session_cookie" \
     -d '{"message": "Hello"}'
   ```

3. **Check Console Logs:**
   - Open browser dev tools
   - Look for errors in the Console tab
   - Check the Network tab for failed requests

4. **Check Server Logs:**
   - Look at your terminal where `npm run dev` is running
   - The enhanced logging will show exactly where the issue occurs

## Quick Fixes

### If you get "Authentication required":
- Make sure you're logged in
- Check that your session is valid

### If you get "User not found":
- Run `npx prisma db push` to sync database
- Check your database connection

### If you get "Failed to process chat message":
- Check the server logs for detailed error information
- Verify your environment variables are set correctly

### If AI responses don't work:
- Add API keys to your `.env` file
- Or the system will use mock responses (which should still work)

-- Run this migration to add the Articles feature tables
-- Command: npx prisma migrate dev --name add-articles-feature

-- This migration will be automatically generated when you run:
-- npx prisma migrate dev --name add-articles-feature

-- The migration will create:
-- 1. articles table with columns for storing article content and translations
-- 2. reading_sessions table for tracking user reading progress
-- 3. Foreign key relationships to the users table

-- To apply this migration:
-- 1. Make sure your DATABASE_URL is configured in .env
-- 2. Run: npx prisma migrate dev --name add-articles-feature
-- 3. Run: npx prisma generate to update the Prisma client
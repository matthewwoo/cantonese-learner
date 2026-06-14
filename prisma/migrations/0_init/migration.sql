-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flashcard_sets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flashcard_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flashcards" (
    "id" TEXT NOT NULL,
    "chineseWord" TEXT NOT NULL,
    "englishTranslation" TEXT NOT NULL,
    "flashcardSetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "exampleSentenceEnglish" TEXT,
    "exampleSentenceChinese" TEXT,
    "pronunciation" TEXT,

    CONSTRAINT "flashcards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_sessions" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "totalCards" INTEGER NOT NULL DEFAULT 20,

    CONSTRAINT "study_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_cards" (
    "id" TEXT NOT NULL,
    "flashcardId" TEXT NOT NULL,
    "studySessionId" TEXT NOT NULL,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "interval" INTEGER NOT NULL DEFAULT 0,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "nextReviewDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "wasCorrect" BOOLEAN,
    "responseTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "theme" TEXT NOT NULL,
    "targetWords" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "chatSessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "translation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "originalContent" JSONB NOT NULL,
    "translatedContent" JSONB NOT NULL,
    "wordDefinitions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "difficulty" TEXT,
    "estimatedMinutes" INTEGER,
    "sentenceCount" INTEGER,
    "sentences" JSONB,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reading_sessions" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "articleId" TEXT NOT NULL,
    "currentPosition" INTEGER NOT NULL DEFAULT 0,
    "readingSpeed" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "showTranslation" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "totalReadingTime" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "reading_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "flashcard_sets_userId_idx" ON "flashcard_sets"("userId");

-- CreateIndex
CREATE INDEX "flashcards_flashcardSetId_idx" ON "flashcards"("flashcardSetId");

-- CreateIndex
CREATE INDEX "study_sessions_userId_idx" ON "study_sessions"("userId");

-- CreateIndex
CREATE INDEX "study_cards_flashcardId_idx" ON "study_cards"("flashcardId");

-- CreateIndex
CREATE INDEX "study_cards_studySessionId_idx" ON "study_cards"("studySessionId");

-- CreateIndex
CREATE INDEX "chat_sessions_userId_idx" ON "chat_sessions"("userId");

-- CreateIndex
CREATE INDEX "chat_messages_chatSessionId_idx" ON "chat_messages"("chatSessionId");

-- CreateIndex
CREATE INDEX "articles_userId_idx" ON "articles"("userId");

-- CreateIndex
CREATE INDEX "reading_sessions_userId_idx" ON "reading_sessions"("userId");

-- CreateIndex
CREATE INDEX "reading_sessions_articleId_idx" ON "reading_sessions"("articleId");

-- AddForeignKey
ALTER TABLE "flashcard_sets" ADD CONSTRAINT "flashcard_sets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_flashcardSetId_fkey" FOREIGN KEY ("flashcardSetId") REFERENCES "flashcard_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_cards" ADD CONSTRAINT "study_cards_flashcardId_fkey" FOREIGN KEY ("flashcardId") REFERENCES "flashcards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_cards" ADD CONSTRAINT "study_cards_studySessionId_fkey" FOREIGN KEY ("studySessionId") REFERENCES "study_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_chatSessionId_fkey" FOREIGN KEY ("chatSessionId") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_sessions" ADD CONSTRAINT "reading_sessions_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_sessions" ADD CONSTRAINT "reading_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


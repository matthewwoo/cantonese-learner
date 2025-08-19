-- AlterTable
ALTER TABLE "public"."articles" ADD COLUMN     "difficulty" TEXT,
ADD COLUMN     "estimatedMinutes" INTEGER,
ADD COLUMN     "sentenceCount" INTEGER,
ADD COLUMN     "sentences" JSONB;

-- CreateTable
CREATE TABLE "public"."reading_sessions_v2" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "currentCardIndex" INTEGER NOT NULL DEFAULT 0,
    "totalCards" INTEGER NOT NULL,
    "completedCards" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "autoPlayTTS" BOOLEAN NOT NULL DEFAULT true,
    "ttsSpeed" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "showTranslation" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "cardsFlipped" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "audioReplays" JSONB,
    "timePerCard" JSONB,

    CONSTRAINT "reading_sessions_v2_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."reading_sessions_v2" ADD CONSTRAINT "reading_sessions_v2_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reading_sessions_v2" ADD CONSTRAINT "reading_sessions_v2_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

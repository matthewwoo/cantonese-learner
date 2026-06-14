-- CreateIndex
CREATE INDEX "flashcard_sets_userId_idx" ON "public"."flashcard_sets"("userId");

-- CreateIndex
CREATE INDEX "flashcards_flashcardSetId_idx" ON "public"."flashcards"("flashcardSetId");

-- CreateIndex
CREATE INDEX "study_sessions_userId_idx" ON "public"."study_sessions"("userId");

-- CreateIndex
CREATE INDEX "study_cards_flashcardId_idx" ON "public"."study_cards"("flashcardId");

-- CreateIndex
CREATE INDEX "study_cards_studySessionId_idx" ON "public"."study_cards"("studySessionId");

-- CreateIndex
CREATE INDEX "chat_sessions_userId_idx" ON "public"."chat_sessions"("userId");

-- CreateIndex
CREATE INDEX "chat_messages_chatSessionId_idx" ON "public"."chat_messages"("chatSessionId");

-- CreateIndex
CREATE INDEX "articles_userId_idx" ON "public"."articles"("userId");

-- CreateIndex
CREATE INDEX "reading_sessions_userId_idx" ON "public"."reading_sessions"("userId");

-- CreateIndex
CREATE INDEX "reading_sessions_articleId_idx" ON "public"."reading_sessions"("articleId");

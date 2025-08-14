/*
  Warnings:

  - You are about to drop the column `exampleSentence` on the `flashcards` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."flashcards" DROP COLUMN "exampleSentence",
ADD COLUMN     "exampleSentenceEnglish" TEXT;

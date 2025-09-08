/*
  Warnings:

  - You are about to drop the column `description` on the `flashcard_sets` table. All the data in the column will be lost.
  - You are about to drop the column `theme` on the `flashcard_sets` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."flashcard_sets" DROP COLUMN "description",
DROP COLUMN "theme";

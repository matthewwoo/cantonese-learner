-- DropForeignKey
ALTER TABLE "public"."reading_sessions_v2" DROP CONSTRAINT IF EXISTS "reading_sessions_v2_articleId_fkey";

-- DropForeignKey
ALTER TABLE "public"."reading_sessions_v2" DROP CONSTRAINT IF EXISTS "reading_sessions_v2_userId_fkey";

-- DropTable
DROP TABLE IF EXISTS "public"."reading_sessions_v2";

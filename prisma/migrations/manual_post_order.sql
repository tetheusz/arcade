-- Adiciona ordem manual e destaque editorial aos posts
-- Execute: npx prisma db push
-- ou aplique manualmente no Supabase SQL editor

ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "displayOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "featured" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "posts_status_featured_displayOrder_idx"
  ON "posts" ("status", "featured", "displayOrder");

import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const contentPath = path.join(
    process.cwd(),
    "content",
    "bem-vindo-ao-arcade-journal.md",
  );
  const content = await readFile(contentPath, "utf8");
  const coverImageUrl = "/uploads/covers/arcade-journal-home.png";

  await prisma.post.upsert({
    where: { slug: "bem-vindo-ao-arc-builder-jornal" },
    update: {
      title: "Bem-vindo ao Arcade Journal",
      summary:
        "A base editorial do Arcade para documentar o ecossistema Arc em português, com curadoria, traduções e artigos para builders brasileiros.",
      content,
      kind: "ARTICLE",
      coverImageUrl,
      sourceTitle: null,
      sourceUrl: null,
      tags: "arc,pt-br,builder-journal",
      status: "PUBLISHED",
    },
    create: {
      slug: "bem-vindo-ao-arc-builder-jornal",
      title: "Bem-vindo ao Arcade Journal",
      summary:
        "A base editorial do Arcade para documentar o ecossistema Arc em português, com curadoria, traduções e artigos para builders brasileiros.",
      content,
      kind: "ARTICLE",
      coverImageUrl,
      sourceTitle: null,
      sourceUrl: null,
      tags: "arc,pt-br,builder-journal",
      status: "PUBLISHED",
      publishedAt: new Date("2026-04-07T12:00:00.000Z"),
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

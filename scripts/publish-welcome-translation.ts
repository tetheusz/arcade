import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const contentPath = path.join(
    process.cwd(),
    "content",
    "bem-vindo-ao-arc-traducao.md",
  );
  const content = await readFile(contentPath, "utf8");
  const coverImageUrl = "/uploads/covers/arc-docs-official.jpg";

  await prisma.post.upsert({
    where: { slug: "bem-vindo-ao-arc-traducao-pt-br" },
    update: {
      title: "Bem-vindo ao Arc",
      summary:
        "Tradução em PT-BR do texto oficial Welcome to Arc, com os princípios centrais da rede e os principais casos de uso destacados pela documentação.",
      content,
      kind: "TRANSLATION",
      coverImageUrl,
      sourceTitle: "Welcome to Arc",
      sourceUrl: "https://docs.arc.network/arc/concepts/welcome-to-arc",
      tags: "arc,pt-br,tradução,docs,onboarding",
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
    create: {
      slug: "bem-vindo-ao-arc-traducao-pt-br",
      title: "Bem-vindo ao Arc",
      summary:
        "Tradução em PT-BR do texto oficial Welcome to Arc, com os princípios centrais da rede e os principais casos de uso destacados pela documentação.",
      content,
      kind: "TRANSLATION",
      coverImageUrl,
      sourceTitle: "Welcome to Arc",
      sourceUrl: "https://docs.arc.network/arc/concepts/welcome-to-arc",
      tags: "arc,pt-br,tradução,docs,onboarding",
      status: "PUBLISHED",
      publishedAt: new Date(),
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

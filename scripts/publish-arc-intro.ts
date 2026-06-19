import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const contentPath = path.join(
    process.cwd(),
    "content",
    "o-que-e-arc-para-builders-br.md",
  );
  const content = await readFile(contentPath, "utf8");
  const coverImageUrl = "/uploads/covers/system-overview-page.png";

  await prisma.post.upsert({
    where: { slug: "o-que-e-arc-para-builders-br" },
    update: {
      title: "O que é Arc e por que builders brasileiros deveriam acompanhar agora",
      summary:
        "Um resumo em PT-BR da tese do Arc, da testnet pública e do que mais importa para builders brasileiros entrando cedo no ecossistema.",
      content,
      kind: "ARTICLE",
      coverImageUrl,
      sourceTitle: null,
      sourceUrl: null,
      tags: "arc,pt-br,builders,stablecoins",
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
    create: {
      slug: "o-que-e-arc-para-builders-br",
      title: "O que é Arc e por que builders brasileiros deveriam acompanhar agora",
      summary:
        "Um resumo em PT-BR da tese do Arc, da testnet pública e do que mais importa para builders brasileiros entrando cedo no ecossistema.",
      content,
      kind: "ARTICLE",
      coverImageUrl,
      sourceTitle: null,
      sourceUrl: null,
      tags: "arc,pt-br,builders,stablecoins",
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

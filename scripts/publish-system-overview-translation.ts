import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const contentPath = path.join(
    process.cwd(),
    "content",
    "system-overview-traducao-pt-br.md",
  );
  const content = await readFile(contentPath, "utf8");

  await prisma.post.upsert({
    where: { slug: "system-overview-traducao-pt-br" },
    update: {
      title: "Arquitetura do Arc",
      summary:
        "Tradução em PT-BR da página oficial de arquitetura do Arc, cobrindo Malachite, Reth, taxas em USDC, finalidade determinística e os benefícios práticos para builders.",
      content,
      kind: "TRANSLATION",
      coverImageUrl: "/uploads/covers/system-overview-page.png",
      sourceTitle: "Architecture - Arc Docs",
      sourceUrl: "https://docs.arc.network/arc/concepts/system-overview",
      tags: "arc,pt-br,tradução,arquitetura,malachite,reth,docs",
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
    create: {
      slug: "system-overview-traducao-pt-br",
      title: "Arquitetura do Arc",
      summary:
        "Tradução em PT-BR da página oficial de arquitetura do Arc, cobrindo Malachite, Reth, taxas em USDC, finalidade determinística e os benefícios práticos para builders.",
      content,
      kind: "TRANSLATION",
      coverImageUrl: "/uploads/covers/system-overview-page.png",
      sourceTitle: "Architecture - Arc Docs",
      sourceUrl: "https://docs.arc.network/arc/concepts/system-overview",
      tags: "arc,pt-br,tradução,arquitetura,malachite,reth,docs",
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

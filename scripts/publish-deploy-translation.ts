import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const contentPath = path.join(
    process.cwd(),
    "content",
    "deploy-on-arc-traducao.md",
  );
  const content = await readFile(contentPath, "utf8");
  const coverImageUrl = "/uploads/covers/deploy-on-arc-crop.png";

  await prisma.post.upsert({
    where: { slug: "deploy-on-arc-traducao-pt-br" },
    update: {
      title: "Deploy on Arc",
      summary:
        "Tradução em PT-BR do tutorial oficial de deploy no Arc, cobrindo Foundry, configuração da RPC, wallet, testnet USDC e interação com o contrato publicado.",
      content,
      kind: "TRANSLATION",
      coverImageUrl,
      sourceTitle: "Deploy on Arc",
      sourceUrl: "https://docs.arc.network/arc/tutorials/deploy-on-arc",
      tags: "arc,pt-br,tradução,foundry,deploy,docs",
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
    create: {
      slug: "deploy-on-arc-traducao-pt-br",
      title: "Deploy on Arc",
      summary:
        "Tradução em PT-BR do tutorial oficial de deploy no Arc, cobrindo Foundry, configuração da RPC, wallet, testnet USDC e interação com o contrato publicado.",
      content,
      kind: "TRANSLATION",
      coverImageUrl,
      sourceTitle: "Deploy on Arc",
      sourceUrl: "https://docs.arc.network/arc/tutorials/deploy-on-arc",
      tags: "arc,pt-br,tradução,foundry,deploy,docs",
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

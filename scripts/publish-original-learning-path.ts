import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const slug = "como-eu-usaria-o-arcade-para-aprender-arc-mais-rapido";
  const contentPath = path.join(
    process.cwd(),
    "content",
    "como-eu-usaria-o-arcade-para-aprender-arc-mais-rapido.md",
  );
  const content = await readFile(contentPath, "utf8");

  const post = await prisma.post.upsert({
    where: { slug },
    update: {
      title: "Como eu usaria o Arcade para aprender Arc mais rápido",
      summary:
        "Trilha autoral de 3 semanas: Journal + desafios diários + bounties + on-chain — a sequência que falta entre a doc oficial e virar builder ativo no ecossistema Arc.",
      content,
      kind: "ARTICLE",
      coverImageUrl: "/uploads/covers/arcade-journal-home.png",
      sourceTitle: null,
      sourceUrl: null,
      tags: "arc,pt-br,autoral,arcade,aprendizado,builders,trilha",
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
    create: {
      slug,
      title: "Como eu usaria o Arcade para aprender Arc mais rápido",
      summary:
        "Trilha autoral de 3 semanas: Journal + desafios diários + bounties + on-chain — a sequência que falta entre a doc oficial e virar builder ativo no ecossistema Arc.",
      content,
      kind: "ARTICLE",
      coverImageUrl: "/uploads/covers/arcade-journal-home.png",
      sourceTitle: null,
      sourceUrl: null,
      tags: "arc,pt-br,autoral,arcade,aprendizado,builders,trilha",
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
    select: { slug: true, title: true, status: true, kind: true },
  });

  console.log(JSON.stringify({ status: "published", post }, null, 2));
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

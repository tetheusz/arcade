import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const slug = process.argv[2] ?? "access-usdc-crosschain-traducao-pt-br";

  const existing = await prisma.post.findUnique({ where: { slug } });

  if (!existing) {
    throw new Error(`Post nao encontrado: ${slug}`);
  }

  const publishedAt = existing.publishedAt ?? new Date();

  const post = await prisma.post.update({
    where: { slug },
    data: {
      status: "PUBLISHED",
      publishedAt,
      coverImageUrl:
        existing.coverImageUrl ?? "/uploads/covers/arc-docs-official.jpg",
    },
    select: {
      slug: true,
      title: true,
      status: true,
      publishedAt: true,
      coverImageUrl: true,
    },
  });

  console.log(JSON.stringify({ status: "published", post }, null, 2));
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

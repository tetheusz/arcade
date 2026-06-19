import { readFile } from "node:fs/promises";
import path from "node:path";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "../src/lib/prisma";

const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
const adminName = process.env.ADMIN_NAME ?? "ARC Admin";
const dataFile = path.join(process.cwd(), "data", "posts.json");

export async function seedAdmin(options?: { force?: boolean }) {
  if (!adminEmail || !adminPassword) {
    console.warn("ADMIN_EMAIL ou ADMIN_PASSWORD nao configurados. Seed de admin ignorado.");
    return;
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingUser && !options?.force) {
    return;
  }

  if (existingUser && options?.force) {
    await prisma.user.delete({
      where: { email: adminEmail },
    });
  }

  const seedAuth = betterAuth({
    secret:
      process.env.BETTER_AUTH_SECRET ??
      "dev-only-secret-change-before-production-please-change-me",
    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000"],
    database: prismaAdapter(prisma, {
      provider: process.env.DATABASE_URL?.startsWith("postgres")
        ? "postgresql"
        : "sqlite",
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: false,
    },
    rateLimit: {
      enabled: false,
    },
  });

  await seedAuth.api.signUpEmail({
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    },
  });
}

export async function seedPosts() {
  const postsCount = await prisma.post.count();

  if (postsCount > 0) {
    return;
  }

  try {
    const raw = await readFile(dataFile, "utf8");
    const legacyPosts = JSON.parse(raw) as Array<{
      slug: string;
      title: string;
      summary: string;
      content: string;
      kind?: "article" | "translation";
      sourceTitle?: string | null;
      sourceUrl?: string | null;
      status: "draft" | "published";
      tags: string[];
      publishedAt: string | null;
      updatedAt: string;
    }>;

    for (const post of legacyPosts) {
      await prisma.post.create({
        data: {
          slug: post.slug,
          title: post.title,
          summary: post.summary,
          content: post.content,
          kind: (post.kind ?? "article").toUpperCase() as "ARTICLE" | "TRANSLATION",
          sourceTitle: post.sourceTitle ?? null,
          sourceUrl: post.sourceUrl ?? null,
          status: post.status.toUpperCase() as "DRAFT" | "PUBLISHED",
          tags: post.tags.join(","),
          publishedAt: post.publishedAt ? new Date(post.publishedAt) : null,
          updatedAt: new Date(post.updatedAt),
        },
      });
    }
  } catch {
    console.warn("Nenhum seed legado de posts encontrado.");
  }
}

export async function seedFoundation(options?: { forceAdmin?: boolean }) {
  await seedAdmin({ force: options?.forceAdmin });
  const { seedBountyDomain } = await import("../scripts/seed-bounty-domain");
  await seedBountyDomain();
}

async function main() {
  await seedFoundation();
  await seedPosts();
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

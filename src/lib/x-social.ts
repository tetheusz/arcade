import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { createXPost, getXCurrentUser, isXConfigured } from "@/lib/x-client";

type SocialPostLogEntry = {
  slug: string;
  xPostId: string;
  xPostUrl: string | null;
  text: string;
  postedAt: string;
};

const DEFAULT_PUBLIC_URL = "https://arcade-nu-blush.vercel.app";

function getSocialLogPath() {
  return path.join(process.cwd(), "data", "social-post-log.json");
}

async function readSocialLog() {
  try {
    const raw = await readFile(getSocialLogPath(), "utf8");
    const parsed = JSON.parse(raw) as SocialPostLogEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeSocialLog(entries: SocialPostLogEntry[]) {
  await writeFile(getSocialLogPath(), `${JSON.stringify(entries, null, 2)}\n`, "utf8");
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function getPublicBaseUrl() {
  const configuredPublicUrl = process.env.ARCADE_PUBLIC_URL?.trim();

  if (configuredPublicUrl) {
    return configuredPublicUrl.replace(/\/+$/, "");
  }

  const authUrl = process.env.BETTER_AUTH_URL?.trim();

  if (
    authUrl &&
    !authUrl.includes("localhost") &&
    !authUrl.includes("127.0.0.1")
  ) {
    return authUrl.replace(/\/+$/, "");
  }

  return DEFAULT_PUBLIC_URL;
}

export function buildTweetText(input: {
  title: string;
  summary: string;
  slug: string;
  kind: "ARTICLE" | "TRANSLATION";
}) {
  const prefix =
    input.kind === "TRANSLATION"
      ? "Nova tradução no Arcade:"
      : "Novo artigo no Arcade:";
  const url = `${getPublicBaseUrl()}/posts/${input.slug}`;
  const cleanSummary = normalizeWhitespace(input.summary);
  const staticLength = `${prefix}\n\n${input.title}\n\n\n\nLeia aqui: ${url}`.length;
  const remaining = Math.max(0, 280 - staticLength);
  const summary = truncate(cleanSummary, remaining);

  return {
    text: `${prefix}\n\n${input.title}\n\n${summary}\n\nLeia aqui: ${url}`,
    url,
  };
}

export async function getLatestPublishedPostForSocial(explicitSlug?: string) {
  if (explicitSlug) {
    return prisma.post.findUnique({
      where: { slug: explicitSlug },
      select: {
        slug: true,
        title: true,
        summary: true,
        kind: true,
        publishedAt: true,
        status: true,
      },
    });
  }

  return prisma.post.findFirst({
    where: {
      status: "PUBLISHED",
    },
    orderBy: [
      { publishedAt: "desc" },
      { updatedAt: "desc" },
    ],
    select: {
      slug: true,
      title: true,
      summary: true,
      kind: true,
      publishedAt: true,
      status: true,
    },
  });
}

export async function previewLatestPostForX(explicitSlug?: string) {
  const post = await getLatestPublishedPostForSocial(explicitSlug);

  if (!post || post.status !== "PUBLISHED") {
    return {
      status: "missing" as const,
      message: "Nenhum post publicado foi encontrado para o X.",
    };
  }

  const preview = buildTweetText(post);
  const log = await readSocialLog();
  const alreadyPosted = log.some((entry) => entry.slug === post.slug);

  return {
    status: alreadyPosted ? ("already-posted" as const) : ("ready" as const),
    post,
    preview,
  };
}

export async function publishLatestPostToX(options?: {
  explicitSlug?: string;
  force?: boolean;
}) {
  const preview = await previewLatestPostForX(options?.explicitSlug);

  if (preview.status === "missing") {
    return preview;
  }

  if (preview.status === "already-posted" && !options?.force) {
    return {
      ...preview,
      message: "Esse post já foi enviado para o X anteriormente.",
    };
  }

  if (!isXConfigured()) {
    return {
      ...preview,
      status: "not-configured" as const,
      message:
        "As credenciais do X ainda não estão configuradas no ambiente. A prévia foi gerada, mas nada foi publicado.",
    };
  }

  const user = await getXCurrentUser();
  const created = await createXPost(preview.preview.text);
  const xPostUrl = user.username
    ? `https://x.com/${user.username}/status/${created.id}`
    : null;
  const log = await readSocialLog();

  log.unshift({
    slug: preview.post.slug,
    xPostId: created.id,
    xPostUrl,
    text: preview.preview.text,
    postedAt: new Date().toISOString(),
  });

  await writeSocialLog(log);

  return {
    status: "posted" as const,
    post: preview.post,
    preview: preview.preview,
    created,
    xPostUrl,
    username: user.username,
  };
}

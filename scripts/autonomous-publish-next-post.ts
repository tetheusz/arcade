import "dotenv/config";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { constants as fsConstants } from "node:fs";
import { PrismaClient } from "@prisma/client";
import {
  getNextEditorialSelection,
  type EditorialQueueItem,
} from "./lib/editorial-queue";
import {
  previewLatestPostForX,
  publishLatestPostToX,
} from "../src/lib/x-social";

type SourceContext = {
  url: string;
  title: string | null;
  description: string | null;
  headings: string[];
  paragraphs: string[];
  fetchError: string | null;
};

type LocalDraft = {
  path: string;
  content: string;
};

type GeneratedPost = {
  title: string;
  summary: string;
  content: string;
  tags: string[];
  sourceTitle: string | null;
  sourceUrl: string | null;
  coverImageUrl: string;
  generator: "reviewed";
};

type PublishLogEntry = {
  slug: string;
  kind: "translation" | "article";
  title: string;
  generator: "reviewed";
  publishedAt: string;
  contentPath: string;
  socialStatus: string;
};

type XQueueEntry = {
  id: string;
  text: string;
};

type XQueueLogEntry = {
  id: string;
  text: string;
  postedAt: string;
  mode: "web";
};

const prisma = new PrismaClient();
const generatedContentDir = path.join(process.cwd(), "content", "generated");
const publishLogPath = path.join(process.cwd(), "data", "autonomous-publish-log.json");
const xQueuePath = path.join(process.cwd(), "data", "x-content-queue.json");
const xQueueLogPath = path.join(process.cwd(), "data", "x-queue-log.json");

function readFlag(flag: string) {
  return process.argv.includes(flag);
}

function readOption(prefix: string) {
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

async function readJsonFile<T>(filePath: string, fallback: T) {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath: string, data: unknown) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function fileExists(filePath: string) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupe(values: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const normalized = normalizeWhitespace(value);

    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(normalized);
  }

  return output;
}

function stripMarkdownInline(value: string) {
  return value
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_~>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function deriveTitleFromMarkdown(content: string, fallbackTitle: string) {
  const heading = content.match(/^#\s+(.+)$/m)?.[1];
  return normalizeWhitespace(heading ?? fallbackTitle);
}

function deriveSummaryFromMarkdown(content: string, fallbackSummary: string) {
  const lines = content.split(/\r?\n/);
  const collected: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (
      !trimmed ||
      trimmed.startsWith("#") ||
      trimmed.startsWith(">") ||
      trimmed.startsWith("- ") ||
      trimmed.startsWith("```")
    ) {
      if (collected.length > 0) {
        break;
      }

      continue;
    }

    collected.push(trimmed);
  }

  const summary = stripMarkdownInline(collected.join(" "));
  return normalizeWhitespace(summary || fallbackSummary);
}

async function readLocalDraft(item: EditorialQueueItem): Promise<LocalDraft | null> {
  const candidates = [
    path.join(process.cwd(), "content", `${item.slug}.md`),
    path.join(process.cwd(), "content", "drafts", `${item.slug}.md`),
    path.join(process.cwd(), "content", "reviewed", `${item.slug}.md`),
  ];

  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      return {
        path: candidate,
        content: await readFile(candidate, "utf8"),
      };
    }
  }

  return null;
}

function matchAllTexts(html: string, pattern: RegExp) {
  return dedupe(
    Array.from(html.matchAll(pattern))
      .map((match) => stripHtml(match[1] ?? ""))
      .filter((value) => value.length > 0),
  );
}

function getMetaContent(html: string, keys: string[]) {
  for (const key of keys) {
    const pattern = new RegExp(
      `<meta[^>]+(?:name|property)=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i",
    );
    const match = html.match(pattern);

    if (match?.[1]) {
      return stripHtml(match[1]);
    }
  }

  return null;
}

async function fetchSourceContext(url: string): Promise<SourceContext> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "ArcadeAutopublisher/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`source-fetch-${response.status}`);
    }

    const html = await response.text();
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = stripHtml(titleMatch?.[1] ?? "");
    const description = getMetaContent(html, [
      "description",
      "og:description",
      "twitter:description",
    ]);
    const headings = matchAllTexts(html, /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi).slice(0, 6);
    const paragraphs = matchAllTexts(html, /<p[^>]*>([\s\S]*?)<\/p>/gi)
      .filter((value) => value.length >= 70)
      .slice(0, 6);

    return {
      url,
      title: title || null,
      description,
      headings,
      paragraphs,
      fetchError: null,
    };
  } catch (error) {
    return {
      url,
      title: null,
      description: null,
      headings: [],
      paragraphs: [],
      fetchError: error instanceof Error ? error.message : String(error),
    };
  }
}

function guessCoverImage(item: EditorialQueueItem) {
  const key = `${item.slug} ${item.sourceUrl ?? ""}`.toLowerCase();

  if (key.includes("deploy")) {
    return "/uploads/covers/deploy-on-arc-crop.png";
  }

  if (item.kind === "translation") {
    return "/uploads/covers/arc-docs-official.jpg";
  }

  return "/uploads/covers/system-overview-page.png";
}

function deriveTags(item: EditorialQueueItem, source: SourceContext) {
  const tags = ["arc", "pt-br", item.kind === "translation" ? "traducao" : "article"];
  const bag = `${item.title} ${item.notes} ${source.title ?? ""} ${source.url}`.toLowerCase();

  const candidates: Array<[string, string]> = [
    ["stablecoin", "stablecoins"],
    ["usdc", "usdc"],
    ["deploy", "deploy"],
    ["foundry", "foundry"],
    ["evm", "evm"],
    ["bridge", "bridge"],
    ["contract", "contracts"],
    ["payment", "payments"],
    ["system overview", "architecture"],
  ];

  for (const [needle, tag] of candidates) {
    if (bag.includes(needle)) {
      tags.push(tag);
    }
  }

  return dedupe(tags).slice(0, 8);
}

function buildReviewedPost(
  item: EditorialQueueItem,
  source: SourceContext,
  localDraft: LocalDraft,
): GeneratedPost {
  const fallbackSummary =
    item.notes ||
    `Leitura em PT-BR preparada manualmente para a pauta ${item.title}.`;

  return {
    title: deriveTitleFromMarkdown(localDraft.content, item.title),
    summary: deriveSummaryFromMarkdown(localDraft.content, fallbackSummary),
    tags: deriveTags(item, source),
    content: localDraft.content.trim(),
    sourceTitle: source.title || item.title,
    sourceUrl: item.sourceUrl,
    coverImageUrl: guessCoverImage(item),
    generator: "reviewed",
  };
}

async function generatePost(item: EditorialQueueItem) {
  const source = item.sourceUrl
    ? await fetchSourceContext(item.sourceUrl)
    : {
        url: "",
        title: null,
        description: null,
        headings: [],
        paragraphs: [],
        fetchError: null,
      };
  const localDraft = await readLocalDraft(item);

  if (localDraft) {
    return {
      post: buildReviewedPost(item, source, localDraft),
      source,
      blocked: false as const,
    };
  }

  return {
    blocked: true as const,
    reason:
      item.kind === "translation"
        ? "translation-review-required"
        : "article-review-required",
    source,
  };
}

async function saveGeneratedContent(slug: string, content: string) {
  await mkdir(generatedContentDir, { recursive: true });
  const filePath = path.join(generatedContentDir, `${slug}.md`);
  await writeFile(filePath, `${content.trim()}\n`, "utf8");
  return filePath;
}

async function appendPublishLog(entry: PublishLogEntry) {
  const log = await readJsonFile<PublishLogEntry[]>(publishLogPath, []);
  log.unshift(entry);
  await writeJsonFile(publishLogPath, log.slice(0, 50));
}

async function queuePostForX(slug: string, text: string) {
  const queue = await readJsonFile<XQueueEntry[]>(xQueuePath, []);
  const log = await readJsonFile<XQueueLogEntry[]>(xQueueLogPath, []);
  const id = `post:${slug}`;

  if (queue.some((entry) => entry.id === id)) {
    return {
      status: "queued",
      alreadyQueued: true,
      id,
      text,
    };
  }

  if (log.some((entry) => entry.id === id)) {
    return {
      status: "already-posted",
      alreadyQueued: false,
      id,
      text,
    };
  }

  queue.push({
    id,
    text,
  });
  await writeJsonFile(xQueuePath, queue);

  return {
    status: "queued",
    alreadyQueued: false,
    id,
    text,
  };
}

async function runSocialAutomation(slug: string) {
  const preview = await previewLatestPostForX(slug);

  if (preview.status === "missing") {
    return preview;
  }

  if (preview.status === "already-posted") {
    return preview;
  }

  try {
    const result = await publishLatestPostToX({
      explicitSlug: slug,
    });

    if (result.status === "posted") {
      return result;
    }

    if (result.status === "not-configured") {
      const queued = await queuePostForX(slug, result.preview.text);
      return {
        status: queued.status,
        reason: "x-api-not-configured",
        preview: result.preview,
        queue: queued,
      };
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const queued = await queuePostForX(slug, preview.preview.text);

    return {
      status: queued.status,
      reason: message.includes("CreditsDepleted")
        ? "x-api-credits-depleted"
        : "x-api-error",
      message,
      preview: preview.preview,
      queue: queued,
    };
  }
}

async function publishGeneratedPost(
  item: EditorialQueueItem,
  generated: GeneratedPost,
  dryRun: boolean,
) {
  const contentPath = path.join(generatedContentDir, `${item.slug}.md`);

  if (dryRun) {
    return {
      status: "preview" as const,
      contentPath,
    };
  }

  const writtenContentPath = await saveGeneratedContent(item.slug, generated.content);
  const publishedAt = new Date();
  const savedPost = await prisma.post.upsert({
    where: {
      slug: item.slug,
    },
    update: {
      title: generated.title,
      summary: generated.summary,
      content: generated.content,
      kind: item.kind === "translation" ? "TRANSLATION" : "ARTICLE",
      coverImageUrl: generated.coverImageUrl,
      sourceTitle: generated.sourceTitle,
      sourceUrl: generated.sourceUrl,
      tags: generated.tags.join(","),
      status: "PUBLISHED",
      publishedAt,
    },
    create: {
      slug: item.slug,
      title: generated.title,
      summary: generated.summary,
      content: generated.content,
      kind: item.kind === "translation" ? "TRANSLATION" : "ARTICLE",
      coverImageUrl: generated.coverImageUrl,
      sourceTitle: generated.sourceTitle,
      sourceUrl: generated.sourceUrl,
      tags: generated.tags.join(","),
      status: "PUBLISHED",
      publishedAt,
    },
    select: {
      slug: true,
      title: true,
      status: true,
      publishedAt: true,
      kind: true,
    },
  });

  return {
    status: "published" as const,
    contentPath: writtenContentPath,
    savedPost,
  };
}

async function main() {
  const dryRun = readFlag("--dry-run");
  const explicitSlug = readOption("--slug=");

  if (readFlag("--translate-only")) {
    const { runAutonomousTranslation } = await import(
      "../src/lib/editorial/autonomous-translate"
    );
    const result = await runAutonomousTranslation(prisma, {
      dryRun,
      forceSlug: explicitSlug,
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const selection = await getNextEditorialSelection(prisma);

  if (!selection.selected) {
    console.log(
      JSON.stringify(
        {
          status: "empty",
          selection,
          message: "A fila editorial nao tem mais itens pendentes.",
        },
        null,
        2,
      ),
    );
    return;
  }

  const item =
    explicitSlug && selection.selected.slug !== explicitSlug
      ? (
          await readJsonFile<EditorialQueueItem[]>(
            path.join(process.cwd(), "data", "editorial-queue.json"),
            [],
          )
        ).find((entry) => entry.slug === explicitSlug) ?? selection.selected
      : selection.selected;

  const generation = await generatePost(item);

  if (generation.blocked) {
    console.log(
      JSON.stringify(
        {
          status: "blocked",
          selection,
          item,
          reason: generation.reason,
          message:
            generation.reason === "translation-review-required"
              ? "Traducoes so podem ser publicadas automaticamente quando existir um arquivo local revisado para a pauta."
              : "Artigos autorais so podem ser publicados automaticamente quando existir um arquivo local revisado para a pauta.",
          source: generation.source,
        },
        null,
        2,
      ),
    );
    return;
  }

  const { post, source } = generation;
  const publishResult = await publishGeneratedPost(item, post, dryRun);

  if (publishResult.status === "preview") {
    console.log(
      JSON.stringify(
        {
          status: "preview",
          selection,
          generator: post.generator,
          item,
          source,
          generated: {
            title: post.title,
            summary: post.summary,
            tags: post.tags,
            coverImageUrl: post.coverImageUrl,
            contentPath: publishResult.contentPath,
            contentPreview: post.content.slice(0, 1200),
          },
        },
        null,
        2,
      ),
    );
    return;
  }

  const social = await runSocialAutomation(item.slug);
  await appendPublishLog({
    slug: item.slug,
    kind: item.kind,
    title: post.title,
    generator: post.generator,
    publishedAt: publishResult.savedPost.publishedAt?.toISOString() ?? new Date().toISOString(),
    contentPath: publishResult.contentPath,
    socialStatus: social.status,
  });

  console.log(
    JSON.stringify(
      {
        status: "published",
        selection,
        generator: post.generator,
        item,
        source,
        post: publishResult.savedPost,
        contentPath: publishResult.contentPath,
        social,
      },
      null,
      2,
    ),
  );
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

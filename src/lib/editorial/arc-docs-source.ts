import { readFile } from "node:fs/promises";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { slugify } from "@/lib/utils";

export type ArcDocCandidate = {
  slug: string;
  title: string;
  sourceUrl: string;
  sourceTitle: string;
  priority: number;
  notes: string;
  origin: "queue" | "llms";
};

type EditorialQueueItem = {
  slug: string;
  kind: "translation" | "article";
  title: string;
  sourceUrl: string | null;
  notes: string;
};

const LLMS_URL = "https://docs.arc.network/llms.txt";
const RECENT_DRAFT_WINDOW_MS = 11 * 60 * 60 * 1000;

export function normalizeArcDocUrl(url: string) {
  return url
    .trim()
    .replace(/^http:\/\//i, "https://")
    .replace(/docs\.arc\.io/i, "docs.arc.network")
    .replace(/\.md$/i, "")
    .replace(/\/+$/, "");
}

export function arcDocSlug(title: string, explicitSlug?: string) {
  if (explicitSlug) {
    return explicitSlug;
  }

  return `${slugify(title)}-traducao-pt-br`;
}

function scoreLlmsPath(url: string) {
  const normalized = normalizeArcDocUrl(url).toLowerCase();

  if (normalized.includes("/arc/concepts/")) {
    return 90;
  }

  if (normalized.includes("/arc/tutorials/")) {
    return 85;
  }

  if (normalized.includes("/arc/references/")) {
    return 70;
  }

  if (normalized.includes("/app-kit/")) {
    return 50;
  }

  if (normalized.includes("/build/") || normalized.includes("/integrate/")) {
    return 45;
  }

  return 40;
}

function parseLlmsCatalog(raw: string): ArcDocCandidate[] {
  const pattern = /-\s*\[([^\]]+)\]\((https?:\/\/[^)]+)\)(?::\s*(.+))?/g;
  const candidates: ArcDocCandidate[] = [];
  const seen = new Set<string>();

  for (const match of raw.matchAll(pattern)) {
    const title = match[1]?.trim();
    const url = match[2]?.trim();
    const description = match[3]?.trim() ?? "";

    if (!title || !url || !url.includes("docs.arc")) {
      continue;
    }

    const sourceUrl = normalizeArcDocUrl(url);
    const key = sourceUrl.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    candidates.push({
      slug: arcDocSlug(title),
      title,
      sourceUrl,
      sourceTitle: title,
      priority: scoreLlmsPath(sourceUrl),
      notes: description,
      origin: "llms",
    });
  }

  return candidates;
}

export async function fetchLlmsCatalog() {
  const response = await fetch(LLMS_URL, {
    headers: {
      "User-Agent": "ArcadeAutopublisher/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`llms-fetch-${response.status}`);
  }

  return parseLlmsCatalog(await response.text());
}

export async function loadEditorialQueue() {
  const queuePath = path.join(process.cwd(), "data", "editorial-queue.json");
  const raw = await readFile(queuePath, "utf8");
  return JSON.parse(raw) as EditorialQueueItem[];
}

async function getExistingCoverage(prisma: PrismaClient) {
  const posts = await prisma.post.findMany({
    select: {
      slug: true,
      sourceUrl: true,
      status: true,
      updatedAt: true,
      tags: true,
    },
  });

  const coveredSourceUrls = new Set<string>();
  const coveredSlugs = new Set<string>();
  const recentDraftSlugs = new Set<string>();
  const cutoff = Date.now() - RECENT_DRAFT_WINDOW_MS;

  for (const post of posts) {
    coveredSlugs.add(post.slug);

    if (post.sourceUrl) {
      coveredSourceUrls.add(normalizeArcDocUrl(post.sourceUrl).toLowerCase());
    }

    if (post.status === "DRAFT" && post.updatedAt.getTime() >= cutoff) {
      recentDraftSlugs.add(post.slug);
    }
  }

  return { coveredSourceUrls, coveredSlugs, recentDraftSlugs };
}

function isCandidateAvailable(
  candidate: ArcDocCandidate,
  coverage: Awaited<ReturnType<typeof getExistingCoverage>>,
) {
  const normalizedSource = normalizeArcDocUrl(candidate.sourceUrl).toLowerCase();

  if (coverage.coveredSourceUrls.has(normalizedSource)) {
    return false;
  }

  if (coverage.coveredSlugs.has(candidate.slug)) {
    return false;
  }

  if (coverage.recentDraftSlugs.has(candidate.slug)) {
    return false;
  }

  return true;
}

export async function listArcDocCandidates(prisma: PrismaClient) {
  const [queue, llmsCatalog, coverage] = await Promise.all([
    loadEditorialQueue(),
    fetchLlmsCatalog().catch(() => [] as ArcDocCandidate[]),
    getExistingCoverage(prisma),
  ]);

  const merged = new Map<string, ArcDocCandidate>();

  for (const item of queue) {
    if (item.kind !== "translation" || !item.sourceUrl) {
      continue;
    }

    const sourceUrl = normalizeArcDocUrl(item.sourceUrl);
    const key = sourceUrl.toLowerCase();

    merged.set(key, {
      slug: item.slug,
      title: item.title,
      sourceUrl,
      sourceTitle: item.title,
      priority: 200,
      notes: item.notes,
      origin: "queue",
    });
  }

  for (const item of llmsCatalog) {
    const key = normalizeArcDocUrl(item.sourceUrl).toLowerCase();

    if (!merged.has(key)) {
      merged.set(key, item);
    }
  }

  return [...merged.values()]
    .filter((candidate) => isCandidateAvailable(candidate, coverage))
    .sort((left, right) => {
      if (right.priority !== left.priority) {
        return right.priority - left.priority;
      }

      return left.title.localeCompare(right.title);
    });
}

export async function selectNextArcDocCandidate(
  prisma: PrismaClient,
  options?: { forceSlug?: string },
) {
  const candidates = await listArcDocCandidates(prisma);

  if (options?.forceSlug) {
    return (
      candidates.find((candidate) => candidate.slug === options.forceSlug) ??
      null
    );
  }

  return candidates[0] ?? null;
}

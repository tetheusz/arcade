import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

export type EditorialQueueItem = {
  slug: string;
  kind: "translation" | "article";
  title: string;
  sourceUrl: string | null;
  notes: string;
};

export type EditorialSelection = {
  generatedAt: string;
  preferredKind: "translation" | "article";
  selected: EditorialQueueItem | null;
  pendingCount: number;
  readyForAction: boolean;
  readyReason: string;
  draftPath: string | null;
};

function getPreferredKind(date = new Date()) {
  return date.getDate() % 2 === 0 ? "translation" : "article";
}

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findLocalDraftPath(item: EditorialQueueItem) {
  const candidates = [
    path.join(process.cwd(), "content", `${item.slug}.md`),
    path.join(process.cwd(), "content", "drafts", `${item.slug}.md`),
    path.join(process.cwd(), "content", "reviewed", `${item.slug}.md`),
  ];

  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function getActionability(item: EditorialQueueItem | null) {
  if (!item) {
    return {
      readyForAction: false,
      readyReason: "no-selection",
      draftPath: null,
    };
  }

  const draftPath = await findLocalDraftPath(item);

  if (item.kind === "translation") {
    if (draftPath) {
      return {
        readyForAction: true,
        readyReason: "reviewed-translation-available",
        draftPath,
      };
    }

    return {
      readyForAction: false,
      readyReason: "translation-review-required",
      draftPath: null,
    };
  }

  if (draftPath) {
    return {
      readyForAction: true,
      readyReason: "local-draft-available",
      draftPath,
    };
  }

  if (item.sourceUrl) {
    return {
      readyForAction: true,
      readyReason: "source-url-available",
      draftPath: null,
    };
  }

  return {
    readyForAction: false,
    readyReason: "waiting-for-source-or-draft",
    draftPath: null,
  };
}

export async function getNextEditorialSelection(prisma: PrismaClient) {
  const queuePath = path.join(process.cwd(), "data", "editorial-queue.json");
  const outputPath = path.join(process.cwd(), "data", "next-post.json");
  const rawQueue = await readFile(queuePath, "utf8");
  const queue = JSON.parse(rawQueue) as EditorialQueueItem[];

  const publishedPosts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
    },
    select: {
      slug: true,
    },
  });

  const publishedSlugs = new Set(publishedPosts.map((post) => post.slug));
  const pending = queue.filter((item) => !publishedSlugs.has(item.slug));
  const preferredKind = getPreferredKind();
  const preferredPending = pending.filter((item) => item.kind === preferredKind);
  const fallbackPending = pending.filter((item) => item.kind !== preferredKind);

  let selected: EditorialQueueItem | null = null;
  let actionability = {
    readyForAction: false,
    readyReason: "no-selection",
    draftPath: null as string | null,
  };

  for (const candidate of [...preferredPending, ...fallbackPending]) {
    const candidateActionability = await getActionability(candidate);

    if (candidateActionability.readyForAction) {
      selected = candidate;
      actionability = candidateActionability;
      break;
    }
  }

  if (!selected) {
    selected = preferredPending[0] ?? pending[0] ?? null;
    actionability = await getActionability(selected);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    preferredKind,
    selected,
    pendingCount: pending.length,
    readyForAction: actionability.readyForAction,
    readyReason: actionability.readyReason,
    draftPath: actionability.draftPath,
  } satisfies EditorialSelection;

  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  return payload;
}

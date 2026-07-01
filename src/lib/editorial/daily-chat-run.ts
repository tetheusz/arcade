import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { runEditorialCycle } from "@/lib/editorial/run-editorial-cycle";
import { buildTweetText } from "@/lib/x-social";
import { createXPost, getXCurrentUser, isXConfigured } from "@/lib/x-client";
import { getDateKey } from "@/lib/utils";

export type DailyXQueueEntry = {
  id: string;
  text: string;
  kind: "translation" | "challenges" | "engagement";
};

export type DailyEditorialChatResult = {
  generatedAt: string;
  dateKey: string;
  editorial: Awaited<ReturnType<typeof runEditorialCycle>>;
  publishedChallenges: Array<{ id: string; category: string; title: string }>;
  xQueue: DailyXQueueEntry[];
  xPosted: Array<{ id: string; xPostUrl: string | null }>;
  xSkipped: Array<{ id: string; reason: string }>;
  nextSteps: string[];
};

const DEFAULT_PUBLIC_URL = "https://arcade-nu-blush.vercel.app";

function getPublicBaseUrl() {
  return (
    process.env.ARCADE_PUBLIC_URL?.trim()?.replace(/\/+$/, "") ||
    process.env.BETTER_AUTH_URL?.trim()?.replace(/\/+$/, "") ||
    DEFAULT_PUBLIC_URL
  );
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function buildDailyChallengesTweet(dateKey: string) {
  const url = `${getPublicBaseUrl()}/jogar`;
  const text = truncate(
    `Desafios do dia no Arcade (${dateKey}):\n\nTermo, Conexão e Security check sobre Arc.\n\nJogue aqui: ${url}`,
    280,
  );

  return {
    id: `daily:${dateKey}:challenges`,
    text,
    kind: "challenges" as const,
  };
}

export function buildDailyEngagementTweet(input: {
  dateKey: string;
  themeTitle?: string;
}) {
  const theme = input.themeTitle ?? "Arc";
  const url = getPublicBaseUrl();
  const text = truncate(
    `Builder log do dia: estou usando o Arcade para aprender ${theme} em PT-BR — leitura + desafios diários.\n\n${url}`,
    280,
  );

  return {
    id: `daily:${input.dateKey}:engagement`,
    text,
    kind: "engagement" as const,
  };
}

function buildDraftTranslationTweet(input: {
  dateKey: string;
  slug: string;
  title: string;
  summary: string;
}) {
  const adminUrl = `${getPublicBaseUrl()}/admin/posts/${input.slug}/edit`;
  const text = truncate(
    `Rascunho pronto no Arcade:\n\n${input.title}\n\n${input.summary}\n\nRevisar: ${adminUrl}`,
    280,
  );

  return {
    id: `draft:${input.dateKey}:${input.slug}`,
    text,
    kind: "translation" as const,
  };
}

async function readXQueue() {
  const queuePath = path.join(process.cwd(), "data", "x-content-queue.json");

  try {
    const raw = await readFile(queuePath, "utf8");
    const parsed = JSON.parse(raw) as Array<{ id: string; text: string }>;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeXQueue(entries: Array<{ id: string; text: string }>) {
  const queuePath = path.join(process.cwd(), "data", "x-content-queue.json");
  await writeFile(queuePath, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
}

async function readXQueueLog() {
  const logPath = path.join(process.cwd(), "data", "x-queue-log.json");

  try {
    const raw = await readFile(logPath, "utf8");
    const parsed = JSON.parse(raw) as Array<{
      id: string;
      text?: string;
      xPostId?: string;
      xPostUrl?: string | null;
      postedAt?: string;
    }>;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function appendXQueueLog(entry: {
  id: string;
  text: string;
  xPostId: string;
  xPostUrl: string | null;
}) {
  const logPath = path.join(process.cwd(), "data", "x-queue-log.json");
  const log = await readXQueueLog();

  log.unshift({
    id: entry.id,
    text: entry.text,
    xPostId: entry.xPostId,
    xPostUrl: entry.xPostUrl,
    postedAt: new Date().toISOString(),
  });

  await writeFile(logPath, `${JSON.stringify(log, null, 2)}\n`, "utf8");
}

export async function queueDailyXPosts(entries: DailyXQueueEntry[]) {
  const queue = await readXQueue();
  const postedIds = new Set((await readXQueueLog()).map((entry) => entry.id));
  const queuedIds = new Set(queue.map((entry) => entry.id));
  const added: DailyXQueueEntry[] = [];

  for (const entry of entries) {
    if (postedIds.has(entry.id) || queuedIds.has(entry.id)) {
      continue;
    }

    queue.push({ id: entry.id, text: entry.text });
    queuedIds.add(entry.id);
    added.push(entry);
  }

  if (added.length > 0) {
    await writeXQueue(queue);
  }

  return added;
}

export async function postQueuedXEntries(options?: {
  limit?: number;
  ids?: string[];
}) {
  const limit = options?.limit ?? 2;
  const queue = await readXQueue();
  const postedIds = new Set((await readXQueueLog()).map((entry) => entry.id));
  const targetIds = options?.ids ? new Set(options.ids) : null;

  const candidates = queue.filter((entry) => {
    if (postedIds.has(entry.id)) {
      return false;
    }

    if (targetIds && !targetIds.has(entry.id)) {
      return false;
    }

    return true;
  });

  const xPosted: Array<{ id: string; xPostUrl: string | null }> = [];
  const xSkipped: Array<{ id: string; reason: string }> = [];

  if (!isXConfigured()) {
    for (const entry of candidates.slice(0, limit)) {
      xSkipped.push({ id: entry.id, reason: "x-not-configured" });
    }

    return { xPosted, xSkipped };
  }

  const user = await getXCurrentUser();

  for (const entry of candidates.slice(0, limit)) {
    try {
      const created = await createXPost(entry.text);
      const xPostUrl = user.username
        ? `https://x.com/${user.username}/status/${created.id}`
        : null;

      await appendXQueueLog({
        id: entry.id,
        text: entry.text,
        xPostId: created.id,
        xPostUrl,
      });

      xPosted.push({ id: entry.id, xPostUrl });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      xSkipped.push({
        id: entry.id,
        reason: message.includes("CreditsDepleted") ? "x-credits-depleted" : message,
      });
      break;
    }
  }

  return { xPosted, xSkipped };
}

async function publishTodayChallenges(
  prisma: PrismaClient,
  dateKey: string,
  challengeIds: string[],
) {
  if (challengeIds.length === 0) {
    const drafts = await prisma.dailyChallenge.findMany({
      where: {
        dateKey,
        sourceLabel: "auto-generated",
        status: "DRAFT",
      },
      select: { id: true, category: true, title: true },
    });

    if (drafts.length === 0) {
      return [];
    }

    await prisma.dailyChallenge.updateMany({
      where: {
        id: { in: drafts.map((entry) => entry.id) },
      },
      data: { status: "PUBLISHED" },
    });

    return drafts.map((entry) => ({
      id: entry.id,
      category: entry.category,
      title: entry.title,
    }));
  }

  await prisma.dailyChallenge.updateMany({
    where: { id: { in: challengeIds } },
    data: { status: "PUBLISHED" },
  });

  return prisma.dailyChallenge.findMany({
    where: { id: { in: challengeIds } },
    select: { id: true, category: true, title: true },
  });
}

export async function runDailyEditorialChat(
  prisma: PrismaClient,
  options?: {
    dryRun?: boolean;
    autoPublishChallenges?: boolean;
    postToX?: boolean;
    xPostLimit?: number;
  },
): Promise<DailyEditorialChatResult> {
  const dateKey = getDateKey();
  const autoPublishChallenges = options?.autoPublishChallenges ?? true;
  const postToX = options?.postToX ?? true;

  const editorial = await runEditorialCycle(prisma, {
    dryRun: options?.dryRun,
    forceDateKey: dateKey,
  });

  const nextSteps: string[] = [];
  let publishedChallenges: Array<{ id: string; category: string; title: string }> = [];
  const xQueueEntries: DailyXQueueEntry[] = [];

  if (editorial.challenges.status === "draft-saved") {
    xQueueEntries.push(buildDailyChallengesTweet(dateKey));
    xQueueEntries.push(
      buildDailyEngagementTweet({
        dateKey,
        themeTitle: editorial.challenges.themeId?.replace(/-/g, " "),
      }),
    );

    if (!options?.dryRun && autoPublishChallenges) {
      publishedChallenges = await publishTodayChallenges(
        prisma,
        dateKey,
        editorial.challenges.saved.map((entry) => entry.id),
      );
      nextSteps.push("Desafios de hoje publicados em /jogar.");
    } else {
      nextSteps.push("Revise e publique os desafios em /admin/challenges.");
    }
  } else if (editorial.challenges.status === "no-candidate") {
    nextSteps.push("Desafios: nada novo gerado (ja existem para hoje).");
  }

  if (editorial.translation.status === "draft-saved") {
    const post = editorial.translation.post;
    xQueueEntries.push(
      buildDraftTranslationTweet({
        dateKey,
        slug: post.slug,
        title: post.title,
        summary:
          editorial.translation.candidate.notes ||
          "Nova traducao da documentacao Arc em PT-BR.",
      }),
    );
    nextSteps.push(`Revise a traducao em /admin/posts/${post.slug}/edit e publique.`);
  } else if (editorial.translation.status === "no-candidate") {
    nextSteps.push("Traducao: nada novo gerado (fila esgotada ou rascunho recente).");
  }

  if (editorial.translation.status === "ready-for-agent") {
    nextSteps.push(
      "Traducao pronta para o agente Cursor. Peça: 'complete a traducao de hoje' no chat.",
    );
  }

  if (editorial.challenges.status === "ready-for-agent") {
    nextSteps.push(
      "Desafios prontos para o agente Cursor gerar no chat (tema: " +
        editorial.challenges.themeTitle +
        ").",
    );
  }

  if (editorial.translation.status === "error") {
    if (editorial.translation.code === "openai-not-configured") {
      nextSteps.push("Modo OpenAI ativo sem chave. Use EDITORIAL_PROVIDER=cursor-agent (padrao).");
    } else {
      nextSteps.push(`Traducao falhou: ${editorial.translation.message}`);
    }
  }

  if (editorial.challenges.status === "error") {
    if (editorial.challenges.code === "openai-not-configured") {
      nextSteps.push("Desafios: use cursor-agent ou configure OPENAI_API_KEY.");
    } else {
      nextSteps.push(`Desafios falharam: ${editorial.challenges.message}`);
    }
  }

  if (options?.dryRun) {
    return {
      generatedAt: new Date().toISOString(),
      dateKey,
      editorial,
      publishedChallenges,
      xQueue: xQueueEntries,
      xPosted: [],
      xSkipped: xQueueEntries.map((entry) => ({
        id: entry.id,
        reason: "dry-run",
      })),
      nextSteps,
    };
  }

  const queued = await queueDailyXPosts(xQueueEntries);

  if (queued.some((entry) => entry.kind === "translation")) {
    nextSteps.push(
      "Tweet de rascunho enfileirado. Apos publicar o post, rode npm run x:post-latest.",
    );
  }

  let xPosted: Array<{ id: string; xPostUrl: string | null }> = [];
  let xSkipped: Array<{ id: string; reason: string }> = [];

  if (postToX && queued.length > 0) {
    const xResult = await postQueuedXEntries({
      limit: options?.xPostLimit ?? 2,
      ids: queued.map((entry) => entry.id),
    });
    xPosted = xResult.xPosted;
    xSkipped = xResult.xSkipped;

    if (xPosted.length > 0) {
      nextSteps.push(`${xPosted.length} post(s) publicados no X.`);
    }

    if (xSkipped.some((entry) => entry.reason === "x-not-configured")) {
      nextSteps.push("Configure credenciais X no .env/Vercel ou poste com npm run x:post-next.");
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    dateKey,
    editorial,
    publishedChallenges,
    xQueue: queued,
    xPosted,
    xSkipped,
    nextSteps,
  };
}

export async function publishTranslationAndTweet(
  prisma: PrismaClient,
  slug: string,
) {
  const post = await prisma.post.update({
    where: { slug },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
    select: {
      slug: true,
      title: true,
      summary: true,
      kind: true,
    },
  });

  const tweet = buildTweetText(post);
  const queueEntry = {
    id: `post:${post.slug}`,
    text: tweet.text,
    kind: "translation" as const,
  };

  await queueDailyXPosts([queueEntry]);
  const xResult = await postQueuedXEntries({ limit: 1, ids: [queueEntry.id] });

  return {
    post,
    tweet,
    x: xResult,
  };
}

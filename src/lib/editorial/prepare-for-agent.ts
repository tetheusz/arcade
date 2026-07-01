import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { selectNextArcDocCandidate } from "@/lib/editorial/arc-docs-source";
import { selectChallengeTheme } from "@/lib/editorial/generate-challenges";
import { getEditorialModelLabel, getEditorialProvider } from "@/lib/editorial/provider";
import { fetchArcDocMarkdown } from "@/lib/editorial/translate-doc";
import { getDateKey, shiftDateKey } from "@/lib/utils";
import type { ChallengeCategory } from "@prisma/client";

const ALL_CATEGORIES: ChallengeCategory[] = ["WORD", "CONNECTION", "SECURITY"];

export type PendingEditorialJob = {
  generatedAt: string;
  dateKey: string;
  provider: ReturnType<typeof getEditorialProvider>;
  model: string;
  translation: {
    candidate: NonNullable<Awaited<ReturnType<typeof selectNextArcDocCandidate>>>;
    fetchedUrl: string;
    truncated: boolean;
    sourceMarkdown: string;
  } | null;
  challenges: {
    dateKey: string;
    theme: NonNullable<Awaited<ReturnType<typeof selectChallengeTheme>>>;
    missingCategories: ChallengeCategory[];
  } | null;
  agentInstructions: string[];
};

async function getUsedAutoThemeIds(prisma: PrismaClient) {
  const autoChallenges = await prisma.dailyChallenge.findMany({
    where: { sourceLabel: { in: ["auto-generated", "cursor-agent"] } },
    select: { hint: true },
  });

  return autoChallenges
    .map((challenge) => challenge.hint?.match(/^theme:([a-z0-9-]+)$/i)?.[1] ?? null)
    .filter(Boolean) as string[];
}

async function resolveChallengePlan(prisma: PrismaClient, dateKey: string) {
  const existing = await prisma.dailyChallenge.findMany({
    where: {
      dateKey,
      status: { in: ["DRAFT", "PUBLISHED"] },
    },
    select: { category: true },
  });

  const covered = new Set(existing.map((entry) => entry.category));
  const missingCategories = ALL_CATEGORIES.filter((category) => !covered.has(category));

  if (missingCategories.length === 0) {
    const tomorrow = shiftDateKey(dateKey, 1);
    const tomorrowExisting = await prisma.dailyChallenge.findMany({
      where: { dateKey: tomorrow, status: { in: ["DRAFT", "PUBLISHED"] } },
      select: { category: true },
    });
    const tomorrowCovered = new Set(tomorrowExisting.map((entry) => entry.category));
    const tomorrowMissing = ALL_CATEGORIES.filter((category) => !tomorrowCovered.has(category));

    if (tomorrowMissing.length === 0) {
      return null;
    }

    const theme = await selectChallengeTheme(await getUsedAutoThemeIds(prisma));

    if (!theme) {
      return null;
    }

    return { dateKey: tomorrow, theme, missingCategories: tomorrowMissing };
  }

  const theme = await selectChallengeTheme(await getUsedAutoThemeIds(prisma));

  if (!theme) {
    return null;
  }

  return { dateKey, theme, missingCategories };
}

export async function prepareEditorialForAgent(
  prisma: PrismaClient,
  options?: { forceSlug?: string; forceDateKey?: string },
): Promise<PendingEditorialJob> {
  const dateKey = options?.forceDateKey ?? getDateKey();
  const candidate = await selectNextArcDocCandidate(prisma, {
    forceSlug: options?.forceSlug,
  });

  let translation: PendingEditorialJob["translation"] = null;
  const agentInstructions: string[] = [];

  if (candidate) {
    const fetched = await fetchArcDocMarkdown(candidate.sourceUrl);
    translation = {
      candidate,
      fetchedUrl: fetched.fetchedUrl,
      truncated: fetched.truncated,
      sourceMarkdown: fetched.markdown,
    };

    agentInstructions.push(
      `Traduza para PT-BR tecnico o markdown em translation.sourceMarkdown.`,
      `Salve com slug ${candidate.slug}, kind TRANSLATION, status DRAFT.`,
      `Preserve codigo, links e nomes Arc/USDC/CCTP. Adicione ## Fonte oficial no final.`,
    );
  } else {
    agentInstructions.push("Nenhuma traducao pendente na fila.");
  }

  const challengePlan = await resolveChallengePlan(prisma, dateKey);
  let challenges: PendingEditorialJob["challenges"] = null;

  if (challengePlan) {
    challenges = challengePlan;
    agentInstructions.push(
      `Gere desafios ${challengePlan.missingCategories.join(", ")} para ${challengePlan.dateKey}.`,
      `Tema: ${challengePlan.theme.title} — ${challengePlan.theme.topic}.`,
      `WORD: resposta em ingles minuscula, uma palavra. CONNECTION: 3 grupos x 4 itens.`,
    );
  } else {
    agentInstructions.push("Desafios de hoje/amanha ja existem.");
  }

  const job: PendingEditorialJob = {
    generatedAt: new Date().toISOString(),
    dateKey,
    provider: getEditorialProvider(),
    model: getEditorialModelLabel(),
    translation,
    challenges,
    agentInstructions,
  };

  const pendingDir = path.join(process.cwd(), "data", "pending-editorial");
  await mkdir(pendingDir, { recursive: true });
  const jobPath = path.join(pendingDir, `daily-${dateKey}.json`);
  await writeFile(jobPath, `${JSON.stringify(job, null, 2)}\n`, "utf8");

  return job;
}

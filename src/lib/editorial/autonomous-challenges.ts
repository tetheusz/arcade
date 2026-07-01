import type { ChallengeCategory, ChallengeStatus, PrismaClient } from "@prisma/client";
import {
  generateDailyChallenges,
  selectChallengeTheme,
} from "@/lib/editorial/generate-challenges";
import { getEditorialModelLabel, getEditorialProvider } from "@/lib/editorial/provider";
import {
  saveAgentChallenges,
  type AgentChallengeInput,
} from "@/lib/editorial/save-agent-content";
import { getDateKey, shiftDateKey } from "@/lib/utils";

const RECENT_DRAFT_WINDOW_MS = 23 * 60 * 60 * 1000;
const ALL_CATEGORIES: ChallengeCategory[] = ["WORD", "CONNECTION", "SECURITY"];

export type AutonomousChallengeResult =
  | {
      status: "draft-saved";
      dateKey: string;
      themeId: string;
      model: string;
      saved: Array<{
        id: string;
        category: ChallengeCategory;
        title: string;
        status: ChallengeStatus;
      }>;
    }
  | {
      status: "ready-for-agent";
      dateKey: string;
      themeId: string;
      themeTitle: string;
      themeTopic: string;
      model: string;
      missingCategories: ChallengeCategory[];
      message: string;
    }
  | {
      status: "preview";
      dateKey: string;
      themeId: string;
      model: string;
      challenges: Array<{
        category: ChallengeCategory;
        title: string;
        answer: string;
      }>;
    }
  | {
      status: "no-candidate";
      message: string;
      dateKey?: string;
    }
  | {
      status: "error";
      code: string;
      message: string;
      dateKey?: string;
    };

async function getUsedAutoThemeIds(prisma: PrismaClient) {
  const autoChallenges = await prisma.dailyChallenge.findMany({
    where: {
      sourceLabel: { in: ["auto-generated", "cursor-agent"] },
    },
    select: {
      hint: true,
    },
  });

  return autoChallenges
    .map((challenge) => {
      const match = challenge.hint?.match(/^theme:([a-z0-9-]+)$/i);
      return match?.[1] ?? null;
    })
    .filter(Boolean) as string[];
}

async function resolveTargetDateKey(prisma: PrismaClient, forceDateKey?: string) {
  if (forceDateKey && /^\d{4}-\d{2}-\d{2}$/.test(forceDateKey)) {
    return forceDateKey;
  }

  const today = getDateKey();
  const todayCategories = await prisma.dailyChallenge.findMany({
    where: {
      dateKey: today,
      status: { in: ["DRAFT", "PUBLISHED"] },
    },
    select: { category: true },
  });

  const coveredToday = new Set(todayCategories.map((entry) => entry.category));
  const missingToday = ALL_CATEGORIES.filter((category) => !coveredToday.has(category));

  if (missingToday.length > 0) {
    return today;
  }

  return shiftDateKey(today, 1);
}

async function getMissingCategories(
  prisma: PrismaClient,
  dateKey: string,
  forceCategories?: ChallengeCategory[],
) {
  if (forceCategories?.length) {
    return forceCategories;
  }

  const existing = await prisma.dailyChallenge.findMany({
    where: {
      dateKey,
      status: { in: ["DRAFT", "PUBLISHED"] },
    },
    select: { category: true, sourceLabel: true, updatedAt: true },
  });

  const covered = new Set(existing.map((entry) => entry.category));
  const cutoff = Date.now() - RECENT_DRAFT_WINDOW_MS;
  const recentAutoDraft = existing.some(
    (entry) =>
      (entry.sourceLabel === "auto-generated" || entry.sourceLabel === "cursor-agent") &&
      entry.updatedAt.getTime() >= cutoff,
  );

  if (recentAutoDraft) {
    return [];
  }

  return ALL_CATEGORIES.filter((category) => !covered.has(category));
}

export async function runAutonomousChallengeGeneration(
  prisma: PrismaClient,
  options?: {
    dryRun?: boolean;
    forceDateKey?: string;
    forceCategories?: ChallengeCategory[];
    agentChallenges?: AgentChallengeInput[];
    publish?: boolean;
  },
): Promise<AutonomousChallengeResult> {
  const dateKey = await resolveTargetDateKey(prisma, options?.forceDateKey);
  const missingCategories = await getMissingCategories(
    prisma,
    dateKey,
    options?.forceCategories,
  );

  if (missingCategories.length === 0) {
    return {
      status: "no-candidate",
      message: "Ja existem desafios (ou rascunho recente) para a data alvo.",
      dateKey,
    };
  }

  const theme = await selectChallengeTheme(await getUsedAutoThemeIds(prisma));

  if (!theme) {
    return {
      status: "no-candidate",
      message: "Nenhum tema de desafio disponivel.",
      dateKey,
    };
  }

  const provider = getEditorialProvider();
  const model = getEditorialModelLabel();

  if (provider === "cursor-agent" && !options?.agentChallenges) {
    if (options?.dryRun) {
      return {
        status: "preview",
        dateKey,
        themeId: theme.id,
        model,
        challenges: missingCategories.map((category) => ({
          category,
          title: `[Cursor Agent] ${theme.title}`,
          answer: "pending",
        })),
      };
    }

    return {
      status: "ready-for-agent",
      dateKey,
      themeId: theme.id,
      themeTitle: theme.title,
      themeTopic: theme.topic,
      model,
      missingCategories,
      message:
        "Tema selecionado. O agente Cursor (Composer) deve gerar os desafios e salvar via save-agent-content.",
    };
  }

  try {
    if (provider === "cursor-agent" && options?.agentChallenges) {
      const saved = await saveAgentChallenges(
        prisma,
        dateKey,
        options.agentChallenges,
        { themeId: theme.id, publish: options.publish },
      );

      return {
        status: "draft-saved",
        dateKey,
        themeId: theme.id,
        model,
        saved: saved.map((entry) => ({
          id: entry.id,
          category: entry.category,
          title: entry.title,
          status: entry.status,
        })),
      };
    }

    const generated = await generateDailyChallenges({
      dateKey,
      theme,
      missingCategories,
    });

    if (options?.dryRun) {
      return {
        status: "preview",
        dateKey,
        themeId: theme.id,
        model: generated.model,
        challenges: generated.challenges.map((challenge) => ({
          category: challenge.category,
          title: challenge.title,
          answer: challenge.answer,
        })),
      };
    }

    const saved = [];

    for (const challenge of generated.challenges) {
      const records = await saveAgentChallenges(prisma, dateKey, [
        {
          category: challenge.category,
          title: challenge.title,
          teaser: challenge.teaser,
          prompt: challenge.prompt,
          instructions: challenge.instructions,
          answer: challenge.answer,
          explanation: challenge.explanation,
          hint: challenge.hint,
          difficulty: challenge.difficulty,
          basePoints: challenge.basePoints,
          payload: challenge.payload,
        },
      ], { themeId: theme.id, publish: false });

      for (const record of records) {
        await prisma.dailyChallenge.update({
          where: { id: record.id },
          data: { sourceLabel: "auto-generated" },
        });
        saved.push({
          id: record.id,
          category: record.category,
          title: record.title,
          status: "DRAFT" as const,
        });
      }
    }

    return {
      status: "draft-saved",
      dateKey,
      themeId: theme.id,
      model: generated.model,
      saved,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = message.startsWith("openai-not-configured")
      ? "openai-not-configured"
      : message.startsWith("openai-")
        ? "openai-error"
        : message.startsWith("challenge-")
          ? "validation-error"
          : "generation-failed";

    return {
      status: "error",
      code,
      message,
      dateKey,
    };
  }
}

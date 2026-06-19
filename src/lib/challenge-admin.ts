import { ChallengeCategory as PrismaChallengeCategory, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeAnswer } from "@/lib/utils";
import type {
  ChallengeAdminOverview,
  ChallengeAdminRecord,
} from "@/types/challenge-admin";
import type { ChallengeCategory } from "@/types/challenge";
import type { ParsedChallengeInput } from "@/lib/challenge-form";

const prismaCategoryMap: Record<ChallengeCategory, PrismaChallengeCategory> = {
  word: "WORD",
  connection: "CONNECTION",
  security: "SECURITY",
};

function mapCategory(category: PrismaChallengeCategory): ChallengeCategory {
  if (category === "CONNECTION") {
    return "connection";
  }

  if (category === "SECURITY") {
    return "security";
  }

  return "word";
}

function mapChallenge(challenge: {
  id: string;
  dateKey: string;
  category: PrismaChallengeCategory;
  title: string;
  teaser: string;
  prompt: string;
  instructions: string | null;
  answer: string;
  explanation: string | null;
  hint: string | null;
  difficulty: number;
  basePoints: number;
  sourceLabel: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  payload: unknown;
  createdAt: Date;
  updatedAt: Date;
}): ChallengeAdminRecord {
  return {
    id: challenge.id,
    dateKey: challenge.dateKey,
    category: mapCategory(challenge.category),
    title: challenge.title,
    teaser: challenge.teaser,
    prompt: challenge.prompt,
    instructions: challenge.instructions ?? "",
    answer: challenge.answer,
    explanation: challenge.explanation ?? "",
    hint: challenge.hint ?? "",
    difficulty: challenge.difficulty,
    basePoints: challenge.basePoints,
    sourceLabel: challenge.sourceLabel,
    status:
      challenge.status === "PUBLISHED"
        ? "published"
        : challenge.status === "ARCHIVED"
          ? "archived"
          : "draft",
    payload:
      challenge.payload && typeof challenge.payload === "object" && !Array.isArray(challenge.payload)
        ? (challenge.payload as Record<string, unknown>)
        : null,
    createdAt: challenge.createdAt.toISOString(),
    updatedAt: challenge.updatedAt.toISOString(),
  };
}

export async function getChallengeAdminOverview(): Promise<ChallengeAdminOverview> {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const [publishedToday, totalPublished, drafts] = await Promise.all([
    prisma.dailyChallenge.count({
      where: { dateKey: today, status: "PUBLISHED" },
    }),
    prisma.dailyChallenge.count({
      where: { status: "PUBLISHED" },
    }),
    prisma.dailyChallenge.count({
      where: { status: "DRAFT" },
    }),
  ]);

  return {
    publishedToday,
    totalPublished,
    drafts,
  };
}

export async function getAllChallengesForAdmin() {
  const challenges = await prisma.dailyChallenge.findMany({
    orderBy: [{ dateKey: "desc" }, { category: "asc" }, { updatedAt: "desc" }],
  });

  return challenges.map(mapChallenge);
}

export async function getChallengeById(id: string) {
  const challenge = await prisma.dailyChallenge.findUnique({
    where: { id },
  });

  return challenge ? mapChallenge(challenge) : null;
}

export async function saveChallenge(input: ParsedChallengeInput, currentId?: string) {
  const data = {
    dateKey: input.dateKey,
    category: prismaCategoryMap[input.category],
    title: input.title,
    teaser: input.teaser,
    prompt: input.prompt,
    instructions: input.instructions,
    answer: input.answer,
    answerNormalized: normalizeAnswer(input.answer),
    explanation: input.explanation,
    hint: input.hint,
    difficulty: input.difficulty,
    basePoints: input.basePoints,
    sourceLabel: input.sourceLabel,
    status:
      input.status === "published"
        ? "PUBLISHED"
        : input.status === "archived"
          ? "ARCHIVED"
          : "DRAFT",
    payload: (input.payload as Prisma.InputJsonValue | null) ?? undefined,
  } as const;

  const existingConflict = await prisma.dailyChallenge.findFirst({
    where: {
      dateKey: input.dateKey,
      category: prismaCategoryMap[input.category],
      ...(currentId
        ? {
            NOT: {
              id: currentId,
            },
          }
        : {}),
    },
    select: { id: true },
  });

  if (existingConflict) {
    throw new Error("Ja existe um desafio dessa categoria nessa data.");
  }

  const challenge = currentId
    ? await prisma.dailyChallenge.update({
        where: { id: currentId },
        data,
      })
    : await prisma.dailyChallenge.create({
        data,
      });

  return mapChallenge(challenge);
}

export async function deleteChallenge(id: string) {
  const attempts = await prisma.challengeAttempt.count({
    where: { challengeId: id },
  });

  if (attempts > 0) {
    throw new Error("Esse desafio ja recebeu tentativas. Arquive em vez de excluir.");
  }

  await prisma.dailyChallenge.delete({
    where: { id },
  });
}

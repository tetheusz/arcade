import type { ChallengeCategory, Prisma, PrismaClient } from "@prisma/client";
import type { ArcDocCandidate } from "@/lib/editorial/arc-docs-source";
import { normalizeAnswer } from "@/lib/utils";

export type AgentTranslationInput = {
  slug: string;
  title: string;
  summary: string;
  content: string;
  sourceTitle?: string;
  sourceUrl?: string;
  coverImageUrl?: string;
  tags?: string[];
  publish?: boolean;
};

export type AgentChallengeInput = {
  category: "WORD" | "CONNECTION" | "SECURITY";
  title: string;
  teaser: string;
  prompt: string;
  instructions: string;
  answer: string;
  explanation: string;
  hint: string;
  difficulty: number;
  basePoints: number;
  payload: Record<string, unknown>;
};

function guessCoverImage(candidateSlug: string, sourceUrl: string) {
  const key = `${candidateSlug} ${sourceUrl}`.toLowerCase();

  if (key.includes("deploy")) {
    return "/uploads/covers/deploy-on-arc-crop.png";
  }

  return "/uploads/covers/arc-docs-official.jpg";
}

function deriveTags(candidate: Pick<ArcDocCandidate, "title" | "notes" | "sourceUrl">) {
  const tags = ["arc", "pt-br", "traducao", "auto-traducao", "cursor-agent"];
  const bag = `${candidate.title} ${candidate.notes} ${candidate.sourceUrl}`.toLowerCase();

  const candidates: Array<[string, string]> = [
    ["stablecoin", "stablecoins"],
    ["usdc", "usdc"],
    ["deploy", "deploy"],
    ["bridge", "bridge"],
    ["contract", "contracts"],
    ["gas", "gas"],
    ["evm", "evm"],
    ["agent", "agents"],
  ];

  for (const [needle, tag] of candidates) {
    if (bag.includes(needle)) {
      tags.push(tag);
    }
  }

  return [...new Set(tags)].slice(0, 10);
}

export async function saveAgentTranslationDraft(
  prisma: PrismaClient,
  candidate: ArcDocCandidate,
  input: AgentTranslationInput,
) {
  const tags = input.tags?.length ? input.tags : deriveTags(candidate);
  const coverImageUrl =
    input.coverImageUrl ?? guessCoverImage(candidate.slug, candidate.sourceUrl);

  return prisma.post.upsert({
    where: { slug: input.slug },
    update: {
      title: input.title,
      summary: input.summary,
      content: input.content.trim(),
      kind: "TRANSLATION",
      coverImageUrl,
      sourceTitle: input.sourceTitle ?? candidate.sourceTitle,
      sourceUrl: input.sourceUrl ?? candidate.sourceUrl,
      tags: tags.join(","),
      status: input.publish ? "PUBLISHED" : "DRAFT",
      publishedAt: input.publish ? new Date() : null,
    },
    create: {
      slug: input.slug,
      title: input.title,
      summary: input.summary,
      content: input.content.trim(),
      kind: "TRANSLATION",
      coverImageUrl,
      sourceTitle: input.sourceTitle ?? candidate.sourceTitle,
      sourceUrl: input.sourceUrl ?? candidate.sourceUrl,
      tags: tags.join(","),
      status: input.publish ? "PUBLISHED" : "DRAFT",
      publishedAt: input.publish ? new Date() : null,
    },
    select: {
      slug: true,
      title: true,
      status: true,
      kind: true,
    },
  });
}

export async function saveAgentChallenges(
  prisma: PrismaClient,
  dateKey: string,
  challenges: AgentChallengeInput[],
  options?: { themeId?: string; publish?: boolean },
) {
  const status = options?.publish ? "PUBLISHED" : "DRAFT";
  const saved = [];

  for (const challenge of challenges) {
    const record = await prisma.dailyChallenge.upsert({
      where: {
        dateKey_category: {
          dateKey,
          category: challenge.category as ChallengeCategory,
        },
      },
      update: {
        title: challenge.title,
        teaser: challenge.teaser,
        prompt: challenge.prompt,
        instructions: challenge.instructions,
        answer: challenge.answer,
        answerNormalized: normalizeAnswer(challenge.answer),
        explanation: challenge.explanation,
        hint: options?.themeId ? `theme:${options.themeId}` : challenge.hint,
        difficulty: challenge.difficulty,
        basePoints: challenge.basePoints,
        sourceLabel: "cursor-agent",
        status,
        payload: challenge.payload as Prisma.InputJsonValue,
      },
      create: {
        dateKey,
        category: challenge.category as ChallengeCategory,
        title: challenge.title,
        teaser: challenge.teaser,
        prompt: challenge.prompt,
        instructions: challenge.instructions,
        answer: challenge.answer,
        answerNormalized: normalizeAnswer(challenge.answer),
        explanation: challenge.explanation,
        hint: options?.themeId ? `theme:${options.themeId}` : challenge.hint,
        difficulty: challenge.difficulty,
        basePoints: challenge.basePoints,
        sourceLabel: "cursor-agent",
        status,
        payload: challenge.payload as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        category: true,
        title: true,
        status: true,
      },
    });

    saved.push(record);
  }

  return saved;
}

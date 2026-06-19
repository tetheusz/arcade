import type { ChallengeCategory } from "@/types/challenge";

export type ChallengeStatus = "draft" | "published" | "archived";

export type ChallengeGroupInput = {
  label: string;
  description: string;
  items: string[];
};

export type ChallengeAdminRecord = {
  id: string;
  dateKey: string;
  category: ChallengeCategory;
  title: string;
  teaser: string;
  prompt: string;
  instructions: string;
  answer: string;
  explanation: string;
  hint: string;
  difficulty: number;
  basePoints: number;
  sourceLabel: string;
  status: ChallengeStatus;
  payload: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type ChallengeAdminOverview = {
  publishedToday: number;
  totalPublished: number;
  drafts: number;
};

export type ChallengeFormDefaults = {
  dateKey: string;
  category: ChallengeCategory;
  title: string;
  teaser: string;
  prompt: string;
  instructions: string;
  answer: string;
  explanation: string;
  hint: string;
  difficulty: number;
  basePoints: number;
  sourceLabel: string;
  status: ChallengeStatus;
  wordLength: number;
  maxAttempts: number;
  clue: string;
  maxSelection: number;
  maxMistakes: number;
  groupsText: string;
  snippet: string;
  tags: string;
};

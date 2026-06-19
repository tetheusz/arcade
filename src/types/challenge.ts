export type ChallengeCategory = "word" | "connection" | "security";

export type DailyChallenge = {
  id: string;
  dateKey: string;
  category: ChallengeCategory;
  title: string;
  teaser: string;
  prompt: string;
  instructions: string | null;
  explanation: string | null;
  hint: string | null;
  difficulty: number;
  basePoints: number;
  sourceLabel: string;
  payload: Record<string, unknown> | null;
  status: "draft" | "published" | "archived";
};

export type ChallengeProgress = {
  challengeId: string;
  attemptsCount: number;
  lastAnswer: string | null;
  isSolved: boolean;
  pointsAwarded: number;
  solvedAt: string | null;
};

export type ChallengeReveal = {
  word?: string;
  groups?: Array<{
    label: string;
    description?: string;
    items: string[];
  }>;
  explanation?: string | null;
};

export type DailyChallengeWithProgress = DailyChallenge & {
  progress: ChallengeProgress | null;
  reveal?: ChallengeReveal | null;
};

export type PlayerProfile = {
  userId: string;
  slug: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  bio: string | null;
  skills: string[];
  region: string | null;
  links: {
    twitter?: string;
    github?: string;
    website?: string;
    discord?: string;
  };
  totalPoints: number;
  reputationScore: number;
  currentStreak: number;
  longestStreak: number;
  solvedChallenges: number;
  lastActiveDateKey: string | null;
  createdAt: string;
};

export type LeaderboardEntry = {
  userId: string;
  slug: string;
  displayName: string;
  totalPoints: number;
  reputationScore: number;
  currentStreak: number;
  solvedChallenges: number;
  pointsInPeriod: number;
};

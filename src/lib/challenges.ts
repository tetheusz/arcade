import { ChallengeCategory as PrismaChallengeCategory, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getDateKey,
  normalizeAnswer,
  shiftDateKey,
  slugify,
} from "@/lib/utils";
import {
  parseProfileLinks,
  parseSkills,
  profileSlugBase,
  resolveAvatarUrl,
  resolveDisplayName,
} from "@/lib/profile-display";
import type {
  ChallengeCategory,
  ChallengeReveal,
  DailyChallengeWithProgress,
  LeaderboardEntry,
  PlayerProfile,
} from "@/types/challenge";

type WordRowState = {
  value: string;
  evaluation: Array<"correct" | "present" | "absent">;
};

type StoredWordState = {
  mode: "word";
  rows: WordRowState[];
};

type FoundConnectionGroup = {
  label: string;
  description?: string;
  items: string[];
};

type StoredConnectionState = {
  mode: "connection";
  foundGroups: FoundConnectionGroup[];
  mistakes: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseStoredWordState(value: string | null) {
  if (!value) {
    return { mode: "word", rows: [] } satisfies StoredWordState;
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (
      isRecord(parsed) &&
      parsed.mode === "word" &&
      Array.isArray(parsed.rows)
    ) {
      return {
        mode: "word",
        rows: parsed.rows.filter((row): row is WordRowState => {
          return (
            isRecord(row) &&
            typeof row.value === "string" &&
            Array.isArray(row.evaluation)
          );
        }),
      } satisfies StoredWordState;
    }
  } catch {
    return { mode: "word", rows: [] } satisfies StoredWordState;
  }

  return { mode: "word", rows: [] } satisfies StoredWordState;
}

function parseStoredConnectionState(value: string | null) {
  if (!value) {
    return { mode: "connection", foundGroups: [], mistakes: 0 } satisfies StoredConnectionState;
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (
      isRecord(parsed) &&
      parsed.mode === "connection" &&
      Array.isArray(parsed.foundGroups)
    ) {
      return {
        mode: "connection",
        foundGroups: parsed.foundGroups.filter((group): group is FoundConnectionGroup => {
          return (
            isRecord(group) &&
            typeof group.label === "string" &&
            Array.isArray(group.items)
          );
        }),
        mistakes: typeof parsed.mistakes === "number" ? parsed.mistakes : 0,
      } satisfies StoredConnectionState;
    }
  } catch {
    return { mode: "connection", foundGroups: [], mistakes: 0 } satisfies StoredConnectionState;
  }

  return { mode: "connection", foundGroups: [], mistakes: 0 } satisfies StoredConnectionState;
}

function evaluateWordGuess(answer: string, guess: string) {
  const answerChars = answer.split("");
  const guessChars = guess.split("");
  const evaluation: Array<"correct" | "present" | "absent"> = Array.from(
    { length: guessChars.length },
    () => "absent",
  );
  const remaining = new Map<string, number>();

  answerChars.forEach((char, index) => {
    if (guessChars[index] === char) {
      evaluation[index] = "correct";
      return;
    }

    remaining.set(char, (remaining.get(char) ?? 0) + 1);
  });

  guessChars.forEach((char, index) => {
    if (evaluation[index] === "correct") {
      return;
    }

    const count = remaining.get(char) ?? 0;

    if (count > 0) {
      evaluation[index] = "present";
      remaining.set(char, count - 1);
    }
  });

  return evaluation;
}

function extractConnectionGroups(payload: Record<string, unknown>) {
  const groups = Array.isArray(payload.groups) ? payload.groups : [];

  return groups.flatMap((group) => {
    if (!isRecord(group)) {
      return [];
    }

    return [
      {
        label: typeof group.label === "string" ? group.label : "Grupo",
        description:
          typeof group.description === "string" ? group.description : undefined,
        items: Array.isArray(group.items)
          ? group.items.filter((item): item is string => typeof item === "string")
          : [],
      },
    ];
  });
}

function computeChallengeReveal(
  challenge: {
    category: PrismaChallengeCategory;
    answer: string;
    explanation: string | null;
    payload: Prisma.JsonValue | null;
  },
  progress: {
    attemptsCount: number;
    isSolved: boolean;
    lastAnswer: string | null;
  } | null,
): ChallengeReveal | null {
  if (!progress || progress.isSolved) {
    return null;
  }

  const payload = isRecord(challenge.payload) ? challenge.payload : {};

  if (challenge.category === "WORD") {
    const maxAttempts =
      typeof payload.maxAttempts === "number" ? payload.maxAttempts : 6;

    if (progress.attemptsCount >= maxAttempts) {
      return {
        word: challenge.answer,
        explanation: challenge.explanation,
      };
    }

    return null;
  }

  if (challenge.category === "CONNECTION") {
    const maxMistakes =
      typeof payload.maxMistakes === "number" ? payload.maxMistakes : 4;
    const state = parseStoredConnectionState(progress.lastAnswer);

    if (state.mistakes >= maxMistakes) {
      return {
        groups: extractConnectionGroups(payload),
        explanation: challenge.explanation,
      };
    }
  }

  return null;
}

function mapChallengeWithProgress(
  challenge: {
    id: string;
    dateKey: string;
    category: PrismaChallengeCategory;
    title: string;
    teaser: string;
    prompt: string;
    instructions: string | null;
    explanation: string | null;
    hint: string | null;
    difficulty: number;
    basePoints: number;
    sourceLabel: string;
    payload: Prisma.JsonValue | null;
    status: string;
    answer: string;
    attempts: Array<{
      attemptsCount: number;
      lastAnswer: string | null;
      isSolved: boolean;
      pointsAwarded: number;
      solvedAt: Date | null;
    }>;
  },
) {
  const progress = challenge.attempts[0]
    ? {
        challengeId: challenge.id,
        attemptsCount: challenge.attempts[0].attemptsCount,
        lastAnswer: challenge.attempts[0].lastAnswer,
        isSolved: challenge.attempts[0].isSolved,
        pointsAwarded: challenge.attempts[0].pointsAwarded,
        solvedAt: challenge.attempts[0].solvedAt?.toISOString() ?? null,
      }
    : null;

  return {
    id: challenge.id,
    dateKey: challenge.dateKey,
    category: mapCategory(challenge.category),
    title: challenge.title,
    teaser: challenge.teaser,
    prompt: challenge.prompt,
    instructions: challenge.instructions,
    explanation: challenge.explanation,
    hint: challenge.hint,
    difficulty: challenge.difficulty,
    basePoints: challenge.basePoints,
    sourceLabel: challenge.sourceLabel,
    payload: sanitizePayload(challenge.category, challenge.payload),
    status:
      challenge.status === "PUBLISHED"
        ? "published"
        : challenge.status === "ARCHIVED"
          ? "archived"
          : "draft",
    progress,
    reveal: computeChallengeReveal(challenge, progress),
  } satisfies DailyChallengeWithProgress;
}

function sanitizePayload(category: PrismaChallengeCategory, rawPayload: Prisma.JsonValue | null) {
  if (!isRecord(rawPayload)) {
    return null;
  }

  if (category === "WORD") {
    return {
      mode: rawPayload.mode === "termo" ? "termo" : "word",
      wordLength:
        typeof rawPayload.wordLength === "number" ? rawPayload.wordLength : undefined,
      maxAttempts:
        typeof rawPayload.maxAttempts === "number" ? rawPayload.maxAttempts : undefined,
      clue: typeof rawPayload.clue === "string" ? rawPayload.clue : undefined,
      alphabet: Array.isArray(rawPayload.alphabet) ? rawPayload.alphabet : undefined,
    };
  }

  if (category === "CONNECTION") {
    const groups = Array.isArray(rawPayload.groups) ? rawPayload.groups : [];
    const publicItems = groups.flatMap((group) => {
      if (!isRecord(group) || !Array.isArray(group.items)) {
        return [];
      }

      return group.items.filter((item): item is string => typeof item === "string");
    });

    return {
      mode: rawPayload.mode === "conexo" ? "conexo" : "connection",
      items: publicItems,
      groupCount: groups.length,
      maxSelection:
        typeof rawPayload.maxSelection === "number" ? rawPayload.maxSelection : 4,
      maxMistakes:
        typeof rawPayload.maxMistakes === "number" ? rawPayload.maxMistakes : 4,
    };
  }

  if (category === "SECURITY") {
    return {
      snippet: typeof rawPayload.snippet === "string" ? rawPayload.snippet : undefined,
      tags: Array.isArray(rawPayload.tags) ? rawPayload.tags : undefined,
    };
  }

  return rawPayload;
}

const categoryMap: Record<PrismaChallengeCategory, ChallengeCategory> = {
  WORD: "word",
  CONNECTION: "connection",
  SECURITY: "security",
};

function mapCategory(category: PrismaChallengeCategory): ChallengeCategory {
  return categoryMap[category];
}

function mapProfile(profile: {
  userId: string;
  slug: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  skills?: string | null;
  region?: string | null;
  links?: string | null;
  totalPoints: number;
  reputationScore: number;
  currentStreak: number;
  longestStreak: number;
  solvedChallenges: number;
  lastActiveDateKey: string | null;
  createdAt: Date;
  user: { name: string; email: string; image?: string | null };
}): PlayerProfile {
  const displayName = resolveDisplayName({
    profileDisplayName: profile.displayName,
    userName: profile.user.name,
    slug: profile.slug,
  });

  return {
    userId: profile.userId,
    slug: profile.slug,
    displayName,
    email: profile.user.email,
    avatarUrl: resolveAvatarUrl({
      avatarUrl: profile.avatarUrl,
      userImage: profile.user.image,
      seed: profile.slug,
    }),
    bio: profile.bio ?? null,
    skills: parseSkills(profile.skills),
    region: profile.region ?? null,
    links: parseProfileLinks(profile.links),
    totalPoints: profile.totalPoints,
    reputationScore: profile.reputationScore,
    currentStreak: profile.currentStreak,
    longestStreak: profile.longestStreak,
    solvedChallenges: profile.solvedChallenges,
    lastActiveDateKey: profile.lastActiveDateKey,
    createdAt: profile.createdAt.toISOString(),
  };
}

async function createUniqueProfileSlug(
  baseValue: string,
  client: Pick<typeof prisma, "userProfile"> = prisma,
) {
  const base = slugify(baseValue) || "player";
  const taken = await client.userProfile.findUnique({
    where: { slug: base },
    select: { slug: true },
  });

  if (!taken) {
    return base;
  }

  let attempt = 2;
  while (attempt < 1000) {
    const next = `${base}-${attempt}`;
    const exists = await client.userProfile.findUnique({
      where: { slug: next },
      select: { slug: true },
    });

    if (!exists) {
      return next;
    }

    attempt += 1;
  }

  return `${base}-${Date.now().toString().slice(-6)}`;
}

export async function getOrCreatePlayerProfile(user: {
  id: string;
  name: string;
  email: string;
}) {
  const existing = await prisma.userProfile.findUnique({
    where: { userId: user.id },
    include: {
      user: {
        select: { name: true, email: true, image: true },
      },
    },
  });

  if (existing) {
    return mapProfile(existing);
  }

  const slug = await createUniqueProfileSlug(profileSlugBase(user.name, user.email));
  const created = await prisma.userProfile.create({
    data: {
      userId: user.id,
      slug,
    },
    include: {
      user: {
        select: { name: true, email: true, image: true },
      },
    },
  });

  await prisma.activityEvent.create({
    data: {
      userId: user.id,
      type: "USER_JOINED",
      dateKey: getDateKey(),
      metadata: {
        slug,
      },
    },
  });

  return mapProfile(created);
}

export async function getTodayChallenges(userId?: string) {
  const today = getDateKey();
  if (userId) {
    const challenges = await prisma.dailyChallenge.findMany({
      where: {
        dateKey: today,
        status: "PUBLISHED",
      },
      orderBy: [{ category: "asc" }],
      include: {
        attempts: {
          where: { userId },
          take: 1,
        },
      },
    });

    return challenges.map((challenge) =>
      mapChallengeWithProgress({ ...challenge, attempts: challenge.attempts }),
    ) satisfies DailyChallengeWithProgress[];
  }

  const challenges = await prisma.dailyChallenge.findMany({
    where: {
      dateKey: today,
      status: "PUBLISHED",
    },
    orderBy: [{ category: "asc" }],
  });

  return challenges.map((challenge) => ({
    id: challenge.id,
    dateKey: challenge.dateKey,
    category: mapCategory(challenge.category),
    title: challenge.title,
    teaser: challenge.teaser,
    prompt: challenge.prompt,
    instructions: challenge.instructions,
    explanation: challenge.explanation,
    hint: challenge.hint,
    difficulty: challenge.difficulty,
    basePoints: challenge.basePoints,
    sourceLabel: challenge.sourceLabel,
    payload: sanitizePayload(challenge.category, challenge.payload),
    status:
      challenge.status === "PUBLISHED"
        ? "published"
        : challenge.status === "ARCHIVED"
          ? "archived"
          : "draft",
    progress: null,
  })) satisfies DailyChallengeWithProgress[];
}

export async function getPlayerProfileByUserId(userId: string) {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    include: {
      user: {
        select: { name: true, email: true, image: true },
      },
    },
  });

  return profile ? mapProfile(profile) : null;
}

export async function getPlayerProfileBySlug(slug: string) {
  const profile = await prisma.userProfile.findUnique({
    where: { slug },
    include: {
      user: {
        select: { name: true, email: true, image: true },
      },
    },
  });

  return profile ? mapProfile(profile) : null;
}

export async function getRecentActivityForUser(userId: string, limit = 8) {
  return prisma.activityEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

async function getProfilesForUserIds(userIds: string[]) {
  const profiles = await prisma.userProfile.findMany({
    where: {
      userId: {
        in: userIds,
      },
    },
    include: {
      user: {
        select: { name: true, email: true, image: true },
      },
    },
  });

  return new Map(
    profiles.map((profile) => [
      profile.userId,
      {
        slug: profile.slug,
        displayName: resolveDisplayName({
          profileDisplayName: profile.displayName,
          userName: profile.user.name,
          slug: profile.slug,
        }),
        totalPoints: profile.totalPoints,
        reputationScore: profile.reputationScore,
        currentStreak: profile.currentStreak,
        solvedChallenges: profile.solvedChallenges,
      },
    ]),
  );
}

export async function getLeaderboard(
  period: "daily" | "weekly" | "all" = "weekly",
  limit = 20,
) {
  const boundedLimit = Math.min(Math.max(limit, 1), 20);

  if (period === "all") {
    const profiles = await prisma.userProfile.findMany({
      orderBy: [{ totalPoints: "desc" }, { reputationScore: "desc" }],
      take: boundedLimit,
      include: {
        user: {
          select: { name: true },
        },
      },
    });

    return profiles.map((profile) => ({
      userId: profile.userId,
      slug: profile.slug,
      displayName: resolveDisplayName({
        profileDisplayName: profile.displayName,
        userName: profile.user.name,
        slug: profile.slug,
      }),
      totalPoints: profile.totalPoints,
      reputationScore: profile.reputationScore,
      currentStreak: profile.currentStreak,
      solvedChallenges: profile.solvedChallenges,
      pointsInPeriod: profile.totalPoints,
    })) satisfies LeaderboardEntry[];
  }

  const today = getDateKey();
  const startDate = period === "daily" ? today : shiftDateKey(today, -6);
  const grouped = await prisma.activityEvent.groupBy({
    by: ["userId"],
    where: {
      type: "CHALLENGE_SOLVED",
      dateKey: {
        gte: startDate,
        lte: today,
      },
    },
    _sum: {
      points: true,
    },
    orderBy: {
      _sum: {
        points: "desc",
      },
    },
    take: boundedLimit,
  });

  const profiles = await getProfilesForUserIds(grouped.map((entry) => entry.userId));

  return grouped
    .map((entry) => {
      const profile = profiles.get(entry.userId);

      if (!profile) {
        return null;
      }

      return {
        userId: entry.userId,
        slug: profile.slug,
        displayName: profile.displayName,
        totalPoints: profile.totalPoints,
        reputationScore: profile.reputationScore,
        currentStreak: profile.currentStreak,
        solvedChallenges: profile.solvedChallenges,
        pointsInPeriod: entry._sum.points ?? 0,
      } satisfies LeaderboardEntry;
    })
    .filter(Boolean) as LeaderboardEntry[];
}

export async function getChallengeOverview() {
  const today = getDateKey();
  const [publishedToday, totalChallenges, solvedToday] = await Promise.all([
    prisma.dailyChallenge.count({
      where: { dateKey: today, status: "PUBLISHED" },
    }),
    prisma.dailyChallenge.count({
      where: { status: "PUBLISHED" },
    }),
    prisma.challengeAttempt.count({
      where: {
        challenge: {
          dateKey: today,
        },
        isSolved: true,
      },
    }),
  ]);

  return {
    publishedToday,
    totalChallenges,
    solvedToday,
  };
}

export async function submitChallengeAnswer(input: {
  user: { id: string; name: string; email: string };
  challengeId: string;
  answer?: string;
  selection?: string[];
}) {
  const today = getDateKey();

  return prisma.$transaction(async (tx) => {
    const challenge = await tx.dailyChallenge.findUnique({
      where: { id: input.challengeId },
    });

    if (!challenge || challenge.status !== "PUBLISHED") {
  throw new Error("Desafio não encontrado.");
    }

    if (challenge.dateKey !== today) {
  throw new Error("Esse desafio não está mais ativo hoje.");
    }

    const profile = await (async () => {
      const existing = await tx.userProfile.findUnique({
        where: { userId: input.user.id },
      });

      if (existing) {
        return existing;
      }

      const slug = await createUniqueProfileSlug(input.user.name || input.user.email, tx);

      return tx.userProfile.create({
        data: {
          userId: input.user.id,
          slug,
        },
      });
    })();

    const progress =
      (await tx.challengeAttempt.findUnique({
        where: {
          userId_challengeId: {
            userId: input.user.id,
            challengeId: challenge.id,
          },
        },
      })) ??
      (await tx.challengeAttempt.create({
        data: {
          userId: input.user.id,
          challengeId: challenge.id,
        },
      }));

    if (progress.isSolved) {
      return {
        status: "already-solved" as const,
        isCorrect: true,
      message: "Esse desafio já foi resolvido por você hoje.",
        pointsAwarded: progress.pointsAwarded,
      };
    }

    const completeSolvedChallenge = async (nextAttempts: number, lastAnswer: string, extra?: Record<string, unknown>) => {
      const previousDay = shiftDateKey(today, -1);
      const isFirstSolvedToday = profile.lastActiveDateKey !== today;
      const nextStreak = isFirstSolvedToday
        ? profile.lastActiveDateKey === previousDay
          ? profile.currentStreak + 1
          : 1
        : profile.currentStreak;
      const streakBonus = isFirstSolvedToday ? Math.min(nextStreak * 2, 14) : 0;
      const basePoints = challenge.basePoints * Math.max(challenge.difficulty, 1);
      const pointsAwarded = basePoints + streakBonus;
      const reputationIncrease = pointsAwarded + challenge.difficulty * 3;

      await tx.challengeAttempt.update({
        where: { id: progress.id },
        data: {
          attemptsCount: nextAttempts,
          lastAnswer,
          isSolved: true,
          solvedAt: new Date(),
          pointsAwarded,
        },
      });

      await tx.userProfile.update({
        where: { userId: input.user.id },
        data: {
          totalPoints: { increment: pointsAwarded },
          reputationScore: { increment: reputationIncrease },
          solvedChallenges: { increment: 1 },
          currentStreak: nextStreak,
          longestStreak:
            nextStreak > profile.longestStreak ? nextStreak : profile.longestStreak,
          lastActiveDateKey: today,
        },
      });

      await tx.activityEvent.create({
        data: {
          userId: input.user.id,
          type: "CHALLENGE_SOLVED",
          dateKey: today,
          points: pointsAwarded,
          referenceId: challenge.id,
          referenceKey: challenge.category,
          metadata: {
            category: challenge.category,
            difficulty: challenge.difficulty,
            attemptsCount: nextAttempts,
            streakBonus,
            ...extra,
          },
        },
      });

      return {
        pointsAwarded,
        nextStreak,
        streakBonus,
      };
    };

    if (challenge.category === "WORD") {
      const answer = String(input.answer ?? "").trim();
      const payload = isRecord(challenge.payload) ? challenge.payload : {};
      const wordLength =
        typeof payload.wordLength === "number"
          ? payload.wordLength
          : challenge.answer.length;
      const maxAttempts =
        typeof payload.maxAttempts === "number" ? payload.maxAttempts : 6;

      if (answer.length !== wordLength) {
        throw new Error(`Use uma palavra com ${wordLength} letras.`);
      }

      if (progress.attemptsCount >= maxAttempts) {
        return {
          status: "locked" as const,
          isCorrect: false,
          message: `Suas tentativas acabaram. A palavra era ${challenge.answer.toUpperCase()}.`,
          pointsAwarded: 0,
          revealedAnswer: challenge.answer,
          explanation: challenge.explanation,
        };
      }

      const normalized = normalizeAnswer(answer);
      const nextAttempts = progress.attemptsCount + 1;
      const state = parseStoredWordState(progress.lastAnswer);
      const evaluation = evaluateWordGuess(challenge.answerNormalized, normalized);
      const nextState = {
        mode: "word",
        rows: [...state.rows, { value: normalized, evaluation }],
      } satisfies StoredWordState;
      const serializedState = JSON.stringify(nextState);
      const isCorrect = normalized === challenge.answerNormalized;

      if (!isCorrect) {
        await tx.challengeAttempt.update({
          where: { id: progress.id },
          data: {
            attemptsCount: nextAttempts,
            lastAnswer: serializedState,
          },
        });

        await tx.activityEvent.create({
          data: {
            userId: input.user.id,
            type: "CHALLENGE_ATTEMPT",
            dateKey: today,
            referenceId: challenge.id,
            referenceKey: challenge.category,
            metadata: {
              attemptsCount: nextAttempts,
              category: challenge.category,
              mode: "word",
            },
          },
        });

        return {
          status: nextAttempts >= maxAttempts ? ("locked" as const) : ("incorrect" as const),
          isCorrect: false,
          message:
            nextAttempts >= maxAttempts
              ? `Fim das tentativas. A palavra era ${challenge.answer.toUpperCase()}.`
              : "Ainda não foi. Use o feedback das letras para ajustar a próxima.",
          pointsAwarded: 0,
          revealedAnswer: nextAttempts >= maxAttempts ? challenge.answer : undefined,
          explanation: nextAttempts >= maxAttempts ? challenge.explanation : undefined,
          attemptState: {
            mode: "word",
            rows: nextState.rows,
            wordLength,
            maxAttempts,
          },
        };
      }

      const reward = await completeSolvedChallenge(nextAttempts, serializedState, {
        mode: "word",
      });

      return {
        status: "correct" as const,
        isCorrect: true,
        message:
          reward.streakBonus > 0
            ? `Boa. Palavra certa e bônus de streak de ${reward.streakBonus} pontos.`
            : "Boa. Palavra correta.",
        pointsAwarded: reward.pointsAwarded,
        attemptState: {
          mode: "word",
          rows: nextState.rows,
          wordLength,
          maxAttempts,
        },
      };
    }

    if (challenge.category === "CONNECTION") {
      const payload = isRecord(challenge.payload) ? challenge.payload : {};
      const groups = extractConnectionGroups(payload);
      const maxSelection =
        typeof payload.maxSelection === "number" ? payload.maxSelection : 4;
      const maxMistakes =
        typeof payload.maxMistakes === "number" ? payload.maxMistakes : 4;
      const selection = (input.selection ?? []).map((item) => normalizeAnswer(item));

      if (selection.length !== maxSelection) {
        throw new Error(`Selecione exatamente ${maxSelection} itens.`);
      }

      const state = parseStoredConnectionState(progress.lastAnswer);
      const unresolvedGroups = groups.filter(
        (group) =>
          !state.foundGroups.some(
            (foundGroup) => normalizeAnswer(foundGroup.label) === normalizeAnswer(group.label),
          ),
      );
      const matchingGroup = unresolvedGroups.find((group) => {
        const groupItems = group.items.map((item) => normalizeAnswer(item)).sort();
        const pickedItems = [...selection].sort();
        return JSON.stringify(groupItems) === JSON.stringify(pickedItems);
      });
      const nextAttempts = progress.attemptsCount + 1;

      if (!matchingGroup) {
        const nextState = {
          mode: "connection",
          foundGroups: state.foundGroups,
          mistakes: state.mistakes + 1,
        } satisfies StoredConnectionState;

        await tx.challengeAttempt.update({
          where: { id: progress.id },
          data: {
            attemptsCount: nextAttempts,
            lastAnswer: JSON.stringify(nextState),
          },
        });

        await tx.activityEvent.create({
          data: {
            userId: input.user.id,
            type: "CHALLENGE_ATTEMPT",
            dateKey: today,
            referenceId: challenge.id,
            referenceKey: challenge.category,
            metadata: {
              attemptsCount: nextAttempts,
              category: challenge.category,
              mode: "connection",
            },
          },
        });

        return {
          status:
            nextState.mistakes >= maxMistakes ? ("locked" as const) : ("incorrect" as const),
          isCorrect: false,
          message:
            nextState.mistakes >= maxMistakes
              ? "Limite de erros atingido. Confira os grupos abaixo."
              : "Esse grupo ainda não fecha. Tente outra combinação.",
          pointsAwarded: 0,
          revealedGroups:
            nextState.mistakes >= maxMistakes ? groups : undefined,
          explanation:
            nextState.mistakes >= maxMistakes ? challenge.explanation : undefined,
          attemptState: {
            mode: "connection",
            foundGroups: nextState.foundGroups,
            mistakes: nextState.mistakes,
            maxMistakes,
            solvedCount: nextState.foundGroups.length,
            totalGroups: groups.length,
          },
        };
      }

      const nextFoundGroups = [
        ...state.foundGroups,
        {
          label: matchingGroup.label,
          description: matchingGroup.description,
          items: matchingGroup.items,
        },
      ];
      const nextState = {
        mode: "connection",
        foundGroups: nextFoundGroups,
        mistakes: state.mistakes,
      } satisfies StoredConnectionState;
      const serializedState = JSON.stringify(nextState);

      if (nextFoundGroups.length < groups.length) {
        await tx.challengeAttempt.update({
          where: { id: progress.id },
          data: {
            attemptsCount: nextAttempts,
            lastAnswer: serializedState,
          },
        });

        await tx.activityEvent.create({
          data: {
            userId: input.user.id,
            type: "CHALLENGE_ATTEMPT",
            dateKey: today,
            referenceId: challenge.id,
            referenceKey: challenge.category,
            metadata: {
              attemptsCount: nextAttempts,
              category: challenge.category,
              mode: "connection",
              groupFound: matchingGroup.label,
            },
          },
        });

        return {
          status: "group-found" as const,
          isCorrect: false,
          message: `Boa. Você encontrou o grupo ${matchingGroup.label}.`,
          pointsAwarded: 0,
          attemptState: {
            mode: "connection",
            foundGroups: nextFoundGroups,
            mistakes: state.mistakes,
            maxMistakes,
            solvedCount: nextFoundGroups.length,
            totalGroups: groups.length,
          },
        };
      }

      const reward = await completeSolvedChallenge(nextAttempts, serializedState, {
        mode: "connection",
      });

      return {
        status: "correct" as const,
        isCorrect: true,
        message:
          reward.streakBonus > 0
            ? `Tabuleiro fechado. Bônus de streak de ${reward.streakBonus} pontos incluído.`
            : "Tabuleiro fechado. Todas as conexões certas.",
        pointsAwarded: reward.pointsAwarded,
        attemptState: {
          mode: "connection",
          foundGroups: nextFoundGroups,
          mistakes: state.mistakes,
          maxMistakes,
          solvedCount: nextFoundGroups.length,
          totalGroups: groups.length,
        },
      };
    }

    const answer = String(input.answer ?? "").trim();

    if (answer.length < 2) {
      throw new Error("Resposta muito curta.");
    }

    const normalized = normalizeAnswer(answer);
    const nextAttempts = progress.attemptsCount + 1;
    const isCorrect = normalized === challenge.answerNormalized;

    if (!isCorrect) {
      await tx.challengeAttempt.update({
        where: { id: progress.id },
        data: {
          attemptsCount: nextAttempts,
          lastAnswer: answer,
        },
      });

      await tx.activityEvent.create({
        data: {
          userId: input.user.id,
          type: "CHALLENGE_ATTEMPT",
          dateKey: today,
          referenceId: challenge.id,
          referenceKey: challenge.category,
          metadata: {
            attemptsCount: nextAttempts,
            category: challenge.category,
            mode: "security",
          },
        },
      });

      return {
        status: "incorrect" as const,
        isCorrect: false,
        message: "Ainda não foi dessa vez. Ajuste a resposta e tente de novo.",
        pointsAwarded: 0,
      };
    }

    const reward = await completeSolvedChallenge(nextAttempts, answer, {
      mode: "security",
    });

    return {
      status: "correct" as const,
      isCorrect: true,
      message:
        reward.streakBonus > 0
          ? `Boa. Você acertou e ainda levou bônus de streak de ${reward.streakBonus} pontos.`
          : "Boa. Resposta correta.",
      pointsAwarded: reward.pointsAwarded,
    };
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}

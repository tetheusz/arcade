import { prisma } from "@/lib/prisma";
import type { ArchetypeClass, MissionDifficulty, MissionStatus } from "@prisma/client";
import type { MissionMilestoneInput } from "@/lib/bounties/milestones";

export async function getPublishedMissions(filters?: {
  category?: ArchetypeClass;
  difficulty?: MissionDifficulty;
  search?: string;
}) {
  return prisma.mission.findMany({
    where: {
      status: "PUBLISHED",
      ...(filters?.category ? { category: filters.category } : {}),
      ...(filters?.difficulty ? { difficulty: filters.difficulty } : {}),
      ...(filters?.search
        ? {
            OR: [
              { title: { contains: filters.search, mode: "insensitive" } },
              { description: { contains: filters.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      protocol: { select: { name: true, slug: true, logoUrl: true, isVerified: true } },
      _count: { select: { submissions: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getMissionByIdForPage(id: string) {
  return prisma.mission.findUnique({
    where: { id },
    include: {
      protocol: { select: { name: true, slug: true, logoUrl: true } },
      payouts: { select: { id: true, amount: true, status: true, txHash: true } },
      milestones: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

export async function getUserMilestoneClaimsForMission(missionId: string, userId: string) {
  return prisma.milestoneClaim.findMany({
    where: {
      userId,
      milestone: { missionId },
    },
    select: {
      id: true,
      milestoneId: true,
      status: true,
      evidence: true,
      reviewedAt: true,
    },
  });
}

export async function getMissionById(id: string) {
  return prisma.mission.findUnique({
    where: { id },
    include: {
      protocol: true,
      submissions: {
        include: { user: { select: { id: true, name: true, profile: { select: { slug: true } } } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      payouts: true,
    },
  });
}

export async function canUserApplyToMission(userId: string, missionId: string) {
  const [profile, mission, existing] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.mission.findUnique({ where: { id: missionId } }),
    prisma.submission.findFirst({ where: { userId, missionId } }),
  ]);

  if (!profile || !mission || mission.status !== "PUBLISHED") {
    return { allowed: false, reason: "Missão indisponível." };
  }

  if (existing) {
    return { allowed: false, reason: "Você já submeteu para esta missão." };
  }

  if (profile.reputationScore < mission.minReputation) {
    return {
      allowed: false,
      reason: `Reputação mínima: ${mission.minReputation} (você tem ${profile.reputationScore}).`,
    };
  }

  if (profile.currentStreak < mission.minStreak) {
    return {
      allowed: false,
      reason: `Streak mínimo: ${mission.minStreak} (você tem ${profile.currentStreak}).`,
    };
  }

  return { allowed: true, reason: null };
}

export async function getUserSubmissionsForDashboard(userId: string) {
  return prisma.submission.findMany({
    where: { userId },
    select: {
      id: true,
      status: true,
      rewardGranted: true,
      missionId: true,
      mission: {
        select: {
          title: true,
          category: true,
          protocol: { select: { name: true } },
        },
      },
      review: { select: { feedback: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getUserSubmissions(userId: string) {
  return prisma.submission.findMany({
    where: { userId },
    include: {
      mission: { include: { protocol: { select: { name: true, slug: true } } } },
      review: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPendingSubmissions() {
  return prisma.submission.findMany({
    where: { status: "PENDING" },
    include: {
      mission: { include: { protocol: true } },
      user: { select: { id: true, name: true, profile: { select: { slug: true, walletAddress: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getProtocols() {
  return prisma.protocol.findMany({
    where: { isVerified: true },
    include: { _count: { select: { missions: true } } },
    orderBy: { name: "asc" },
  });
}

export async function grantReputation(
  userId: string,
  amount: number,
  description: string,
  category?: string,
) {
  await prisma.$transaction([
    prisma.userProfile.update({
      where: { userId },
      data: {
        reputationScore: { increment: amount },
        xp: { increment: amount },
      },
    }),
    prisma.reputationEvent.create({
      data: { userId, amount, description, category },
    }),
    prisma.activityEvent.create({
      data: {
        userId,
        type: "BOUNTY_COMPLETED",
        dateKey: new Date().toISOString().slice(0, 10),
        points: amount,
        referenceKey: category,
      },
    }),
  ]);
}

export type CreateMissionInput = {
  title: string;
  description: string;
  requirements: string;
  category: ArchetypeClass;
  difficulty: MissionDifficulty;
  reputationReward: number;
  rewardUsdc?: string;
  minReputation?: number;
  minStreak?: number;
  deadline?: Date;
  protocolId: string;
  status?: MissionStatus;
  milestones?: MissionMilestoneInput[];
};

export type { MissionMilestoneInput } from "@/lib/bounties/milestones";

export type UpdateMissionInput = Partial<
  Omit<CreateMissionInput, "protocolId">
> & {
  protocolId?: string;
  milestones?: MissionMilestoneInput[];
};

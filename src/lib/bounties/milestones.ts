import { prisma } from "@/lib/prisma";
import { setupMissionEscrow } from "@/lib/bounties/escrow";

export type MissionMilestoneInput = {
  id?: string;
  title: string;
  description?: string;
  reputationReward: number;
  rewardUsdc?: string;
};

export function parseMilestonesJson(raw: string | null | undefined): MissionMilestoneInput[] {
  if (!raw?.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    const milestones: MissionMilestoneInput[] = [];

    for (const entry of parsed) {
      if (typeof entry !== "object" || entry === null) {
        continue;
      }

      const item = entry as Record<string, unknown>;
      const title = String(item.title ?? "").trim();

      if (!title) {
        continue;
      }

      const reputationReward = Number(item.reputationReward ?? 0);
      const rewardUsdcRaw = String(item.rewardUsdc ?? "").trim();

      milestones.push({
        ...(typeof item.id === "string" ? { id: item.id } : {}),
        title,
        description: String(item.description ?? "").trim() || undefined,
        reputationReward: Number.isFinite(reputationReward)
          ? Math.max(0, Math.min(10_000, Math.round(reputationReward)))
          : 0,
        rewardUsdc: rewardUsdcRaw || undefined,
      });
    }

    return milestones.slice(0, 12);
  } catch {
    return [];
  }
}

export function sumMilestoneRewards(milestones: MissionMilestoneInput[]) {
  const reputationReward = milestones.reduce(
    (total, milestone) => total + milestone.reputationReward,
    0,
  );

  const rewardUsdc = milestones.reduce((total, milestone) => {
    const amount = Number(milestone.rewardUsdc ?? 0);
    return Number.isFinite(amount) ? total + amount : total;
  }, 0);

  return {
    reputationReward,
    rewardUsdc: rewardUsdc > 0 ? rewardUsdc.toFixed(2) : null,
  };
}

export async function syncMissionMilestones(
  missionId: string,
  milestones: MissionMilestoneInput[],
) {
  const existing = await prisma.missionMilestone.findMany({
    where: { missionId },
    select: { id: true },
  });

  const keepIds = new Set(
    milestones.map((milestone) => milestone.id).filter(Boolean) as string[],
  );

  const toDelete = existing
    .map((entry) => entry.id)
    .filter((id) => !keepIds.has(id));

  if (toDelete.length > 0) {
    await prisma.missionMilestone.deleteMany({
      where: { id: { in: toDelete } },
    });
  }

  for (const [index, milestone] of milestones.entries()) {
    const data = {
      sortOrder: index,
      title: milestone.title,
      description: milestone.description ?? null,
      reputationReward: milestone.reputationReward,
      rewardUsdc: milestone.rewardUsdc ?? null,
    };

    if (milestone.id && keepIds.has(milestone.id)) {
      await prisma.missionMilestone.update({
        where: { id: milestone.id },
        data,
      });
    } else {
      await prisma.missionMilestone.create({
        data: {
          missionId,
          ...data,
        },
      });
    }
  }

  const totals = sumMilestoneRewards(milestones);

  await prisma.mission.update({
    where: { id: missionId },
    data: {
      ...(milestones.length > 0
        ? {
            reputationReward: totals.reputationReward,
            rewardUsdc: totals.rewardUsdc,
          }
        : {}),
    },
  });

  if (milestones.length > 0 && totals.rewardUsdc) {
    await setupMissionEscrow(missionId);
  }
}

export async function getPendingMilestoneClaims() {
  return prisma.milestoneClaim.findMany({
    where: { status: "PENDING" },
    include: {
      milestone: {
        include: {
          mission: {
            include: { protocol: { select: { name: true } } },
          },
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          profile: { select: { slug: true, walletAddress: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

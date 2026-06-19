import { prisma } from "@/lib/prisma";
import { mintSoulboundBadge } from "@/lib/onchain";

export async function awardBadgeByName(userId: string, badgeName: string) {
  const existing = await prisma.userBadge.findFirst({
    where: { userId, badge: { name: badgeName } },
  });

  if (existing) return existing;

  let badge = await prisma.badgeDefinition.findUnique({ where: { name: badgeName } });

  if (!badge) {
    badge = await prisma.badgeDefinition.create({
      data: {
        name: badgeName,
        description: `Badge: ${badgeName}`,
        icon: "🏅",
      },
    });
  }

  const userBadge = await prisma.userBadge.create({
    data: { userId, badgeId: badge.id },
  });

  const profile = await prisma.userProfile.findUnique({ where: { userId } });

  if (profile?.walletAddress) {
    await mintSoulboundBadge(userBadge.id, profile.walletAddress, badgeName);
  }

  return userBadge;
}

export async function checkAndAwardBadges(userId: string) {
  const [approved, profile] = await Promise.all([
    prisma.submission.findMany({
      where: { userId, status: "APPROVED" },
      include: { mission: true },
    }),
    prisma.userProfile.findUnique({ where: { userId } }),
  ]);

  const totalCount = approved.length;
  const reputation = profile?.reputationScore ?? 0;

  if (totalCount >= 1) await awardBadgeByName(userId, "Genesis Contributor");
  if (reputation >= 100) await awardBadgeByName(userId, "Reputation Pioneer");
  if (reputation >= 500) await awardBadgeByName(userId, "Arc Elite");

  const categoryCounts = approved.reduce<Record<string, number>>((acc, sub) => {
    const cat = sub.mission.category;
    acc[cat] = (acc[cat] ?? 0) + 1;
    return acc;
  }, {});

  if ((categoryCounts.DEVELOPER ?? 0) >= 1) await awardBadgeByName(userId, "Junior Developer");
  if ((categoryCounts.DEVELOPER ?? 0) >= 5) await awardBadgeByName(userId, "Senior Architect");
  if ((categoryCounts.SENTINEL ?? 0) >= 1) await awardBadgeByName(userId, "Bug Hunter");
  if ((categoryCounts.CREATOR ?? 0) >= 1) await awardBadgeByName(userId, "Content Creator");
  if ((categoryCounts.SCHOLAR ?? 0) >= 1) await awardBadgeByName(userId, "Active Researcher");
}

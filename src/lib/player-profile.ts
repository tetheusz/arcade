import { prisma } from "@/lib/prisma";
import {
  getOrCreatePlayerProfile,
  getPlayerProfileBySlug,
  getRecentActivityForUser,
} from "@/lib/challenges";
import { getWalletForUser } from "@/lib/circle/wallets";
import type { ArchetypeClass } from "@/lib/archetypes";
import type { PlayerProfile } from "@/types/challenge";

export type ProfileRecord = {
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  region: string | null;
  chosenArchetype: ArchetypeClass | null;
  xp: number;
  walletAddress: string | null;
};

function mapProfileRecord(
  record: {
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    region: string | null;
    chosenArchetype: ArchetypeClass | null;
    xp: number;
    walletAddress: string | null;
  } | null,
  profile: PlayerProfile,
): ProfileRecord {
  return {
    displayName: record?.displayName ?? null,
    avatarUrl: record?.avatarUrl ?? null,
    bio: record?.bio ?? null,
    region: record?.region ?? null,
    chosenArchetype: record?.chosenArchetype ?? null,
    xp: record?.xp ?? profile.reputationScore,
    walletAddress: record?.walletAddress ?? null,
  };
}

const profileRecordSelect = {
  displayName: true,
  avatarUrl: true,
  bio: true,
  region: true,
  chosenArchetype: true,
  xp: true,
  walletAddress: true,
} as const;

export async function getOwnerProfilePageData(
  userId: string,
  user: { id: string; name: string; email: string },
) {
  const profile = await getOrCreatePlayerProfile(user);

  const [activity, approvedBounties, wallet, siweWallet, record] = await Promise.all([
    getRecentActivityForUser(userId),
    prisma.submission.count({
      where: { userId, status: "APPROVED" },
    }),
    getWalletForUser(userId),
    prisma.walletAddress.findFirst({
      where: { userId, isPrimary: true },
      select: { address: true },
    }),
    prisma.userProfile.findUnique({
      where: { userId },
      select: profileRecordSelect,
    }),
  ]);

  return {
    profile,
    record: mapProfileRecord(record, profile),
    activity,
    approvedBounties,
    wallet,
    siweWallet,
  };
}

export async function getPublicPlayerPageData(slug: string) {
  const profile = await getPlayerProfileBySlug(slug);

  if (!profile) {
    return null;
  }

  const [activity, meta, badges, approvedBounties, siweWallet] = await Promise.all([
    getRecentActivityForUser(profile.userId, 10),
    prisma.userProfile.findUnique({
      where: { userId: profile.userId },
      select: profileRecordSelect,
    }),
    prisma.userBadge.findMany({
      where: { userId: profile.userId },
      include: { badge: true },
      take: 6,
    }),
    prisma.submission.count({
      where: { userId: profile.userId, status: "APPROVED" },
    }),
    prisma.walletAddress.findFirst({
      where: { userId: profile.userId, isPrimary: true },
      select: { address: true },
    }),
  ]);

  return {
    profile,
    activity,
    badges,
    approvedBounties,
    siweWallet,
    meta: meta
      ? {
          chosenArchetype: meta.chosenArchetype as ArchetypeClass | null,
          xp: meta.xp,
          walletAddress: meta.walletAddress,
        }
      : null,
  };
}

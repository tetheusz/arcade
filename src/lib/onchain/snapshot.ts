import { prisma } from "@/lib/prisma";
import { keccak256, encodeAbiParameters, parseAbiParameters } from "viem";

function buildLeaf(params: {
  player: string;
  profileSlug: string;
  dateKey: string;
  points: number;
  streak: number;
  solvedChallenges: number;
}) {
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters("address, string, string, uint256, uint256, uint256"),
      [
        params.player as `0x${string}`,
        params.profileSlug,
        params.dateKey,
        BigInt(params.points),
        BigInt(params.streak),
        BigInt(params.solvedChallenges),
      ],
    ),
  );
}

function buildMerkleRoot(leaves: `0x${string}`[]): `0x${string}` {
  if (leaves.length === 0) return `0x${"0".repeat(64)}` as `0x${string}`;

  let level = [...leaves].sort();

  while (level.length > 1) {
    const next: `0x${string}`[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i]!;
      const right = level[i + 1] ?? left;
      const pair: readonly [`0x${string}`, `0x${string}`] =
        left < right ? [left, right] : [right, left];
      next.push(keccak256(encodeAbiParameters(parseAbiParameters("bytes32, bytes32"), pair)));
    }
    level = next;
  }

  return level[0]!;
}

export async function buildDailySnapshot(dateKey: string) {
  const events = await prisma.activityEvent.findMany({
    where: { dateKey },
    include: {
      user: {
        include: { profile: true },
      },
    },
  });

  const byUser = new Map<
    string,
    { points: number; streak: number; solved: number; slug: string; wallet: string }
  >();

  for (const event of events) {
    const wallet = event.user.profile?.walletAddress;
    if (!wallet) continue;

    const current = byUser.get(event.userId) ?? {
      points: 0,
      streak: event.user.profile?.currentStreak ?? 0,
      solved: event.user.profile?.solvedChallenges ?? 0,
      slug: event.user.profile?.slug ?? event.userId,
      wallet,
    };

    current.points += event.points;
    byUser.set(event.userId, current);
  }

  const leaves = [...byUser.values()].map((u) =>
    buildLeaf({
      player: u.wallet,
      profileSlug: u.slug,
      dateKey,
      points: u.points,
      streak: u.streak,
      solvedChallenges: u.solved,
    }),
  );

  const merkleRoot = buildMerkleRoot(leaves);
  const totalPoints = [...byUser.values()].reduce((sum, u) => sum + u.points, 0);

  const snapshot = await prisma.activitySnapshot.upsert({
    where: { dateKey },
    create: {
      dateKey,
      merkleRoot,
      participantCount: byUser.size,
      totalPoints,
    },
    update: {
      merkleRoot,
      participantCount: byUser.size,
      totalPoints,
    },
  });

  return { snapshot, leaves, participants: byUser.size };
}

export async function getSnapshotForDate(dateKey: string) {
  return prisma.activitySnapshot.findUnique({ where: { dateKey } });
}

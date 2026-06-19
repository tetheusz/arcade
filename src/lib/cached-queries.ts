import { unstable_cache } from "next/cache";
import { getLeaderboard as fetchLeaderboard } from "@/lib/challenges";
import {
  getPublishedMissions as fetchPublishedMissions,
  getProtocols as fetchProtocols,
} from "@/lib/bounties";
import { prisma } from "@/lib/prisma";
import { CACHE_REVALIDATE, CACHE_TAGS } from "@/lib/cache";

const getDailyLeaderboard = unstable_cache(
  () => fetchLeaderboard("daily"),
  ["leaderboard-daily"],
  {
    revalidate: CACHE_REVALIDATE.leaderboard,
    tags: [CACHE_TAGS.leaderboard],
  },
);

const getWeeklyLeaderboard = unstable_cache(
  () => fetchLeaderboard("weekly"),
  ["leaderboard-weekly"],
  {
    revalidate: CACHE_REVALIDATE.leaderboard,
    tags: [CACHE_TAGS.leaderboard],
  },
);

const getAllTimeLeaderboard = unstable_cache(
  () => fetchLeaderboard("all"),
  ["leaderboard-all"],
  {
    revalidate: CACHE_REVALIDATE.leaderboard,
    tags: [CACHE_TAGS.leaderboard],
  },
);

export function getCachedLeaderboard(period: "daily" | "weekly" | "all") {
  if (period === "daily") {
    return getDailyLeaderboard();
  }

  if (period === "weekly") {
    return getWeeklyLeaderboard();
  }

  return getAllTimeLeaderboard();
}

export const getCachedPublishedMissions = unstable_cache(
  () => fetchPublishedMissions(),
  ["published-missions"],
  {
    revalidate: CACHE_REVALIDATE.missions,
    tags: [CACHE_TAGS.missions],
  },
);

export const getCachedProtocols = unstable_cache(
  () => fetchProtocols(),
  ["protocols-list"],
  {
    revalidate: CACHE_REVALIDATE.protocols,
    tags: [CACHE_TAGS.protocols],
  },
);

async function fetchProtocolBySlug(slug: string) {
  return prisma.protocol.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      website: true,
      missions: {
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          description: true,
          rewardUsdc: true,
          reputationReward: true,
        },
      },
    },
  });
}

export function getCachedProtocolBySlug(slug: string) {
  return unstable_cache(
    () => fetchProtocolBySlug(slug),
    ["protocol", slug],
    {
      revalidate: CACHE_REVALIDATE.protocols,
      tags: [CACHE_TAGS.protocols, `protocol:${slug}`],
    },
  )();
}

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CACHE_REVALIDATE, CACHE_TAGS } from "@/lib/cache";

async function fetchHomeStats() {
  const [posts, bounties, protocols, players] = await Promise.all([
    prisma.post.count({ where: { status: "PUBLISHED" } }),
    prisma.mission.count({ where: { status: "PUBLISHED" } }),
    prisma.protocol.count(),
    prisma.userProfile.count(),
  ]);

  return { posts, bounties, protocols, players };
}

export const getHomeStats = unstable_cache(fetchHomeStats, ["home-stats"], {
  revalidate: CACHE_REVALIDATE.homeStats,
  tags: [CACHE_TAGS.homeStats],
});

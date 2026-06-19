import type { PrismaClient } from "@prisma/client";
import { runAutonomousChallengeGeneration } from "@/lib/editorial/autonomous-challenges";
import { runAutonomousTranslation } from "@/lib/editorial/autonomous-translate";

export async function runEditorialCycle(
  prisma: PrismaClient,
  options?: {
    dryRun?: boolean;
    forceSlug?: string;
    forceDateKey?: string;
  },
) {
  const [translation, challenges] = await Promise.all([
    runAutonomousTranslation(prisma, {
      dryRun: options?.dryRun,
      forceSlug: options?.forceSlug,
    }),
    runAutonomousChallengeGeneration(prisma, {
      dryRun: options?.dryRun,
      forceDateKey: options?.forceDateKey,
    }),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    translation,
    challenges,
  };
}

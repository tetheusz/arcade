import type { PrismaClient } from "@prisma/client";
import { runAutonomousChallengeGeneration } from "@/lib/editorial/autonomous-challenges";
import { runAutonomousTranslation } from "@/lib/editorial/autonomous-translate";
import type { AgentChallengeInput, AgentTranslationInput } from "@/lib/editorial/save-agent-content";

export async function runEditorialCycle(
  prisma: PrismaClient,
  options?: {
    dryRun?: boolean;
    forceSlug?: string;
    forceDateKey?: string;
    agentTranslation?: AgentTranslationInput;
    agentChallenges?: AgentChallengeInput[];
    publishChallenges?: boolean;
  },
) {
  const [translation, challenges] = await Promise.all([
    runAutonomousTranslation(prisma, {
      dryRun: options?.dryRun,
      forceSlug: options?.forceSlug,
      agentTranslation: options?.agentTranslation,
    }),
    runAutonomousChallengeGeneration(prisma, {
      dryRun: options?.dryRun,
      forceDateKey: options?.forceDateKey,
      agentChallenges: options?.agentChallenges,
      publish: options?.publishChallenges,
    }),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    translation,
    challenges,
  };
}

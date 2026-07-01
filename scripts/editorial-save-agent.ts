import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { runAutonomousChallengeGeneration } from "../src/lib/editorial/autonomous-challenges";
import { runAutonomousTranslation } from "../src/lib/editorial/autonomous-translate";
import type {
  AgentChallengeInput,
  AgentTranslationInput,
} from "../src/lib/editorial/save-agent-content";

const prisma = new PrismaClient();

function readOption(prefix: string) {
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const inputPath = readOption("--file=");

  if (!inputPath) {
    console.error("Use --file=data/pending-editorial/saved-today.json");
    process.exit(1);
  }

  const raw = await readFile(path.resolve(inputPath), "utf8");
  const payload = JSON.parse(raw) as {
    translation?: AgentTranslationInput & { candidateSlug?: string };
    challenges?: AgentChallengeInput[];
    dateKey?: string;
    themeId?: string;
    publishChallenges?: boolean;
  };

  const results: Record<string, unknown> = {};

  if (payload.translation) {
    results.translation = await runAutonomousTranslation(prisma, {
      forceSlug: payload.translation.slug,
      agentTranslation: payload.translation,
    });
  }

  if (payload.challenges?.length) {
    results.challenges = await runAutonomousChallengeGeneration(prisma, {
      forceDateKey: payload.dateKey,
      agentChallenges: payload.challenges,
      publish: payload.publishChallenges ?? true,
    });
  }

  console.log(JSON.stringify(results, null, 2));
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

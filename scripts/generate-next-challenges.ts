import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { runAutonomousChallengeGeneration } from "../src/lib/editorial/autonomous-challenges";

const prisma = new PrismaClient();

function readFlag(flag: string) {
  return process.argv.includes(flag);
}

function readOption(prefix: string) {
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const result = await runAutonomousChallengeGeneration(prisma, {
    dryRun: readFlag("--dry-run"),
    forceDateKey: readOption("--date="),
  });

  console.log(JSON.stringify(result, null, 2));
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

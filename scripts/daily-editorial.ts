import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { runDailyEditorialChat } from "../src/lib/editorial/daily-chat-run";

const prisma = new PrismaClient();

function readFlag(flag: string) {
  return process.argv.includes(flag);
}

async function main() {
  const result = await runDailyEditorialChat(prisma, {
    dryRun: readFlag("--dry-run"),
    autoPublishChallenges: !readFlag("--keep-challenge-drafts"),
    postToX: !readFlag("--skip-x"),
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

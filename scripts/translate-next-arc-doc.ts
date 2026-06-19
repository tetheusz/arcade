import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { runAutonomousTranslation } from "../src/lib/editorial/autonomous-translate";

const prisma = new PrismaClient();

function readFlag(flag: string) {
  return process.argv.includes(flag);
}

function readOption(prefix: string) {
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const dryRun = readFlag("--dry-run");
  const forceSlug = readOption("--slug=");

  const result = await runAutonomousTranslation(prisma, {
    dryRun,
    forceSlug,
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

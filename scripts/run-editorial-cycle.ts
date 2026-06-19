import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { runEditorialCycle } from "../src/lib/editorial/run-editorial-cycle";

const prisma = new PrismaClient();

function readFlag(flag: string) {
  return process.argv.includes(flag);
}

function readOption(prefix: string) {
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const result = await runEditorialCycle(prisma, {
    dryRun: readFlag("--dry-run"),
    forceSlug: readOption("--slug="),
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

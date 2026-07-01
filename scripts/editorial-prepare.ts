import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { prepareEditorialForAgent } from "../src/lib/editorial/prepare-for-agent";

const prisma = new PrismaClient();

function readOption(prefix: string) {
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const dateKey = readOption("--date=");
  const forceSlug = readOption("--slug=");
  const fromFile = readOption("--from=");

  if (fromFile) {
    const raw = await readFile(path.resolve(fromFile), "utf8");
    console.log(raw);
    return;
  }

  const job = await prepareEditorialForAgent(prisma, {
    forceDateKey: dateKey,
    forceSlug,
  });

  console.log(JSON.stringify(job, null, 2));
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

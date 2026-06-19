import { PrismaClient } from "@prisma/client";
import { getNextEditorialSelection } from "./lib/editorial-queue";

const prisma = new PrismaClient();

async function main() {
  const payload = await getNextEditorialSelection(prisma);
  console.log(JSON.stringify(payload, null, 2));
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

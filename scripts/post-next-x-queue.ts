import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createXPost, getXCurrentUser, isXConfigured } from "../src/lib/x-client";

type QueueEntry = {
  id: string;
  text: string;
};

type QueueLogEntry = {
  id: string;
  text: string;
  xPostId: string;
  xPostUrl: string | null;
  postedAt: string;
};

const queuePath = path.join(process.cwd(), "data", "x-content-queue.json");
const logPath = path.join(process.cwd(), "data", "x-queue-log.json");

async function readJsonFile<T>(filePath: string, fallback: T) {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath: string, data: unknown) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const queue = await readJsonFile<QueueEntry[]>(queuePath, []);
  const log = await readJsonFile<QueueLogEntry[]>(logPath, []);
  const postedIds = new Set(log.map((entry) => entry.id));
  const nextEntry = queue.find((entry) => !postedIds.has(entry.id)) ?? null;

  if (!nextEntry) {
    console.log(
      JSON.stringify(
        {
          status: "empty",
          message: "A fila de posts do X já foi totalmente consumida.",
        },
        null,
        2,
      ),
    );
    return;
  }

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          status: "ready",
          nextEntry,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (!isXConfigured()) {
    console.log(
      JSON.stringify(
        {
          status: "not-configured",
          nextEntry,
          message:
            "As credenciais do X ainda não estão configuradas no ambiente.",
        },
        null,
        2,
      ),
    );
    return;
  }

  const user = await getXCurrentUser();
  const created = await createXPost(nextEntry.text);
  const xPostUrl = user.username
    ? `https://x.com/${user.username}/status/${created.id}`
    : null;

  log.unshift({
    id: nextEntry.id,
    text: nextEntry.text,
    xPostId: created.id,
    xPostUrl,
    postedAt: new Date().toISOString(),
  });

  await writeJsonFile(logPath, log);

  console.log(
    JSON.stringify(
      {
        status: "posted",
        nextEntry,
        xPostId: created.id,
        xPostUrl,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("CreditsDepleted")) {
    console.log(
      JSON.stringify(
        {
          status: "blocked",
          reason: "credits-depleted",
          message:
            "A conta do X autenticou corretamente, mas a API recusou a postagem porque os créditos do plano estão esgotados.",
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }

  console.error(error);
  process.exit(1);
});

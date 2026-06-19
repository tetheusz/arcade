import "dotenv/config";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright-core";

export type XQueueEntry = {
  id: string;
  text: string;
};

export type XQueueLogEntry = {
  id: string;
  text: string;
  postedAt: string;
  mode: "web";
};

const queuePath = path.join(process.cwd(), "data", "x-content-queue.json");
const logPath = path.join(process.cwd(), "data", "x-queue-log.json");

export async function readJsonFile<T>(filePath: string, fallback: T) {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJsonFile(filePath: string, data: unknown) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function getNextQueuedXPost() {
  const queue = await readJsonFile<XQueueEntry[]>(queuePath, []);
  const log = await readJsonFile<XQueueLogEntry[]>(logPath, []);
  const postedIds = new Set(log.map((entry) => entry.id));
  const nextEntry = queue.find((entry) => !postedIds.has(entry.id)) ?? null;

  return {
    nextEntry,
    log,
    queue,
    queuePath,
    logPath,
  };
}

export function getChromeExecutablePath() {
  return (
    process.env.X_WEB_CHROME_PATH?.trim() ||
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  );
}

export function getXWebProfileDir() {
  return (
    process.env.X_WEB_PROFILE_DIR?.trim() ||
    path.join(process.cwd(), "data", "x-web-profile")
  );
}

export function getXWebDebugPort() {
  return process.env.X_WEB_DEBUG_PORT?.trim() || "9222";
}

export async function ensureXWebProfileDir() {
  const dir = getXWebProfileDir();
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function connectToXAutomationChrome(options?: {
  initialUrl?: string;
  launchIfNeeded?: boolean;
}) {
  const debugPort = getXWebDebugPort();
  const chromePath = getChromeExecutablePath();
  const userDataDir = await ensureXWebProfileDir();

  const tryConnect = async () =>
    chromium.connectOverCDP(`http://127.0.0.1:${debugPort}`);

  try {
    return await tryConnect();
  } catch {
    if (!options?.launchIfNeeded) {
      throw new Error(
        "O Chrome da automação não está disponível na porta de depuração esperada.",
      );
    }
  }

  spawn(
    chromePath,
    [
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${userDataDir}`,
      options?.initialUrl ?? "https://x.com/home",
    ],
    {
      detached: true,
      stdio: "ignore",
    },
  ).unref();

  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      return await tryConnect();
    } catch {
      await delay(1000);
    }
  }

  throw new Error(
    "Não consegui conectar ao Chrome da automação. Feche janelas antigas desse perfil e tente novamente.",
  );
}

import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { runEditorialCycle } from "@/lib/editorial/run-editorial-cycle";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const isAdmin = await isAdminAuthenticated();
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!isAdmin && (!cronSecret || authHeader !== `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const forceSlug =
    typeof (body as { forceSlug?: unknown }).forceSlug === "string"
      ? (body as { forceSlug: string }).forceSlug
      : undefined;
  const forceDateKey =
    typeof (body as { forceDateKey?: unknown }).forceDateKey === "string"
      ? (body as { forceDateKey: string }).forceDateKey
      : undefined;
  const dryRun = Boolean((body as { dryRun?: unknown }).dryRun);

  const result = await runEditorialCycle(prisma, {
    dryRun,
    forceSlug,
    forceDateKey,
  });

  const translationError =
    result.translation.status === "error" ? result.translation : null;
  const challengeError =
    result.challenges.status === "error" ? result.challenges : null;

  if (translationError?.code === "openai-not-configured" && challengeError?.code === "openai-not-configured") {
    return NextResponse.json(result, { status: 503 });
  }

  const hasHardError =
    (translationError && translationError.code !== "openai-not-configured") ||
    (challengeError && challengeError.code !== "openai-not-configured");

  return NextResponse.json(result, { status: hasHardError ? 500 : 200 });
}

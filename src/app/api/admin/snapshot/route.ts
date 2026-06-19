import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { buildDailySnapshot } from "@/lib/onchain/snapshot";
import { getDateKey } from "@/lib/utils";

export async function POST(request: Request) {
  const isAdmin = await isAdminAuthenticated();
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!isAdmin && (!cronSecret || authHeader !== `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const rawDateKey = (body as { dateKey?: string }).dateKey ?? getDateKey();
  const dateKey = /^\d{4}-\d{2}-\d{2}$/.test(rawDateKey) ? rawDateKey : getDateKey();

  const result = await buildDailySnapshot(dateKey);

  return NextResponse.json({
    dateKey,
    merkleRoot: result.snapshot.merkleRoot,
    participants: result.participants,
    totalPoints: result.snapshot.totalPoints,
  });
}

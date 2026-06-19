import { NextResponse } from "next/server";
import { getRouteSession } from "@/lib/auth";
import { getClientIp } from "@/lib/app-security";
import {
  getChallengeOverview,
  getLeaderboard,
  getOrCreatePlayerProfile,
  getRecentActivityForUser,
} from "@/lib/challenges";
import { createRateLimitResponse, enforceRateLimit } from "@/lib/rate-limit";

function parseLimit(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, 1), max);
}

export async function GET(request: Request) {
  const session = await getRouteSession();

  if (!session) {
    return NextResponse.json(
      { error: "Entre para exportar sua atividade." },
      { status: 401 },
    );
  }

  const rateLimit = enforceRateLimit({
    key: `activity-export:${session.user.id}:${getClientIp(request)}`,
    limit: 20,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return createRateLimitResponse(
      "Muitas exportações em sequência. Aguarde um pouco antes de tentar de novo.",
      rateLimit.retryAfterMs,
    );
  }

  const url = new URL(request.url);
  const leaderboardLimit = parseLimit(url.searchParams.get("leaderboardLimit"), 10, 20);
  const activityLimit = parseLimit(url.searchParams.get("activityLimit"), 12, 25);

  const [overview, weekly, profile, recentActivity] = await Promise.all([
    getChallengeOverview(),
    getLeaderboard("weekly", leaderboardLimit),
    getOrCreatePlayerProfile({
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    }),
    getRecentActivityForUser(session.user.id, activityLimit),
  ]);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    product: "Arcade",
    overview,
    leaderboard: weekly,
    player: profile,
    recentActivity,
  });
}

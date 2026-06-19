import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getClientIp } from "@/lib/app-security";
import { aiLabStatus } from "@/lib/ai-lab";
import { createRateLimitResponse, enforceRateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const rateLimit = enforceRateLimit({
    key: `ai-status:${getClientIp(request)}`,
    limit: 30,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return createRateLimitResponse(
      "Muitas consultas de status em pouco tempo.",
      rateLimit.retryAfterMs,
    );
  }

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    ...aiLabStatus,
  });
}

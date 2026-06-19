import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getClientIp } from "@/lib/app-security";
import { saveChallenge } from "@/lib/challenge-admin";
import { parseChallengeFormData } from "@/lib/challenge-form";
import { enforceRateLimit } from "@/lib/rate-limit";
import { ensureSameOrigin } from "@/lib/request-security";

export async function POST(request: Request) {
  const originError = ensureSameOrigin(request);

  if (originError) {
    return originError;
  }

  if (!(await isAdminAuthenticated())) {
    return NextResponse.redirect(
      new URL("/admin/login?error=Acesso%20negado", request.url),
      303,
    );
  }

  const rateLimit = enforceRateLimit({
    key: `admin-challenge-create:${getClientIp(request)}`,
    limit: 30,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.redirect(
      new URL(
        `/admin/challenges/new?error=${encodeURIComponent("Muitas criações de desafio em sequência. Aguarde antes de continuar.")}`,
        request.url,
      ),
      303,
    );
  }

  try {
    const formData = await request.formData();
    const input = parseChallengeFormData(formData);
    const challenge = await saveChallenge(input);

    return NextResponse.redirect(
      new URL(`/admin/challenges/${challenge.id}/edit`, request.url),
      303,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível criar o desafio.";

    return NextResponse.redirect(
      new URL(`/admin/challenges/new?error=${encodeURIComponent(message)}`, request.url),
      303,
    );
  }
}

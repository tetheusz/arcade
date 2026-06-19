import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getClientIp } from "@/lib/app-security";
import { saveChallenge } from "@/lib/challenge-admin";
import { parseChallengeFormData } from "@/lib/challenge-form";
import { enforceRateLimit } from "@/lib/rate-limit";
import { ensureSameOrigin } from "@/lib/request-security";

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: RouteProps) {
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

  const { id } = await params;

  const rateLimit = enforceRateLimit({
    key: `admin-challenge-update:${getClientIp(request)}`,
    limit: 40,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.redirect(
      new URL(
        `/admin/challenges/${id}/edit?error=${encodeURIComponent("Muitas alterações de desafio em sequência. Aguarde antes de tentar novamente.")}`,
        request.url,
      ),
      303,
    );
  }

  try {
    const formData = await request.formData();
    const input = parseChallengeFormData(formData);
    const challenge = await saveChallenge(input, id);

    return NextResponse.redirect(
      new URL(`/admin/challenges/${challenge.id}/edit`, request.url),
      303,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível atualizar o desafio.";

    return NextResponse.redirect(
      new URL(`/admin/challenges/${id}/edit?error=${encodeURIComponent(message)}`, request.url),
      303,
    );
  }
}

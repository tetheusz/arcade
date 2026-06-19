import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getClientIp } from "@/lib/app-security";
import { deleteChallenge } from "@/lib/challenge-admin";
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

  const rateLimit = enforceRateLimit({
    key: `admin-challenge-delete:${getClientIp(request)}`,
    limit: 20,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.redirect(
      new URL(
        `/admin/challenges?error=${encodeURIComponent("Muitas exclusões de desafio em sequência. Aguarde antes de continuar.")}`,
        request.url,
      ),
      303,
    );
  }

  const { id } = await params;

  try {
    await deleteChallenge(id);

    return NextResponse.redirect(new URL("/admin/challenges", request.url), 303);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível excluir o desafio.";

    return NextResponse.redirect(
      new URL(`/admin/challenges?error=${encodeURIComponent(message)}`, request.url),
      303,
    );
  }
}

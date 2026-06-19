import { NextResponse } from "next/server";
import { z } from "zod";
import { getRouteSession } from "@/lib/auth";
import { getClientIp } from "@/lib/app-security";
import { submitChallengeAnswer } from "@/lib/challenges";
import { createRateLimitResponse, enforceRateLimit } from "@/lib/rate-limit";
import { ensureSameOrigin } from "@/lib/request-security";

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

const challengeSubmissionSchema = z
  .object({
    answer: z
      .string()
      .trim()
      .min(1)
      .max(160)
      .optional(),
    selection: z
      .array(z.string().trim().min(1).max(64))
      .max(8)
      .optional(),
  })
  .refine((value) => Boolean(value.answer) || Boolean(value.selection?.length), {
    message: "Envie uma resposta válida antes de continuar.",
  });

export async function POST(request: Request, { params }: RouteProps) {
  const originError = ensureSameOrigin(request);

  if (originError) {
    return originError;
  }

  const session = await getRouteSession();

  if (!session) {
    return NextResponse.json(
      { error: "Você precisa entrar para responder o desafio." },
      { status: 401 },
    );
  }

  const rateLimit = enforceRateLimit({
    key: `challenge-submit:${session.user.id}:${getClientIp(request)}`,
    limit: 24,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return createRateLimitResponse(
      "Tentativas demais em pouco tempo. Aguarde alguns segundos para continuar.",
      rateLimit.retryAfterMs,
    );
  }

  const { id } = await params;

  try {
    const body = challengeSubmissionSchema.parse(await request.json());
    const result = await submitChallengeAnswer({
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      },
      challengeId: id,
      answer: body.answer,
      selection: Array.isArray(body.selection) ? body.selection : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível validar a resposta.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

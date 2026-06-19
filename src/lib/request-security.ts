import { NextResponse } from "next/server";
import {
  getTrustedOrigins,
  isProductionEnvironment,
  isTrustedOrigin,
} from "@/lib/app-security";

export function ensureSameOrigin(request: Request) {
  const method = request.method.toUpperCase();

  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return null;
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const candidateOrigin = origin ?? referer;

  if (!candidateOrigin) {
    if (!isProductionEnvironment()) {
      return null;
    }

    return NextResponse.json(
      {
        error:
          "Origem ausente em uma operação sensível. Atualize a página e tente novamente.",
      },
      { status: 403 },
    );
  }

  if (!isTrustedOrigin(candidateOrigin)) {
    return NextResponse.json(
      {
        error: `Origem não autorizada. Permitidas: ${getTrustedOrigins().join(", ")}`,
      },
      { status: 403 },
    );
  }

  return null;
}

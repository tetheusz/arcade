import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getClientIp } from "@/lib/app-security";
import { deletePost } from "@/lib/posts";
import { enforceRateLimit } from "@/lib/rate-limit";
import { ensureSameOrigin } from "@/lib/request-security";

type RouteProps = {
  params: Promise<{
    slug: string;
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
    key: `admin-post-delete:${getClientIp(request)}`,
    limit: 20,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.redirect(
      new URL(
        `/admin?error=${encodeURIComponent("Muitas exclusões em sequência. Aguarde antes de tentar de novo.")}`,
        request.url,
      ),
      303,
    );
  }

  const { slug } = await params;
  await deletePost(slug);

  return NextResponse.redirect(new URL("/admin", request.url), 303);
}

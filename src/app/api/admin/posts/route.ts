import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { hasUploadedFile, uploadCoverImage } from "@/lib/cover-storage";
import { parsePostFormData } from "@/lib/post-form";
import { savePost } from "@/lib/posts";
import { enforceRateLimit } from "@/lib/rate-limit";
import { ensureSameOrigin } from "@/lib/request-security";
import { getClientIp } from "@/lib/app-security";

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
    key: `admin-post-create:${getClientIp(request)}`,
    limit: 30,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.redirect(
      new URL(
        `/admin/new?error=${encodeURIComponent("Muitas operações em sequência. Aguarde um pouco antes de tentar de novo.")}`,
        request.url,
      ),
      303,
    );
  }

  try {
    const formData = await request.formData();
    const input = parsePostFormData(formData);
    const coverImageFile = formData.get("coverImageFile");

    if (hasUploadedFile(coverImageFile)) {
      input.coverImageUrl = await uploadCoverImage(coverImageFile);
    } else if (input.removeCoverImage) {
      input.coverImageUrl = "";
    }

    const post = await savePost(input);

    return NextResponse.redirect(
      new URL(`/admin/posts/${post.slug}/edit`, request.url),
      303,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível salvar o post.";

    return NextResponse.redirect(
      new URL(`/admin/new?error=${encodeURIComponent(message)}`, request.url),
      303,
    );
  }
}

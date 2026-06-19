import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import {
  hasUploadedFile,
  removeManagedCoverImage,
  uploadCoverImage,
} from "@/lib/cover-storage";
import { parsePostFormData } from "@/lib/post-form";
import { getPostBySlug, savePost } from "@/lib/posts";
import { enforceRateLimit } from "@/lib/rate-limit";
import { ensureSameOrigin } from "@/lib/request-security";
import { getClientIp } from "@/lib/app-security";

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

  const { slug: currentSlug } = await params;

  const rateLimit = enforceRateLimit({
    key: `admin-post-update:${getClientIp(request)}`,
    limit: 40,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.redirect(
      new URL(
        `/admin/posts/${currentSlug}/edit?error=${encodeURIComponent("Muitas alterações em sequência. Aguarde alguns instantes antes de continuar.")}`,
        request.url,
      ),
      303,
    );
  }

  try {
    const existingPost = await getPostBySlug(currentSlug);
    const formData = await request.formData();
    const input = parsePostFormData(formData);
    const coverImageFile = formData.get("coverImageFile");

    if (hasUploadedFile(coverImageFile)) {
      input.coverImageUrl = await uploadCoverImage(coverImageFile);
    } else if (input.removeCoverImage) {
      input.coverImageUrl = "";
    }

    const post = await savePost(input, currentSlug);

    if (
      existingPost?.coverImageUrl &&
      existingPost.coverImageUrl !== post.coverImageUrl
    ) {
      await removeManagedCoverImage(existingPost.coverImageUrl);
    }

    return NextResponse.redirect(
      new URL(`/admin/posts/${post.slug}/edit`, request.url),
      303,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível atualizar o post.";

    return NextResponse.redirect(
      new URL(
        `/admin/posts/${currentSlug}/edit?error=${encodeURIComponent(message)}`,
        request.url,
      ),
      303,
    );
  }
}

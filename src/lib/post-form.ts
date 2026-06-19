import type { PostKind, PostStatus } from "@/types/post";
import { sanitizeTagList, sanitizeTextInput } from "@/lib/sanitize";

export type ParsedPostInput = {
  title: string;
  slug: string;
  summary: string;
  content: string;
  kind: PostKind;
  coverImageUrl: string;
  removeCoverImage: boolean;
  sourceTitle: string;
  sourceUrl: string;
  tags: string[];
  status: PostStatus;
};

export function parsePostFormData(formData: FormData): ParsedPostInput {
  const title = sanitizeTextInput(formData.get("title"));
  const slug = sanitizeTextInput(formData.get("slug"));
  const summary = sanitizeTextInput(formData.get("summary"));
  const content = sanitizeTextInput(formData.get("content"));
  const kindValue = sanitizeTextInput(formData.get("kind")) || "article";
  const kind: PostKind = kindValue === "translation" ? "translation" : "article";
  const coverImageUrl = sanitizeTextInput(formData.get("coverImageUrl"));
  const removeCoverImage = sanitizeTextInput(formData.get("removeCoverImage")) === "on";
  const sourceTitle = sanitizeTextInput(formData.get("sourceTitle"));
  const sourceUrl = sanitizeTextInput(formData.get("sourceUrl"));
  const tags = sanitizeTagList(formData.get("tags"));
  const statusValue = sanitizeTextInput(formData.get("status")) || "draft";
  const status: PostStatus = statusValue === "published" ? "published" : "draft";

  if (title.length < 4) {
    throw new Error("Título muito curto.");
  }

  if (summary.length < 12) {
    throw new Error("Resumo muito curto.");
  }

  if (content.length < 40) {
    throw new Error("Conteúdo muito curto.");
  }

  if (coverImageUrl) {
    try {
      const url = new URL(coverImageUrl);

      if (!/^https?:$/.test(url.protocol)) {
        throw new Error("invalid");
      }
    } catch {
      throw new Error("A capa precisa usar uma URL válida.");
    }
  }

  if (kind === "translation" && sourceTitle.length < 4) {
    throw new Error("Traduções precisam informar o título original.");
  }

  if (kind === "translation") {
    try {
      const url = new URL(sourceUrl);

      if (!/^https?:$/.test(url.protocol)) {
        throw new Error("invalid");
      }
    } catch {
      throw new Error("Traduções precisam informar uma URL de origem válida.");
    }
  }

  return {
    title,
    slug,
    summary,
    content,
    kind,
    coverImageUrl,
    removeCoverImage,
    sourceTitle,
    sourceUrl,
    tags,
    status,
  };
}

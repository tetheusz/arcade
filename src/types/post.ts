export type PostStatus = "draft" | "published";
export type PostKind = "article" | "translation";

export type Post = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  kind: PostKind;
  coverImageUrl: string | null;
  sourceTitle: string | null;
  sourceUrl: string | null;
  status: PostStatus;
  tags: string[];
  displayOrder: number;
  featured: boolean;
  publishedAt: string | null;
  updatedAt: string;
};

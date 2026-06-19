import { unstable_cache, unstable_noStore as noStore, revalidateTag } from "next/cache";
import { notFound } from "next/navigation";
import { PostKind, PostStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Post } from "@/types/post";
import { slugify } from "@/lib/utils";
import { CACHE_REVALIDATE, CACHE_TAGS } from "@/lib/cache";

export type PostListItem = Omit<Post, "content"> & { content?: string };

type PostInput = {
  title: string;
  summary: string;
  content: string;
  kind: "article" | "translation";
  coverImageUrl: string;
  removeCoverImage?: boolean;
  sourceTitle: string;
  sourceUrl: string;
  tags: string[];
  status: "draft" | "published";
  slug?: string;
};

function mapPost(post: {
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
  tags: string;
  displayOrder: number;
  featured: boolean;
  publishedAt: Date | null;
  updatedAt: Date;
}) {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    summary: post.summary,
    content: post.content,
    kind: post.kind === "TRANSLATION" ? "translation" : "article",
    coverImageUrl: post.coverImageUrl,
    sourceTitle: post.sourceTitle,
    sourceUrl: post.sourceUrl,
    status: post.status === "PUBLISHED" ? "published" : "draft",
    tags: post.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    displayOrder: post.displayOrder,
    featured: post.featured,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    updatedAt: post.updatedAt.toISOString(),
  } satisfies Post;
}

function mapPostListItem(post: {
  id: string;
  slug: string;
  title: string;
  summary: string;
  kind: PostKind;
  coverImageUrl: string | null;
  sourceTitle: string | null;
  sourceUrl: string | null;
  status: PostStatus;
  tags: string;
  displayOrder: number;
  featured: boolean;
  publishedAt: Date | null;
  updatedAt: Date;
}): PostListItem {
  return mapPost({ ...post, content: "" });
}

const publishedPostsOrder = [
  { featured: "desc" as const },
  { displayOrder: "asc" as const },
  { publishedAt: "desc" as const },
  { updatedAt: "desc" as const },
];

async function fetchPublishedPostsList() {
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: publishedPostsOrder,
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      kind: true,
      coverImageUrl: true,
      sourceTitle: true,
      sourceUrl: true,
      status: true,
      tags: true,
      displayOrder: true,
      featured: true,
      publishedAt: true,
      updatedAt: true,
    },
  });

  return posts.map(mapPostListItem);
}

export const getPublishedPostsList = unstable_cache(
  fetchPublishedPostsList,
  ["published-posts-list"],
  {
    revalidate: CACHE_REVALIDATE.posts,
    tags: [CACHE_TAGS.posts],
  },
);

async function fetchHomeFeaturedTeaser() {
  const featured = await prisma.post.findFirst({
    where: { status: "PUBLISHED", featured: true },
    orderBy: publishedPostsOrder,
    select: { slug: true, title: true },
  });

  if (featured) {
    return featured;
  }

  return prisma.post.findFirst({
    where: { status: "PUBLISHED" },
    orderBy: publishedPostsOrder,
    select: { slug: true, title: true },
  });
}

export const getHomeFeaturedTeaser = unstable_cache(
  fetchHomeFeaturedTeaser,
  ["home-featured-teaser"],
  {
    revalidate: CACHE_REVALIDATE.posts,
    tags: [CACHE_TAGS.posts],
  },
);

export async function getRelatedPosts(currentSlug: string, limit = 3) {
  const posts = await getPublishedPostsList();
  return posts.filter((post) => post.slug !== currentSlug).slice(0, limit);
}

export async function readPosts() {
  noStore();
  const posts = await prisma.post.findMany({
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
  });

  return posts.map(mapPost);
}

export async function getPublishedPosts() {
  return getPublishedPostsList();
}

export async function getPublishedPostsForAdminOrder() {
  noStore();
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ displayOrder: "asc" }, { publishedAt: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      featured: true,
      displayOrder: true,
    },
  });

  return posts;
}

export async function reorderPublishedPosts(orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.post.update({
        where: { id },
        data: { displayOrder: index * 10 },
      }),
    ),
  );
}

export async function setFeaturedPost(postId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, status: true },
  });

  if (!post || post.status !== "PUBLISHED") {
    throw new Error("Post publicado não encontrado.");
  }

  await prisma.$transaction([
    prisma.post.updateMany({
      where: { featured: true },
      data: { featured: false },
    }),
    prisma.post.update({
      where: { id: postId },
      data: { featured: true },
    }),
  ]);
}

export async function getAllPosts() {
  return readPosts();
}

export async function getPostBySlug(slug: string) {
  noStore();
  const post = await prisma.post.findUnique({
    where: { slug },
  });

  return post ? mapPost(post) : null;
}

export async function getRequiredPost(slug: string) {
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return post;
}

export async function savePost(input: PostInput, currentSlug?: string) {
  const now = new Date();
  const baseSlug = slugify(input.slug || input.title);

  if (!baseSlug) {
    throw new Error("Slug invalido.");
  }

  const duplicatedPost = await prisma.post.findFirst({
    where: {
      slug: baseSlug,
      ...(currentSlug
        ? {
            NOT: {
              slug: currentSlug,
            },
          }
        : {}),
    },
    select: { id: true },
  });

  if (duplicatedPost) {
    throw new Error("Ja existe um post com esse slug.");
  }

  const normalizedTags = input.tags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8);

  const existingPost = currentSlug
    ? await prisma.post.findUnique({
        where: { slug: currentSlug },
      })
    : null;

  const nextStatus = input.status === "published" ? "PUBLISHED" : "DRAFT";
  const nextKind = input.kind === "translation" ? "TRANSLATION" : "ARTICLE";
  const publishedAt =
    nextStatus === "PUBLISHED" ? existingPost?.publishedAt ?? now : null;

  const savedPost = existingPost
    ? await prisma.post.update({
        where: { id: existingPost.id },
        data: {
          slug: baseSlug,
          title: input.title.trim(),
          summary: input.summary.trim(),
          content: input.content.trim(),
          kind: nextKind,
          coverImageUrl: input.coverImageUrl.trim() || null,
          sourceTitle: input.sourceTitle.trim() || null,
          sourceUrl: input.sourceUrl.trim() || null,
          status: nextStatus,
          tags: normalizedTags.join(","),
          publishedAt,
        },
      })
    : await prisma.post.create({
        data: {
          slug: baseSlug,
          title: input.title.trim(),
          summary: input.summary.trim(),
          content: input.content.trim(),
          kind: nextKind,
          coverImageUrl: input.coverImageUrl.trim() || null,
          sourceTitle: input.sourceTitle.trim() || null,
          sourceUrl: input.sourceUrl.trim() || null,
          status: nextStatus,
          tags: normalizedTags.join(","),
          publishedAt,
        },
      });

  revalidateTag(CACHE_TAGS.posts, "max");
  revalidateTag(CACHE_TAGS.homeStats, "max");

  return mapPost(savedPost);
}

export async function deletePost(slug: string) {
  await prisma.post.delete({
    where: { slug },
  });

  revalidateTag(CACHE_TAGS.posts, "max");
  revalidateTag(CACHE_TAGS.homeStats, "max");
}

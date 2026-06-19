import type { PrismaClient } from "@prisma/client";
import {
  selectNextArcDocCandidate,
  type ArcDocCandidate,
} from "@/lib/editorial/arc-docs-source";
import {
  fetchArcDocMarkdown,
  translateArcDocMarkdown,
} from "@/lib/editorial/translate-doc";

export type AutonomousTranslationResult =
  | {
      status: "draft-saved";
      candidate: ArcDocCandidate;
      post: {
        slug: string;
        title: string;
        status: "DRAFT";
        kind: "TRANSLATION";
      };
      fetchedUrl: string;
      truncated: boolean;
      model: string;
    }
  | {
      status: "preview";
      candidate: ArcDocCandidate;
      fetchedUrl: string;
      truncated: boolean;
      model: string;
      generated: {
        title: string;
        summary: string;
        contentPreview: string;
      };
    }
  | {
      status: "no-candidate";
      message: string;
    }
  | {
      status: "error";
      code: string;
      message: string;
      candidate?: ArcDocCandidate;
    };

function guessCoverImage(candidate: ArcDocCandidate) {
  const key = `${candidate.slug} ${candidate.sourceUrl}`.toLowerCase();

  if (key.includes("deploy")) {
    return "/uploads/covers/deploy-on-arc-crop.png";
  }

  return "/uploads/covers/arc-docs-official.jpg";
}

function deriveTags(candidate: ArcDocCandidate) {
  const tags = ["arc", "pt-br", "traducao", "auto-traducao"];
  const bag = `${candidate.title} ${candidate.notes} ${candidate.sourceUrl}`.toLowerCase();

  const candidates: Array<[string, string]> = [
    ["stablecoin", "stablecoins"],
    ["usdc", "usdc"],
    ["deploy", "deploy"],
    ["bridge", "bridge"],
    ["contract", "contracts"],
    ["gas", "gas"],
    ["evm", "evm"],
    ["agent", "agents"],
  ];

  for (const [needle, tag] of candidates) {
    if (bag.includes(needle)) {
      tags.push(tag);
    }
  }

  return [...new Set(tags)].slice(0, 10);
}

export async function runAutonomousTranslation(
  prisma: PrismaClient,
  options?: { dryRun?: boolean; forceSlug?: string },
): Promise<AutonomousTranslationResult> {
  const candidate = await selectNextArcDocCandidate(prisma, {
    forceSlug: options?.forceSlug,
  });

  if (!candidate) {
    return {
      status: "no-candidate",
      message: "Nao ha mais paginas do hub Arc pendentes de traducao.",
    };
  }

  try {
    const fetched = await fetchArcDocMarkdown(candidate.sourceUrl);
    const translated = await translateArcDocMarkdown({
      markdown: fetched.markdown,
      sourceUrl: candidate.sourceUrl,
      sourceTitle: candidate.sourceTitle,
    });

    if (options?.dryRun) {
      return {
        status: "preview",
        candidate,
        fetchedUrl: fetched.fetchedUrl,
        truncated: fetched.truncated,
        model: translated.model,
        generated: {
          title: translated.titlePt,
          summary: translated.summaryPt,
          contentPreview: translated.contentMd.slice(0, 1200),
        },
      };
    }

    const savedPost = await prisma.post.upsert({
      where: {
        slug: candidate.slug,
      },
      update: {
        title: translated.titlePt,
        summary: translated.summaryPt,
        content: translated.contentMd,
        kind: "TRANSLATION",
        coverImageUrl: guessCoverImage(candidate),
        sourceTitle: candidate.sourceTitle,
        sourceUrl: candidate.sourceUrl,
        tags: deriveTags(candidate).join(","),
        status: "DRAFT",
        publishedAt: null,
      },
      create: {
        slug: candidate.slug,
        title: translated.titlePt,
        summary: translated.summaryPt,
        content: translated.contentMd,
        kind: "TRANSLATION",
        coverImageUrl: guessCoverImage(candidate),
        sourceTitle: candidate.sourceTitle,
        sourceUrl: candidate.sourceUrl,
        tags: deriveTags(candidate).join(","),
        status: "DRAFT",
        publishedAt: null,
      },
      select: {
        slug: true,
        title: true,
        status: true,
        kind: true,
      },
    });

    return {
      status: "draft-saved",
      candidate,
      post: {
        slug: savedPost.slug,
        title: savedPost.title,
        status: "DRAFT",
        kind: "TRANSLATION",
      },
      fetchedUrl: fetched.fetchedUrl,
      truncated: fetched.truncated,
      model: translated.model,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = message.startsWith("openai-not-configured")
      ? "openai-not-configured"
      : message.startsWith("source-fetch")
        ? "fetch-failed"
        : message.startsWith("openai-")
          ? "openai-error"
          : "translation-failed";

    return {
      status: "error",
      code,
      message,
      candidate,
    };
  }
}

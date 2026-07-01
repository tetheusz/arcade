import type { PrismaClient } from "@prisma/client";
import {
  selectNextArcDocCandidate,
  type ArcDocCandidate,
} from "@/lib/editorial/arc-docs-source";
import { getEditorialModelLabel, getEditorialProvider } from "@/lib/editorial/provider";
import {
  saveAgentTranslationDraft,
  type AgentTranslationInput,
} from "@/lib/editorial/save-agent-content";
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
        status: "DRAFT" | "PUBLISHED";
        kind: "TRANSLATION";
      };
      fetchedUrl: string;
      truncated: boolean;
      model: string;
    }
  | {
      status: "ready-for-agent";
      candidate: ArcDocCandidate;
      fetchedUrl: string;
      truncated: boolean;
      model: string;
      sourceMarkdown: string;
      message: string;
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
  options?: {
    dryRun?: boolean;
    forceSlug?: string;
    agentTranslation?: AgentTranslationInput;
  },
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

  const provider = getEditorialProvider();
  const model = getEditorialModelLabel();

  try {
    const fetched = await fetchArcDocMarkdown(candidate.sourceUrl);

    if (provider === "cursor-agent" && !options?.agentTranslation) {
      if (options?.dryRun) {
        return {
          status: "preview",
          candidate,
          fetchedUrl: fetched.fetchedUrl,
          truncated: fetched.truncated,
          model,
          generated: {
            title: `[Cursor Agent] ${candidate.title}`,
            summary: candidate.notes,
            contentPreview: fetched.markdown.slice(0, 1200),
          },
        };
      }

      return {
        status: "ready-for-agent",
        candidate,
        fetchedUrl: fetched.fetchedUrl,
        truncated: fetched.truncated,
        model,
        sourceMarkdown: fetched.markdown,
        message:
          "Fonte baixada. O agente Cursor (Composer) deve traduzir e chamar save-agent-content.",
      };
    }

    const translated =
      provider === "cursor-agent" && options?.agentTranslation
        ? {
            titlePt: options.agentTranslation.title,
            summaryPt: options.agentTranslation.summary,
            contentMd: options.agentTranslation.content,
            model,
          }
        : await translateArcDocMarkdown({
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

    const savedPost =
      provider === "cursor-agent" && options?.agentTranslation
        ? await saveAgentTranslationDraft(prisma, candidate, options.agentTranslation)
        : await prisma.post.upsert({
            where: { slug: candidate.slug },
            update: {
              title: translated.titlePt,
              summary: translated.summaryPt,
              content: translated.contentMd,
              kind: "TRANSLATION",
              coverImageUrl: guessCoverImage(candidate),
              sourceTitle: candidate.sourceTitle,
              sourceUrl: candidate.sourceUrl,
              tags: [...deriveTags(candidate), "openai"].join(","),
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
              tags: [...deriveTags(candidate), "openai"].join(","),
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
        status: savedPost.status,
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

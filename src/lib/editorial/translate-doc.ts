import { normalizeArcDocUrl } from "@/lib/editorial/arc-docs-source";

const DEFAULT_MODEL = "gpt-4o-mini";
const MAX_SOURCE_CHARS = 48_000;

export type FetchedArcDoc = {
  markdown: string;
  fetchedUrl: string;
  truncated: boolean;
};

export type TranslatedArcDoc = {
  titlePt: string;
  summaryPt: string;
  contentMd: string;
  model: string;
};

function getTranslationModel() {
  return process.env.OPENAI_TRANSLATION_MODEL?.trim() || DEFAULT_MODEL;
}

function buildMarkdownCandidates(sourceUrl: string) {
  const normalized = normalizeArcDocUrl(sourceUrl);
  const withNetwork = normalized.replace(/docs\.arc\.io/i, "docs.arc.network");
  const withIo = normalized.replace(/docs\.arc\.network/i, "docs.arc.io");

  const bases = [normalized, withNetwork, withIo];
  const urls = new Set<string>();

  for (const base of bases) {
    urls.add(`${base}.md`);
    urls.add(base);
  }

  return [...urls];
}

export async function fetchArcDocMarkdown(sourceUrl: string): Promise<FetchedArcDoc> {
  const candidates = buildMarkdownCandidates(sourceUrl);
  let lastError = "source-fetch-failed";

  for (const url of candidates) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "ArcadeAutopublisher/1.0",
          Accept: "text/markdown,text/plain,*/*",
        },
      });

      if (!response.ok) {
        lastError = `source-fetch-${response.status}`;
        continue;
      }

      const markdown = await response.text();

      if (!markdown.trim()) {
        lastError = "source-empty";
        continue;
      }

      const truncated = markdown.length > MAX_SOURCE_CHARS;

      return {
        markdown: truncated ? markdown.slice(0, MAX_SOURCE_CHARS) : markdown,
        fetchedUrl: url,
        truncated,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  throw new Error(lastError);
}

function extractJsonObject(raw: string) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced ?? raw.trim();

  try {
    return JSON.parse(candidate) as {
      title?: string;
      summary?: string;
      content?: string;
    };
  } catch {
    throw new Error("openai-invalid-json");
  }
}

export async function translateArcDocMarkdown(input: {
  markdown: string;
  sourceUrl: string;
  sourceTitle: string;
}): Promise<TranslatedArcDoc> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("openai-not-configured");
  }

  const model = getTranslationModel();
  const normalizedSourceUrl = normalizeArcDocUrl(input.sourceUrl);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Voce traduz documentacao tecnica do ecossistema Arc/Circle para PT-BR. Preserve blocos de codigo, links, nomes de produto (Arc, USDC, CCTP, Bridge Kit, App Kit) e estrutura markdown. Responda apenas JSON valido com as chaves title, summary e content.",
        },
        {
          role: "user",
          content: [
            `Titulo original: ${input.sourceTitle}`,
            `URL oficial: ${normalizedSourceUrl}`,
            "",
            "Traduza o markdown abaixo para PT-BR tecnico.",
            "Regras:",
            "- Mantenha headings, listas, tabelas e blocos de codigo intactos em estrutura.",
            "- Nao invente conteudo que nao exista na fonte.",
            "- summary: 1-2 frases em PT-BR.",
            "- content: markdown completo traduzido.",
            `- Se a secao "## Fonte oficial" nao existir, adicione ao final com link para ${normalizedSourceUrl}.`,
            "",
            input.markdown,
          ].join("\n"),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`openai-${response.status}:${errorBody.slice(0, 240)}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("openai-empty-response");
  }

  const parsed = extractJsonObject(content);
  const titlePt = parsed.title?.trim();
  const summaryPt = parsed.summary?.trim();
  const contentMd = parsed.content?.trim();

  if (!titlePt || !summaryPt || !contentMd) {
    throw new Error("openai-missing-fields");
  }

  return {
    titlePt,
    summaryPt,
    contentMd,
    model,
  };
}

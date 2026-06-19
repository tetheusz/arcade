import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ChallengeCategory } from "@prisma/client";

export type ChallengeTheme = {
  id: string;
  title: string;
  topic: string;
  priority: number;
};

export type GeneratedChallengeDraft = {
  category: ChallengeCategory;
  title: string;
  teaser: string;
  prompt: string;
  instructions: string;
  answer: string;
  explanation: string;
  hint: string;
  difficulty: number;
  basePoints: number;
  payload: Record<string, unknown>;
};

const DEFAULT_MODEL = "gpt-4o-mini";

function getModel() {
  return process.env.OPENAI_TRANSLATION_MODEL?.trim() || DEFAULT_MODEL;
}

export async function loadChallengeThemes() {
  const themesPath = path.join(process.cwd(), "data", "challenge-themes.json");
  const raw = await readFile(themesPath, "utf8");
  const themes = JSON.parse(raw) as ChallengeTheme[];
  return themes.sort((left, right) => right.priority - left.priority);
}

export async function selectChallengeTheme(usedThemeIds: string[]) {
  const themes = await loadChallengeThemes();
  const used = new Set(usedThemeIds);

  return themes.find((theme) => !used.has(theme.id)) ?? themes[0] ?? null;
}

function extractJsonObject(raw: string) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced ?? raw.trim();
  return JSON.parse(candidate) as {
    word?: Record<string, unknown>;
    connection?: Record<string, unknown>;
    security?: Record<string, unknown>;
  };
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function parseWordChallenge(raw: Record<string, unknown>): GeneratedChallengeDraft {
  const payload = isRecord(raw.payload) ? raw.payload : {};
  const wordLength = readNumber(payload.wordLength, 5);

  return {
    category: "WORD",
    title: readString(raw.title, "Palavra do dia"),
    teaser: readString(raw.teaser, "Desafio de vocabulario Arc."),
    prompt: readString(raw.prompt, "Qual palavra completa o desafio?"),
    instructions: readString(raw.instructions, "Responda em ingles, minusculas, sem espacos."),
    answer: readString(raw.answer),
    explanation: readString(raw.explanation),
    hint: readString(raw.hint),
    difficulty: Math.min(Math.max(readNumber(raw.difficulty, 1), 1), 5),
    basePoints: Math.min(Math.max(readNumber(raw.basePoints, 10), 1), 200),
    payload: {
      mode: "termo",
      wordLength,
      maxAttempts: readNumber(payload.maxAttempts, 6),
      clue: readString(payload.clue) || undefined,
    },
  };
}

function parseConnectionChallenge(raw: Record<string, unknown>): GeneratedChallengeDraft {
  const payload = isRecord(raw.payload) ? raw.payload : {};
  const groups = Array.isArray(payload.groups)
    ? payload.groups.filter(isRecord).map((group) => ({
        label: readString(group.label, "Grupo"),
        description: readString(group.description),
        items: Array.isArray(group.items)
          ? group.items.filter((item): item is string => typeof item === "string").slice(0, 4)
          : [],
      }))
    : [];

  return {
    category: "CONNECTION",
    title: readString(raw.title, "Conexao do dia"),
    teaser: readString(raw.teaser, "Monte os grupos corretos."),
    prompt: readString(raw.prompt, "Encontre os grupos de 4 termos relacionados."),
    instructions: readString(
      raw.instructions,
      "Selecione 4 itens por vez. Cada acerto revela um grupo completo.",
    ),
    answer: readString(raw.answer, "arc"),
    explanation: readString(raw.explanation),
    hint: readString(raw.hint),
    difficulty: Math.min(Math.max(readNumber(raw.difficulty, 2), 1), 5),
    basePoints: Math.min(Math.max(readNumber(raw.basePoints, 12), 1), 200),
    payload: {
      mode: "conexo",
      maxSelection: 4,
      maxMistakes: readNumber(payload.maxMistakes, 4),
      groups,
    },
  };
}

function parseSecurityChallenge(raw: Record<string, unknown>): GeneratedChallengeDraft {
  const payload = isRecord(raw.payload) ? raw.payload : {};

  return {
    category: "SECURITY",
    title: readString(raw.title, "Security check"),
    teaser: readString(raw.teaser, "Identifique o antipadrao."),
    prompt: readString(raw.prompt, "Qual antipadrao aparece no snippet?"),
    instructions: readString(raw.instructions, "Responda com o nome exato do antipadrao."),
    answer: readString(raw.answer),
    explanation: readString(raw.explanation),
    hint: readString(raw.hint),
    difficulty: Math.min(Math.max(readNumber(raw.difficulty, 3), 1), 5),
    basePoints: Math.min(Math.max(readNumber(raw.basePoints, 14), 1), 200),
    payload: {
      snippet: readString(payload.snippet) || undefined,
      tags: Array.isArray(payload.tags)
        ? payload.tags.filter((tag): tag is string => typeof tag === "string")
        : [],
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateChallenge(challenge: GeneratedChallengeDraft) {
  if (challenge.title.length < 4) {
    throw new Error("challenge-title-too-short");
  }

  if (challenge.answer.length < 2) {
    throw new Error("challenge-answer-too-short");
  }

  if (challenge.category === "WORD") {
    const wordLength =
      typeof challenge.payload.wordLength === "number" ? challenge.payload.wordLength : 5;

    if (challenge.answer.length !== wordLength) {
      throw new Error("challenge-word-length-mismatch");
    }
  }

  if (challenge.category === "CONNECTION") {
    const groups = Array.isArray(challenge.payload.groups) ? challenge.payload.groups : [];

    if (groups.length < 2) {
      throw new Error("challenge-connection-groups-invalid");
    }

    for (const group of groups) {
      if (!isRecord(group) || !Array.isArray(group.items) || group.items.length !== 4) {
        throw new Error("challenge-connection-groups-invalid");
      }
    }
  }
}

export async function generateDailyChallenges(input: {
  dateKey: string;
  theme: ChallengeTheme;
  missingCategories: ChallengeCategory[];
}) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("openai-not-configured");
  }

  const model = getModel();
  const categories = input.missingCategories.join(", ");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Voce cria desafios diarios em PT-BR sobre Arc/Circle para builders brasileiros. Responda apenas JSON valido.",
        },
        {
          role: "user",
          content: [
            `Data: ${input.dateKey}`,
            `Tema: ${input.theme.title}`,
            `Contexto: ${input.theme.topic}`,
            `Categorias a gerar: ${categories}`,
            "",
            "Gere apenas as categorias pedidas com esta estrutura:",
            "{",
            '  "word": { title, teaser, prompt, instructions, answer, explanation, hint, difficulty, basePoints, payload: { mode:"termo", wordLength, maxAttempts, clue } },',
            '  "connection": { title, teaser, prompt, instructions, answer, explanation, hint, difficulty, basePoints, payload: { mode:"conexo", maxMistakes, groups:[{label,description,items[4]}] } },',
            '  "security": { title, teaser, prompt, instructions, answer, explanation, hint, difficulty, basePoints, payload: { snippet, tags } }',
            "}",
            "",
            "Regras:",
            "- WORD: resposta em ingles minuscula, uma palavra, sem espacos; wordLength = tamanho da resposta.",
            "- CONNECTION: exatamente 3 grupos com 4 itens cada, sem repetir item.",
            "- SECURITY: snippet Solidity curto com antipadrao real; answer = identificador do antipadrao.",
            "- Textos do desafio (title, teaser, prompt, etc.) em PT-BR.",
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
  const results: GeneratedChallengeDraft[] = [];

  if (input.missingCategories.includes("WORD") && isRecord(parsed.word)) {
    results.push(parseWordChallenge(parsed.word));
  }

  if (input.missingCategories.includes("CONNECTION") && isRecord(parsed.connection)) {
    results.push(parseConnectionChallenge(parsed.connection));
  }

  if (input.missingCategories.includes("SECURITY") && isRecord(parsed.security)) {
    results.push(parseSecurityChallenge(parsed.security));
  }

  if (results.length === 0) {
    throw new Error("openai-missing-challenges");
  }

  results.forEach(validateChallenge);

  return {
    model,
    theme: input.theme,
    challenges: results,
  };
}

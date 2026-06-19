import { normalizeAnswer } from "@/lib/utils";
import { sanitizeTagList, sanitizeTextInput } from "@/lib/sanitize";
import type {
  ChallengeAdminRecord,
  ChallengeFormDefaults,
  ChallengeGroupInput,
  ChallengeStatus,
} from "@/types/challenge-admin";
import type { ChallengeCategory } from "@/types/challenge";

export type ParsedChallengeInput = {
  dateKey: string;
  category: ChallengeCategory;
  title: string;
  teaser: string;
  prompt: string;
  instructions: string | null;
  answer: string;
  explanation: string | null;
  hint: string | null;
  difficulty: number;
  basePoints: number;
  sourceLabel: string;
  status: ChallengeStatus;
  payload: Record<string, unknown> | null;
};

function parsePositiveInt(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseCategory(value: string): ChallengeCategory {
  if (value === "connection" || value === "security") {
    return value;
  }

  return "word";
}

function parseStatus(value: string): ChallengeStatus {
  if (value === "published" || value === "archived") {
    return value;
  }

  return "draft";
}

function parseDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Use a data no formato YYYY-MM-DD.");
  }

  return value;
}

function parseConnectionGroups(value: string) {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const groups = lines.map((line, index) => {
    const [labelRaw, itemsRaw, descriptionRaw = ""] = line.split("|").map((part) => part.trim());
    const items = itemsRaw
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean) ?? [];

    if (!labelRaw || items.length !== 4) {
      throw new Error(
        `Linha ${index + 1}: use o formato "Grupo | item1, item2, item3, item4 | descricao".`,
      );
    }

    return {
      label: labelRaw,
      description: descriptionRaw,
      items,
    } satisfies ChallengeGroupInput;
  });

  if (groups.length < 2) {
    throw new Error("Conexo precisa de pelo menos 2 grupos completos.");
  }

  const duplicateItems = new Set<string>();
  const seenItems = new Set<string>();

  groups.forEach((group) => {
    group.items.forEach((item) => {
      const normalized = normalizeAnswer(item);
      if (seenItems.has(normalized)) {
        duplicateItems.add(item);
      }
      seenItems.add(normalized);
    });
  });

  if (duplicateItems.size > 0) {
    throw new Error("Não repita itens entre grupos no Conexo.");
  }

  return groups;
}

export function parseChallengeFormData(formData: FormData): ParsedChallengeInput {
  const category = parseCategory(sanitizeTextInput(formData.get("category")) || "word");
  const title = sanitizeTextInput(formData.get("title"));
  const teaser = sanitizeTextInput(formData.get("teaser"));
  const prompt = sanitizeTextInput(formData.get("prompt"));
  const instructions = sanitizeTextInput(formData.get("instructions"));
  const answer = sanitizeTextInput(formData.get("answer"));
  const explanation = sanitizeTextInput(formData.get("explanation"));
  const hint = sanitizeTextInput(formData.get("hint"));
  const sourceLabel = sanitizeTextInput(formData.get("sourceLabel")) || "manual";
  const difficulty = Math.min(Math.max(parsePositiveInt(formData.get("difficulty"), 1), 1), 5);
  const basePoints = Math.min(Math.max(parsePositiveInt(formData.get("basePoints"), 10), 1), 200);
  const status = parseStatus(sanitizeTextInput(formData.get("status")) || "draft");
  const dateKey = parseDateKey(sanitizeTextInput(formData.get("dateKey")));

  if (title.length < 4) {
    throw new Error("Título muito curto.");
  }

  if (teaser.length < 8) {
    throw new Error("Teaser muito curto.");
  }

  if (prompt.length < 12) {
    throw new Error("Prompt muito curto.");
  }

  let payload: Record<string, unknown> | null = null;
  let normalized = normalizeAnswer(answer);

  if (category === "word") {
    const wordLength = Math.min(Math.max(parsePositiveInt(formData.get("wordLength"), 5), 4), 8);
    const maxAttempts = Math.min(Math.max(parsePositiveInt(formData.get("maxAttempts"), 6), 4), 8);
    const clue = sanitizeTextInput(formData.get("clue"));

    if (answer.length !== wordLength) {
      throw new Error(`No Termo, a resposta precisa ter ${wordLength} letras.`);
    }

    normalized = normalizeAnswer(answer);

    if (normalized.includes(" ")) {
      throw new Error("No Termo, use apenas uma palavra simples, sem espaços.");
    }

    payload = {
      mode: "termo",
      wordLength,
      maxAttempts,
      clue: clue || undefined,
    };
  }

  if (category === "connection") {
    const groups = parseConnectionGroups(sanitizeTextInput(formData.get("groupsText")));
    const maxSelection = 4;
    const maxMistakes = Math.min(Math.max(parsePositiveInt(formData.get("maxMistakes"), 4), 1), 8);

    payload = {
      mode: "conexo",
      maxSelection,
      maxMistakes,
      groups,
    };

    if (!answer) {
      const labels = groups.map((group) => group.label).join(", ");
      normalized = normalizeAnswer(labels);
    }
  }

  if (category === "security") {
    const snippet = sanitizeTextInput(formData.get("snippet"));
    const tags = sanitizeTagList(formData.get("tags"));

    if (answer.length < 2) {
      throw new Error("A resposta do desafio técnico está muito curta.");
    }

    payload = {
      snippet: snippet || undefined,
      tags,
    };
  }

  return {
    dateKey,
    category,
    title,
    teaser,
    prompt,
    instructions: instructions || null,
    answer,
    explanation: explanation || null,
    hint: hint || null,
    difficulty,
    basePoints,
    sourceLabel,
    status,
    payload,
  };
}

function toGroupsText(payload: Record<string, unknown> | null) {
  if (!payload || payload.mode !== "conexo" || !Array.isArray(payload.groups)) {
    return "";
  }

  return payload.groups
    .map((group) => {
      if (
        typeof group !== "object" ||
        group === null ||
        !("label" in group) ||
        !("items" in group) ||
        !Array.isArray(group.items)
      ) {
        return "";
      }

      const label = typeof group.label === "string" ? group.label : "Grupo";
      const description = typeof group.description === "string" ? group.description : "";
      const items = group.items.filter((item: unknown): item is string => typeof item === "string");

      return `${label} | ${items.join(", ")} | ${description}`;
    })
    .filter(Boolean)
    .join("\n");
}

export function getChallengeFormDefaults(
  challenge?: ChallengeAdminRecord,
): ChallengeFormDefaults {
  const payload = challenge?.payload ?? null;
  const isWord = challenge?.category === "word" && payload?.mode === "termo";
  const isConnection = challenge?.category === "connection" && payload?.mode === "conexo";
  const isSecurity = challenge?.category === "security";

  return {
    dateKey: challenge?.dateKey ?? "",
    category: challenge?.category ?? "word",
    title: challenge?.title ?? "",
    teaser: challenge?.teaser ?? "",
    prompt: challenge?.prompt ?? "",
    instructions: challenge?.instructions ?? "",
    answer: challenge?.answer ?? "",
    explanation: challenge?.explanation ?? "",
    hint: challenge?.hint ?? "",
    difficulty: challenge?.difficulty ?? 1,
    basePoints: challenge?.basePoints ?? 10,
    sourceLabel: challenge?.sourceLabel ?? "manual",
    status: challenge?.status ?? "draft",
    wordLength:
      isWord && typeof payload.wordLength === "number" ? payload.wordLength : 5,
    maxAttempts:
      isWord && typeof payload.maxAttempts === "number" ? payload.maxAttempts : 6,
    clue: isWord && typeof payload.clue === "string" ? payload.clue : "",
    maxSelection:
      isConnection && typeof payload.maxSelection === "number" ? payload.maxSelection : 4,
    maxMistakes:
      isConnection && typeof payload.maxMistakes === "number" ? payload.maxMistakes : 4,
    groupsText: isConnection ? toGroupsText(payload) : "",
    snippet: isSecurity && typeof payload?.snippet === "string" ? payload.snippet : "",
    tags:
      isSecurity && Array.isArray(payload?.tags)
        ? payload.tags.filter((tag): tag is string => typeof tag === "string").join(", ")
        : "",
  };
}

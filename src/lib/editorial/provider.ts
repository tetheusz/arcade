export type EditorialProvider = "cursor-agent" | "openai";

export function getEditorialProvider(): EditorialProvider {
  const explicit = process.env.EDITORIAL_PROVIDER?.trim().toLowerCase();

  if (explicit === "openai" && process.env.OPENAI_API_KEY?.trim()) {
    return "openai";
  }

  if (explicit === "openai" && !process.env.OPENAI_API_KEY?.trim()) {
    return "cursor-agent";
  }

  if (process.env.OPENAI_API_KEY?.trim() && explicit !== "cursor-agent") {
    return "openai";
  }

  return "cursor-agent";
}

export function getEditorialModelLabel() {
  return getEditorialProvider() === "openai"
    ? process.env.OPENAI_TRANSLATION_MODEL?.trim() || "gpt-4o-mini"
    : "cursor-agent";
}

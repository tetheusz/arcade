const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY);

export const aiLabStatus = {
  enabled: hasOpenAIKey,
  mode: hasOpenAIKey ? "provider-ready" : "manual-curated",
  generator: hasOpenAIKey ? "openai-configured" : "not-connected",
  validation: "manual-review",
  note: hasOpenAIKey
    ? "OpenAI disponivel (EDITORIAL_PROVIDER=openai). Padrao do projeto: cursor-agent no chat."
    : "Modo cursor-agent: traducoes e desafios gerados pelo Composer/Cursor no chat.",
  capabilities: hasOpenAIKey
    ? ["openai-provider", "cursor-agent", "arc-doc-translation", "daily-challenge-generation"]
    : ["cursor-agent", "arc-doc-translation", "daily-challenge-generation", "manual-approval"],
};

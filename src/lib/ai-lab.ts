const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY);

export const aiLabStatus = {
  enabled: hasOpenAIKey,
  mode: hasOpenAIKey ? "provider-ready" : "manual-curated",
  generator: hasOpenAIKey ? "openai-configured" : "not-connected",
  validation: "manual-review",
  note: hasOpenAIKey
    ? "OpenAI configurado. O cron editorial (24h) traduz docs Arc e gera desafios diarios como rascunhos para revisao no admin."
    : "Configure OPENAI_API_KEY para traducoes e desafios automaticos do hub Arc.",
  capabilities: hasOpenAIKey
    ? [
        "arc-doc-translation",
        "daily-challenge-generation",
        "draft-generation",
        "editorial-review",
        "manual-approval",
      ]
    : ["manual-curation", "admin-review"],
};

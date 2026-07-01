# Rotina editorial diaria (via chat / Cursor Agent)

**Motor padrao:** `cursor-agent` (Composer ou qualquer modelo do Cursor no chat).  
**OpenAI opcional:** defina `EDITORIAL_PROVIDER=openai` + `OPENAI_API_KEY`.

## Fluxo no chat

Diga:

> Rotina diaria do Arcade

O agente:

1. Roda `npm run editorial:prepare` — busca artigo Arc + tema de desafios
2. Traduz e cria desafios **aqui no chat** (sem OpenAI externa)
3. Roda `npm run editorial:save-agent -- --file=data/pending-editorial/saved-today.json`
4. Enfileira/posta no X se configurado

## Comandos

```powershell
npm run editorial:prepare
npm run editorial:save-agent -- --file=data/pending-editorial/saved-today.json
npm run editorial:daily
npm run x:post-latest -- --slug=SEU-SLUG
```

## Variaveis

| Variavel | Padrao | Uso |
|----------|--------|-----|
| `EDITORIAL_PROVIDER` | `cursor-agent` | `openai` so se quiser API externa |
| `OPENAI_API_KEY` | — | So se `EDITORIAL_PROVIDER=openai` |
| Credenciais X | — | Postagem automatica (opcional) |

## Cron Vercel

O cron so funciona com OpenAI na Vercel. Para rotina 100% Cursor, use o chat diario e desative crons em `vercel.json`.

# Auditoria de segurança — Junho 2026

Revisão pós-merge bounties + Circle wallets + reordenação de posts.

## Resumo

| Severidade | Achado | Status |
|------------|--------|--------|
| Média | Submissões sem limite de tamanho | **Corrigido** — `trimField` + limites em `input-limits.ts` |
| Média | Revisão duplicada / reward arbitrário | **Corrigido** — checagem PENDING + clamp scores/reward |
| Média | Arquétipo arbitrário via action | **Corrigido** — whitelist `ArchetypeClass` |
| Baixa | `dateKey` arbitrário no snapshot | **Corrigido** — regex `YYYY-MM-DD` |
| Baixa | Token Turso exposto em `docs/SECURITY.md` | **Corrigido** — removido do doc |
| Info | Server actions inline em páginas admin | **OK** — delegam para actions com `requireActionAdmin` |
| Info | Snapshot API sem admin em prod | **OK** — exige admin OU `CRON_SECRET` Bearer |
| Info | Export de atividade | **OK** — sessão + rate limit 20/min |

## Rotas auditadas

- `POST /api/admin/posts` — admin + same-origin + rate limit
- `POST /api/admin/snapshot` — admin ou cron secret
- `GET /api/activity/export` — sessão + rate limit
- `GET /api/activity/claim-status` — sessão (dados do próprio usuário)
- `src/actions/bounties.ts` — sessão/admin em todas as mutações
- `src/actions/posts.ts` — `requireActionAdmin` + validação de IDs
- `src/actions/protocols.ts` — sessão/admin (sem alteração nesta rodada)

## Recomendações pendentes (produção)

1. Definir `CRON_SECRET` forte para snapshots automatizados
2. Rotacionar segredos se `.env.example` chegou a conter valores reais
3. Rate limit em server actions de bounty (hoje só em rotas HTTP)
4. CSP report-only antes de enforcement total
5. Monitorar escrow ERC-8183 — valores baixos em testnet apenas

## Reordenação de posts

- Apenas admin autenticado via Better Auth
- Lista de IDs validada contra posts publicados (anti-tampering)
- Máximo 100 posts por operação

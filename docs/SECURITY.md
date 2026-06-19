# Segurança — Arc Builder Hub

## Rotação de segredos

Se segredos apareceram em commits, issues ou `.env.example`:

1. **Turso / Postgres**: revogue tokens antigos e gere novos
2. **ADMIN_PRIVATE_KEY**: transfira fundos para nova wallet, descarte a chave antiga
3. **Circle API**: regenere `CIRCLE_API_KEY` e `CIRCLE_ENTITY_SECRET` no console Circle
4. **Nunca** commite `.env` no repositório

Ver também: [SECURITY_AUDIT_2026-06.md](./SECURITY_AUDIT_2026-06.md)

## Variáveis sensíveis

| Variável | Uso | Onde configurar |
|----------|-----|-----------------|
| `BETTER_AUTH_SECRET` | Sessões | Vercel env (min 32 chars) |
| `CIRCLE_API_KEY` | Circle SDK | Vercel env (server only) |
| `CIRCLE_ENTITY_SECRET` | Circle wallets | Vercel env (server only) |
| `ADMIN_PRIVATE_KEY` | Mint SBT, publish snapshots | Vercel env (server only) |
| `SUPABASE_SERVICE_ROLE_KEY` | Upload de capas | Vercel env (server only) |
| `CRON_SECRET` | Snapshots automatizados | Vercel env (server only) |

## Checklist de deploy

- [ ] `BETTER_AUTH_SECRET` com 32+ caracteres
- [ ] `ADMIN_PASSWORD` forte e único
- [ ] `APP_ALLOWED_ORIGINS` com domínio de produção
- [ ] Segredos rotacionados se expostos
- [ ] `.env` no `.gitignore`
- [ ] Rate limiting ativo (rotas HTTP)
- [ ] Headers de segurança (em `next.config.ts`)

## Autorização server-side

Todas as server actions em `src/actions/` usam `requireActionSession()` ou `requireActionAdmin()` antes de mutações. Admin actions checam `isAdminSession()`.

## Limites testnet

- Bounties com escrow limitadas a valores baixos durante testes
- Apenas admin como sponsor inicial
- Revisão manual de todas as submissões

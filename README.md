# Arcade — Arc Builder Hub

Plataforma unificada para builders brasileiros no ecossistema **Arc** (Circle): journal editorial, desafios diários, bounties com reputação e pagamentos USDC via ERC-8183.

**Produção:** [arcade-nu-blush.vercel.app](https://arcade-nu-blush.vercel.app)

## Stack

- **Next.js 16** App Router + React 19 + TypeScript
- **Prisma 6** + PostgreSQL (Supabase)
- **Better Auth** — identidade Web2 (email/senha)
- **Circle User-Controlled Wallets** — carteira Arc embutida
- **viem** — leituras on-chain na Arc Testnet (chainId 5042002)
- **ERC-8183** — escrow USDC para bounties pagas
- **Hardhat** — contratos SBT + Activity Registry

## Funcionalidades

| Módulo | Rotas | Status |
|--------|-------|--------|
| Journal | `/`, `/posts` | Produção |
| Desafios | `/jogar`, `/ranking` | Produção |
| Bounties | `/bounties`, `/dashboard` | Novo |
| Protocolos | `/protocols` | Novo |
| Perfil + Wallet | `/perfil`, `/players/[slug]` | Atualizado |
| Admin | `/admin`, `/admin/bounties` | Unificado |

## Como rodar

```bash
npm install
cp .env.example .env.local
# Preencha DATABASE_URL, BETTER_AUTH_*, ADMIN_*
npm run db:generate
npm run db:push
npm run db:seed
npm run bounties:seed
npm run dev
```

## Variáveis de ambiente

Ver [`.env.example`](.env.example) — inclui Circle API, Arc on-chain e Supabase.

## Documentação

- [Arquitetura](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Segurança](docs/SECURITY.md)
- [On-chain local](ONCHAIN_LOCAL.md)

## Circle / Arc

- Arc Docs: https://docs.arc.io/
- Circle Developer: https://developers.circle.com/
- Faucet: https://faucet.circle.com
- Explorer: https://testnet.arcscan.app

### Skills e MCP (dev)

```bash
npx skills add circlefin/skills
```

MCP Circle configurado em [`.cursor/mcp.json`](.cursor/mcp.json).

## Scripts

```bash
npm run dev              # Desenvolvimento
npm run build            # Build produção
npm run bounties:seed    # Seed protocolos + bounties bootstrap
npm run chain:compile    # Compilar contratos
npm run chain:deploy:local
npm run snapshot:build   # Gerar snapshot diário (admin)
```

## Merge arcTalent

O domínio de bounties foi portado de `arcTalent` (Drizzle/Turso/wallet-only) para este repo com:
- Auth unificada (Better Auth)
- Banco unificado (Prisma/Postgres)
- Circle Wallets embutidas
- Pagamentos USDC via ERC-8183

**Importante:** rotacione segredos do `.env` do arcTalent antes de descontinuar aquele projeto. Ver [docs/SECURITY.md](docs/SECURITY.md).

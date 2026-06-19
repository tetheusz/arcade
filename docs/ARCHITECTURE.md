# Arc Builder Hub — Arquitetura

## Visão

Plataforma unificada que mescla **Arcade** (journal + desafios + reputação) com **arcTalent** (bounties + arquétipos + SBT), posicionada como hub brasileiro de builders na Arc.

```
Aprender (Journal) → Jogar (Desafios) → Construir (Bounties) → Ganhar (USDC + reputação on-chain)
```

## Stack

| Camada | Tecnologia |
|--------|------------|
| App | Next.js 16 App Router, React 19, TypeScript |
| Auth | Better Auth (email/senha) — identidade Web2 |
| DB | Prisma 6 + PostgreSQL (Supabase) |
| Carteiras | Circle User-Controlled Wallets (provisionadas no login) |
| On-chain reads | viem na Arc Testnet (chainId 5042002) |
| Escrow | ERC-8183 (`0x0747EEf0706327138c69792bF28Cd525089e4583`) |
| Identidade on-chain | ERC-8004 + ArcTalentsSBT |
| Atividade | ArcadeActivityRegistry (Merkle snapshots) |
| Storage | Supabase Storage (capas de posts) |

## Módulos

```
src/
├── actions/          # Server actions (bounties, protocols, reviews, wallet)
├── app/              # Rotas App Router
├── components/       # UI (wallet, bounties, archetypes, admin)
├── lib/
│   ├── arc/          # Chain config, USDC, explorer
│   ├── circle/       # Wallet provisioning, webhooks
│   ├── bounties/     # Domínio de missões/submissões
│   ├── onchain/      # SBT, ERC-8183, activity registry
│   └── auth-guard.ts # Verificação server-side de sessão
├── types/            # Tipos compartilhados
contracts/            # Solidity (SBT, ActivityRegistry)
```

## Fluxo de identidade

1. Usuário cria conta via Better Auth (email/senha)
2. `UserProfile` é criado automaticamente
3. Circle User-Controlled Wallet é provisionada (server-side)
4. Usuário escolhe arquétipo (opcional, onboarding)
5. Wallet linkada em `UserProfile.walletAddress`

## Fluxo de bounty paga (ERC-8183)

1. Sponsor (admin/protocol) cria bounty com `rewardUsdc`
2. Backend chama `createJob` no contrato ERC-8183
3. Sponsor faz `approve` + `fund` USDC no escrow
4. Builder submete entrega (off-chain + `deliverableHash` on-chain)
5. Reviewer aprova → `complete(jobId)` libera USDC para wallet do builder
6. XP + badge + evento de reputação registrados off-chain

## Integrações Circle/Arc

- **Circle Skills**: `use-arc`, `use-usdc`, `use-user-controlled-wallets`, `use-gateway`
- **Circle MCP**: `https://api.circle.com/v1/codegen/mcp`
- **Arc MCP**: documentação ao vivo no editor
- **Faucet**: https://faucet.circle.com
- **Explorer**: https://testnet.arcscan.app

## Segurança

- Todas as server actions validam sessão via `requireActionSession()`
- Mutations sensíveis checam `isAdminSession()` ou `isProtocolAdmin()`
- Rate limiting em rotas de API
- Segredos nunca commitados (ver `docs/SECURITY.md`)

## Rede Arc Testnet

| Parâmetro | Valor |
|-----------|-------|
| Chain ID | 5042002 |
| RPC | https://rpc.testnet.arc.network |
| Currency | USDC (18 decimais) |
| USDC | 0x3600000000000000000000000000000000000000 |

# Arc Builder Hub — Roadmap

## Milestones

### M0 — Fundação ✅
- [x] Documentação de arquitetura e roadmap
- [x] Correção de drift schema/README
- [x] Configuração MCP Circle + skills
- [x] Guia de rotação de segredos (arcTalent)
- [x] `.env.example` atualizado com variáveis Circle/Arc

### M1 — Banco e identidade
- [x] Schema Prisma unificado (Arcade + arcTalent)
- [x] Better Auth como identidade única
- [x] `auth-guard.ts` para verificação server-side

### M2 — Circle Wallets + Arc
- [x] Provisionamento de User-Controlled Wallet no login
- [x] Tela de carteira no `/perfil`
- [x] Leitura de saldo USDC via viem
- [x] Link para faucet Circle

### M3 — Bounties off-chain
- [x] Rotas `/bounties`, `/protocols`, `/dashboard`
- [x] Pipeline submit → review → XP
- [x] Arquétipos e qualificação por reputação
- [x] Admin de bounties e protocolos

### M4 — Pagamentos USDC (ERC-8183)
- [x] Integração com contrato de referência Arc
- [x] Modelos `Payout` e `WalletLedger`
- [x] UI de status de escrow com link no explorer

### M5 — Identidade on-chain
- [x] `ArcTalentsSBT.sol` portado
- [x] Mint de badges via admin wallet
- [x] Activity registry + job de snapshot
- [x] Claim de atividade na UI

### M6 — UI/UX unificada
- [x] Navegação unificada (Bounties no header)
- [x] Builder card público enriquecido
- [x] Onboarding de arquétipo
- [x] Landing 3D opcional (feature flag)

### M7 — Admin, otimização e launch
- [x] Admin unificado
- [x] Índices Prisma otimizados
- [x] Documentação de segurança
- [x] Scripts npm padronizados

## Próximos passos (pós-launch)

- Bridge USDC via App Kit / CCTP para builders de outras chains
- Gateway Nanopayments para micro-recompensas
- ERC-8004 registro automático de agents
- Gas Station para transações 100% gasless
- Newsletter e analytics
- Candidatura Arc House / Superteam BR

## Critérios de sucesso (6 meses)

1. Plataforma unica em produção com Journal + desafios + bounties
2. Login Web2 com Circle Wallet provisionada na Arc
3. Pelo menos 1 bounty paga via ERC-8183 na Arc Testnet
4. Reputação on-chain (SBT) ligada a atividade real
5. Portfolio demonstrável para Arc House / Superteam BR

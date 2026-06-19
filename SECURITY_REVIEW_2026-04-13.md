# Revisão de Segurança e Prontidão

Data da revisão: `13 de abril de 2026`

## Resolvido no código

- Nenhuma chave de API ou segredo exposto no frontend público.
- Rotas customizadas auditadas:
  - `/api/activity/export` agora exige autenticação.
  - `/api/ai/status` agora exige acesso de admin.
  - `/api/challenges/[id]/submit` exige autenticação, valida payload e tem rate limit.
  - Rotas de admin de posts e desafios exigem admin, validam origem e têm rate limit.
- Entrada validada e sanitizada no servidor para posts, desafios e submissões.
- Rate limiting ativo:
  - autenticação via Better Auth
  - export de atividade
  - status de IA
  - submissão de desafio
  - CRUD admin
- Sessões com expiração explícita configurada no Better Auth.
- Logout com invalidação no lado do servidor via Better Auth e tabela de sessões.
- Consultas ao banco feitas via Prisma, sem concatenação manual de SQL.
- Listagens do backend com limites explícitos.
- Estados de loading e error adicionados na App Router.
- `npm audit` sem vulnerabilidades conhecidas no momento da revisão.
- Sem `console.log` na aplicação web em produção.
- Headers de segurança aplicados via `next.config.ts`.

## Verificado na stack atual

- Better Auth usa hash de senha baseado em `scrypt` no pacote instalado.
  - Observação: isso não bate literalmente com a checklist `bcrypt/argon2`, mas continua sendo um KDF moderno e seguro.
- Better Auth armazena sessões no banco e remove a sessão no logout.
- O projeto usa migrações/versionamento via Prisma schema.
- O pool de conexões depende da connection string do banco/host de produção.

## Ainda depende de infraestrutura

- Forçar HTTPS e redirecionar HTTP no edge/plataforma de deploy.
- Certificado SSL válido no domínio final.
- Firewall público limitado a `80/443` quando houver servidor próprio.
- Backups automáticos e teste real de restauração.
- Banco com usuário não-root em produção.
- Separação operacional entre staging e produção.
- Plano formal de rollback.
- Processo de aprovação em staging antes de produção.

## Observações

- Hoje o bloqueio de origem está implementado para mutações sensíveis e não há CORS aberto com curinga.
- Se o projeto continuar na Vercel + Supabase, parte importante da checklist de rede e TLS fica no provedor, não no código da aplicação.

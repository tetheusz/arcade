# Postgres / Supabase

O schema ativo é [`prisma/schema.prisma`](prisma/schema.prisma) — PostgreSQL completo com auth, posts, desafios **e** bounties.

## Setup

1. Crie projeto no Supabase
2. Copie Session pooler (`DATABASE_URL`) e Direct connection (`DIRECT_URL`)
3. Preencha [`.env.postgres.example`](.env.postgres.example)
4. Rode:

```bash
npm run db:generate
npm run db:push
npm run db:seed
npm run bounties:seed
npm run build
```

## Nota sobre schemas auxiliares

Os arquivos `prisma/schema.postgresql.prisma` e `prisma/schema.sqlite.prisma` são legados e **não** incluem modelos de bounties. Use apenas `schema.prisma`.

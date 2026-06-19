# Deploy em produção — Arc Builder Journal

## 1. Zerar banco e começar do zero

**Atenção:** apaga usuários, posts, desafios, bounties, tentativas e histórico on-chain off-chain.

1. Configure `.env` (ou variáveis na Vercel) apontando para o Postgres de **produção**
2. Confirme `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `APP_ALLOWED_ORIGINS`
3. Execute:

```powershell
cd c:\Users\Ghaxt\Desktop\arc-builder-journal
npm run db:reset
```

Isso recria apenas:
- conta admin
- badges e protocolo Arcade + bounties seed

Posts e desafios **não** são pré-populados — entram via cron editorial ou scripts manuais.

## 2. Variáveis obrigatórias na Vercel

| Variável | Uso |
|----------|-----|
| `DATABASE_URL` / `DIRECT_URL` | Supabase Postgres |
| `BETTER_AUTH_URL` | URL pública (ex. `https://arcade-nu-blush.vercel.app`) |
| `BETTER_AUTH_SECRET` | Segredo forte (32+ chars), diferente do local |
| `APP_ALLOWED_ORIGINS` | Mesma URL pública |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Login admin |
| `CRON_SECRET` | Bearer token para cron |
| `OPENAI_API_KEY` | Traduções + desafios automáticos |

Opcionais: Circle, Supabase storage, on-chain (`ADMIN_PRIVATE_KEY`), X/social.

## 3. Deploy

```powershell
git push origin main
```

Ou conecte o repo na Vercel e faça deploy. O `vercel.json` registra o cron:

- **Path:** `/api/cron/publish-translation`
- **Schedule:** `0 0 * * *` (24h em UTC — 00:00 todo dia)

Cada execução:
1. Traduz 1 artigo do hub Arc → rascunho de post
2. Gera desafios faltantes (WORD + CONNECTION + SECURITY) → rascunhos

## 4. Fluxo operacional pós-deploy

1. Aguarde o cron ou dispare manualmente:

```powershell
curl -X POST https://SEU-DOMINIO/api/cron/publish-translation `
  -H "Authorization: Bearer SEU_CRON_SECRET" `
  -H "Content-Type: application/json"
```

2. Revise em `/admin`:
   - Posts com prefixo `[Auto]` → editar → publicar
   - Desafios em `/admin/challenges` com `[Auto]` → editar → status **Publicado**

3. Desafios só aparecem em `/jogar` quando status = **Publicado** e `dateKey` = hoje.

## 5. Scripts úteis

| Comando | Efeito |
|---------|--------|
| `npm run editorial:cycle` | Traduz + gera desafios (local) |
| `npm run editorial:cycle -- --dry-run` | Preview sem salvar |
| `npm run posts:translate-next` | Só tradução |
| `npm run challenges:generate-next` | Só desafios |
| `npm run db:reset` | Apaga tudo e re-seeda base |

## 6. Checklist rápido

- [ ] `npm run db:reset` executado no banco de produção (se quiser zero absoluto)
- [ ] Todas env vars na Vercel
- [ ] Deploy concluído
- [ ] Cron disparado uma vez manualmente para validar
- [ ] Primeiro post e desafios revisados e publicados no admin

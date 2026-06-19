# Guia de configuração do .env — Arc Builder Hub

Use **`.env`** na raiz do projeto (ou `.env.local`, que tem prioridade no Next.js).

---

## 1. O que você já tem configurado

| Variável | Status |
|----------|--------|
| `DATABASE_URL` / `DIRECT_URL` | Supabase Postgres |
| `BETTER_AUTH_*` | Auth local |
| `ADMIN_*` | Conta admin |
| `NEXT_PUBLIC_SUPABASE_*` | Supabase público |
| `ARCADE_PUBLIC_URL` | URL de produção |

Com isso o app **já roda localmente** com journal, desafios e bounties.

---

## 2. Variáveis por prioridade

### Obrigatório — local (`npm run dev`)

```env
DATABASE_URL="..."          # Session pooler Supabase (porta 5432)
DIRECT_URL="..."            # Direct connection Supabase
BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_SECRET="..."    # Mínimo 32 caracteres aleatórios
APP_ALLOWED_ORIGINS="http://localhost:3000"
ADMIN_EMAIL="admin@arcbuilder.local"
ADMIN_PASSWORD="..."
ADMIN_NAME="ARC Admin"
```

**Gerar secret forte (PowerShell):**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object {[char]$_})
```

### Obrigatório — produção (Vercel)

Além do acima, na Vercel:

```env
BETTER_AUTH_URL="https://arcade-nu-blush.vercel.app"
APP_ALLOWED_ORIGINS="https://arcade-nu-blush.vercel.app"
BETTER_AUTH_SECRET="..."    # Diferente do local — gere um novo
ADMIN_PASSWORD="..."        # Senha forte, só produção
```

### Recomendado — upload de capas (Supabase Storage)

1. Supabase → **Project Settings → API**
2. Copie **service_role** (secret, nunca no client)
3. Crie bucket `arcade-covers` (público para leitura)

```env
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
SUPABASE_STORAGE_BUCKET="arcade-covers"
```

Sem isso, capas salvam em `public/uploads/covers` localmente.

### Opcional — Circle Wallets (carteira real na Arc)

1. Crie conta em [console.circle.com](https://console.circle.com)
2. **Keys → Create API key** (Testnet)
3. **Entity Secret** → registre e guarde o ciphertext

```env
CIRCLE_API_KEY="TEST_API_KEY:..."
CIRCLE_ENTITY_SECRET="..."   # Ciphertext do Entity Secret
```

**Se deixar vazio:** o app usa **carteira mock** automática em dev (funciona para testar bounties off-chain).

### Opcional — on-chain (SBT, escrow USDC, snapshots)

Só quando for testar pagamentos reais na Arc Testnet:

```env
ADMIN_PRIVATE_KEY="0x..."    # Wallet com USDC testnet — NUNCA commitar
SBT_CONTRACT_ADDRESS="0x..." # Após deploy de ArcTalentsSBT.sol
ACTIVITY_REGISTRY_ADDRESS="0x..."
ERC8183_CONTRACT_ADDRESS="0x0747EEf0706327138c69792bF28Cd525089e4583"
```

USDC testnet: [faucet.circle.com](https://faucet.circle.com)

### Opcional — cron / social / tradução automática

```env
CRON_SECRET="..."                  # Protege rotas de cron na Vercel (Bearer token)
OPENAI_API_KEY="..."               # Tradução automática de docs Arc (rascunhos PT-BR)
OPENAI_TRANSLATION_MODEL="gpt-4o-mini"
X_BEARER_TOKEN="..."               # Posts automáticos no X
```

**Cron editorial (a cada 12h, UTC):** `POST /api/cron/publish-translation` — roda tradução de docs Arc **e** geração de desafios diários (ambos como rascunho). Schedule em `vercel.json`: `0 */12 * * *` (00:00 e 12:00 UTC).

Teste local:

```powershell
npm run editorial:cycle -- --dry-run
npm run posts:translate-next -- --dry-run
npm run challenges:generate-next -- --dry-run
```

Zerar banco e recomeçar (destrutivo — só produção/staging quando intencional):

```powershell
npm run db:reset
```

Teste manual da rota (produção):

```powershell
curl -X POST https://SEU-DOMINIO/api/cron/publish-translation -H "Authorization: Bearer SEU_CRON_SECRET"
```

---

## 3. Onde pegar cada URL do Supabase

No painel Supabase → **Connect**:

| Variável | Tipo no painel |
|----------|----------------|
| `DATABASE_URL` | **Session pooler** → URI (porta 5432) |
| `DIRECT_URL` | **Direct connection** → URI |

Troque `[YOUR-PASSWORD]` pela senha do banco. Se a senha tiver caracteres especiais (`@`, `#`, `,`), use **URL encoding** (ex.: `,` → `%2C`).

---

## 4. Depois de editar o .env

```powershell
cd c:\Users\Ghaxt\Desktop\arc-builder-journal
npm run db:generate
npm run db:push
npm run db:seed
npm run bounties:seed
npm run dev
```

Login admin: email = `ADMIN_EMAIL`, senha = `ADMIN_PASSWORD`.

---

## 5. Segurança

- `.env` está no `.gitignore` — **nunca** faça commit
- Rotacione segredos do projeto antigo `arcTalent` (Turso, private keys)
- Não coloque chaves reais no `.env.example`
- Em produção, configure tudo em **Vercel → Settings → Environment Variables**

---

## 6. Checklist rápido

- [ ] `DATABASE_URL` + `DIRECT_URL` testados (`npm run db:push`)
- [ ] `BETTER_AUTH_SECRET` com 32+ chars
- [ ] `APP_ALLOWED_ORIGINS` inclui URL do dev/prod
- [ ] Admin criado via seed (`npm run db:seed`)
- [ ] (Opcional) `SUPABASE_SERVICE_ROLE_KEY` para capas na nuvem
- [ ] (Opcional) Circle API para wallets reais
- [ ] (Opcional) `ADMIN_PRIVATE_KEY` + faucet USDC para on-chain
- [ ] (Opcional) `OPENAI_API_KEY` + `CRON_SECRET` para traduções automáticas do hub Arc

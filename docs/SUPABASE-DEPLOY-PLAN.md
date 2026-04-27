# Plano de Deploy — Infraestrutura Supabase (Sprint 6)

> Documento de referência para aplicar as migrations de banco e ativar o Auth Hook
> no projeto Supabase de produção (`dbaqvoatopfquaqgdptk`).

---

## Visão geral

As migrations abaixo formam o núcleo da infraestrutura multi-tenant do BeeIT OS-RT v2.
Elas precisam ser aplicadas **na ordem cronológica** (o Supabase CLI garante isso).

| Arquivo | O que faz |
|---|---|
| `20260424155100_helpers_auth.sql` | Funções RLS: `auth_tenant_id`, `user_belongs_to_tenant`, `is_tenant_admin`, `set_updated_at` |
| `20260424155200_schema_multitenant.sql` | Tabelas `tenant_protheus_config`, `user_tenant`, `protheus_dict_snapshot`, `protheus_dict_history` + RLS |
| `20260424161500_audit_protheus.sql` | Tabela `audit_protheus` append-only + RLS |
| `20260424163000_auth_hook_tenant_claim.sql` | Auth Hook v1 (`custom_access_token_hook`) — base, sobrescrita pela v2 abaixo |
| `20260424163100_provision_tenant_rpc.sql` | RPC `provision_tenant_protheus` + `list_provisioned_tenants` |
| `20260427100000_tenant_vault_alias_trigger.sql` | Trigger BEFORE INSERT: auto-preenche `basic_auth_ref` com alias determinístico do Vault |
| `20260427100100_auth_hook_vault_alias.sql` | Auth Hook v2: adiciona claim `vault_alias` ao JWT |

---

## Pré-requisitos

```bash
# Versão mínima recomendada
supabase --version   # >= 1.160.0

# Instalar / atualizar se necessário
npm install -g supabase
# ou
brew upgrade supabase
```

Variáveis que você vai precisar ter em mãos:
- `SUPABASE_DB_PASSWORD` — senha do banco (Supabase Dashboard → Settings → Database → Database password)
- `SUPABASE_SERVICE_ROLE_KEY` — chave service_role (Dashboard → Settings → API)

---

## Passo 1 — Login e link do projeto

```bash
# Autenticar na CLI do Supabase (abre browser para OAuth)
supabase login

# Dentro do diretório do repo:
cd /caminho/para/beeitimplantacao

# Vincular ao projeto remoto
supabase link --project-ref dbaqvoatopfquaqgdptk
# A CLI pedirá a senha do banco (SUPABASE_DB_PASSWORD)
```

Verificar se o link foi estabelecido:

```bash
supabase status
# Deve exibir: "Linked to project: dbaqvoatopfquaqgdptk"
```

---

## Passo 2 — Dry-run das migrations

Antes de aplicar, visualize o diff que será executado:

```bash
supabase db diff --linked
```

O output deve listar as tabelas, funções e triggers das migrations pendentes.
Se aparecer algo inesperado, investigue antes de prosseguir.

---

## Passo 3 — Aplicar migrations no banco remoto

```bash
supabase db push
```

A CLI exibe cada migration sendo aplicada. Saída esperada:

```
Applying migration 20260424155100_helpers_auth.sql...
Applying migration 20260424155200_schema_multitenant.sql...
Applying migration 20260424161500_audit_protheus.sql...
Applying migration 20260424163000_auth_hook_tenant_claim.sql...
Applying migration 20260424163100_provision_tenant_rpc.sql...
Applying migration 20260427100000_tenant_vault_alias_trigger.sql...
Applying migration 20260427100100_auth_hook_vault_alias.sql...
Finished supabase db push.
```

> **Se houver erro:** leia a mensagem de conflito. Em caso de tabela já existente
> (schema aplicado parcialmente em sessão anterior), use
> `supabase db push --include-all` para forçar reaplicação, ou resolva
> manualmente via SQL Editor no Dashboard.

---

## Passo 4 — Verificar objetos no banco

Abra o **SQL Editor** no Dashboard e execute:

```sql
-- Confirma tabelas principais
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'tenant_protheus_config',
    'user_tenant',
    'protheus_dict_snapshot',
    'protheus_dict_history',
    'audit_protheus'
  )
order by table_name;
-- Esperado: 5 linhas

-- Confirma funções críticas
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'auth_tenant_id',
    'is_tenant_admin',
    'user_belongs_to_tenant',
    'custom_access_token_hook',
    'provision_tenant_protheus',
    'set_tenant_vault_alias'
  )
order by routine_name;
-- Esperado: 6 linhas

-- Confirma triggers
select trigger_name, event_object_table
from information_schema.triggers
where trigger_schema = 'public'
order by event_object_table, trigger_name;
-- Esperado: tenant_protheus_config_set_updated_at
--           tenant_protheus_config_set_vault_alias
--           protheus_dict_snapshot_set_updated_at
```

---

## Passo 5 — Ativar o Auth Hook no Dashboard (ação manual)

O Supabase exige ativação manual do Auth Hook via interface web.
**Este passo não pode ser feito pela CLI.**

1. Acesse: [Dashboard → Authentication → Hooks](https://supabase.com/dashboard/project/dbaqvoatopfquaqgdptk/auth/hooks)
2. Localize a seção **"Customize Access Token (JWT) Claims"**
3. Clique em **"Add new hook"** (ou edite se já existir)
4. Selecione:
   - **Hook type:** `PostgreSQL function`
   - **Schema:** `public`
   - **Function:** `custom_access_token_hook`
5. Clique em **"Confirm"** e depois em **"Save"**

> **Alternativa via `config.toml`** (para futura automação via CI):
> Crie `supabase/config.toml` na raiz do repo com:
> ```toml
> [auth.hook.custom_access_token]
> enabled = true
> uri = "pg-functions://postgres/public/custom_access_token_hook"
> ```
> Em seguida: `supabase db push` re-aplica a configuração.
> Por enquanto o Dashboard é o método recomendado (sem necessidade de
> supabase/config.toml no repositório).

---

## Passo 6 — Provisionar o primeiro tenant

Use o script `scripts/setup-tenant.js` com `service_role`:

```bash
# Criar .env local (NUNCA commitar)
cat > .env <<EOF
SUPABASE_URL=https://dbaqvoatopfquaqgdptk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<sua_service_role_key>
EOF

# Provisionar (modo interativo)
node --env-file=.env scripts/setup-tenant.js

# Ou com flags (modo CI)
node --env-file=.env scripts/setup-tenant.js \
  --display-name "BeeIt Partner" \
  --url "http://beeit207327.protheus.cloudtotvs.com.br:10607" \
  --env P12 --company 01 --filial 0101 \
  --protheus-user <user> --protheus-pass <pass> \
  --admin-email admin@beeit.com.br
```

Saída esperada:

```
✅ Tenant provisionado com sucesso.
   tenant_id    : xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   display_name : BeeIt Partner
   protheus_url : http://beeit207327.protheus.cloudtotvs.com.br:10607
   vault_secret : tenant_<uuid_sem_hifens>_protheus_basicauth
   admin        : admin@beeit.com.br
```

Confirmar que o trigger gerou o `basic_auth_ref` correto:

```sql
select tenant_id, display_name, basic_auth_ref, active
from public.tenant_protheus_config
order by created_at desc
limit 1;
-- basic_auth_ref deve ser: tenant_<uuid_sem_hifens>_protheus_basicauth
```

---

## Passo 7 — Verificar JWT com vault_alias

Após o Auth Hook ativado e o tenant provisionado:

1. Faça login no sistema com o usuário admin vinculado ao tenant
2. Abra o DevTools → Application → Local Storage → `sb-dbaqvoatopfquaqgdptk-auth-token`
3. Copie o `access_token` e decodifique em [jwt.io](https://jwt.io)

O payload deve conter:
```json
{
  "tenant_id":      "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "role_in_tenant": "admin",
  "vault_alias":    "tenant_<uuid_sem_hifens>_protheus_basicauth",
  "app_metadata": {
    "tenant_id":      "xxxxxxxx-xxxx-...",
    "role_in_tenant": "admin",
    "vault_alias":    "tenant_<uuid_sem_hifens>_protheus_basicauth"
  }
}
```

> Se `vault_alias` estiver ausente: verifique se o Auth Hook está salvo no Dashboard
> (Passo 5) e force novo login (logout + login) para reemitir o JWT.

---

## Passo 8 — Smoke test da Edge Function

```bash
# Substitua <JWT> pelo access_token do usuário admin
export JWT="<access_token>"
export ANON_KEY="<supabase_anon_key>"  # Dashboard → Settings → API → anon public

# 1. Health (sem auth)
curl -s "https://dbaqvoatopfquaqgdptk.supabase.co/functions/v1/protheus-proxy/health" | jq .

# 2. Blueprint SA1 (com auth — exige JWT com tenant_id)
curl -s -X POST \
  "https://dbaqvoatopfquaqgdptk.supabase.co/functions/v1/protheus-proxy/protheus/api/v1/bda/dictionary/blueprint" \
  -H "Authorization: Bearer $JWT" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"aliases":["SA1"],"options":{"scope":"MANDATORY_AND_KEYS"}}' | jq '.status, (.blueprint | keys)'
# Esperado: "success" + ["SA1"]

# 3. Sem JWT → 401
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://dbaqvoatopfquaqgdptk.supabase.co/functions/v1/protheus-proxy/protheus/api/v1/bda/dictionary/blueprint"
# Esperado: 401
```

---

## Passo 9 — Deploy da Edge Function (se não deployada)

A Edge Function v3.1 está no repo mas **pode não estar deployada** (ver nota S3 no ROADMAP):

```bash
supabase functions deploy protheus-proxy \
  --project-ref dbaqvoatopfquaqgdptk \
  --no-verify-jwt
```

> `--no-verify-jwt` desativa a verificação de JWT _nativa_ do Supabase para esta
> função — o código da função faz a validação internamente via `getUser(jwt)`,
> que é mais precisa. Sem esta flag, requisições com JWTs válidos mas emitidos
> pelo hook (com claims extras) podem ser rejeitadas antes de chegar ao handler.

Verificar versão deployada:

```bash
curl -s "https://dbaqvoatopfquaqgdptk.supabase.co/functions/v1/protheus-proxy/health" | jq '.version'
# Esperado: "3.1"
```

---

## Checklist de conclusão

- [ ] `supabase db push` executado sem erros
- [ ] 5 tabelas criadas (verificado em Passo 4)
- [ ] 6 funções criadas (verificado em Passo 4)
- [ ] 3 triggers presentes (verificado em Passo 4)
- [ ] Auth Hook ativado no Dashboard (Passo 5)
- [ ] Primeiro tenant provisionado via `setup-tenant.js` (Passo 6)
- [ ] JWT pós-login contém `vault_alias` (Passo 7)
- [ ] Blueprint SA1 retorna `"success"` via Edge Function (Passo 8)
- [ ] Requisição sem JWT retorna 401 (Passo 8)
- [ ] Edge Function v3.1 deployada (Passo 9)

---

## Troubleshooting

### `supabase db push` falha com "relation already exists"

O schema foi aplicado parcialmente. Opções:
1. `supabase db push --include-all` — força reaplicação (idempotente se migrations usam `CREATE OR REPLACE` e `IF NOT EXISTS`)
2. Identifique qual migration falhou e aplique manualmente via SQL Editor

### Auth Hook não injeta claims

Causas comuns:
- Hook não foi salvo no Dashboard → verifique em Authentication → Hooks
- Usuário não tem vínculo em `user_tenant` → provisione o tenant e vincule o usuário
- Tenant está `active = false` → atualize: `update tenant_protheus_config set active = true where tenant_id = '<id>';`
- JWT ainda é o anterior (cacheado) → force `supabase.auth.refreshSession()` ou logout/login

### Edge Function retorna 403 "JWT sem claim tenant_id"

O JWT chegou à Edge sem o claim `tenant_id`. Isso ocorre quando:
- Auth Hook não está ativado (ver acima)
- Usuário logou antes da ativação do Hook → force novo login
- O usuário não está vinculado a nenhum tenant ativo em `user_tenant`

### `vault_alias` está presente no JWT mas Edge retorna 403 "Tenant sem configuração Protheus ativa"

O secret do Vault não foi criado. Execute o `setup-tenant.js` para provisionar
corretamente (ele chama `provision_tenant_protheus` que cria o secret via `vault.create_secret`).

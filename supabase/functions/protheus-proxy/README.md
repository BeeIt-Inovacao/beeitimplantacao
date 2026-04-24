# Edge Function: `protheus-proxy` (v3.0 — Hardened)

Proxy unificado com segurança reforçada (Sprint 3). Substitui o antigo servidor Node.js local na porta 3030.

Base URL: `https://dbaqvoatopfquaqgdptk.supabase.co/functions/v1/protheus-proxy`

---

## 🔒 Modelo de segurança

| Controle | Antes (v2) | Agora (v3) |
|---|---|---|
| CORS | `*` (qualquer origem) | Allow-list: `implantacao.com.br` + `localhost:*` dev |
| JWT Supabase | Config `verify_jwt=true` apenas | **Validação explícita no código** (`supabase.auth.getUser`) |
| Credenciais Protheus | Browser enviava `x-protheus-auth` | **Server-side** via `tenant_protheus_config` + Supabase Vault |
| Path allow-list | Qualquer `/protheus/*` passa | **Regex estrita** — só `/bda/dictionary/*`, `/bda/dynamic`, `/mata4XX` |
| Audit | Nenhum | Log append-only em `public.audit_protheus` |
| Rate-limit | Nenhum | *(planejado para Sprint 3.1, via Deno KV)* |

### Path allow-list (regex)

```regex
^(
  /api/v1/bda/(dictionary|dynamic)(/[a-z0-9_-]+)*
  |
  /api/v1/mata4\d{2}(/[a-z0-9_-]+)*
  |
  /rest/mata4\d{2}(/[a-z0-9_-]+)*
)$
```

Permite:
- ✅ `/api/v1/bda/dictionary/blueprint`
- ✅ `/api/v1/bda/dynamic`
- ✅ `/api/v1/mata410/pedido/123`
- ✅ `/rest/mata460/nota/NFE001`

Bloqueia:
- ❌ `/SIGAADV/...`
- ❌ `/api/admin/...`
- ❌ `/totvs-menu/*`
- ❌ `/rest/sa1` (leitura direta de tabela via REST padrão TOTVS)

---

## 🔑 Credenciais Protheus — server-side via Vault

1. Operador cadastra o Basic Auth do Protheus no Supabase Vault:
   ```bash
   # SQL via painel Supabase → SQL Editor → (execute como owner)
   select vault.create_secret(
     'tenant_<uuid-do-tenant>_protheus_basicauth',
     encode('usuario_protheus:senha_protheus', 'base64')
   );
   ```

2. O tenant aponta para o secret:
   ```sql
   insert into public.tenant_protheus_config
     (tenant_id, display_name, protheus_url, protheus_env,
      protheus_company, protheus_filial, basic_auth_ref)
   values (
     '<uuid-do-tenant>',
     'BeeIt Partner',
     'http://beeit207327.protheus.cloudtotvs.com.br:10607',
     'P12',
     '01',
     '0101',
     'tenant_<uuid-do-tenant>_protheus_basicauth'
   );
   ```

3. O browser **nunca** envia credenciais Protheus. A Edge:
   - Lê `tenant_id` do JWT claim.
   - Busca `tenant_protheus_config` via service_role (bypassa RLS).
   - Resolve o secret do Vault.
   - Injeta `Authorization: Basic <secret>` na chamada upstream.

---

## 📮 Exemplos de chamada

### Health check (público)
```bash
curl https://dbaqvoatopfquaqgdptk.supabase.co/functions/v1/protheus-proxy/health
```

### Blueprint do dicionário Protheus
```bash
curl -X POST \
  https://dbaqvoatopfquaqgdptk.supabase.co/functions/v1/protheus-proxy/protheus/api/v1/bda/dictionary/blueprint \
  -H "Authorization: Bearer <SUPABASE_JWT>" \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"aliases":["SA1","SB1"],"options":{"scope":"MANDATORY_AND_KEYS"}}' \
  | jq '.blueprint | keys'
```

> **⚠️ Diferença em relação à v2:** NÃO envie mais `x-protheus-auth`. A Edge resolve sozinha a partir do `tenant_id` no JWT.

### ViaCEP (público, só precisa do JWT Supabase)
```bash
curl https://dbaqvoatopfquaqgdptk.supabase.co/functions/v1/protheus-proxy/viacep/01310100 \
  -H "Authorization: Bearer <SUPABASE_JWT>" \
  -H "apikey: <SUPABASE_ANON_KEY>"
```

---

## 🔧 Variáveis de ambiente necessárias

Em **Project Settings → Edge Functions → Secrets** do Supabase:

| Nome | Injeção | Descrição |
|---|---|---|
| `SUPABASE_URL` | auto | URL do projeto |
| `SUPABASE_SERVICE_ROLE_KEY` | auto | Service role key (acesso ao Vault e audit) |
| `SUPABASE_ANON_KEY` | auto | Anon key |
| `SUPABASE_DB_URL` | auto | Postgres URL |

A v3 não exige `PROTHEUS_BASE_URL` como secret — a URL é lida de `tenant_protheus_config` por tenant.

### JWT custom claim `tenant_id`

O claim precisa estar presente no JWT emitido pelo Supabase Auth. Configurar via **Auth Hook** (ou JWT template) para preencher `tenant_id` a partir de `user_tenant`. Exemplo de hook:

```sql
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  tid uuid;
begin
  select tenant_id into tid
  from public.user_tenant
  where user_id = (event ->> 'user_id')::uuid
  order by created_at asc
  limit 1;

  if tid is not null then
    event := jsonb_set(event, '{claims,tenant_id}', to_jsonb(tid::text));
  end if;

  return event;
end;
$$;

-- Registrar como hook no Supabase:
-- Auth → Hooks → Customize Access Token → selecione custom_access_token_hook
```

---

## 🚨 Migração de v2 → v3 — Impacto no frontend

**Deploy da v3 sem migrar o frontend quebra produção imediatamente.** O frontend atual:

1. Envia `x-protheus-auth` — a v3 **ignora** (credenciais vêm do Vault).
2. Faz chamadas a paths fora da allow-list (ex.: `/protheus/rest/SA1` direto) — a v3 **bloqueia com 403**.

### Pré-requisitos antes do deploy

- [ ] `tenant_protheus_config` populada para todos os tenants ativos
- [ ] Segredos no Vault cadastrados (`tenant_<uuid>_protheus_basicauth`)
- [ ] Auth Hook injetando `tenant_id` no JWT (usuários precisam re-logar para obter novo token)
- [ ] Frontend removeu envio de `x-protheus-auth`
- [ ] Frontend usa apenas paths em allow-list (audit de grep `fetch\("https://.*protheus-proxy/protheus/`)

### Janela de deploy sugerida

1. Deploy da **migration** `audit_protheus` em produção.
2. Popular `tenant_protheus_config` + Vault (fora de janela — dados apenas).
3. Ativar Auth Hook para `tenant_id`.
4. Avisar usuários para relogarem (ou invalidar sessões existentes).
5. Deploy da **Edge v3**.
6. Smoke test completo antes de liberar para usuários.

---

## 📦 Deploy (quando autorizado)

```bash
# No diretório do repo
supabase link --project-ref dbaqvoatopfquaqgdptk
supabase functions deploy protheus-proxy --project-ref dbaqvoatopfquaqgdptk

# Migration do audit
supabase db push --linked
```

## 📜 Logs e auditoria

Infra Supabase:
```
https://supabase.com/dashboard/project/dbaqvoatopfquaqgdptk/functions/protheus-proxy/logs
```

Auditoria de negócio (por usuário/tenant):
```sql
select path, method, status, rejected_reason, duration_ms, created_at
from public.audit_protheus
where tenant_id = '<uuid>'
order by created_at desc
limit 100;
```

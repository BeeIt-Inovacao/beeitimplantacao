# Governança — Diário de Atividades por Sessão

Autor: Bruno Daniel 

> Arquivo incremental. Cada sessão de trabalho com IA ou dev deve registrar um bloco abaixo.
> Ordem: **mais recente primeiro**.
> Arquivo incremental. Cada sessão de trabalho com IA ou dev deve registrar um bloco abaixo.

---

## Índice de Sessões

| Data       | Sessão                            | Sprints          | Resumo                                                                                                                           |
| ---------- | --------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-29 | [S-2026-04-29-A](#s-2026-04-29-a) | R1.1 · SEC       | RLS recursion fix (PG14+ SECURITY DEFINER) + safe 404 handling + syncGrupo onclick quotes repair + build regen                   |
| 2026-04-28 | [S-2026-04-28-H](#s-2026-04-28-h) | S5.7             | fetch-interceptor dinâmico (EDGE_BASE lê window.BEEIT_EDGE_URL) + dev-server.js + E2E browser: interceptor→Edge local→Protheus   |
| 2026-04-28 | [S-2026-04-28-G](#s-2026-04-28-g) | SEC · GOV        | Laudo de segurança (RLS, JWT, anon key, tabelas sem homologação) + prompt Gemini como analista de backlog + tasks.md incremental |
| 2026-04-28 | [S-2026-04-28-F](#s-2026-04-28-f) | S6+ UX           | Drawer dicionário, btn Salvar Conexão→RPC provision, overlay genérico, loading Sincronizar, tabelas legadas criadas, dev.sh      |
| 2026-04-28 | [S-2026-04-28-E](#s-2026-04-28-e) | S5.6 + prep S5.7 | E2E local validado: Auth Hook, Vault, Edge→Protheus real→snapshot (HTTP 201)                                                     |
| 2026-04-28 | [S-2026-04-28-D](#s-2026-04-28-d) | Git Flow         | Sync develop→feature + integração ClickSign na Edge v3.1 + propagação de regras IA                                               |
| 2026-04-28 | [S-2026-04-28-C](#s-2026-04-28-c) | HUD · S1→S4      | Pivot HUD bConnect→TOTVS Acelerador + Gestão de OS (aiLog, PDF) + regras IA                                                      |
| 2026-04-28 | [S-2026-04-28-I](#s-2026-04-28-i) | S7 | Sprint 7 — Migração rotas legadas para Edge Function: health check, FASE 1/3, blueprint SA1/SB1, syncTabela fix |
| 2026-04-28 | [S-2026-04-28-B](#s-2026-04-28-b) | P0               | Hotfix P0 — RLS ativado nas 4 tabelas legadas + Auth Hook suspenso                                                               |
| 2026-04-28 | [S-2026-04-28-A](#s-2026-04-28-a) | 5.4 · 5.5        | Build injector + CI/CD pipeline atualizado                                                                                       |
| 2026-04-27 | [S-2026-04-27-B](#s-2026-04-27-b) | S7 · R1          | Sprint 7 (paths legados) + Release 1 — URL gerenciada, sync refactor, fetchDictBlueprint, drawer, badges                         |
| 2026-04-27 | [S-2026-04-27-A](#s-2026-04-27-a) | S6 SQL           | Sprint 6 — trigger vault alias + Auth Hook v2 (claim `vault_alias`) + SUPABASE-DEPLOY-PLAN.md                                    |

---

---

## S-2026-04-29-A

**Data:** 2026-04-29 (continuação de 2026-04-28)
**Branch:** `feature/os-rt-modularization`
**Commits:** `d096cb1` `63720ff` `af60309` `a54a3de`
**Migrations:** `20260428180000_fix_profiles_rls_recursion.sql` (criada)
**Roadmap:** R1.1 (concluída) · SEC (RLS hardening)
**OS Ativa:** OS-1042

---

### Contexto

Esta sessão foi dedicada ao hardening de segurança e correção de bugs críticos de UX no frontend. Os principais focos foram:

1. **RLS Recursion Fix (PG14+ SECURITY DEFINER behavior)** — Função `is_admin()` foi alterada para adicionar `SET row_security = off` na sua definição, evitando recursão infinita quando políticas de RLS tentam chamar a função. Este é um problema conhecido em PostgreSQL 14+ onde `SECURITY DEFINER` não bypassa RLS por padrão.

2. **Safe 404 Error Handling** — Funções `fetchDictBlueprint()` e `fetchDictBlueprintSA1SB1()` agora possuem guard clauses que tratam respostas HTTP não-OK (4xx, 5xx) com mensagens descritivas orientando o usuário a verificar credenciais/URL, em vez de falhar silenciosamente ou exibir erros genéricos.

3. **syncGrupo onclick Quotes Fix** — Corrigido crítico problema onde `JSON.stringify()` produzia aspas duplas dentro de atributos HTML `onclick="..."`, quebrando o HTML prematuramente (SyntaxError: Unexpected end of input). Solução implementada: `.replace(/"/g,"'")` converte aspas duplas para simples após stringify, tornando seguro embutir em atributos HTML.

4. **Build System Regeneration** — Após as correções, build foi regenerado via script e `public/index.html` foi atualizado automaticamente.

5. **R1.1 Expansion Documentation** — Roadmap atualizado refletindo conclusão de R1.1 (expansão horizontal do dicionário blueprint para 16 aliases: Contábil/Financeiro/Fiscal/AF).

---

### Fixes / Alterações no código

| Descrição | Arquivo | Commit | Tipo |
| --- | --- | --- | --- |
| Fix RLS infinita recursão em `is_admin()` — adiciona `SET row_security = off` | `supabase/migrations/20260428180000_fix_profiles_rls_recursion.sql` | — | Migration SQL |
| Safe 404 handling: `fetchDictBlueprint()` + `fetchDictBlueprintSA1SB1()` com guard clauses descritivas | `src/BeeIT-OS-RT-v2.html` | `af60309` | Fix |
| Quotes fix: `syncGrupo()` JSON.stringify → `.replace(/"/g,"'")` para atributos HTML seguros | `src/BeeIT-OS-RT-v2.html` | `af60309` + `a54a3de` | Fix |
| Build regeneration: `public/index.html` sincronizado via `node scripts/build-modules.js` | `public/index.html` | `a54a3de` | Chore |
| Roadmap atualizado: R1.1 concluída, API-v2 backlog formalmente registrado | `docs/ROADMAP.md` | `d096cb1` | Docs |
| UX expansion (R1.1): 16 aliases (CT1, CTT, CT5, SED, SE4, SE1, SE2, SA6, SEE, SF4, SB9, SN1, SN3) + badges `-hdr` suffix | `src/BeeIT-OS-RT-v2.html` | `63720ff` | Feat |

---

### Tabelas Supabase envolvidas

| Tabela | Schema | Operação | Contexto |
| --- | --- | --- | --- |
| `profiles` | `public` | Policy `profile_select_admin` — RLS | Corrigido recursão: policy agora usa `is_admin()` com `row_security=off` |
| `protheus_dict_snapshot` | `public` | SELECT/UPSERT via RPC | `fetchDictBlueprint()` com error handling seguro |

---

### Logs de erro tratados / prevenidos

| Erro | Causa Original | Fix Implementado |
| --- | --- | --- |
| `SyntaxError: Unexpected end of input` (onclick parse) | `JSON.stringify()` com aspas duplas dentro de `onclick="..."` | `.replace(/"/g,"'")` antes de embutir no atributo HTML |
| HTTP 404/500 silencioso | Falta de guard clause após `.fetch()` | `if (!res.ok) throw new Error(res.status === 404 ? "Credenciais/URL inválida" : res.statusText)` |
| **Infinite recursion** (PG 14+ RLS) | `is_admin()` chamada de policy `profile_select_admin` dispara RLS novamente | `SET row_security = off` na função — similar pattern em Oracle/SQL Server |

---

### Consultas/RPCs testadas

- ✅ `POST /protheus/api/v1/bda/dictionary/blueprint` (Edge Function) — agora com error handling
- ✅ `SELECT * FROM protheus_dict_snapshot` (Supabase RLS) — agora sem recursão
- ✅ `onclick="syncGrupo(['SA1','SA2'])"` — HTML parsing correto

---

### Build / Deploy

- ✅ `node --check` em `src/BeeIT-OS-RT-v2.html` validado
- ✅ `public/index.html` regenerado (109 linhas alteradas)
- ⏳ Próximo step: deploy em staging para validar Edge Function com nova migration RLS

---

## S-2026-04-28-F

**Data:** 2026-04-28
**Branch:** `feature/os-rt-modularization`
**Commits:** `50856c3` `9f2c9e8` `cd9504c` `af35775` `76f3e93` `a180257` `335a44b` `70bc12c`
**Roadmap:** S6 (pós-deploy SaaS) · S8 embrionário (dict-viewer)
**OS Ativa:** OS-1042

---

### Contexto

Com o deploy SaaS concluído (sessão anterior) e o E2E local validado, esta sessão poliu a interface de gerenciamento multi-tenant: persistência da conexão Protheus no banco, drawer lateral de visualização do dicionário SX3, overlay de processamento, loading no botão Sincronizar, criação formal das tabelas legadas no schema Supabase e configuração do ambiente local.

---

### Botões adicionados / UX

| ID / Chamada                              | Label                   | Função JS                     | Visibilidade / Gatilho                                                      |
| ----------------------------------------- | ----------------------- | ----------------------------- | --------------------------------------------------------------------------- |
| `#cfg-save-conn-btn`                      | 💾 Salvar Conexão        | `cfgSaveProtheusConn()`       | Aparece apenas após teste de conexão bem-sucedido (estado `conectado=true`) |
| `fetchDictBlueprint(['SA1','SA2','SB1'])` | 🔄 Sincronizar Cadastros | `fetchDictBlueprint(aliases)` | Topbar de implantação — primeiro sync ou re-sync manual                     |
| `syncGrupo(aliases)`                      | 🚀 Sync grupo            | `syncGrupo(aliases)`          | Cards de grupos de tabelas                                                  |
| `openDictDrawer(alias)`                   | 📖 Ver Dicionário        | `openDictDrawer(alias)`       | Uma linha por alias na listagem de tabelas                                  |
| `closeDictDrawer()`                       | ✕                       | `closeDictDrawer()`           | Header do drawer + clique no overlay escuro                                 |
| `#dict-drawer-btn-json`                   | `{}` Copiar JSON        | `_dictDrawerCopyJson()`       | Toolbar interna do drawer                                                   |
| `#dict-drawer-search`                     | *(input filtro)*        | `_dictDrawerFilter(value)`    | Toolbar interna do drawer — filtra em tempo real                            |

---

### Processos / Funções JS criadas ou alteradas

| Função                          | Arquivo  | Descrição                                                                                                                                                                    |
| ------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cfgSaveProtheusConn()`         | monólito | Lê URL/env/company/filial do form de config; chama RPC `provision_tenant_protheus` via `beeitSbFetch`; exibe `⏳ Salvando...` durante a operação; esconde o botão após salvar |
| `fetchDictBlueprint(aliases)`   | monólito | POST para Edge `/protheus/api/v1/bda/dictionary/blueprint`; faz UPSERT em `protheus_dict_snapshot`; atualiza badge de status com ✅ ou 🟡                                      |
| `checkDictSnapshots()`          | monólito | SELECT em `protheus_dict_snapshot` para verificar quais aliases têm snapshot; atualiza badges visuais na listagem                                                            |
| `_beeitTenantIdFromJWT()`       | monólito | Extrai `tenant_id` do JWT no localStorage sem biblioteca externa (atob + split)                                                                                              |
| `_sha256hex(str)`               | monólito | SHA-256 via `crypto.subtle.digest` — usado para hash do payload de campos (detecção de diffs)                                                                                |
| `openDictDrawer(alias)`         | monólito | Busca campos de `protheus_dict_snapshot` para o alias; renderiza no drawer com busca, ordenação e botão JSON                                                                 |
| `closeDictDrawer()`             | monólito | Remove overlay e fecha drawer                                                                                                                                                |
| `_dictDrawerFilter(value)`      | monólito | Filtra array de campos em tempo real por `x3_campo`, `x3_titulo` ou `x3_tipo`                                                                                                |
| `_renderSchemaRows(campos, el)` | monólito | Renderiza `<tr>` por campo: tipo, tamanho, decimal, obrigat., is_key, f3, combo                                                                                              |
| `_dictDrawerCopyJson()`         | monólito | Copia o array de campos em JSON formatado para o clipboard                                                                                                                   |
| `beeitShowOverlay(msg)`         | monólito | Bloqueia UI com overlay semi-transparente + spinner + mensagem customizável                                                                                                  |
| `beeitHideOverlay()`            | monólito | Remove overlay                                                                                                                                                               |
| `_refreshDictBadges()`          | monólito | Atualiza contadores e cores dos badges de sincronização após cada operação                                                                                                   |
| `beeitInit` (fix)               | monólito | Corrigido para não derrubar a sessão quando `profiles` retorna erro (tabela ainda não existia no banco remoto)                                                               |

---

### Tabelas Supabase envolvidas

| Tabela                   | Schema   | Operação        | Contexto                                                                 |
| ------------------------ | -------- | --------------- | ------------------------------------------------------------------------ |
| `tenant_protheus_config` | `public` | INSERT via RPC  | Botão Salvar Conexão →`provision_tenant_protheus`                        |
| `protheus_dict_snapshot` | `public` | UPSERT / SELECT | `fetchDictBlueprint` grava; `openDictDrawer` e `checkDictSnapshots` leem |
| `profiles`               | `public` | SELECT          | `beeitInit` lê nome/role do usuário logado                               |
| `access_log`             | `public` | INSERT          | Log de ações (legado)                                                    |
| `clientes`               | `public` | —               | Criada na migration; não exposta no frontend ativo                       |
| `documentos`             | `public` | —               | Criada na migration; não exposta no frontend ativo                       |

---

### Migrations criadas nesta sessão

| Arquivo                                   | O que faz                                                                                                                                                                                                                                     |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20260427115900_legacy_tables_create.sql` | Cria `profiles`, `access_log`, `clientes`, `documentos` com `IF NOT EXISTS`. Trigger `on_auth_user_created` em `auth.users` → cria profile automaticamente no cadastro. Insere profile do `admin@beeit.com.br` se já existir em `auth.users`. |
| `supabase/config.toml`                    | Configura vault schema em `[db.shadow]` e `[auth.hook.custom_access_token]` para o ambiente local                                                                                                                                             |

---

### Queries / RPCs notáveis

```sql
-- Chamada pelo botão "Salvar Conexão"
SELECT provision_tenant_protheus(
  p_display_name, p_protheus_url, p_protheus_env,
  p_protheus_company, p_protheus_filial, p_basic_auth_b64, p_admin_email
);

-- UPSERT de snapshot após sync (fetchDictBlueprint)
POST /rest/v1/protheus_dict_snapshot
Headers: Prefer: resolution=merge-duplicates
Body: { tenant_id, user_id, sx2_alias, campos, campos_hash, scope, ... }

-- SELECT do drawer lateral (openDictDrawer)
SELECT campos FROM protheus_dict_snapshot
WHERE tenant_id = $tenant AND user_id = auth.uid() AND sx2_alias = $alias;

-- Trigger automático de profile (migration legacy)
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, role, ativo)
  VALUES (new.id, new.email,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'role', 'consultor'), true)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END; $$;
```

---

### Outros artefatos

| Artefato                              | Descrição                                                                                                                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/dev.sh`                      | Shell script que sobe ambiente local completo:`supabase start`, `supabase functions serve`, `node scripts/dev-server.js` em background. Útil para testar E2E sem docker manual. |
| Fix `#cfg-save-conn-btn` visibilidade | Botão ocultado automaticamente quando `protheus_url` já vem do banco (UX gerenciada — sem duplicar a ação)                                                                      |

---

### Resumo de artefatos desta sessão

| Artefato                                                      | Tipo                | Status                                                |
| ------------------------------------------------------------- | ------------------- | ----------------------------------------------------- |
| `src/BeeIT-OS-RT-v2.html` + `public/index.html`               | Alterado (monólito) | ✅ 8 commits · drawer, overlay, loading, UX gerenciada |
| `supabase/migrations/20260427115900_legacy_tables_create.sql` | Migration nova      | ✅ criada · commitada `335a44b`                        |
| `supabase/config.toml`                                        | Config local        | ✅ vault + auth hook local · commitada `70bc12c`       |
| `scripts/dev.sh`                                              | Script novo         | ✅ criado · commitado `9f2c9e8`                        |

---

---

## S-2026-04-28-E

**Data:** 2026-04-28
**Branch:** `feature/os-rt-modularization`
**Roadmap:** Sprint S5.6 (E2E Local) + abertura S5.7
**OS Ativa:** OS-1042
**Commits desta sessão:** nenhum — sessão de configuração e testes locais (arquivos `.env.local`, `config.toml`, scripts temporários e plano)

---

### Contexto de entrada

S5.5 concluída (CI/CD pipeline + build injector). Fetch-interceptor já injetado em `public/index.html`.
Objetivo da sessão: validar ponta-a-ponta o fluxo de autenticação e extração de dicionário **no ambiente local** (Supabase + OrbStack), atingindo o Protheus real na nuvem via túnel Edge Function.

---

### S5.6 — Laboratório E2E Local

#### Infraestrutura configurada

**`supabase/config.toml` — duas mudanças:**

| Seção adicionada/alterada                                                                                                | Motivo                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `[auth.hook.custom_access_token]` — `enabled = true` / `uri = "pg-functions://postgres/public/custom_access_token_hook"` | Ativar o Auth Hook localmente para injetar `tenant_id` no JWT a cada login                                        |
| `schemas = ["public", "graphql_public", "vault"]`                                                                        | Expor o schema `vault` ao PostgREST para a Edge Function acessar `vault.decrypted_secrets` via `.schema("vault")` |

Ambas requerem `supabase stop && supabase start` para surtir efeito (sem reset de DB — dados preservados em volumes Docker).

**`.env.local` — criado e corrigido:**

```
SUPABASE_URL=http://127.0.0.1:54321     ← comentada depois (fix Docker B1)
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
PROTHEUS_REST_URL=https://beeit207327.protheus.cloudtotvs.com.br:10607/rest
PROTHEUS_REST_USER=admin
PROTHEUS_REST_PASSWORD=***
LOCAL_ADMIN_EMAIL=admin@beeit.com.br
LOCAL_ADMIN_PASS=***
```

Separadores `:` (não-padrão) corrigidos para `=`. `SUPABASE_URL` comentada para não sobrescrever a URL Docker interna auto-injetada pelo `supabase functions serve`.

---

#### Scripts criados

| Script                         | Propósito                                                                                                         | Ciclo de vida                                                        |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `scripts/run-setup-secure.js`  | Cria usuário `admin@beeit.com.br` via Admin API + chama RPC `provision_tenant_protheus` sem expor senhas no shell | Temporário — auto-deleta após execução (`fs.unlinkSync(__filename)`) |
| `scripts/test-extract-dict.js` | Teste E2E: login → JWT → Edge Function → Protheus real → UPSERT em `protheus_dict_snapshot`                       | Permanente — ferramenta de validação local                           |

Ambos: zero dependências npm, Node 20+ nativo (`fetch`, `crypto`, `fs`).

---

#### Tenant provisionado (banco local)

| Campo                                 | Valor                                                                 |
| ------------------------------------- | --------------------------------------------------------------------- |
| `tenant_id`                           | `2234d38d-4c17-4872-a1d2-7ee127d4705c`                                |
| `display_name`                        | BeeIT Homologação                                                     |
| `protheus_url`                        | `https://beeit207327.protheus.cloudtotvs.com.br:10607/rest`           |
| `protheus_env` / `company` / `filial` | P12 / 01 / 0101                                                       |
| `basic_auth_ref` (Vault)              | `tenant_2234d38d4c174872a1d27ee127d4705c_protheus_basicauth`          |
| `active`                              | `true`                                                                |
| Admin                                 | `admin@beeit.com.br` · user_id `18236a42-1247-48f5-8377-0eff529cdeb9` |

---

#### Ciclo de debug — 3 bloqueios resolvidos em sequência

| #      | Erro apresentado                                          | Causa raiz                                                                                                                                                            | Fix aplicado                                                                                                 |
| ------ | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **B1** | `403: Tenant sem configuração Protheus ativa`             | `SUPABASE_URL=127.0.0.1` no `.env.local` sobrescrevia a URL auto-injetada. Deno (dentro do container OrbStack) não alcança `127.0.0.1` do host                        | Comentar `SUPABASE_URL` no `.env.local`. A Edge Function passa a usar a URL Docker interna injetada pelo CLI |
| **B2** | `403: Tenant sem configuração Protheus ativa` (persistia) | `vault` não estava em `schemas` do PostgREST → `PGRST106: Invalid schema: vault`. O `if (vErr \|\| !secret) return null` na Edge Function silencia o erro → mesmo 403 | Adicionar `"vault"` a `schemas` no `config.toml` + reiniciar Supabase                                        |
| **B3** | `404` com HTML de erro HTTPREST do Protheus               | Script chamava `/api/v1/bda/dynamic` — endpoint inexistente. O correto (confirmado via curl do usuário) é `/api/v1/bda/dictionary/blueprint`                          | Corrigir URL no `test-extract-dict.js`                                                                       |
| **B4** | `❌ SUPABASE_URL ausente em .env.local`                    | Após comentar a linha no `.env.local`, o script Node (que roda no host) perdeu a URL para suas chamadas REST diretas                                                  | Adicionar fallback hardcoded:`env.SUPABASE_URL \|\| 'http://127.0.0.1:54321'` no script                      |

**Nota arquitetural:** `resolveProtheusCredentials` na Edge Function retorna `null` para qualquer falha nas duas queries (tenant config OU Vault), gerando sempre o mesmo `403 "Tenant sem configuração Protheus ativa"`. Isso dificulta diagnóstico. Registrado como melhoria futura.

---

#### Tabelas envolvidas

| Tabela                   | Schema   | Operações                                                                   |
| ------------------------ | -------- | --------------------------------------------------------------------------- |
| `tenant_protheus_config` | `public` | INSERT via RPC `provision_tenant_protheus`; SELECT pela Edge Function       |
| `user_tenant`            | `public` | INSERT via RPC; SELECT pelo script (confirma tenant_id)                     |
| `protheus_dict_snapshot` | `public` | UPSERT (`POST /rest/v1` + `Prefer: resolution=merge-duplicates`) → HTTP 201 |
| `audit_protheus`         | `public` | INSERT automático pela Edge Function (best-effort)                          |
| `decrypted_secrets`      | `vault`  | SELECT pela Edge Function via `.schema("vault").from("decrypted_secrets")`  |
| `users`                  | `auth`   | INSERT via Admin API `/auth/v1/admin/users`; SELECT via `getUser(jwt)`      |

#### RPCs e endpoints utilizados

| Tipo               | Endpoint                                                                     | Propósito                                            |
| ------------------ | ---------------------------------------------------------------------------- | ---------------------------------------------------- |
| RPC PostgREST      | `POST /rest/v1/rpc/provision_tenant_protheus`                                | Cria tenant + grava Basic Auth no Vault atomicamente |
| Supabase Admin API | `POST /auth/v1/admin/users`                                                  | Cria `admin@beeit.com.br` com email confirmado       |
| Supabase Auth      | `POST /auth/v1/token?grant_type=password`                                    | Login → JWT com `tenant_id` injetado pelo Auth Hook  |
| Edge Function      | `POST /functions/v1/protheus-proxy/protheus/api/v1/bda/dictionary/blueprint` | Proxy → Protheus real (SA1, SB1)                     |
| PostgREST REST     | `GET /rest/v1/user_tenant?user_id=eq.{id}`                                   | Confirma tenant_id do usuário                        |
| PostgREST REST     | `POST /rest/v1/protheus_dict_snapshot`                                       | UPSERT do blueprint extraído                         |

#### Queries psql de diagnóstico

```sql
-- Confirmar tenant
SELECT tenant_id, display_name, basic_auth_ref, active
FROM public.tenant_protheus_config
WHERE tenant_id = '2234d38d-4c17-4872-a1d2-7ee127d4705c';

-- Confirmar secret no Vault
SELECT name, left(decrypted_secret, 6) || '...' AS preview
FROM vault.decrypted_secrets
WHERE name = 'tenant_2234d38d4c174872a1d27ee127d4705c_protheus_basicauth';

-- Testar acesso REST ao vault (confirmou PGRST106 como root cause do B2)
-- GET /rest/v1/decrypted_secrets + Accept-Profile: vault → {"code":"PGRST106",...}
```

---

#### Resultado final

```
✅ JWT obtido com tenant_id: 2234d38d-4c17-4872-a1d2-7ee127d4705c
✅ Vínculo tenant confirmado no banco local
✅ Edge Function → Protheus real: POST /api/v1/bda/dictionary/blueprint
✅ SA1 + SB1 extraídos com sucesso
✅ UPSERT em protheus_dict_snapshot → HTTP 201
```

---

### Fechamento de governança

| Arquivo                      | O que mudou                                               |
| ---------------------------- | --------------------------------------------------------- |
| `docs/ROADMAP.md`            | S5.6 → ✅ com evidência (HTTP 201); S5.7 linkada com plano |
| `docs/SPRINT-5.7-PLAN.md`    | Criado — plano técnico em 4 tasks para o próximo ciclo    |
| `Governanca/bdapowered.html` | `aiLog` da OS-1042 atualizado com resumo da sessão        |
| `Governanca/tasks.md`        | Este arquivo — sessão E registrada                        |

---

### Resumo de artefatos desta sessão

| Artefato                       | Tipo                         | Status                                                         |
| ------------------------------ | ---------------------------- | -------------------------------------------------------------- |
| `.env.local`                   | Config local (não commitado) | ✅ corrigido — separadores,`SUPABASE_URL` comentada, vars admin |
| `supabase/config.toml`         | Config versionada            | ✅ Auth Hook + vault schema                                     |
| `scripts/run-setup-secure.js`  | Script temporário            | ✅ executado · auto-deletado                                    |
| `scripts/test-extract-dict.js` | Script de teste permanente   | ✅ criado + 4 correções                                         |
| `docs/ROADMAP.md`              | Documentação                 | ✅ S5.6 fechada, S5.7 aberta                                    |
| `docs/SPRINT-5.7-PLAN.md`      | Documentação                 | ✅ criado (197 linhas)                                          |
| `Governanca/bdapowered.html`   | HUD privado                  | ✅ aiLog OS-1042 atualizado                                     |

### Pendências pós-sessão (Sprint 5.7)

- [ ] S5.7.1 — `src/core/fetch-interceptor.js`: 1 linha — `EDGE_BASE` lê `window.BEEIT_EDGE_URL || <prod>`
- [ ] S5.7.2 — `scripts/dev-server.js`: dev server Node que injeta URLs locais no HTML servido
- [ ] S5.7.3 — Validação browser E2E (checklist 7 pontos — F12 Network)
- [ ] S5.7.4 — Rebuild `public/index.html` + `node --check` + commit

---

---

---

## S-2026-04-28-D

**Data:** 2026-04-28
**Branch:** `feature/os-rt-modularization`
**Commits:** `bb9bcfd` (merge develop→feature) · `c2082d7` (ROADMAP)
**Roadmap:** Git Flow Governance · preparação Sprint S6
**OS Ativa:** OS-1042

---

### Contexto

Após a cirurgia de isolamento de branches (sessão anterior), as frentes de
Bruno (modularização/segurança) e Daniel (monólito/ClickSign) estavam
separadas. Esta sessão sincronizou a `feature/os-rt-modularization` com o
`develop` (que contém o ClickSign do Daniel), resolveu o conflito estrutural
na Edge Function e propagou as regras Git Flow para todas as branches ativas.

---

### 1 — Sincronização Git Flow: main → develop → feature

| Passo                       | Branch                         | Resultado                   |
| --------------------------- | ------------------------------ | --------------------------- |
| `git pull origin main`      | `main`                         | Já em `b67829e` — nada novo |
| `git merge --ff-only main`  | `develop`                      | Já up-to-date (`3f95fae`)   |
| `git merge --no-ff develop` | `feature/os-rt-modularization` | Conflito em `index.ts`      |

**Auto-merge bem-sucedido:** `public/index.html` — regiões distintas (injeção `<head>` vs UI ClickSign no `<body>`) resolvidas automaticamente pelo git.

---

### 2 — Integração das rotas ClickSign na Edge v3.1

**Arquivo alterado:** `supabase/functions/protheus-proxy/index.ts`

**Conflito resolvido com `git checkout --ours`** (v3.1 como base) + adição manual das rotas ClickSign com JWT obrigatório.

#### Constantes adicionadas

```ts
const CLICKSIGN_BASE = "https://app.clicksign.com";
const CLICKSIGN_SBOX = "https://sandbox.clicksign.com";
```

#### Rotas adicionadas (após `/brasilapi/`)

```ts
if (path.startsWith("/clicksign/")) {
  return await proxyPublic(origin, `${CLICKSIGN_BASE}${rest}${search}`, req);
}
if (path.startsWith("/clicksign-sandbox/")) {
  return await proxyPublic(origin, `${CLICKSIGN_SBOX}${rest}${search}`, req);
}
```

#### Tabela de rotas da Edge v3.1 pós-merge

| Rota                   | Destino               | JWT | Vault | Audit |
| ---------------------- | --------------------- | --- | ----- | ----- |
| `/protheus/<path>`     | Protheus REST         | ✅   | ✅     | ✅     |
| `/ibge/*`              | IBGE localidades      | ✅   | ❌     | ❌     |
| `/viacep/:cep`         | ViaCEP                | ✅   | ❌     | ❌     |
| `/brasilapi/*`         | BrasilAPI             | ✅   | ❌     | ❌     |
| `/clicksign/*`         | app.clicksign.com     | ✅   | ❌     | ❌     |
| `/clicksign-sandbox/*` | sandbox.clicksign.com | ✅   | ❌     | ❌     |
| `/health`              | –                     | ❌   | ❌     | ❌     |

#### Segurança das rotas ClickSign

| Aspecto                    | Comportamento                                            |
| -------------------------- | -------------------------------------------------------- |
| JWT Supabase               | ✅ Obrigatório (check global antes das rotas)             |
| `access_token` ClickSign   | Trafega como query param — responsabilidade do monólito  |
| Basic Auth Protheus        | ❌ Não aplicável (`proxyPublic()` sem credenciais extras) |
| Audit log `audit_protheus` | ❌ Não — apenas `/protheus/` gera registros               |
| CORS                       | ✅ Allow-list:`implantacao.com.br` + `localhost:*`        |

#### Validações realizadas (11/11 ✅)

```
✅ Sem conflitos  ✅ v3.1  ✅ JWT authenticate()  ✅ Vault resolveProtheusCredentials
✅ CORS allow-list  ✅ Legacy alias allow-list  ✅ Audit log
✅ CLICKSIGN_BASE  ✅ CLICKSIGN_SBOX  ✅ Rota /clicksign/  ✅ Rota /clicksign-sandbox/
```

---

### 3 — Propagação de regras Git Flow

**Arquivo:** `.claude/rules/git-flow.md`

#### Cadeia de propagação

```
feature/os-rt-modularization (criação original)
  → git checkout <branch> -- .claude/rules/git-flow.md
         ↓
    develop  (commit 3f95fae)
         ↓
    git merge --ff-only develop
         ↓
    feature/clicksign-daniel  (commit 3f95fae)
```

Diretiva crítica gravada na regra para o Claude do Daniel:

> **"Executar imediatamente ao iniciar a sessão: `git checkout feature/clicksign-daniel && git pull origin feature/clicksign-daniel`"**

---

### 4 — Topologia Git resultante

```
main                  b67829e  ← produção (Daniel's ClickSign)
  └── develop         3f95fae  ← integração
        ├── feature/os-rt-modularization  c2082d7  ← Bruno (S1-5 + ClickSign integrado)
        └── feature/clicksign-daniel      3f95fae  ← Daniel (monólito atual)
```

---

### Resumo de artefatos desta sessão

| Artefato                                     | Tipo               | Status                                                  |
| -------------------------------------------- | ------------------ | ------------------------------------------------------- |
| `supabase/functions/protheus-proxy/index.ts` | Conflito resolvido | ✅ v3.1 + ClickSign · commit `bb9bcfd`                   |
| `public/index.html`                          | Auto-merged        | ✅ head injection + ClickSign UI · commit `bb9bcfd`      |
| `.claude/rules/git-flow.md`                  | Propagado          | ✅ develop + feature/clicksign-daniel · commit `3f95fae` |
| `docs/ROADMAP.md`                            | Atualizado         | ✅ topologia · commit `c2082d7`                          |
| `Governanca/tasks.md`                        | Atualizado         | ✅ esta entrada (não commitado — privado)                |

### Pendências pós-sessão

- [ ] Deploy Edge v3.1 com rotas ClickSign: `supabase functions deploy protheus-proxy --project-ref dbaqvoatopfquaqgdptk`
- [ ] Smoke test: `curl .../functions/v1/protheus-proxy/health` → confirmar `version: "3.1"`
- [ ] Verificar chamadas ClickSign com JWT no browser (DevTools → Network)
- [ ] Reativar Auth Hook no Dashboard Supabase (bloqueado desde Hotfix P0)
- [ ] Iniciar Sprint S6: migração paths legados (`/SA1/`, `/SX3/`) → `/api/v1/bda/dynamic`
---

---

## S-2026-04-28-C
**Data:** 2026-04-28
**Branch:** `feature/os-rt-modularization`
**Commits:** `9a6707d` (gitignore) · `458b12b` (sync-hud + cursorrules) · `b3b41b6` (diário OS incremental)
**Roadmap:** HUD governance · Sprints S1→S4 (DEFAULT_CARDS reescrito)
**OS Ativa:** OS-1042

---

### Contexto

Sessão de governança e pivot de contexto. O HUD local (`Governanca/bdapowered.html`) estava com toda a identidade do projeto bConnect 2.0 (NestJS / RD Station / DigitalOcean). O projeto real é **BeeIT Implantação — TOTVS Acelerador Protheus**. A sessão executou: pivot textual do HUD, evolução do módulo de Gestão de OS com campo de diário incremental da IA (`aiLog`) e exportação PDF via `window.print()`, e atualização das regras do assistente.

---

### C.1 — Proteção do HUD no `.gitignore`

**Arquivo:** `.gitignore` · **Commit:** `9a6707d`

Linhas adicionadas:
```
Governanca/bdapowered.html
bdapowered.html
```
`git rm --cached` executado como precaução — arquivo não estava rastreado (noop seguro).

---

### C.2 — Regras de automação do assistente

**Commit:** `458b12b`

| Arquivo criado | Papel |
|---|---|
| `.claude/rules/sync-hud.md` | Máx 3 tarefas/sessão → atualizar `DEFAULT_CARDS` + `ROADMAP.md` → commitar → parar |
| `.cursorrules` | Réplica das regras essenciais para compatibilidade com Cursor IDE |

---

### C.3 — Regra de Diário de OS Incremental

**Arquivo:** `.claude/rules/sync-hud.md` · **Commit:** `b3b41b6`

Ao encerrar a sessão, **injetar** (concatenar, nunca sobrescrever) no campo `aiLog` da OS ativa um resumo técnico de 2 linhas prefixado com `YYYY-MM-DD:`. O `aiLog` alimenta o PDF gerado por `printOS()`.

---

### C.4 — Pivot de contexto no HUD (`Governanca/bdapowered.html`)

Arquivo local — não versionado (`.gitignore`).

#### Textos substituídos

| Elemento | De | Para |
|---|---|---|
| `<title>` | bConnect 2.0 HUD | BeeIT Implantação HUD |
| `<h1>` | bConnect 2.0 — Project HUD | BeeIT Implantação — TOTVS Acelerador |
| Footer | bConnect 2.0 HUD | BeeIT OS-RT v2 HUD · PO Tech Lead: Bruno Abrigo |
| Stack | NestJS + Fastify + Redis/BullMQ + Docker | HTML/CSS/JS vanilla · Supabase · Protheus REST API |
| Objetivo | Conectar RD Station CRM via BullMQ | Painel de aceleração, sync REST Protheus, API Cadastros |

#### Trilhas reescritas

| Trilha | Antes | Depois |
|---|---|---|
| 1 | Core & Infra (NestJS, Docker, mTLS) | Core & Segurança (Supabase Auth, Edge v3.1, fetch interceptor) |
| 2 | Provisionamento & Setup (RD Station OAuth2) | Sincronização & Módulos (SA1/SA2/SB1, SX3, ClickSign, Anthropic API) |

#### Timeline — 4 fases mapeadas ao roadmap real

| Fase | Sprints | Status |
|---|---|---|
| Setup, Segurança & Proxy | S1–S3 | ✅ Concluído Abr/2026 |
| Infra Tenant + Auth Hook v2 | S4–S6 | 🔄 Em andamento |
| Migração Paths + Módulos | S7–S9 | ⏳ Planejado Mai–Jun/2026 |
| Go-Live & Monólito Eliminado | S10 | ⏳ Backlog Jul/2026 |

---

### C.5 — Diagrama Mermaid — graph LR (horizontal)

Substituído de vertical (NestJS/BullMQ) para horizontal representando o stack BeeIT real:

```
App Front-End (implantacao.com.br)
  ├─ Autenticação (Supabase Auth)  ──┐
  └─ Configs API (Edge Secrets)    ──┤
                                     ▼
                          Middleware (Edge Function)
                            ├─ REST TOTVS Protheus 12 (SA1 · SA2 · SB1)
                            ├─ ClickSign (Assinatura Digital)
                            └─ Anthropic API (Análise Cadastral)
```

---

### C.6 — DEFAULT_CARDS — 4 Sprints reais (20 cards)

**localStorage key:** `bconnect_cards`

**Estrutura de um card:**

```javascript
{ id, title, desc,
  track,    // BIZ | DEV | ADMIN | SEC
  priority, // P1 | P2 | P3
  col,      // done | wip | todo | backlog
  sprint }  // true = aparece na aba Sprint atual
```

**Distribuição dos 20 cards:**

| Sprint | Cards | done | wip | todo | backlog |
|---|---|---|---|---|---|
| S1 — Setup Painel e Configurações | 5 | 4 | 1 | 0 | 0 |
| S2 — Conexão REST Protheus | 5 | 4 | 0 | 1 | 0 |
| S3 — Sincronizador de Dados | 5 | 2 | 1 | 0 | 2 |
| S4 — Servidor, Carga e Go-Live | 6 | 1 | 0 | 2 | 3 |

**DEFAULT_SPRINT atualizado:**

```javascript
{ name: 'Sprint 6 — Deploy Supabase Infra Tenant + Auth Hook v2',
  number: 6, start: '2026-04-21', end: '2026-05-05',
  goal: 'supabase db push + deploy Edge v3.1 + Auth Hook v2 no Dashboard. Fechar S5.6.' }
```

**localStorage key:** `bconnect_sprint`

---

### C.7 — Tab Dev — Ambientes atualizados

| Ambiente | Status | Detalhe |
|---|---|---|
| Hostinger PROD | ✅ ONLINE | implantacao.com.br · FTP via CI |
| Supabase PROD | 🟠 PENDENTE | dbaqvoatopfquaqgdptk · Edge v3.1 aguardando deploy |
| Protheus Cloud TOTVS | 🔵 EXTERNO | beeit207327.protheus.cloudtotvs.com.br:10607 |

---

### C.8 — Estrutura de dados OS — campo `aiLog`

**localStorage key:** `beeit_os_orders`

**Estrutura nova:** `{ id, num, client, type, status, date, desc, aiLog }`

`aiLog`: string concatenada por sessão, formato `YYYY-MM-DD: resumo.\n`

| OS | Status | aiLog inicial |
|---|---|---|
| OS-1042 | Em Execução | 2026-04-27: Trigger set_tenant_vault_alias implementado e Auth Hook v2 desenvolvido. Deploy remoto pendente. |
| OS-1041 | Aguardando Cliente | (vazio) |
| OS-1040 | Validando | 2026-04-15: Fetch interceptor implementado. Build injector criado. Pendente: S5.6. |

---

### C.9 — Modal de OS — campo Diário IA (#os-edit-ailog)

Novo `<textarea id="os-edit-ailog" rows="4">` adicionado ao modal `#os-modal` (após campo `desc`).

| Função | Mudança |
|---|---|
| `openOsModal(id)` | Lê `o.aiLog \|\| ''` → popula `#os-edit-ailog` |
| `saveOs()` | Captura `.value.trim()` → persiste em `entry.aiLog` |

---

### C.10 — Botão PDF e função `printOS(id)`

Botão `<i class="ph-bold ph-file-pdf">PDF</i>` adicionado em cada linha da tabela de OS.

**Processo `printOS(id)`:**

1. Localiza objeto em `osOrders` por id
2. Gera HTML em `#print-area` (div oculta no dashboard):
   - Cabeçalho: "BdaPowered™" + "Ordem de Serviço"
   - Título: "BeeIT Implantação — TOTVS Acelerador Protheus"
   - Tabela de metadados: num · client · type · status · date · responsável (Bruno Abrigo, fixo)
   - Descrição (campo `desc`)
   - Diário da IA (campo `aiLog`, renderizado com `<br>`, fundo `#f8fafc`)
   - Rodapé: data/hora de geração + "bdapowered.html · Uso interno BeeIT Inovação"
3. `window.print()` → browser abre diálogo impressão/PDF

**CSS `@media print` adicionado:**

```css
body > * { display: none !important; }        /* oculta todo o dashboard */
header, footer, .modal-overlay { display: none !important; }
#print-area { display: block !important; background:#fff; color:#111; padding:40px; }
.print-brand   { font: 700 22px 'Rajdhani'; color:#0077b6; }
.print-label   { color:#64748b; font-size:11px; text-transform:uppercase; }
.print-value   { color:#0f172a; font-size:13px; }
.print-log     { background:#f8fafc; border:1px solid #e2e8f0; padding:12px; }
.print-footer  { font-size:10px; color:#94a3b8; text-align:center; }
```

---

### C.11 — Aba "Gestão de OS" — botões e funções JS

| Elemento | ID / Função | Comportamento |
|---|---|---|
| Botão nav | `showTab('os', btn)` | Ativa aba → chama `renderOs()` |
| Filtro status | `#os-filter-status` | onchange → `renderOs()` |
| Filtro tipo | `#os-filter-type` | onchange → `renderOs()` |
| Contador | `#os-count` | "N OS de M exibidas" |
| Nova OS | `openOsModal()` | Abre `#os-modal` com campos zerados, num auto-gerado |
| PDF | `printOS(id)` | Gera doc + `window.print()` |
| Editar | `editOs(id)` → `openOsModal(id)` | Popula modal com dados |
| Excluir | `deleteOs(id)` | `confirm()` + remove de `osOrders` + `saveOs_()` |

---

### Resumo de artefatos desta sessão

| Artefato | Tipo | Commitado? |
|---|---|---|
| `.gitignore` | Modificado | ✅ `9a6707d` |
| `.claude/rules/sync-hud.md` | Criado → Modificado | ✅ `458b12b` + `b3b41b6` |
| `.cursorrules` | Criado | ✅ `458b12b` |
| `Governanca/bdapowered.html` | Modificado (pivot + OS + PDF) | ❌ privado (.gitignore) |

### Pendências pós-sessão

- [ ] Deploy remoto Supabase (ver checklist `docs/SUPABASE-DEPLOY-PLAN.md`)
- [ ] Teste S5.6 — integração fetch interceptor ponta-a-ponta com credenciais reais
- [ ] Atualizar `docs/ROADMAP.md` ao concluir deploy (S6 wip → done)
- [ ] Reativar Auth Hook após validação das tabelas legadas (ver S-2026-04-28-B)



## S-2026-04-28-I
**Data:** 2026-04-28
**Branch:** `feature/os-rt-modularization`
**Commit:** `0460345`
**Roadmap:** Sprint S7 (migração de rotas legadas → Edge Function)
**OS Ativa:** OS-1042
**Modelo IA:** Claude Sonnet 4.6

---

### Contexto

Sprint 5.7 validou o encadeamento E2E completo (browser → fetch-interceptor → Edge local → Protheus).
Sprint 6 entregou Auth Hook v2, trigger `set_tenant_vault_alias` e Edge v3.1 em produção.
Esta sessão (Sprint 7) refatora as chamadas do monólito para abandonarem rotas diretas
legadas e passarem a utilizar a nova estrutura da Edge Function v3.1:
- Endpoint de health check legado `/beeit/health` → `/health`
- Teste de conectividade FASE 3 não roteava pelo caminho correto da Edge
- `syncTabela` usava `/api/framework/v1/company/{emp}/{fil}/{alias}` fora da allow-list
- Nenhuma função de extração de dicionário SA1/SB1 existia no monólito

---

### S7.1 — Correção do Health Check (cfgTestProtheus — FASE 1)

**Arquivo alterado:** `public/index.html` + `src/BeeIT-OS-RT-v2.html`
**Função:** `cfgTestProtheus()`

| Antes | Depois | Motivo |
|---|---|---|
| `PROXY_URL + '/beeit/health'` | `PROXY_URL + '/health'` | Edge v3.1 expõe `/health` sem prefixo `/beeit/` |

#### Detecção automática de Edge Function URL (isEdgeProxy)

```javascript
// Antes: só detectava localhost:3030
if (/localhost:\d+/.test(baseUrl)) { usandoProxy=true; }

// Depois: detecta Edge Function URL diretamente
const isEdgeProxy = baseUrl.indexOf('supabase.co/functions/v1/protheus-proxy') !== -1;
if (/localhost:\d+/.test(baseUrl) || isEdgeProxy) { usandoProxy=true; }
```

---

### S7.2 — Correção FASE 3 (URL de teste via proxy)

**Função:** `cfgTestProtheus()` — trecho FASE 3

| Antes | Depois |
|---|---|
| `PROXY_URL + '/api/COMPANIES/?pageSize=1'` | `PROXY_URL + '/protheus/COMPANIES/?pageSize=1'` |

**Por quê:** A Edge roteia Protheus somente via `/protheus/<path>`.
O path `/api/COMPANIES/` caía no fallback 404 da Edge — o diagnóstico
mostrava "CORS bloqueado" mesmo com a Edge ativa.

#### Fluxo de diagnóstico após fix

```
cfgTestProtheus()
  ├── FASE 1: isEdgeProxy? → usandoProxy=true (zero fetch extra)
  │          └── else → fetch PROXY_URL/health (timeout 2 s)
  ├── FASE 2: fetch restBase/COMPANIES/ {no-cors} → servidorAcessivel
  └── FASE 3: usandoProxy?
        ├── yes → fetch PROXY_URL/protheus/COMPANIES/ {cors} + JWT
        └── no  → fetch restBase/COMPANIES/ {cors} direto
```

---

### S7.3 — Labels de diagnóstico atualizados

| Label (antes) | Label (depois) |
|---|---|
| "Proxy REST local" | "Edge Function BeeIT" |
| "localhost:3030 detectado e respondendo" | "Edge Function BeeIT ativa e respondendo" |
| "Não detectado em localhost:3030" | "Edge Function não acessível" |
| "Proxy local resolvendo CORS" | "Edge Function BeeIT resolvendo CORS" |

---

### S7.4 — Nova função fetchDictBlueprintSA1SB1()

**Arquivo alterado:** `public/index.html` + `src/BeeIT-OS-RT-v2.html`
**Botão adicionado:** `📋 Dicionário SA1/SB1` na página Sincronizar Protheus (`pg-sync`)

#### O que faz

Extrai o blueprint (dicionário de campos SX3) das tabelas SA1 e SB1 via Edge Function,
usando o endpoint `BdaDictApi.tlpp`. Resultado salvo em `window._protheusBlueprintSA1SB1`.

#### Payload da requisição (formato validado Sprint 5.6)

```json
{
  "aliases": ["SA1", "SB1"],
  "options": {
    "scope": "MANDATORY_AND_KEYS",
    "include_custom": true,
    "include_f3_combo": true,
    "include_mock": true
  }
}
```

#### Fluxo de execução

```
Usuário clica "📋 Dicionário SA1/SB1"
  → fetchDictBlueprintSA1SB1()
  → fetch(EDGE + '/protheus/api/v1/bda/dictionary/blueprint', POST)
  → fetch-interceptor: injeta Bearer JWT + apikey
  → Edge v3.1:
      ├── valida JWT → userId + tenantId
      ├── verifica path: /api/v1/bda/dictionary/blueprint ✅ PROTHEUS_PATH_ALLOW
      ├── vault.decrypted_secrets → Basic Auth do Protheus
      └── forward → Protheus BdaDictApi.tlpp
  → resposta: { blueprint: { SA1: [...], SB1: [...] } }
  → window._protheusBlueprintSA1SB1 = data
  → #sync-blueprint-status: "✅ Blueprint SA1/SB1 recebido"
```

#### Tabelas Supabase consultadas

| Tabela | Operação | Motivo |
|---|---|---|
| `tenant_protheus_config` | SELECT | URL Protheus + referência do secret no Vault |
| `vault.decrypted_secrets` | SELECT | Decripta credenciais Basic Auth por tenant |
| `audit_protheus` | INSERT | Registro de auditoria (path, método, status, duração) |

#### Tabelas Protheus consultadas (via AdvPL)

| Tabela | Descrição |
|---|---|
| `SX3` | Campos obrigatórios, tipos, tamanhos para SA1 e SB1 |
| `SX5` | Tabelas de domínio (combos F3) quando `include_f3_combo: true` |

#### Variável global criada

| Variável | Conteúdo |
|---|---|
| `window._protheusBlueprintSA1SB1` | `{ blueprint: { SA1: [campos], SB1: [campos] } }` |

#### HTML adicionado em rndSync()

```html
<button onclick="fetchDictBlueprintSA1SB1()">📋 Dicionário SA1/SB1</button>
<span id="sync-blueprint-status" style="font-size:9px;color:var(--txt3);"></span>
```

---

### S7.5 — Fix PROTHEUS_PATH_ALLOW_LEGACY (Edge Function)

**Arquivo alterado:** `supabase/functions/protheus-proxy/index.ts`

#### Problema raiz

`syncTabela()` envia `POST /api/framework/v1/company/{emp}/{fil}/{alias}`.
A regex legacy só permitia o base path `/api/framework/v1/company` (sem subpaths),
gerando 403 para qualquer sync de tabela via framework endpoint.

#### Diff aplicado

```diff
- "/api/framework/v1/(health|company|user)"
+ "/api/framework/v1/(health|company|user)(/[A-Za-z0-9_~%.+-]*)*"
```

#### Paths agora permitidos (exemplos)

| Path | Resultado |
|---|---|
| `/api/framework/v1/company` | ✅ (já funcionava) |
| `/api/framework/v1/company/T1/01/SA1` | ✅ (fix S7) |
| `/api/framework/v1/company/T1/01/SB1` | ✅ (fix S7) |
| `/api/framework/v1/company/T1/01/CT1` | ✅ (fix S7) |
| `/api/framework/v1/company/T1/01/CTT` | ✅ (fix S7) |

**Proteções mantidas:** JWT obrigatório · tenant_id claim · Vault · audit log.

---

### Botões adicionados ao monólito nesta sessão

| Botão | Página (id) | Função JS | Endpoint Edge |
|---|---|---|---|
| 📋 Dicionário SA1/SB1 | `pg-sync` | `fetchDictBlueprintSA1SB1()` | `POST /protheus/api/v1/bda/dictionary/blueprint` |

---

### Arquivos alterados nesta sessão

| Arquivo | Mudanças aplicadas |
|---|---|
| `src/BeeIT-OS-RT-v2.html` | S7.1 health · S7.1 isEdgeProxy · S7.2 FASE3 URL · S7.3 labels · S7.4 função + botão |
| `public/index.html` | Idêntico ao src (+ fetch-interceptor injetado no topo pelo build) |
| `supabase/functions/protheus-proxy/index.ts` | S7.5 — regex allow-list ampliada |
| `docs/ROADMAP.md` | Sprint S7 marcada "🔄 Em Progresso (2026-04-28)" |

---

### Resumo de artefatos desta sessão

| Artefato | Tipo | Status |
|---|---|---|
| `src/BeeIT-OS-RT-v2.html` | Arquivo alterado (5 mudanças) | ✅ commitado `0460345` |
| `public/index.html` | Bundle produção (5 mudanças) | ✅ commitado `0460345` |
| `supabase/functions/protheus-proxy/index.ts` | Edge Function alterada | ✅ commitado `0460345` |
| `docs/ROADMAP.md` | Documentação | ✅ commitado `0460345` |
| `Governanca/tasks.md` | Esta entrada | ✅ atualizado (não commitado — privado) |

### Pendências pós-sessão

- [ ] **Deploy da Edge Function** com nova allow-list: `supabase functions deploy protheus-proxy --project-ref dbaqvoatopfquaqgdptk`
- [ ] **Smoke test — Testar Conexão:** URL = Edge Function → deve exibir "Edge Function BeeIT ativa"
- [ ] **Smoke test — Dicionário SA1/SB1:** clicar botão → retornar blueprint sem 403
- [ ] **Smoke test — Sincronizar TUDO:** syncTabela → POST `/api/framework/v1/company/T1/01/SA1` deve retornar 2xx/422, não 403
- [ ] S7 cleanup: atualizar modal `cfgShowProxyInstructions` (2 refs a localhost:3030 ainda presentes)
- [ ] Provisionar primeiro tenant via `scripts/setup-tenant.js` (bloqueado: Auth Hook suspenso)
- [ ] Merge `feature/os-rt-modularization` → `develop` após validação E2E

---


## S-2026-04-28-B

**Data:** 2026-04-28
**Branch:** `feature/os-rt-modularization`
**Commit:** `25283d7`
**Roadmap:** Sprint P0 (hotfix emergencial de segurança)
**OS Ativa:** OS-1042

---

### Contexto

Laudo técnico identificou que as 4 tabelas legadas do monólito (`profiles`,
`clientes`, `documentos`, `access_log`) estavam sem Row Level Security ativo —
qualquer usuário autenticado podia ler/escrever dados de outros clientes.
Auth Hook v2 foi suspenso manualmente no Dashboard pelo responsável para isolar
as tabelas novas SaaS durante a homologação. Esta sessão aplicou o hotfix P0:
ativar RLS sem alterar nenhuma policy existente.

---

### P0 — Ativação de RLS nas tabelas legadas

**Arquivo criado:** `supabase/migrations/20260427120000_enable_rls_legacy_tables.sql`
**Commit:** `25283d7`
**Roadmap:** Sprint P0 registrada em `docs/ROADMAP.md`

#### O que foi feito

Migration SQL cirúrgica com 4 comandos, sem criação/alteração/exclusão de policies:

```sql
ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_log    ENABLE ROW LEVEL SECURITY;
```

#### Por que só o ENABLE, sem mexer nas policies

As policies existentes foram previamente auditadas e atestadas como corretas.
O único vetor de exposição era a chave RLS estar desligada — ou seja, mesmo
com policies definidas, o Postgres as ignorava completamente. Ligar o RLS
ativa a aplicação das policies sem nenhuma mudança de comportamento lógico.

#### Tabelas Supabase impactadas

| Tabela       | Schema   | Operação                    | Observação                                    |
| ------------ | -------- | --------------------------- | --------------------------------------------- |
| `profiles`   | `public` | `ENABLE ROW LEVEL SECURITY` | Tabela legada do monólito — perfis de usuário |
| `clientes`   | `public` | `ENABLE ROW LEVEL SECURITY` | Tabela legada — cadastro de clientes          |
| `documentos` | `public` | `ENABLE ROW LEVEL SECURITY` | Tabela legada — documentos e contratos        |
| `access_log` | `public` | `ENABLE ROW LEVEL SECURITY` | Tabela legada — log de acessos/auditoria      |

#### Tabelas SaaS novas (referência — não alteradas nesta sessão)

Já possuíam RLS ativo desde a criação (Sprints S2/S6):

| Tabela                   | Migration de origem                     |
| ------------------------ | --------------------------------------- |
| `tenant_protheus_config` | `20260424155200_schema_multitenant.sql` |
| `user_tenant`            | `20260424155200_schema_multitenant.sql` |
| `protheus_dict_snapshot` | `20260424155200_schema_multitenant.sql` |
| `protheus_dict_history`  | `20260424155200_schema_multitenant.sql` |

#### Fluxo de execução do deploy

```
supabase link --project-ref dbaqvoatopfquaqgdptk
        │
        ▼
supabase db push
        │   Detecta migration pendente:
        │   • 20260427120000_enable_rls_legacy_tables.sql
        ▼
Applying migration... ✅
        │
        ▼
Banco remoto: RLS ativo em 4 tabelas legadas
Policies existentes: intactas, agora efetivamente aplicadas
```

#### Processo de construção da migration (convenções adotadas)

- Nome do arquivo: `YYYYMMDDHHMMSS_<descricao_snake_case>.sql`
- Timestamp escolhido: `20260427120000` (após última migration de Sprint 6)
- Header obrigatório: bloco de comentários com contexto, dependências e comando de deploy
- Zero `DROP`, zero `CREATE POLICY`, zero `ALTER POLICY` — apenas `ENABLE RLS`

#### Arquivos envolvidos

| Arquivo                                                           | Papel                                                                             |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `supabase/migrations/20260427120000_enable_rls_legacy_tables.sql` | Criado — migration de ativação de RLS                                             |
| `docs/ROADMAP.md`                                                 | Atualizado — Sprint P0 adicionada à tabela de sprints                             |
| `Governanca/bdapowered.html`                                      | Atualizado — aiLog da OS-1042 com entrada do hotfix (não commitado —`.gitignore`) |

#### Edge Functions chamadas durante a sessão

Nenhuma chamada em runtime. A CLI `supabase db push` conecta diretamente
ao Postgres via connection string (não passa pela Edge Function).

#### Decisões tomadas / não tomadas

| Decisão                      | Escolha                      | Motivo                                                |
| ---------------------------- | ---------------------------- | ----------------------------------------------------- |
| Alterar policies existentes? | ❌ Não                        | Auditadas e corretas — só o ENABLE estava faltando    |
| Reativar Auth Hook?          | ❌ Não (ação manual do Bruno) | Isolamento durante homologação das tabelas SaaS novas |
| Commitar `bdapowered.html`?  | ❌ Não                        | Arquivo privado no `.gitignore` por design            |

---

### Resumo de artefatos desta sessão

| Artefato                                                          | Tipo             | Status                                               |
| ----------------------------------------------------------------- | ---------------- | ---------------------------------------------------- |
| `supabase/migrations/20260427120000_enable_rls_legacy_tables.sql` | Arquivo novo     | ✅ criado · deployado · commitado `25283d7`           |
| `docs/ROADMAP.md`                                                 | Arquivo alterado | ✅ Sprint P0 registrada · commitado `25283d7`         |
| `Governanca/bdapowered.html`                                      | Arquivo alterado | ✅ aiLog OS-1042 atualizado · não commitado (privado) |

### Pendências pós-sessão

- [ ] Reativar Auth Hook (`custom_access_token_hook`) no Dashboard Supabase após validação em produção
- [ ] Smoke test: verificar que login, listagem de clientes e documentos continuam funcionando sem regressões
- [ ] Provisionar primeiro tenant com `scripts/setup-tenant.js` (bloqueado pelo Auth Hook suspenso)
- [ ] Retomar Sprint S5.6 — teste de integração ponta-a-ponta do fetch interceptor

---

---

## S-2026-04-28-A

**Data:** 2026-04-28
**Branch:** `feat/modularization-security-v1`
**Commits:** `8e26b3a` (5.4) · `67561b0` (5.5)
**Roadmap:** Sprint S5 (subtarefas 5.4 e 5.5)

---

### Contexto

Sprint S5 em andamento. Sprints 5.2 (Edge v3.1 legacy allow-list) e 5.3
(fetch-interceptor.js) já entregues nas sessões anteriores.
Esta sessão cobriu as duas próximas subtarefas do S5.

---

### 5.4 — Criação de `scripts/build-modules.js`

**Arquivo criado:** `scripts/build-modules.js`
**Commit:** `8e26b3a`

#### O que faz

Script Node.js 20+ (zero dependências externas) que substitui o `cp` manual
no pipeline de build. Responsabilidades:

1. Lê todos os arquivos `.js` de `src/core/` em **ordem lexicográfica**.
2. Valida a sintaxe de cada um com `node --check` antes de qualquer escrita.
3. Injeta os arquivos como blocos `<script>` imediatamente **após `<head>`**
   no HTML fonte (`src/BeeIT-OS-RT-v2.html`).
4. Grava o resultado em `public/index.html`.
5. **Nunca modifica** `src/BeeIT-OS-RT-v2.html` (leitura apenas).

#### Proteção contra dupla injeção

Antes de injetar, o script verifica se o HTML fonte já contém o marcador:

```html
<!-- beeit:core-injected -->
```

Se encontrado, aborta com `exit 1`. O marcador é inserido apenas no
**output** (`public/index.html`), não na fonte.

#### Fluxo interno

```
src/BeeIT-OS-RT-v2.html (read-only)
        │
        ▼
[ readdirSync src/core/*.js | sort ]
        │
        ▼
[ node --check <arquivo> ] ─── falha → exit 1
        │ (todos OK)
        ▼
[ injetar após <head> ]
        │
        ▼
public/index.html  ←  <!-- beeit:core-injected --> + <script>…</script>
```

#### Módulos injetados nesta sessão

| Arquivo                         | Descrição                                                                                                                                                 |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/core/fetch-interceptor.js` | Monkey-patch de `window.fetch`: redireciona chamadas diretas ao Protheus para a Edge Function Supabase, remove Basic Auth do browser, injeta JWT + apikey |

#### Arquivos envolvidos

| Arquivo                         | Papel                                        |
| ------------------------------- | -------------------------------------------- |
| `scripts/build-modules.js`      | Criado (build injector)                      |
| `src/core/fetch-interceptor.js` | Módulo injetado (criado em S5.3)             |
| `src/BeeIT-OS-RT-v2.html`       | Lido (fonte imutável)                        |
| `public/index.html`             | Escrito (bundle final com módulos injetados) |

#### Tabelas Supabase impactadas

Nenhuma. Tarefa exclusivamente de build/bundling.

---

### 5.5 — Atualização de `.github/workflows/deploy.yml`

**Arquivo alterado:** `.github/workflows/deploy.yml`
**Commit:** `67561b0`

#### Mudanças realizadas

**Job `validate`:**

| Antes                                          | Depois                                                                        |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| `cp src/BeeIT-OS-RT-v2.html public/index.html` | `node scripts/build-modules.js`                                               |
| Etapa "Validar HTML + JS inline" (one-liner)   | Etapa "Validar sintaxe do bundle final" (expandida + verificação do marcador) |

**Job `deploy`:**

| Antes                                          | Depois                                           |
| ---------------------------------------------- | ------------------------------------------------ |
| Sem Setup Node                                 | `actions/setup-node@v4` com `node-version: '20'` |
| `cp src/BeeIT-OS-RT-v2.html public/index.html` | `node scripts/build-modules.js`                  |

#### Processo de validação do bundle final (etapa nova)

```yaml
- name: Validar sintaxe do bundle final
  run: |
    # 1. Confirma que a injeção aconteceu
    grep -q '<!-- beeit:core-injected -->' public/index.html

    # 2. Executa new Function() em todos os scripts inline
    node -e "
      const scripts = [...html.matchAll(/<script…>(…)<\/script>/g)]
      scripts.forEach((s, i) => new Function(s))  # lança se inválido
    "
```

A etapa falha o CI se:

- O marcador `<!-- beeit:core-injected -->` não for encontrado (injeção não ocorreu).
- Qualquer script inline do bundle tiver erro de sintaxe.

#### Pipeline completo resultante (validate job)

```
checkout
  └─ setup-node@v4 (node 20)
       └─ node scripts/build-modules.js
            ├─ node --check src/core/fetch-interceptor.js
            └─ injeta → public/index.html
                 └─ Validar sintaxe do bundle final
                      ├─ grep <!-- beeit:core-injected -->
                      └─ new Function() em todos scripts inline
                           └─ upload-artifact (beeit-build, 7d)
```

#### Arquivos envolvidos

| Arquivo                        | Papel                                                   |
| ------------------------------ | ------------------------------------------------------- |
| `.github/workflows/deploy.yml` | Alterado — cp substituído, validação expandida          |
| `scripts/build-modules.js`     | Chamado pelo CI (criado em 5.4)                         |
| `public/index.html`            | Bundle produzido no CI, artefato enviado para Hostinger |

---

### Resumo de artefatos desta sessão

| Artefato                       | Tipo                   | Status                             |
| ------------------------------ | ---------------------- | ---------------------------------- |
| `scripts/build-modules.js`     | Arquivo novo           | ✅ criado · commitado `8e26b3a`     |
| `.github/workflows/deploy.yml` | Arquivo alterado       | ✅ atualizado · commitado `67561b0` |
| `public/index.html`            | Arquivo gerado (build) | ✅ regenerado com injeção           |

### Pendências pós-sessão

- [ ] PR dos commits `8e26b3a` + `67561b0` de `claude/awesome-kalam-a10b9e` → `feat/modularization-security-v1`
- [ ] Atualizar `Governanca/bdapowered.html` → cards 5.4 e 5.5 para `done`
- [ ] Injetar entrada no campo `aiLog` da OS ativa em `DEFAULT_OS`

---

---

---

## S-2026-04-27-B

**Data:** 2026-04-27 (18:05 – 18:41)
**Branch:** `feature/os-rt-modularization`
**Commits:** `0460345` (Sprint 7) · `9b0aa5f` (Release 1)
**Roadmap:** Sprint S7 ✅ · Release R1 ✅
**OS Ativa:** OS-1042

---

### Contexto

Com E2E validado localmente (sessão S-E), esta sessão fechou a **Sprint 7** (migração de paths legados no monólito para a Edge Function estruturada) e entregou a **Release 1** — primeira versão da UX visível ao cliente, focada em validação do fluxo de implantação Protheus via painel web.

---

### Sprint 7 — Migração de Paths Legados (`0460345`)

Substituição no monólito `src/BeeIT-OS-RT-v2.html` de referências diretas ao Protheus ou ao proxy antigo (`localhost:3030`):

| Path/Função legada                   | Novo comportamento                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------- |
| Health check `/beeit/health`         | Agora em `/health` na Edge                                                            |
| Test URL FASE 3 `/api/COMPANIES/`    | `/protheus/COMPANIES/`                                                                |
| FASE 1 — detecção Edge URL hardcoded | Lê `window.BEEIT_EDGE_URL` (injetado pelo `dev-server.js`)                            |
| `fetchDictBlueprintSA1SB1()`         | Nova função no monólito com botão "📋 Dicionário SA1/SB1" na sync page                 |
| `PROTHEUS_PATH_ALLOW_LEGACY`         | Ampliado para `/api/framework/v1/company/{emp}/{fil}/{alias}` (fix para `syncTabela`) |
| Labels de diagnóstico                | "Edge Function" no lugar de "localhost:3030"                                          |

---

### Release 1 — UX Gerenciada para Validação do Cliente (`9b0aa5f`)

#### R1.1 — URL Gerenciada pós-login

**Arquivos alterados:** `src/BeeIT-OS-RT-v2.html` · `public/index.html`

Fluxo adicionado a `beeitShowApp()`:

```
beeitShowApp()
  ├─ beeitSbFetch('/rest/v1/tenant_protheus_config?select=protheus_url&limit=1')
  │        └─ window._beeitManagedProtheusUrl = rows[0].protheus_url
  └─ checkDictSnapshots()
           └─ beeitSbFetch('/rest/v1/protheus_dict_snapshot
                            ?select=sx2_alias,campos,updated_at
                            &sx2_alias=in.(SA1,SA2,SB1)')
                    └─ window._dictSnapshotStatus = { SA1: {...}, SA2: {...}, SB1: {...} }
```

Mudanças em `rndConfig()`:

| Elemento                          | Antes                     | Depois                                        |
| --------------------------------- | ------------------------- | --------------------------------------------- |
| `#cfg-ptheus-url`                 | `<input>` sempre editável | Readonly + visual verde quando URL gerenciada |
| Botões                            | Só "Testar Conexão"       | + badge "🔗 Conexão Gerenciada pela BeeIT"     |
| "💾 Salvar Configurações" (header) | Sempre visível            | Oculto por JS quando URL gerenciada           |

#### R1.2 — Tela de Sincronização Refatorada

Remoções na função `rndSync()`:

| Botão                  | Chamava                      | Motivo                     |
| ---------------------- | ---------------------------- | -------------------------- |
| `🚀 Sincronizar TUDO`   | `syncAllREST()`              | Sem escopo definido        |
| `📋 Dicionário SA1/SB1` | `fetchDictBlueprintSA1SB1()` | Migrado ao grupo Cadastros |

Adições por card SA1/SA2/SB1:

| Elemento                                   | Função                                                                      |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| Badge `<div id="dict-snap-badge-{alias}">` | Preenchido por `_refreshDictBadges()` com 🟢/🟡                               |
| Botão `📖 Ver Dicionário`                   | `openDictDrawer(alias)`                                                     |
| Botão grupo Cadastros                      | `fetchDictBlueprint(['SA1','SA2','SB1'])` · label "🔄 Sincronizar Cadastros" |

#### R1.3 — `fetchDictBlueprint(aliases)` — Generalizado

Substitui `fetchDictBlueprintSA1SB1()`:

```javascript
async function fetchDictBlueprint(aliases) {
  // 1. POST Edge /protheus/api/v1/bda/dictionary/blueprint
  //    headers: { Authorization: Bearer <JWT>, apikey: BEEIT_SB_KEY }
  // 2. Para cada alias: canonicaliza campos → SHA-256 via crypto.subtle
  // 3. UPSERT /rest/v1/protheus_dict_snapshot
  //    Prefer: resolution=merge-duplicates,return=minimal
  // 4. checkDictSnapshots() → _refreshDictBadges()
}
```

Funções auxiliares criadas:

| Função                    | Descrição                                                    |
| ------------------------- | ------------------------------------------------------------ |
| `_beeitTenantIdFromJWT()` | Decodifica claim `tenant_id` do JWT (`atob` + `JSON.parse`)  |
| `_sha256hex(str)`         | `crypto.subtle.digest('SHA-256', ...)` → hex string 64 chars |
| `checkDictSnapshots()`    | Query batch aliases →`window._dictSnapshotStatus`            |
| `_refreshDictBadges()`    | Atualiza `innerHTML` dos `#dict-snap-badge-*` no DOM         |

**Tabela Supabase:**

| Tabela                   | Operação                    | Colunas chave                                                                            |
| ------------------------ | --------------------------- | ---------------------------------------------------------------------------------------- |
| `protheus_dict_snapshot` | `UPSERT` (merge-duplicates) | PK `(tenant_id, user_id, sx2_alias)` · `campos` jsonb[] · `campos_hash` SHA-256 64 chars |

**Edge Function chamada:**

| Endpoint                                          | Método | Auth                                    |
| ------------------------------------------------- | ------ | --------------------------------------- |
| `{EDGE}/protheus/api/v1/bda/dictionary/blueprint` | POST   | `Bearer <JWT>` + `apikey: BEEIT_SB_KEY` |

#### R1.4 — Drawer Lateral Base

HTML adicionado ao monólito (antes de `</body>`):

```
#dict-drawer-overlay  — fundo escuro (clique → fecha)
#dict-drawer          — painel 520px, slide-in 0.28s cubic-bezier
  #dict-drawer-header — ícone + título + botão ✕
  #dict-drawer-toolbar — input filtro + "📋 Copiar JSON"
  #dict-drawer-body   — tabela CAMPO/TIPO/TAM/TÍTULO renderizada por _renderDrawerCampos()
```

Funções (IIFE isolada):

| Função                        | Descrição                                                           |
| ----------------------------- | ------------------------------------------------------------------- |
| `openDictDrawer(alias)`       | Lê cache; anima entrada; exibe aviso se sem snapshot                |
| `closeDictDrawer()`           | `translateX(100%)` + 290ms → `display:none`                         |
| `_dictDrawerFilter(q)`        | Filtra `_ddCampos` ao vivo; re-renderiza                            |
| `_dictDrawerCopyJson()`       | `navigator.clipboard.writeText(JSON.stringify(_ddCampos, null, 2))` |
| `_renderDrawerCampos(campos)` | Grid 4 colunas + badges OBR/KEY/USR                                 |

#### Badges por campo

| Badge | Cor       | Condição                   |
| ----- | --------- | -------------------------- |
| `OBR` | `#f87171` | `campo.obrigat === true`   |
| `KEY` | `#fbbf24` | `campo.is_key === true`    |
| `USR` | `#a78bfa` | `campo.is_custom === true` |

---

### Resumo de Botões — S-2026-04-27-B

**Adicionados:**

| Label                                    | Tela                     | Função                                    |
| ---------------------------------------- | ------------------------ | ----------------------------------------- |
| 🔗 Conexão Gerenciada pela BeeIT*(badge)* | Configurações            | — (visual)                                |
| 🔄 Sincronizar Cadastros                  | Sync → grupo Cadastros   | `fetchDictBlueprint(['SA1','SA2','SB1'])` |
| 📖 Ver Dicionário                         | Sync → cards SA1/SA2/SB1 | `openDictDrawer(alias)`                   |
| 📋 Copiar JSON                            | Drawer                   | `_dictDrawerCopyJson()`                   |
| ✕                                        | Drawer                   | `closeDictDrawer()`                       |

**Removidos:**

| Label                | Motivo                     |
| -------------------- | -------------------------- |
| 🚀 Sincronizar TUDO   | Sem escopo definido        |
| 📋 Dicionário SA1/SB1 | Migrado ao grupo Cadastros |

---

### Resumo de Artefatos

| Artefato                  | Tipo         | Commit                  |
| ------------------------- | ------------ | ----------------------- |
| `src/BeeIT-OS-RT-v2.html` | Alterado     | `0460345` · `9b0aa5f`   |
| `public/index.html`       | Build gerado | idem                    |
| `docs/ROADMAP.md`         | Atualizado   | `9b0aa5f` — S7 ✅ · R1 ✅ |

### Pendências pós-sessão (continuadas em S-2026-04-28-F)

- [X] Drawer evoluído estilo Swagger/OpenAPI
- [X] `cfgSaveProtheusConn()` — persistência no banco
- [X] `beeitProgress` — overlay genérico de carregamento
- [X] `dev.sh` — gerenciador de serviços locais
- [X] Migrations de tabelas legadas ausentes no Supabase local

---

---

## S-2026-04-27-A

**Data:** 2026-04-27
**Branch:** `feature/os-rt-modularization`
**Commits:** `19a31a9` `6de6d38` `6d28831` `cd051f5`
**Roadmap:** S6 ✅ (artefatos SQL + docs criados; deploy aplicado em S-2026-04-28-D)
**OS Ativa:** OS-1042

---

### Contexto

Análise das migrations existentes (Sprint 4) revelou dois gaps antes de prosseguir para o deploy remoto: (1) ausência de trigger que derivasse o `basic_auth_ref` do UUID PK no INSERT, (2) Auth Hook v1 não incluía `vault_alias` no JWT — a Edge Function precisaria de um segundo query ao banco para descobrir o nome do secret. Esta sessão fechou os dois gaps e gerou o plano de deploy documentado.

---

### Gaps identificados e soluções

| #   | Gap                                                                                                               | Impacto                                                                                     | Solução                                                               |
| --- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1   | `basic_auth_ref` dependia do RPC para ser preenchido (INSERT 'pending' → UPDATE alias) — sem enforcement no banco | Qualquer INSERT manual ficaria com `basic_auth_ref = 'pending'` permanente                  | Trigger `BEFORE INSERT` `set_tenant_vault_alias`                      |
| 2   | Auth Hook v1 injetava apenas `tenant_id` + `role_in_tenant`                                                       | Edge Function precisava de query extra ao `tenant_protheus_config` para obter o vault alias | Auth Hook v2: JOIN com `tenant_protheus_config`, injeta `vault_alias` |
| 3   | Sem documento que descrevesse o processo de deploy end-to-end                                                     | Operador sem referência para aplicar migrations + ativar Hook no Dashboard                  | `docs/SUPABASE-DEPLOY-PLAN.md` (9 passos)                             |

---

### Migrations criadas

| Arquivo                                         | O que faz                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20260427100000_tenant_vault_alias_trigger.sql` | Função `set_tenant_vault_alias()` + trigger `BEFORE INSERT` em `tenant_protheus_config`. Deriva `basic_auth_ref` = `'tenant_' \|\| replace(tenant_id::text,'-','') \|\| '_protheus_basicauth'` quando campo é NULL/`''`/`'pending'`. O PostgreSQL avalia `DEFAULT gen_random_uuid()` antes do BEFORE trigger, garantindo que `new.tenant_id` está preenchido. Retrocompatível: `provision_tenant_rpc` continua funcionando — UPDATE torna-se no-op. |
| `20260427100100_auth_hook_vault_alias.sql`      | `CREATE OR REPLACE FUNCTION custom_access_token_hook(event jsonb)` — Auth Hook v2. JOIN `user_tenant ⟶ tenant_protheus_config` (`active = true`). Injeta `tenant_id`, `role_in_tenant`, `vault_alias` em top-level e `app_metadata` do JWT. Reafirma grants para `supabase_auth_admin`.                                                                                                                                                             |

---

### Tabelas Supabase envolvidas

| Tabela                   | Operação                | Contexto                                                              |
| ------------------------ | ----------------------- | --------------------------------------------------------------------- |
| `tenant_protheus_config` | BEFORE INSERT (trigger) | `set_tenant_vault_alias` intercepta INSERT, preenche `basic_auth_ref` |
| `tenant_protheus_config` | SELECT (Auth Hook)      | JOIN para ler `basic_auth_ref` + filtro `active = true`               |
| `user_tenant`            | SELECT (Auth Hook)      | Busca `tenant_id` e `role` do vínculo mais antigo do usuário logado   |

---

### Claims JWT após Auth Hook v2

```json
{
  "tenant_id":      "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "role_in_tenant": "admin | operator | viewer",
  "vault_alias":    "tenant_<uuid_sem_hifens>_protheus_basicauth",
  "app_metadata": {
    "tenant_id":      "...",
    "role_in_tenant": "...",
    "vault_alias":    "..."
  }
}
```

---

### Queries / funções SQL criadas

```sql
-- Trigger BEFORE INSERT: deriva vault alias do UUID
CREATE OR REPLACE FUNCTION public.set_tenant_vault_alias()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF new.basic_auth_ref IS NULL OR trim(new.basic_auth_ref) IN ('', 'pending') THEN
    new.basic_auth_ref :=
      'tenant_' || replace(new.tenant_id::text, '-', '') || '_protheus_basicauth';
  END IF;
  RETURN new;
END; $$;

-- Auth Hook v2: lê tenant + vault_alias em único JOIN
SELECT ut.tenant_id, ut.role, t.basic_auth_ref
  FROM public.user_tenant ut
  JOIN public.tenant_protheus_config t
    ON  t.tenant_id = ut.tenant_id AND t.active = true
  WHERE ut.user_id = v_user_id
  ORDER BY ut.created_at ASC LIMIT 1;
```

---

### Documentação criada

| Arquivo                        | Conteúdo                                                                                                                                                                                                                                                                                |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/SUPABASE-DEPLOY-PLAN.md` | 9 passos:`supabase link` → dry-run → `db push` → ativação do Auth Hook no Dashboard (passo manual) → `setup-tenant.js` → verificação JWT → smoke test Edge (`/health`, blueprint SA1, 401 sem JWT) → deploy Edge Function. Inclui checklist e troubleshooting para 4 cenários de falha. |

---

### Outros eventos desta sessão

| Evento                  | Detalhe                                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------------------- |
| Supabase CLI instalado  | `brew install supabase/tap/supabase` → v2.95.4 (CLI não estava instalado)                                |
| Deploy remoto bloqueado | `SUPABASE_DB_PASSWORD` e `SUPABASE_SERVICE_ROLE_KEY` necessários — aguardando fornecimento pelo operador |
| ADR-010 registrado      | ROADMAP.md: justificativa trigger vs 2-step no RPC para vault alias                                      |
| Renumeração de sprints  | ROADMAP: S6 (paths legados) → S7; S7→S8; S8→S9; S9→S10                                                   |
| S5 corrigido            | ROADMAP: subtarefas 5.4 e 5.5 marcadas ✅ (commits `8e26b3a` e `67561b0` já existiam)                     |

---

### Resumo de artefatos desta sessão

| Artefato                                                            | Tipo           | Status                                                              |
| ------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------- |
| `supabase/migrations/20260427100000_tenant_vault_alias_trigger.sql` | Migration nova | ✅ criada · commitada `19a31a9`                                      |
| `supabase/migrations/20260427100100_auth_hook_vault_alias.sql`      | Migration nova | ✅ criada · commitada `6de6d38`                                      |
| `docs/SUPABASE-DEPLOY-PLAN.md`                                      | Doc novo       | ✅ criado · commitado `6d28831`                                      |
| `docs/ROADMAP.md`                                                   | Atualizado     | ✅ S6 ✅ · ADR-010 · renumeração · S5 corrigido · commitado `cd051f5` |

---

## S-2026-04-28-G

**Data:** 2026-04-28
**Branch:** `feature/os-rt-modularization`
**Commits:** sem commits novos (sessão de análise e governança)
**Roadmap:** SEC (Security Audit) · GOV (Governança)

---

### Contexto

Sessão focada em análise de segurança e governança após o deploy das migrations SaaS e Edge v3.1. O usuário anexou o dump de schema de produção (`schemas_supabase_tenant_id_prd.md`) e solicitou um laudo técnico antes de qualquer nova ação. Também foi criado um prompt de sistema para o Gemini 3.1 Pro no Antigravity atuar como analista conversacional de backlog, e o arquivo `Governanca/tasks.md` foi estruturado como diário incremental de sessões.

---

### Tarefa G.1 — Laudo de Segurança (schema produção)

**Arquivo analisado:** `schemas_supabase_tenant_id_prd.md` (dump de schema remoto, 600+ linhas — fora do repo, .gitignore)

#### O que foi analisado

1. **RLS nas tabelas legadas** — `profiles`, `clientes`, `documentos`, `access_log` tinham políticas escritas mas `ENABLE ROW LEVEL SECURITY` **ausente** → RLS inativo. Dados acessíveis a qualquer usuário autenticado via PostgREST. Risco crítico detectado. Fix aplicado em sessão anterior via migration P0 `20260427120000_enable_rls_legacy_tables.sql` (commit `25283d7`).
2. **JWT claims** — `custom_access_token_hook` injeta `tenant_id`, `role_in_tenant`, `vault_alias` no JWT. Validação: somente via `user_tenant` (vínculo mais antigo). Troca de tenant exige `refreshSession()`.
3. **Anon Key no HTML** — A Supabase Anon Key é pública por design e está no HTML do monólito. Aceitável desde que RLS esteja ativo em todas as tabelas (condição agora atendida pós-P0).
4. **Tabelas novas em produção sem homologação** — `protheus_dict_snapshot`, `tenant_protheus_config`, `user_tenant`, `sx2_alias_map` foram deployadas diretamente em produção via `supabase db push` sem passar por ambiente de homologação. O usuário **discordou** desta abordagem. Decisão: futuras migrations devem ser validadas em Supabase Local antes de promover.
5. **Auth Hook ativo em produção** — Risco de quebra de login se hook retornar erro. Recomendação: manter Auth Hook suspenso no Dashboard até que S5.6 (E2E local) seja validado. Sessão P0 (S-2026-04-28-B) já havia suspendido o hook.

#### Tabelas Supabase impactadas (análise)

| Tabela                   | RLS pré-P0       | RLS pós-P0 | Risco |
| ------------------------ | ---------------- | ---------- | ----- |
| `profiles`               | ❌ ENABLE ausente | ✅ ENABLED  | 🔴→🟢   |
| `clientes`               | ❌ ENABLE ausente | ✅ ENABLED  | 🔴→🟢   |
| `documentos`             | ❌ ENABLE ausente | ✅ ENABLED  | 🔴→🟢   |
| `access_log`             | ❌ ENABLE ausente | ✅ ENABLED  | 🔴→🟢   |
| `protheus_dict_snapshot` | ✅ (nova)         | ✅          | 🟢     |
| `tenant_protheus_config` | ✅ (nova)         | ✅          | 🟢     |
| `user_tenant`            | ✅ (nova)         | ✅          | 🟢     |

#### Pendências identificadas no laudo

- [ ] Audit periódico de `pg_class.relrowsecurity` via query de monitoramento
- [ ] Todas as migrations futuras: `supabase start` → testar local → `supabase db push` (nunca direto em prod)
- [ ] Quando Auth Hook for reativado: smoke test imediato de login + JWT claims
- [ ] Rate-limit na Edge Function (ainda sem implementação)

---

### Tarefa G.2 — Prompt Gemini (Analista de Backlog)

**Artefato:** Prompt de sistema para Gemini 3.1 Pro no Antigravity (VS Code)
**Arquivo:** Não persistido em repo — entregue como texto na sessão

#### O que foi gerado

Um prompt de sistema em dois blocos:

**Bloco 1 — Role/instrução:**

- Gemini atua como analista crítico de backlog (não como executor)
- Critica respostas anteriores do Claude, aponta lacunas, sugere próximas perguntas
- Faz 2–3 perguntas por turno, prioriza segurança > entrega > custo
- Estilo: direto, técnico, sem enrolação

**Bloco 2 — Briefing do projeto (contexto):**

- Stack: Supabase + Edge Functions Deno + Hostinger + TOTVS Protheus Cloud
- Arquitetura: monólito 46.786 linhas + Strangler Pattern SaaS
- Sprints concluídas: S0→S7 + R1 + P0
- Pendências: tenant provisioning (aguardando credenciais Protheus), merge final das branches, S8 (firewall), S9 (módulo dict-viewer)
- Riscos ativos: Auth Hook suspenso, tabelas prod sem homologação local, branch develop divergida

---

### Tarefa G.3 — Estruturação de `Governanca/tasks.md`

**Arquivo:** `Governanca/tasks.md`
**Status:** Descoberto já existente com 1122 linhas e 8 sessões documentadas

#### O que foi feito

- Verificado que o arquivo já continha histórico completo (sessões S-2026-04-27-A até S-2026-04-28-F)
- Adicionada entrada no índice para esta sessão (S-2026-04-28-G) via `Edit` cirúrgico
- Estrutura do arquivo confirmada: índice no topo → sessões mais recentes primeiro → template ao final
- Arquivo está no `.gitignore`? **Não** — está em `Governanca/tasks.md` e **não** está no gitignore (apenas `Governanca/bdapowered.html` está). Portanto, pode ser commitado.

---

### Resumo de artefatos desta sessão

| Artefato                             | Tipo                    | Status                                   |
| ------------------------------------ | ----------------------- | ---------------------------------------- |
| Laudo de segurança (schema produção) | Análise (verbal)        | ✅ entregue — sem commit                  |
| Prompt Gemini analista de backlog    | Texto (não persistido)  | ✅ entregue na sessão                     |
| `Governanca/tasks.md` — índice G     | Atualização incremental | ✅ índice atualizado + bloco G adicionado |

### Pendências pós-sessão

- [ ] Commitar `Governanca/tasks.md` (não está no .gitignore, pode ser versionado)
- [ ] Reativar Auth Hook após validação E2E local (S5.6)
- [ ] Provisionar tenant com credenciais Protheus reais (`scripts/setup-tenant.js`)
- [ ] Validar pipeline: `supabase start` → migration local → smoke test → `supabase db push`

---

---

## S-2026-04-28-H

**Data:** 2026-04-28
**Branch:** `feature/os-rt-modularization`
**Commits:** rebuild de `public/index.html` (sem commit novo — artefatos S5.7.1/S5.7.2 já estavam nos commits anteriores da sprint)
**Roadmap:** Sprint S5 — subtarefa 5.7 (Sprint 5.7 completa)
**OS Ativa:** OS-1042

---

### Contexto

Com o E2E de extração de dicionário validado via Node.js (`scripts/test-extract-dict.js` → HTTP 201 em S-2026-04-28-E), o objetivo desta sessão foi plugar o `fetch-interceptor.js` no fluxo **browser** — fazer com que chamadas Protheus feitas pelo monólito no browser passassem pelo interceptor e chegassem à Edge Function local, nunca ao Protheus diretamente.

---

### S5.7.1 — `EDGE_BASE` dinâmico no fetch-interceptor

**Arquivo alterado:** `src/core/fetch-interceptor.js` (linha 16)

#### Mudança cirúrgica (1 linha)

|             | Antes                                                                    | Depois                                     |
| ----------- | ------------------------------------------------------------------------ | ------------------------------------------ |
| `EDGE_BASE` | `'https://dbaqvoatopfquaqgdptk.supabase.co/functions/v1/protheus-proxy'` | `window.BEEIT_EDGE_URL \|\| 'https://...'` |

#### Por que esse padrão

Em produção, `window.BEEIT_EDGE_URL` não é definido → fallback para Edge de produção (comportamento idêntico ao anterior). Em dev, `dev-server.js` injeta `window.BEEIT_EDGE_URL = 'http://127.0.0.1:54321/functions/v1/protheus-proxy'` antes de qualquer script → interceptor usa Edge local. Zero impacto em produção.

#### Fluxo do interceptor

```
window.fetch (monkey-patched pelo IIFE em src/core/fetch-interceptor.js)
    │
    ├─ URL bate PROTHEUS_DIRECT_RE?
    │      (regex: beeit207327.protheus.cloudtotvs.com.br | localhost:3030)
    │
    ├─ SIM ──► reescreve URL:
    │           originalPath = url.pathname + url.search
    │           newURL = EDGE_BASE + '/protheus' + originalPath
    │           remove header 'Authorization: Basic ...'
    │           adiciona header 'Authorization: Bearer ' + window.beeitSession.access_token
    │           adiciona header 'apikey: ' + window.SUPABASE_ANON_KEY
    │           → chama fetch nativo com headers reescritos
    │
    └─ NÃO ──► passa adiante sem modificação (Supabase, ViaCEP, IBGE, etc.)
```

---

### S5.7.2 — `scripts/dev-server.js` — Servidor HTTP local de desenvolvimento

**Arquivo criado:** `scripts/dev-server.js`
**Porta:** `5000` · `HOST: 127.0.0.1` · Zero dependências externas · Node 20+

#### Por que é necessário

O Live Server do VS Code (porta 5500) serve o HTML sem nenhuma substituição. Com ele:

- `window.BEEIT_EDGE_URL` nunca é definido → interceptor aponta para Edge de produção
- `BEEIT_SB_URL` no HTML aponta para Supabase de produção → login usa banco de produção
- Headers CORS do browser rejeitam `127.0.0.1:5500` → Edge local retorna 403

O `dev-server.js` resolve os três problemas **em memória** (zero toque no arquivo em disco).

#### Lógica de `serveIndex()`

```
1. fs.readFileSync('public/index.html', 'utf8')
2. html.replaceAll(PROD_SB_URL, LOCAL_SB_URL)
        'https://dbaqvoatopfquaqgdptk.supabase.co' → 'http://127.0.0.1:54321'
        (afeta BEEIT_SB_URL, BEEIT_SB_KEY hardcoded, PROXY_URL no cfgTestProtheus)
3. html.replace('<head>', '<head>\n' + INJECT_BLOCK)
        injeta como PRIMEIRO script dentro de <head>:
        window.BEEIT_EDGE_URL    = 'http://127.0.0.1:54321/functions/v1/protheus-proxy'
        window.SUPABASE_ANON_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
4. res.end(html modificado)
```

#### Fluxo de inicialização (browser abre http://127.0.0.1:5000)

```
dev-server.js serve HTML modificado em memória
    │
    ├─ <head> (primeiro script injetado)
    │     window.BEEIT_EDGE_URL    = 'http://127.0.0.1:54321/functions/v1/protheus-proxy'
    │     window.SUPABASE_ANON_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
    │
    ├─ <!-- beeit:core-injected --> (segundo bloco — injetado pelo build-modules.js)
    │     IIFE: monkey-patch window.fetch
    │     EDGE_BASE lê window.BEEIT_EDGE_URL → aponta para Edge local
    │
    └─ monólito (BEEIT_SB_URL já substituído → aponta para 127.0.0.1:54321)
          createClient(BEEIT_SB_URL_local, BEEIT_SB_KEY_local)
          beeitInit() → login → JWT com tenant_id (Auth Hook local)
```

---

### Diagnóstico de usuário local — `admin@beeit.com.br`

O usuário `admin@beeit.com.br` existia no banco local (criado na sessão S-E) mas a senha havia sido esquecida.

#### Queries de diagnóstico (psql direto)

```sql
-- Confirmar existência do usuário
SELECT id, email, email_confirmed_at FROM auth.users WHERE email = 'admin@beeit.com.br';
-- → 18236a42-1247-48f5-8377-0eff529cdeb9 · confirmed

-- Confirmar vínculo de tenant
SELECT tenant_id, role FROM public.user_tenant WHERE user_id = '18236a42-1247-48f5-8377-0eff529cdeb9';
-- → 2234d38d-4c17-4872-a1d2-7ee127d4705c · admin
```

#### Reset via Admin API (sem psql, sem SQL direto)

```bash
curl -X PUT http://127.0.0.1:54321/auth/v1/admin/users/18236a42-1247-48f5-8377-0eff529cdeb9 \
  -H "apikey: sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz" \
  -H "Authorization: Bearer sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz" \
  -H "Content-Type: application/json" \
  -d '{"password": "BeeIT_local_2026"}'
# → 200 OK
```

---

### E2E Browser — Validação da Chain Completa

Pré-requisitos:

```bash
supabase start                                     # Supabase Local (OrbStack)
supabase functions serve protheus-proxy            # Edge Function local
node scripts/dev-server.js                         # Dev server (porta 5000)
```

#### 6 requests de rede observados no DevTools (Network)

| #   | Request                                                  | Status       | Significado                                                                                                                                               |
| --- | -------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `POST /auth/v1/token?grant_type=password`                | 200          | Login OK; JWT com `tenant_id` injetado pelo Auth Hook                                                                                                     |
| 2   | `GET /rest/v1/profiles?...`                              | 404          | Esperado — tabela `profiles` não existe no banco local (só no remoto)                                                                                     |
| 3   | `GET /rest/v1/tenant_protheus_config?...`                | 200          | URL Protheus gerenciada carregada no form de config                                                                                                       |
| 4   | `GET .../protheus-proxy/beeit/health`                    | 404          | BUG-001: path errado no monólito —`/beeit/health` deve ser `/health`                                                                                      |
| 5   | `GET .../COMPANIES/?pageSize=1` (mode:no-cors)           | sem headers  | BUG-002: FASE 2 do cfgTestProtheus usa `no-cors` → browser dropa todos os headers customizados silenciosamente                                            |
| 6   | `POST .../protheus-proxy/protheus/COMPANIES/?pageSize=1` | 401→Protheus | **SUCESSO** — interceptor interceptou, reescreveu URL para Edge, injetou JWT+apikey; Edge validou JWT → buscou Basic Auth no Vault → chamou Protheus real |

**Evidência de atividade do interceptor (stack trace F12):**

```
interceptedFetch @ (index):63
cfgTestProtheus @ (index):19175
```

#### `cfgTestProtheus()` — análise das 3 fases

| Fase   | O que faz                                                                             | Resultado no dev                                                                                        |
| ------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| FASE 1 | Detecta se `window.BEEIT_EDGE_URL` está definido                                      | ✅ detectado —`usandoProxy = true` (mas `/beeit/health` 404 anula)                                       |
| FASE 2 | `fetch(restBase + '/COMPANIES/', {mode:'no-cors'})` — probe de existência do servidor | ❌`mode:no-cors` dropa `Authorization`/`apikey` → Edge retorna 401 (esperado — não é bug real)           |
| FASE 3 | `fetch(PROXY_URL + '/protheus/COMPANIES/')` com headers — verifica proxy real         | ✅ interceptor captura → Edge valida JWT → Protheus responde (HTTP 401 do Protheus = servidor alcançado) |

---

### Tabelas Supabase envolvidas nesta sessão

| Tabela                    | Schema   | Operação                        | Contexto                                               |
| ------------------------- | -------- | ------------------------------- | ------------------------------------------------------ |
| `auth.users`              | `auth`   | SELECT (psql) · PUT (Admin API) | Diagnóstico e reset de senha do usuário local          |
| `user_tenant`             | `public` | SELECT (psql)                   | Confirmar vínculo tenant_id → admin                    |
| `tenant_protheus_config`  | `public` | SELECT (PostgREST)              | `beeitShowApp()` carrega URL gerenciada                |
| `vault.decrypted_secrets` | `vault`  | SELECT (Edge Function)          | Edge busca Basic Auth do Protheus pelo vault alias     |
| `audit_protheus`          | `public` | INSERT (Edge Function)          | Log automático de chamada Protheus                     |
| `profiles`                | `public` | SELECT (PostgREST)              | 404 esperado — não existe no banco local               |
| `access_log`              | `public` | INSERT (PostgREST)              | Tentativa pelo monólito — tabela não existe localmente |

---

### Bugs identificados (sem correção nesta sessão)

| ID       | Arquivo                   | Linha                             | Descrição                                                                                               | Impacto                                                                                              |
| -------- | ------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| BUG-001  | `src/BeeIT-OS-RT-v2.html` | 19164                             | Health check usa `/beeit/health` mas Edge expõe `/health`                                               | `usandoProxy` fica `false`; diagnóstico incorreto. Baixo impacto — interceptor funciona independente |
| BUG-002  | `src/BeeIT-OS-RT-v2.html` | 19175                             | FASE 2 do cfgTestProtheus usa `mode:'no-cors'` → browser dropa `Authorization`/`apikey` silenciosamente | Edge retorna 401 em FASE 2 sempre. Não bloqueia FASE 3                                               |
| INFO-001 | `src/BeeIT-OS-RT-v2.html` | 35474, 36075, 39110, 41864, 43590 | SyntaxErrors pré-existentes em template literals de `_m41ExportPDF` (sequências `<\/script>`)           | Apenas afetam exportação de PDF; não-blocking para o restante                                        |

---

### Resumo de artefatos desta sessão

| Artefato                        | Tipo                        | Status                                                                         |
| ------------------------------- | --------------------------- | ------------------------------------------------------------------------------ |
| `src/core/fetch-interceptor.js` | Alterado (1 linha — S5.7.1) | ✅ EDGE_BASE dinâmico via `window.BEEIT_EDGE_URL`                               |
| `scripts/dev-server.js`         | Criado (S5.7.2)             | ✅ servidor Node 20+ · substitui Supabase URL · injeta vars locais · porta 5000 |
| `public/index.html`             | Rebuild (build-modules.js)  | ✅ interceptor injetado · 7 scripts inline OK                                   |
| `docs/ROADMAP.md`               | Atualizado                  | ✅ Sprint S5 → ✅ CONCLUÍDA com evidência E2E                                    |

### Pendências pós-sessão (Sprint 6+)

- [ ] BUG-001: corrigir `/beeit/health` → `/health` no monólito (linha 19164)
- [ ] Sprint 8: hardening de rede no Protheus (firewall libera apenas IP do Supabase)
- [ ] Sprint 9: módulo `src/modules/dict-viewer` + extração MATA410/415/460
- [ ] Sprint 10: eliminar monólito (shell HTML puro com módulos externos)
- [ ] Commitar `Governanca/tasks.md` (não está no .gitignore)

---

<!-- TEMPLATE PARA PRÓXIMAS SESSÕES ─────────────────────────────────────────

## S-YYYY-MM-DD-X
**Data:** YYYY-MM-DD
**Branch:** `<branch>`
**Commits:** `<sha>` (tarefa) · …
**Roadmap:** Sprint SX (subtarefas X.Y, X.Z)

---

### Contexto

Breve parágrafo situando a sessão em relação ao sprint/fase do projeto.

---

### <Tarefa / Sprint X.Y> — <Título>

**Arquivo(s) criado(s)/alterado(s):** …
**Commit:** `<sha>`

#### O que faz

…

#### Fluxo interno / Diagrama

```
…
```

#### Tabelas Supabase impactadas

| Tabela | Operação             | Observação |
| ------ | -------------------- | ---------- |
| …      | SELECT/INSERT/UPDATE | …          |

#### Endpoints / Edge Functions chamados

| Endpoint                         | Método | Descrição |
| -------------------------------- | ------ | --------- |
| `/functions/v1/protheus-proxy/…` | POST   | …         |

#### Arquivos envolvidos

| Arquivo | Papel |
| ------- | ----- |
| …       | …     |

---

### Resumo de artefatos desta sessão

| Artefato | Tipo | Status |
| -------- | ---- | ------ |
| …        | …    | …      |

### Pendências pós-sessão

- [ ] …

───────────────────────────────────────────────────────────────────────── -->

---

## S-2026-04-28-INIT
**Data:** 2026-04-28
**Branch:** `feat/modularization-security-v1`
**Commit final:** `8b15403`
**Roadmap:** S0 · S0.1 · S0.2 · S1 · S2 · S3 · S4 + Plano S5
**Contexto:** Sessão inaugural de modularização — gerada pelo Gemini como resumo histórico

---

### Contexto de entrada

| Item | Valor |
|---|---|
| Monólito | `src/BeeIT-OS-RT-v2.html` — 46.786 linhas / 3,4 MB |
| Módulos produção (read-only) | `src/assessments/`, `src/rm-agents/` |
| Objetivo geral | Modularização + multi-tenancy + segurança de borda, sem reescrever o monólito |

---

### S0 · Sanitização de credenciais + Identidade Git isolada

| # | Atividade | Arquivo(s) |
|---|---|---|
| 1 | Removida senha admin `BeeIT@2025!` de docs versionados | `CLAUDE.md`, `CLAUDE_CODE_GUIDE.md`, `QUICKSTART.md` |
| 2 | Criada chave SSH dedicada `beeit_inovacao_ed25519` | `~/.ssh/beeit_inovacao_ed25519` |
| 3 | Alias `Host github.com-beeit` isolado | `~/.ssh/config` |
| 4 | Remote do clone apontado para alias | `.git/config` (local) |
| 5 | `git config --local user.email inovacao@beeitpartner.com.br` | `.git/config` (local) |

**ADR-001** — Identidade Git isolada; conta pessoal `bda-dev` permanece separada.

---

### S0.2 · Governança `.claude/`

| Arquivo | Propósito |
|---|---|
| `.claude/rules/code-style.md` | Papéis engenharia, SOLID, proibição CSS no monólito |
| `.claude/rules/testing.md` | `node --check` obrigatório, RLS, REST |
| `.claude/skills/deploy/deploy-config.md` | FTP-only; assessments/rm-agents são production-LOCKED |

---

### S1 · Tag rollback + scaffold

| Atividade | Detalhe |
|---|---|
| Tag `rollback/pre-modularization` | Criada e pusheada |
| Branch `feat/modularization-security-v1` | Criada de `main` |
| Scaffold | `src/core/`, `src/services/`, `src/security/`, `src/modules/` |

---

### S2 · Migrations Supabase — Multi-tenancy + RLS

**Status:** código pronto, pendente `supabase db push`

#### Arquivos criados

| Migration | Conteúdo |
|---|---|
| `20260424155100_helpers_auth.sql` | `auth_tenant_id()`, `user_belongs_to_tenant()`, `is_tenant_admin()`, `set_updated_at()` |
| `20260424155200_schema_multitenant.sql` | 4 tabelas + RLS completo |
| `20260424161500_audit_protheus.sql` | Tabela append-only `audit_protheus` |

#### Tabelas criadas

| Tabela | PK | Descrição |
|---|---|---|
| `public.tenant_protheus_config` | `tenant_id uuid` | URL, env, empresa, filial, ref Vault |
| `public.user_tenant` | `(user_id, tenant_id)` | Vínculo usuário↔tenant com `role` |
| `public.protheus_dict_snapshot` | `(tenant_id, user_id, sx2_alias char(3))` | Snapshot SX3 + hash SHA-256 |
| `public.protheus_dict_history` | `id uuid` | Histórico append-only de diffs |
| `public.audit_protheus` | `id uuid` | Log append-only de chamadas ao proxy |

#### Políticas RLS

| Tabela | Op | Regra |
|---|---|---|
| `tenant_protheus_config` | SELECT | `user_belongs_to_tenant(tenant_id)` |
| `tenant_protheus_config` | UPDATE | `is_tenant_admin(tenant_id)` |
| `user_tenant` | SELECT | `user_id = auth.uid()` |
| `audit_protheus` | INSERT | `service_role` apenas |

**Problema resolvido:** RLS em `user_tenant` causava recursão infinita.
**Solução:** `is_tenant_admin(uuid)` com `SECURITY DEFINER` bypassa RLS internamente.

---

### S3 · Edge `protheus-proxy` v3 — Hardening + Repo AdvPL

**Arquivo:** `supabase/functions/protheus-proxy/index.ts` — v3.0 (305 linhas)
**Status:** código pronto · ⚠️ NÃO deployada (breaking change com frontend atual)

| Camada | Antes | Depois (v3) |
|---|---|---|
| CORS | `Access-Control-Allow-Origin: *` | Allow-list `ORIGIN_EXACT` Set + regex localhost |
| Auth | Sem validação | `supabase.auth.getUser(jwt)` + `tenant_id` do JWT |
| Credenciais | `x-protheus-auth` do browser | Vault via `resolveProtheusCredentials(tenantId)` |
| Path allow-list | Sem restrição | Regex `/api/v1/bda/*`, `/rest/mata4\d{2}` |
| Audit | Não existia | INSERT `public.audit_protheus` (best-effort) |

**Consulta interna (service_role):**
```sql
SELECT t.protheus_url, t.protheus_env, t.protheus_company, t.protheus_filial,
       s.decrypted_secret
FROM public.tenant_protheus_config t
JOIN vault.decrypted_secrets s ON s.name = t.basic_auth_ref
WHERE t.tenant_id = $1 AND t.active = true;
```

**ADR-004** — Browser nunca vê URL nem senha do ERP.
**ADR-006** — Fontes AdvPL em repo privado dedicado (`beeit-protheus-advpl`).

**Repo AdvPL criado:** `git@github.com-beeit:BeeIt-Inovacao/beeit-protheus-advpl`

| Fonte | Endpoint |
|---|---|
| `src/BdaDictApi.tlpp` | `GET /api/v1/bda/dictionary/blueprint` |
| `src/BdaDictUtil.tlpp` | helper (sem endpoint) |
| `src/BDADynApi.tlpp` | `POST /api/v1/bda/dynamic` |

---

### S4 · Auth Hook + RPC provision_tenant + setup-tenant.js

#### Migrations criadas

| Migration | Função |
|---|---|
| `20260424163000_auth_hook_tenant_claim.sql` | `custom_access_token_hook(event jsonb)` |
| `20260424163100_provision_tenant_rpc.sql` | `provision_tenant_protheus(...)` + `list_provisioned_tenants()` |

#### Claims injetados no JWT pelo Auth Hook

| Claim | Fonte |
|---|---|
| `tenant_id` (top-level) | `user_tenant` (vínculo mais antigo por `created_at`) |
| `app_metadata.tenant_id` | idem |
| `app_metadata.role_in_tenant` | `user_tenant.role` |

⚠️ **Ativação manual pendente:** Dashboard → Auth → Hooks → Customize Access Token → `public.custom_access_token_hook`

#### RPC `provision_tenant_protheus` — fluxo atômico

```
1. INSERT tenant_protheus_config (basic_auth_ref='pending') → uuid
2. secret_name = 'tenant_<uuid-sem-hifens>_protheus_basicauth'
3. vault.create_secret(b64, secret_name, desc)
4. UPDATE tenant_protheus_config SET basic_auth_ref = secret_name
5. (Opcional) INSERT user_tenant (user_id, tenant_id, role='admin')
```
Qualquer erro → rollback total. `GRANT EXECUTE` apenas a `service_role`.

#### `scripts/setup-tenant.js`

Zero deps (Node 20+). Uso: `node --env-file=.env scripts/setup-tenant.js [--flags]`

**ADR-007** — Troca de tenant em runtime via `supabase.auth.refreshSession()`.
**ADR-008** — Adaptação por interceptor (S5), não reescrita. Rollback = `git revert`.

---

### Plano Sprint 5 — aprovado, pendente execução

| Fase | Entregável | Est. |
|---|---|---|
| 5.1 | `scripts/scan-monolith-fetch.js` → inventário fetch do monólito | 30 min |
| 5.2 | Edge v3.1 — `PROTHEUS_PATH_ALLOW_LEGACY` (paths `/SA1/`, `/CT1/`, etc.) | 15 min |
| 5.3 | `src/core/fetch-interceptor.js` — monkey-patch `window.fetch` | 90 min |
| 5.4 | `scripts/build-modules.js` — injeta `src/core/*.js` no HTML final | 60 min |
| 5.5 | `deploy.yml` — substitui `cp` pelo build script | 15 min |
| 5.6 | Dev test (localhost + DevTools) | ~2h |
| 5.7 | Deploy coordenado (Edge v3.1 + frontend) | janela |

**Bypass direto crítico no monólito (linhas 7163 e 27880):** `Authorization: Basic btoa(user:pass)` saindo do browser. O interceptor (5.3) remove esse header e redireciona para a Edge.

---

### Resumo de artefatos

| Artefato | Status |
|---|---|
| 5 migrations Supabase (helpers, schema, audit, hook, rpc) | ✅ commitado `8b15403` |
| `supabase/functions/protheus-proxy/index.ts` v3 | ✅ commitado · ⚠️ não deployado |
| `scripts/setup-tenant.js` | ✅ commitado |
| `.env.example` | ✅ commitado |
| `docs/SPRINT-5-PLAN.md` | ✅ commitado |
| `docs/ROADMAP.md` (ADRs 001-008) | ✅ commitado |
| Repo `beeit-protheus-advpl` (3 fontes TLPP) | ✅ pusheado (repo separado) |

### Pendências pós-sessão

- [ ] `supabase db push --linked` — aplicar migrations no banco remoto
- [ ] Ativar Auth Hook no Dashboard Supabase (ação manual)
- [ ] Provisionar tenant com `scripts/setup-tenant.js`
- [ ] Executar Sprint 5 (fases 5.1→5.5)
- [ ] Confirmar HTTP/2 no Hostinger (multi-file vs single-file build)


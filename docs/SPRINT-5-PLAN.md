# Sprint 5 — Plano de Adaptação do Monólito (sem reescrita)

> **Objetivo:** tornar o `src/BeeIT-OS-RT-v2.html` (46.786 linhas) compatível com a Edge v3 **sem editar a lógica existente**. A estratégia é injetar um *fetch interceptor* como código novo em `src/core/`, que o build passa a incluir no HTML final.

## Descobertas da auditoria (fundamentam o plano)

Grep exaustivo nos ~46.786 linhas do monólito:

| Descoberta | Impacto |
|---|---|
| **Zero uso de header `x-protheus-auth`** | ✅ Não precisa remover — já não existe. |
| Paths legados em uso: `/SA1/`, `/SA2/`, `/SA6/`, `/CT1/`, `/CTT/`, `/SEE/`, `/SX3/`, `/SX6/`, `/COMPANIES/` | 🔴 Bloqueados pela allow-list atual da Edge v3. |
| Endpoints framework: `/api/framework/v1/health`, `/api/framework/v1/company` | 🔴 Bloqueados. |
| Fetch **direto** ao Protheus com `Authorization: Basic <btoa(user:pass)>` em **linhas 7163 e 27880** | 🔴 Bypass completo do proxy — expõe credenciais no browser. |
| Proxy já é usado corretamente para IBGE, ViaCEP, BrasilAPI (linhas que contêm `protheus-proxy/ibge/...`) | ✅ Não precisa mexer. |
| URL-base do Protheus vem de `cfg.restBase` (configurável pelo usuário via UI de Configurações) | ⚠️ Alvo ideal do interceptor — reescrever URL-base em runtime. |

## Estratégia em 4 camadas

```
┌─────────────────────────────────────────────────────────────┐
│  src/core/fetch-interceptor.js     (camada 1 — runtime)     │
│  Intercepta window.fetch e reescreve URL + headers ANTES    │
│  da requisição sair do browser.                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Edge v3 + legacy-aliases allow-list (camada 2 — borda)     │
│  Ampliar regex para incluir os aliases legados usados       │
│  HOJE; manter bloqueio para SIGAADV/admin/outros.           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  scripts/build-modules.js          (camada 3 — build)       │
│  Injeta src/core/*.js no topo do HTML final antes de        │
│  qualquer outro <script>.                                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  .github/workflows/deploy.yml      (camada 4 — CI)          │
│  Usa o build script em vez do cp direto.                    │
└─────────────────────────────────────────────────────────────┘
```

**Nenhuma edição no HTML monolítico** — toda a adaptação vive em arquivos NOVOS que o build **injeta**. Rollback é trivial: `git revert` o commit da Sprint 5 + redeploy.

---

## Fases detalhadas

### 5.1 — Inventário completo (auditoria)

**Entregável:** `docs/SPRINT-5-INVENTORY.md` com tabela exaustiva.

Script: `scripts/scan-monolith-fetch.js` (zero-dep, Node 20+) que:
- Extrai toda ocorrência de `fetch(...)` do HTML
- Categoriza por destino:
  - `PROTHEUS_DIRECT` (contém `beeit207327.protheus.cloudtotvs.com.br` ou IP)
  - `PROTHEUS_VIA_PROXY` (contém `/protheus-proxy/protheus/`)
  - `PUBLIC_VIA_PROXY` (contém `/protheus-proxy/{ibge,viacep,brasilapi}/`)
  - `SUPABASE` (contém `.supabase.co`)
  - `AI` (contém `anthropic.com` ou `openai.com`)
  - `EXTERNAL` (outro domínio)
  - `RELATIVE` (começa com `/`)
- Emite estatística: `{path, line, category, headers_used}[]`

Uso:
```bash
node scripts/scan-monolith-fetch.js src/BeeIT-OS-RT-v2.html > docs/SPRINT-5-INVENTORY.md
```

Risco: ~0 (só lê).

### 5.2 — Ampliar allow-list da Edge v3 (legacy-aliases)

**Entregável:** patch em [supabase/functions/protheus-proxy/index.ts](../supabase/functions/protheus-proxy/index.ts).

Adicionar um **segundo regex** (`PROTHEUS_PATH_ALLOW_LEGACY`) com os aliases efetivamente usados pelo monólito hoje, baseado em 5.1:

```ts
// Aliases legados — migrar para /bda/dynamic (action EXEC_SQL) em Sprint 6+.
// Cada endpoint aqui é auditado e será removido quando o monólito estiver 100% migrado.
const PROTHEUS_PATH_ALLOW_LEGACY = new RegExp(
  "^/(" +
    "rest/(SA1|SA2|SA6|SB1|CT1|CTT|CTD|SE4|SED|SEE|SF4|SN1|SX3|SX6)(/[A-Z0-9]*)?/?" +
    "|" +
    "COMPANIES/?" +
    "|" +
    "api/framework/v1/(health|company|user)" +
  ")$",
  "i"
);

// Na função handler:
if (!PROTHEUS_PATH_ALLOW.test(rest) && !PROTHEUS_PATH_ALLOW_LEGACY.test(rest)) {
  // ... audit + 403
}

// Se bateu no LEGACY, adiciona tag no audit para migração futura:
const isLegacy = PROTHEUS_PATH_ALLOW_LEGACY.test(rest);
await audit({ ..., rejectedReason: isLegacy ? "legacy_alias_in_use" : null });
```

**Importante:** todos os endpoints legacy continuam protegidos por JWT + tenant_id + Vault (camadas 2, 3, 4 da Edge v3). Só a _path allow-list_ é ampliada — sem regressão das outras defesas.

Commit: `feat(proxy): add legacy-aliases allow-list for monolith compat (Sprint 5)`

### 5.3 — `src/core/fetch-interceptor.js`

**Entregável:** novo arquivo (≈200 linhas) com monkey-patch de `window.fetch`.

Responsabilidades:
1. **Reescrever URL** quando o request aponta para o Protheus **direto** (bypass):
   ```
   http://beeit207327.protheus.cloudtotvs.com.br:10607/<path>
   →
   https://dbaqvoatopfquaqgdptk.supabase.co/functions/v1/protheus-proxy/protheus/<path>
   ```
2. **Remover `Authorization: Basic <btoa(...)>`** desses requests — a Edge injeta do Vault.
3. **Injetar `Authorization: Bearer <supabase_jwt>`** se ausente, lendo de `window.beeitSession?.access_token`.
4. **Injetar `apikey: <SUPABASE_ANON_KEY>`** se ausente.
5. **Log + métrica** em `console.debug` com prefixo `[fetch-interceptor]` para debugging em dev.

Template:

```js
// src/core/fetch-interceptor.js
(function() {
  'use strict';
  if (window.__beeitFetchInterceptorInstalled) return;
  window.__beeitFetchInterceptorInstalled = true;

  const EDGE_BASE = 'https://dbaqvoatopfquaqgdptk.supabase.co/functions/v1/protheus-proxy';
  const PROTHEUS_DIRECT = /^https?:\/\/beeit207327\.protheus\.cloudtotvs\.com\.br:10607/;
  const IS_LOCAL_DEV = /^(http:\/\/localhost|http:\/\/127\.0\.0\.1)/;

  const origFetch = window.fetch.bind(window);

  async function getSupabaseJWT() {
    try {
      if (window.beeitSession?.access_token) return window.beeitSession.access_token;
      if (window.supabase?.auth?.getSession) {
        const { data } = await window.supabase.auth.getSession();
        return data?.session?.access_token || null;
      }
    } catch (_) {}
    return null;
  }

  window.fetch = async function interceptedFetch(input, init = {}) {
    const url = typeof input === 'string' ? input : input?.url || '';
    const targetsProtheusDirect = PROTHEUS_DIRECT.test(url);
    const targetsEdgeProxy      = url.startsWith(EDGE_BASE) || url.includes('/protheus-proxy/');

    if (!targetsProtheusDirect && !targetsEdgeProxy) {
      return origFetch(input, init);
    }

    const newInit = { ...init, headers: new Headers(init.headers || (typeof input === 'object' ? input.headers : undefined)) };
    let newUrl = url;

    if (targetsProtheusDirect) {
      newUrl = url.replace(PROTHEUS_DIRECT, `${EDGE_BASE}/protheus`);
      newInit.headers.delete('Authorization');  // Basic <user:pass> sai daqui
      console.debug('[fetch-interceptor] direct→proxy:', url, '→', newUrl);
    }

    // Supabase JWT obrigatório na Edge v3
    if (!newInit.headers.has('Authorization')) {
      const jwt = await getSupabaseJWT();
      if (jwt) newInit.headers.set('Authorization', `Bearer ${jwt}`);
    }
    if (!newInit.headers.has('apikey') && window.SUPABASE_ANON_KEY) {
      newInit.headers.set('apikey', window.SUPABASE_ANON_KEY);
    }

    return origFetch(typeof input === 'string' ? newUrl : new Request(newUrl, input), newInit);
  };
})();
```

**Idempotência:** `__beeitFetchInterceptorInstalled` impede dupla instalação em hot-reload.

### 5.4 — `scripts/build-modules.js`

**Entregável:** script Node 20+ zero-dep.

Lógica:
1. Lê `src/BeeIT-OS-RT-v2.html`.
2. Lê todos os `src/core/*.js` (ordenados alfabeticamente — ou via manifest).
3. Monta um bloco:
   ```html
   <!-- beeit:core-injected (DO NOT EDIT — gerado por scripts/build-modules.js) -->
   <script>
   /* === src/core/fetch-interceptor.js === */
   (conteúdo do arquivo)
   </script>
   <!-- /beeit:core-injected -->
   ```
4. Injeta **imediatamente após a abertura de `<head>`** (antes de qualquer outro `<script>`).
5. Grava em `public/index.html`.

Testes internos:
- Recusa de injetar 2× (detecta marcador `beeit:core-injected`).
- Verifica que `node --check` passa em cada `.js` antes de injetar.

### 5.5 — Atualizar `.github/workflows/deploy.yml`

Substituir o `cp` atual pelo build script:

```yaml
- name: Build com módulos injetados
  run: node scripts/build-modules.js src/BeeIT-OS-RT-v2.html public/index.html

- name: Validar sintaxe do bundle final
  run: |
    node -e "const fs=require('fs');const html=fs.readFileSync('public/index.html','utf8');
      const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\\/script>/g)]
        .map(m=>m[1]).filter(s=>s.trim().length>0);
      scripts.forEach((s,i)=>{try{new Function(s);}catch(e){console.error('❌',i,e.message);process.exit(1);}});
      console.log('✅',scripts.length,'scripts OK');"
```

O job `deploy` recebe o artifact do `validate`, não precisa duplicar o build.

### 5.6 — Dev test (localhost)

Checklist antes do PR:
- [ ] `node scripts/build-modules.js src/... public/...` passa local
- [ ] Abrir `public/index.html` em `http://localhost:8080`, login com admin, rodar fluxo que chama Protheus (importar SPED, por exemplo)
- [ ] Verificar no DevTools → Network que requests a `beeit207327...:10607` foram reescritas para `.supabase.co/functions/v1/protheus-proxy/`
- [ ] Verificar que `audit_protheus` tem linhas correspondentes

### 5.7 — Staging + produção

1. **Pré-deploy:**
   - `tenant_protheus_config` populada via `scripts/setup-tenant.js` (Sprint 4)
   - Secret no Vault gravado
   - Auth Hook ativo no Supabase Dashboard
   - Todos os usuários fizeram logout → login (para obter JWT com `tenant_id`)

2. **Deploy Edge v3.1 (com legacy-aliases):**
   ```bash
   supabase functions deploy protheus-proxy --project-ref dbaqvoatopfquaqgdptk
   ```

3. **Deploy frontend (build com interceptor injetado):**
   - Merge da branch → `deploy.yml` roda automaticamente.

4. **Smoke test pós-deploy:**
   - Health: `curl .../functions/v1/protheus-proxy/health` → 200
   - Importação SPED: fluxo completo no browser
   - Consulta SA1 direta (UI de configuração): deve retornar dados
   - Verificar `audit_protheus`: nenhum `rejected_reason` inesperado

5. **Rollback rápido** se necessário:
   ```bash
   git revert <commit-sprint-5>
   git push
   # GitHub Actions redeploya HTML sem interceptor
   # + rollback da Edge v3.1 no Dashboard (ou revert commit e redeploy)
   ```

---

## Riscos e mitigações

| Risco | Severidade | Mitigação |
|---|---|---|
| Interceptor entra em conflito com outra lib que monkey-patches `fetch` (ex.: Sentry, GA) | 🟠 | Guard `__beeitFetchInterceptorInstalled` + chainear `origFetch` salvando versão anterior. Testar com DevTools ligado. |
| Paths não identificados em 5.1 aparecem em produção | 🟠 | Audit log captura `rejected_reason=legacy_alias_in_use` — monitorar por 48h antes de considerar safe. |
| `window.beeitSession.access_token` expira → interceptor chama sem JWT válido → 401 em loop | 🟡 | Deixar passar sem injetar se JWT não estiver disponível — a Edge retorna 401 → monólito (em teoria) redireciona para login. |
| Fetch direto ao Protheus ainda com Basic Auth que dá certo (fallback antigo) | 🟢 | Depois da Sprint 5, o Protheus pode ter firewall liberando só o IP do Supabase — mas isso é Sprint 7+ (hardening de rede). |

---

## Estimativas

- **5.1** (inventário): 30 min (só grep + script)
- **5.2** (legacy allow-list): 15 min (adicionar regex + audit tag)
- **5.3** (interceptor): 90 min (código + self-test unitário)
- **5.4** (build script): 60 min
- **5.5** (deploy.yml): 15 min
- **5.6** (dev test): ~2h (browser, DevTools, smoke manual)
- **5.7** (staging + prod): dependente da janela operacional

Total técnico: **~5h** de código + tempo de janela.

---

## O que NÃO entra na Sprint 5

- Reescrita de paths legacy (`/SA1/` → `/api/v1/bda/dynamic`) — fica para Sprint 6.
- Fechamento de firewall no Protheus (só aceitar IP Supabase) — Sprint 7.
- Migração de MATA410/415/460 para `src/modules/*` — Sprint 8.
- Remoção completa do monólito — Sprint 10.

A Sprint 5 é **cirúrgica**: torna a Edge v3 utilizável em produção sem tocar no monólito, preservando rollback trivial.

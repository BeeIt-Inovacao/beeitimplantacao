# Sprint 5.7 — Fetch Interceptor: Validação Browser E2E

> **Pré-requisito:** Sprint 5.6 ✅ — E2E Node validado (Edge → Protheus → snapshot).
> **Objetivo:** replicar o mesmo fluxo no browser, com o `fetch-interceptor.js` já injetado
> no monólito interceptando as chamadas da UI e roteando-as pela Edge Function local.

---

## Estado atual (entrada da sprint)

| Item | Status | Detalhe |
|---|---|---|
| `src/core/fetch-interceptor.js` | ✅ existe | Monkey-patch de `window.fetch` — detecta URL Protheus e reescreve para Edge |
| Injeção em `public/index.html` | ✅ feita | Build injector inseriu o interceptor nas linhas 6-95 do HTML |
| `EDGE_BASE` (interceptor) | 🔴 hardcoded | `'https://dbaqvoatopfquaqgdptk.supabase.co/functions/v1/protheus-proxy'` — sem fallback local |
| `BEEIT_SB_URL` (monólito) | 🔴 hardcoded | `const BEEIT_SB_URL = 'https://dbaqvoatopfquaqgdptk.supabase.co'` — `const` em escopo de script |
| `window.SUPABASE_ANON_KEY` | ⚠️ não setado | Interceptor tenta ler mas a variável não é declarada como `window.*` no monólito |
| Edge Function local | ✅ funcional | `supabase functions serve` validado com Node (S5.6) |
| Tenant local | ✅ provisionado | `tenant_id: 2234d38d-...` com Vault e Basic Auth no banco local |

---

## Descobertas técnicas críticas

### 1. `EDGE_BASE` precisa ser configurável
O interceptor tem `EDGE_BASE` como `var` dentro de uma IIFE — não é sobrescrevível de fora.
**Fix:** ler de `window.BEEIT_EDGE_URL` com fallback para a URL de produção.

```js
// src/core/fetch-interceptor.js — linha 16 atual:
var EDGE_BASE = 'https://dbaqvoatopfquaqgdptk.supabase.co/functions/v1/protheus-proxy';

// linha 16 corrigida:
var EDGE_BASE = window.BEEIT_EDGE_URL || 'https://dbaqvoatopfquaqgdptk.supabase.co/functions/v1/protheus-proxy';
```

### 2. `BEEIT_SB_URL` é `const` em escopo de script — não sobrescrevível via `window.*`
O browser precisa autenticar na instância Supabase correta para o JWT gerado ser aceito
pela Edge Function local. Como `const BEEIT_SB_URL` está no escopo do segundo `<script>` do
HTML (linha 772), não pode ser redefinido por um script injetado antes.

**Solução adotada no plano:** dev server (`scripts/dev-server.js`) que serve o `index.html`
com substituição de string em memória (sem tocar no arquivo), trocando a URL de produção
pela local antes de enviar ao browser. Zero impacto em `public/index.html`.

### 3. `window.SUPABASE_ANON_KEY` não está definida
O interceptor tenta injetar o header `apikey` lendo `window.SUPABASE_ANON_KEY`, mas essa
variável não é exposta como `window.*` no monólito. Para o dev server, a anon key local
(`sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH`) precisa ser injetada.

### 4. Chamadas Protheus no monólito que o interceptor captura
O interceptor captura via `PROTHEUS_DIRECT_RE` qualquer URL que contenha
`beeit207327.protheus.cloudtotvs.com.br`. As chamadas ativas identificadas no monólito:

| Linha | Chamada | Rota Protheus |
|---|---|---|
| 7276 | Login/verificação empresa | `/api/framework/v1/company` |
| 13175 | Dados empresa/filial SED | `/api/framework/v1/company/{emp}/{fil}/SED` |
| 13306 | Blueprint alias dinâmico | `/api/framework/v1/company/{emp}/{fil}/{alias}` |
| 19276 | Diagnóstico conectividade | `/COMPANIES/?pageSize=1` (legado) |
| 21458 | ExecAuto genérico | `cfg.restBase + ep` |

---

## Tarefas da Sprint 5.7

### S5.7.1 — Tornar `EDGE_BASE` configurável (1 linha)

**Arquivo:** `src/core/fetch-interceptor.js`

```diff
- var EDGE_BASE = 'https://dbaqvoatopfquaqgdptk.supabase.co/functions/v1/protheus-proxy';
+ var EDGE_BASE = window.BEEIT_EDGE_URL || 'https://dbaqvoatopfquaqgdptk.supabase.co/functions/v1/protheus-proxy';
```

Depois: `cp src/BeeIT-OS-RT-v2.html public/index.html` e rebuild via build-modules.js.

**Critério:** `console.debug('[fetch-interceptor] installed — Edge:', EDGE_BASE)` exibe URL local
quando `window.BEEIT_EDGE_URL` está definido.

---

### S5.7.2 — Dev Server local (`scripts/dev-server.js`)

Servidor HTTP minimalista (zero deps, Node 20+) que:

1. Lê `public/index.html` em memória
2. Injeta um bloco `<script>` como **primeiro nó** do `<head>`:

```html
<script>
window.BEEIT_EDGE_URL   = 'http://127.0.0.1:54321/functions/v1/protheus-proxy';
window.SUPABASE_ANON_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
</script>
```

3. Faz substituição de string em memória no HTML servido:

```
'https://dbaqvoatopfquaqgdptk.supabase.co'
→
'http://127.0.0.1:54321'
```

4. Serve em `http://127.0.0.1:5000`
5. Todos os outros assets (CSS, JS, imagens) são servidos normalmente de `public/`

**Uso:**
```bash
node scripts/dev-server.js
# abre http://127.0.0.1:5000 no browser
```

**Não modifica** `public/index.html` — a substituição é apenas na response HTTP.

---

### S5.7.3 — Checklist de validação browser E2E

Pré-condição: Edge Function rodando (`supabase functions serve protheus-proxy --no-verify-jwt --env-file .env.local`)

| # | Ação | Resultado esperado |
|---|---|---|
| 1 | `node scripts/dev-server.js` → abrir `http://127.0.0.1:5000` | HTML carrega sem erros no console |
| 2 | F12 → Console → verificar log do interceptor | `[fetch-interceptor] installed — Edge: http://127.0.0.1:54321/functions/v1/protheus-proxy` |
| 3 | Login com `admin@beeit.com.br` | `beeitSession` preenchido; JWT com `tenant_id: 2234d38d-...` |
| 4 | Navegar para tela de Configurações → salvar URL Protheus | Qualquer chamada de teste que dispare fetch ao Protheus |
| 5 | F12 → Network → filtrar `functions/v1` | Request vai para `127.0.0.1:54321/...` e não para `beeit207327.protheus.cloudtotvs.com.br` |
| 6 | Response da Edge Function | HTTP 200 com dados Protheus OU erro de rota (não 401/403 de auth) |
| 7 | `audit_protheus` no Studio local | Registro da chamada com `user_id`, `tenant_id`, `path`, `status` |

---

### S5.7.4 — Rebuild e commit

```bash
# 1. Após S5.7.1, rebuild o HTML público
node scripts/build-modules.js
cp src/BeeIT-OS-RT-v2.html public/index.html

# 2. Validação sintaxe obrigatória (regra CLAUDE.md)
node -e "
const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');
const scripts = [...html.matchAll(/<script(?:(?!type=\"(?:module|application\/json)\")[^>])*>([\s\S]*?)<\/script>/g)]
  .map(m => m[1]).filter(s => s.trim().length > 0);
let err = 0;
scripts.forEach((s, i) => {
  try { new Function(s); } catch (e) { console.error('Script', i, ':', e.message); err++; }
});
if (err > 0) process.exit(1);
console.log('✅', scripts.length, 'scripts OK');
"

# 3. Commit (NÃO commitar .env.local nem scripts/dev-server.js se tiver dados locais)
git add src/core/fetch-interceptor.js public/index.html
git commit -m "feat(core): fetch-interceptor EDGE_BASE configurável via window.BEEIT_EDGE_URL"
```

---

## Riscos e mitigações

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Substituição de string no dev server quebra outro uso da URL de produção no HTML | Baixa | URL `dbaqvoatopfquaqgdptk.supabase.co` só aparece em `BEEIT_SB_URL` (linha 772) e no fetch-interceptor (já sobrescrito por `BEEIT_EDGE_URL`) |
| Chamadas legadas com path `/COMPANIES/` ou `/SA1/` bloqueadas pela allow-list da Edge | Alta | `PROTHEUS_PATH_ALLOW_LEGACY` já cobre esses aliases — auditados em S5.5. Sinalizados com `rejectedReason: legacy_alias_in_use` no audit log para rastreamento da Sprint 7 |
| JWT do browser não tem `tenant_id` (Auth Hook não ativo na instância local) | Baixa | S5.6 validou Auth Hook local em `config.toml` — reinício do Supabase necessário se DB foi resetado |
| CORS bloqueando chamadas do browser para `127.0.0.1:54321` | Baixa | Edge Function já permite `Origin: http://127.0.0.1:*` via `ORIGIN_REGEX` |

---

## Dependências e ordem de execução

```
S5.7.1 (1 linha fetch-interceptor.js)
  ↓
S5.7.2 (dev-server.js)
  ↓
S5.7.3 (validação browser — requer Edge Function rodando)
  ↓
S5.7.4 (rebuild + commit — só após S5.7.3 verde)
```

---

## Decisões pendentes (para Bruno revisar)

1. **`scripts/dev-server.js` entra no repo?** Recomendação: sim, com entrada no `.gitignore` apenas
   se contiver chaves locais hardcoded. Como o script lê as chaves do `supabase status` (públicas
   para o dev local), pode entrar versionado.

2. **Testar com Protheus real ou mock?** S5.7 usa Protheus real (mesmo setup que S5.6). Sprint 9
   introduzirá mock para testes offline.

3. **`BEEIT_EDGE_URL` precisa ser configurável pela UI?** Não nesta sprint. A leitura de
   `window.BEEIT_EDGE_URL` é suficiente para dev local; produção usa o fallback hardcoded.

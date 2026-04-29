# Security Audit — BeeIT OS-RT v2

**Data:** 2026-04-29
**Classificação:** CRÍTICO
**Responsável:** CISO / Engenheiro Chefe (Bruno Abrigo)

---

## CVE/CWE Identificado

### CWE-602 — Client-Side Enforcement of Server-Side Security

**Localização:** `src/BeeIT-OS-RT-v2.html`, linhas 882–1214 (bloco marcado com `🚨 SECURITY WARNING`)

**Descrição:**
Funções de provisionamento e gerenciamento de identidade (IAM) estão expostas no bundle
JavaScript do cliente. Qualquer usuário autenticado pode inspecionar via DevTools (F12):

- A URL da Edge Function de administração (`BEEIT_ADMIN_FN`)
- O payload exato de cada operação (`create`, `update`, `list`, `log`)
- A estrutura de papéis (`consultor` / `admin`) e como são atribuídos
- A lógica de toggle de ativação de usuários

**Funções afetadas:**
| Função | Operação | Risco |
|---|---|---|
| `beeitAdminFetch` | Todas as chamadas admin | Revela estrutura da API |
| `beeitAdminCreateUser` | `POST /admin-users?action=create` | Criação de usuários |
| `beeitAdminSaveUser` | `PATCH /admin-users?action=update` | Elevação de privilégio |
| `beeitAdminToggle` | `PATCH /admin-users?action=update` | Ativação/desativação |
| `beeitAdminLoadLog` | `GET /admin-users?action=log` | Leitura de log de acesso |

---

## Análise de Risco

**Vetor de ataque:**
Um usuário autenticado com papel `consultor` pode abrir o console do browser, copiar a
função `beeitAdminFetch`, e executar diretamente `beeitAdminFetch('create', 'POST', {...})`
passando `role: 'admin'` no payload.

**Impacto efetivo:**
Depende inteiramente do que a Edge Function `admin-users` valida no backend:
- Se a Edge Function valida que o JWT do chamador tem `role = 'admin'` na tabela `profiles`
  antes de executar → risco **MODERADO** (estrutura exposta, mas operação bloqueada no servidor)
- Se a Edge Function confia no payload do cliente para determinar permissões → risco **CRÍTICO**
  (privilege escalation trivial)

**Verificação imediata necessária:**
Auditar `supabase/functions/admin-users/index.ts` para confirmar se existe verificação de papel
antes de cada `action`. Linha mínima esperada:
```typescript
const callerRole = await getCallerRole(jwt); // consulta profiles
if (callerRole !== 'admin') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
```

---

## Nota sobre `BEEIT_SB_KEY` (anon key)

A `BEEIT_SB_KEY` (linha 694) é a chave `anon` do Supabase. Sua exposição no bundle é
**arquiteturalmente aceitável** em SPAs, desde que:

1. RLS (Row Level Security) esteja ativo em **todas** as tabelas com dados sensíveis
2. A `service_role_key` (que bypassa RLS) **nunca** apareça no frontend

A `anon key` por si só não permite acesso administrativo; o risco real está nas funções IAM
descritas acima.

---

## Plano de Remediação

### Sprint 6 — Migração IAM para Edge Function (PRIORITÁRIO)

**Objetivo:** Remover toda lógica de negócio de IAM do bundle do cliente. O HTML deve conter
apenas o formulário e uma chamada genérica.

**Passos:**

1. **Auditar `admin-users` Edge Function** — confirmar que validação de papel existe.
   Se não existir, implementar imediatamente antes de qualquer outra mudança.

2. **Criar `src/services/admin-client.js`** com interface mínima:
   ```javascript
   // admin-client.js — único ponto de contato com a Edge admin-users
   export async function adminCall(action, body) {
     const r = await fetch(BEEIT_ADMIN_FN + '?action=' + action, {
       method: body ? 'POST' : 'GET',
       headers: { 'Authorization': 'Bearer ' + getToken(), 'apikey': BEEIT_SB_KEY },
       body: body ? JSON.stringify(body) : undefined
     });
     const d = await r.json();
     if (!r.ok) throw new Error(d.error || 'Erro ' + r.status);
     return d;
   }
   ```

3. **Extrair UI de admin** para `src/modules/admin-panel/`:
   - `panel.js` — render do modal
   - `users.js` — listagem, criar, editar, toggle
   - `log.js` — log de acesso

4. **Remover do monólito** as funções `beeitAdminCreateUser`, `beeitAdminSaveUser`,
   `beeitAdminToggle`, `beeitAdminLoadUsers`, `beeitAdminLoadLog`, `beeitAdminPanel`.

5. **Manter temporariamente** apenas `beeitAdminFetch` como ponte de compatibilidade
   até que todos os módulos sejam integrados, depois removê-la também.

### Critério de aceite

- `grep -n "beeitAdminCreateUser\|beeitAdminSaveUser" public/index.html` → 0 resultados
- Tentativa de criar usuário via DevTools sem papel `admin` → HTTP 403 da Edge
- Testes de penetração básicos (Burp Suite / curl forjado) documentados em `testing.md`

---

## Código Morto Removido (Esta Sessão)

| Função | Localização anterior | Motivo da remoção |
|---|---|---|
| `fetchDictBlueprintSA1SB1` | ~linha 13434 (pré-remoção) | Legado Sprint 7, nunca chamada. Substituída por `fetchDictBlueprint(aliases)` generalizado. |

---

## Histórico de Revisões

| Data | Revisor | Ação |
|---|---|---|
| 2026-04-29 | Bruno Abrigo (CISO) | Identificação da vulnerabilidade, marcação do bloco IAM, remoção de código morto |

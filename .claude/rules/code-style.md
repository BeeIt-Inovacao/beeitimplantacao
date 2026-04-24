# Code Style — BeeIT OS-RT v2

## Papéis do assistente

Ao trabalhar neste repositório, atue simultaneamente como:

1. **Engenheiro Full Stack Sênior** — frontend (HTML/CSS/JS vanilla, sem frameworks), backend (Supabase Postgres + Edge Functions Deno), e pipeline de deploy (GitHub Actions + FTP Hostinger).
2. **Engenheiro AdvPL/TLPP Sênior** — integração TOTVS Protheus 12, arquiteturas MVC e ExecAuto, dicionário de dados (SX2/SX3/SX5/SX6) e rotinas padrão (MATA*, CRMA*, CTBA*, ATFA*).

## Regras inegociáveis

### 🚫 Alterações visuais PROIBIDAS

**Nunca** modifique CSS, tokens de design (`:root { --n, --or, --cy, ... }`), tipografia, espaçamentos, animações, keyframes ou qualquer aspecto visual do monólito `src/BeeIT-OS-RT-v2.html` existente.

O design atual é produto final aprovado. Mudanças visuais exigem pedido explícito do usuário e entram como *design token override*, não como edição do HTML principal.

Aplicável a:
- Blocos `<style>` no monólito
- Classes CSS (`.pg-in`, `.topbar`, etc.)
- Variáveis CSS (`--n`, `--or`, `--cy`, `--n2`, ...)
- Templates de `rndP()`, `rndHome()`, `proc()`

### ✅ Mudanças minimalistas no core

O monólito contém **declarações duplicadas intencionais** (padrão last-declaration-wins). Antes de editar uma função, rode:

```bash
grep -n "function nomeDaFunction" src/BeeIT-OS-RT-v2.html
```

Se houver duas+ ocorrências, edite apenas a **última** (vencedora). Nunca remova duplicatas sem autorização explícita.

Variáveis globais críticas que **não** podem ser removidas ou renomeadas:
- `_pflt`, `_pq`, `_pLocked`
- `PARTS`, `PARTS_MAP`, `EP`
- `beeitSession`, `supabase`, `ANTHROPIC_KEY`

### ✅ Princípios SOLID aplicados ao projeto

**S — Single Responsibility:**
- Cada arquivo em `src/core/`, `src/services/`, `src/security/`, `src/modules/` tem uma responsabilidade única.
- Módulos de integração Protheus (`src/modules/mata410-*`, etc.) não acessam Supabase diretamente — passam por `src/services/supabase-client.js`.

**O — Open/Closed:**
- O núcleo (`src/core/bootstrap.js`, `src/core/event-bus.js`) é estável. Novas funcionalidades entram como módulos em `src/modules/`, sem editar o core.
- Edge Function `protheus-proxy`: hardening por middlewares adicionais, não reescrita.

**L — Liskov:**
- Todo módulo expõe o mesmo contrato `{ id, name, mount(context), unmount() }` em seu `module.js`.

**I — Interface Segregation:**
- `src/services/protheus-proxy-client.js` expõe apenas os métodos que cada módulo precisa, tipados por rotina (`call('mata410', ...)`, `call('bdaDict', ...)`).
- Nunca exponha o Basic Auth do Protheus nem a URL raw para módulos.

**D — Dependency Inversion:**
- Módulos dependem de abstrações (`services/*`, `core/event-bus`), não do DOM global nem de `window.*`.
- `window.BeeIT*` é resultado, não dependência — use imports/exports quando possível.

### 🚫 Módulos em produção

`src/assessments/` e `src/rm-agents/` são **read-only** nesta branch. Contêm lógica em produção. Qualquer alteração exige aprovação explícita do usuário e entra em branch separada.

### ✅ AdvPL/TLPP

- Toda nova rotina AdvPL deve usar `namespace bda.api.*` ou `bda.utils.*` (padrão já estabelecido em `BdaDictApi.tlpp`, `BdaDictUtil.tlpp`).
- Sempre `GetArea()` / `RestArea()` para isolar manipulação de áreas de trabalho.
- Usar `FWSX3Util` para leitura do dicionário — nunca parse manual de SX3.
- Respostas REST: `{status, blueprint|data, message?}` com `Content-Type: application/json`.
- `SetRestFault(status, body_json)` para erros; nunca retornar stack trace.

### ✅ Commits

Formato [Conventional Commits](https://www.conventionalcommits.org/):
```
<tipo>(<escopo>): <descrição curta imperativa>

Corpo opcional explicando o "porquê".
```

Tipos: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `security`.
Escopos usados no projeto: `security`, `scaffold`, `core`, `services`, `modules`, `proxy`, `supabase`, `advpl`, `assessments`, `rm-agents`, `deploy`, `docs`.

Mensagens em português. Co-autoria só se o usuário pedir.

# Roadmap — Modularização & Segurança

> Planejamento vivo. Atualize ao final de cada sprint.

## Contexto

Transformar o monólito `src/BeeIT-OS-RT-v2.html` (46.786 linhas, 3,4 MB) em uma arquitetura "estilo Lego" com:

- Núcleo estável (`src/core`, `src/services`, `src/security`)
- Módulos plugáveis (`src/modules/<nome>`) — preserva `assessments/` e `rm-agents/` existentes
- Segurança de borda endurecida no `protheus-proxy` (Edge Function)
- Multi-tenancy via JWT claim `tenant_id`
- Snapshot de dicionário (SX3) com diff automático

Referência completa: *Laudo de Estratégia Técnica v2* (arquivo externo).

## Sprints

| Sprint | Entrega | Status | Risco |
|---|---|---|---|
| **S0** | Remoção de senha admin dos docs + rotação Supabase | ✅ docs sanitizados · 🟡 rotação no Supabase pendente (ação manual) | 🟢 |
| **S0.1** | Identidade Git isolada (SSH alias `github.com-beeit`) | ✅ feito | 🟢 |
| **S0.2** | Governança `.claude/rules` + `.claude/skills` | ✅ feito | 🟢 |
| **S1** | Tag rollback + branch `feat/modularization-security-v1` + scaffold de pastas | ✅ feito | 🟢 |
| **S2** | Migrations Supabase (snapshot, history, tenant_config, user_tenant) com RLS | 🟡 em andamento | 🟢 |
| **S3** | Hardening Edge `protheus-proxy` — CORS allow-list, JWT verify, path allow-list, audit | ✅ feito (commit `d4b257c`, **não deployada**) | 🟠 |
| **S4** | Auth Hook (`custom_access_token_hook`) + RPC `provision_tenant_protheus` + `scripts/setup-tenant.js` + plano Sprint 5 | ✅ feito | 🟢 |
| **S5** | Adaptação do monólito **sem reescrita** — fetch interceptor em `src/core/`, build injector, legacy-aliases allow-list na Edge. Plano completo em [SPRINT-5-PLAN.md](SPRINT-5-PLAN.md) | 🟡 em andamento — 5.2 ✅ 5.3 ✅ · pendente: 5.4 build-modules, 5.5 deploy.yml, 5.6 dev test | 🔴 |
| **S6** | Migrar paths legacy (`/SA1/`, `/CT1/` etc) do monólito para `/api/v1/bda/dynamic` + remover aliases da allow-list legacy | ⏳ pendente | 🟠 |
| **S7** | Hardening de rede no Protheus — firewall libera apenas IP do Supabase | ⏳ pendente | 🟠 |
| **S8** | Módulo prova `src/modules/dict-viewer` + extração MATA410/415/460 | ⏳ pendente | 🔴 |
| **S9** | Eliminar monólito, promover shell HTML puro com módulos externos | ⏳ paralelo | 🟠 |

## Descobertas (auditoria real do repo)

### 🔴 Críticas

1. **Edge `protheus-proxy` com `CORS *`** ([supabase/functions/protheus-proxy/index.ts:16](../supabase/functions/protheus-proxy/index.ts)) — qualquer origem pode chamar o proxy.
2. **Credenciais Protheus trafegam do browser** via header `x-protheus-auth` (linhas 61-63) — visível em F12, não multi-tenant.
3. **Sem validação de JWT** no código do Edge (apesar de `verify_jwt=true` na config), sem rate-limit, sem allow-list de paths Protheus.
4. **Senha admin `BeeIT@2025!`** estava versionada em CLAUDE.md, CLAUDE_CODE_GUIDE.md e QUICKSTART.md — removida em S0.

### 🟠 Altas

5. **7 URLs diretas `beeit207327.protheus.cloudtotvs.com.br:10607` ou `localhost:3030`** ainda no monólito (grep count).
6. **Deploy FTP não remove órfãos** — `SamKirkland/FTP-Deploy-Action` em modo default faz upload incremental; arquivos deletados ficam no Hostinger.
7. **Cache 7 dias** em `application/javascript` sem hash no filename ([public/.htaccess:35](../public/.htaccess)) — usuário pode ver código velho por até 7 dias.

### 🟡 Médias

8. **Módulos em `src/assessments/` e `src/rm-agents/`** existem mas o `deploy.yml` só copia `src/BeeIT-OS-RT-v2.html` para `public/index.html` — confirmar se está embedado no monólito ou se não chega a produção.
9. **Monólito tem 46.786 linhas / 3,4 MB**, não 33.700 como descrito em docs antigos.
10. **`public/index.html` e `src/BeeIT-OS-RT-v2.html` são idênticos** (o deploy faz `cp` no CI).

### 🟢 Pontos bons já no repo

- `.htaccess` com HTTPS, HSTS, X-Frame-Options, Permissions-Policy, bloqueio de `.env/.git`
- gzip habilitado
- `deploy.yml` valida sintaxe JS inline antes do upload
- `.gitignore` cobre `.env`, `*.pem`, `*.key`, credentials
- Commits históricos já usam `inovacao@beeitpartner.com.br`

## Decisões arquiteturais registradas (ADRs resumidos)

### ADR-001 — Identidade Git isolada
Chave SSH dedicada `~/.ssh/beeit_inovacao_ed25519` + alias `github.com-beeit` em `~/.ssh/config`. Remote do clone aponta para o alias. Evita conflito com conta `bda-dev` do desenvolvedor.

### ADR-002 — Topologia `src/core + src/services + src/security + src/modules`
Rejeitada a proposta `/modules` paralelo a `/src`. Motivo: `src/assessments/` e `src/rm-agents/` já estabeleceram padrão `src/<módulo>/` — criar `/modules` externo quebraria simetria e exigiria mudança no `deploy.yml`.

### ADR-003 — Build híbrido (inject vs multi-file)
Build inicial injeta JS externo como blocos `<script>` dentro do HTML final (single-file em produção). Evoluir para `public/assets/*.<hash>.js` em sprint futura, quando HTTP/2 for confirmado no plano Hostinger.

### ADR-004 — Multi-tenancy via JWT claim + `tenant_protheus_config`
Claim `tenant_id` no JWT Supabase (via Auth Hook). Edge Function resolve credenciais Protheus a partir do claim; browser nunca vê URL nem senha do ERP. Chave primária dos snapshots: `(tenant_id, user_id, sx2_alias)`.

### ADR-005 — `src/assessments/` e `src/rm-agents/` são read-only na branch de modularização
Produção estável. Alterações exigem branch própria + aprovação explícita. Documentado em [.claude/skills/deploy/deploy-config.md](../.claude/skills/deploy/deploy-config.md).

### ADR-006 — Fontes AdvPL em repo dedicado
Escolhida Opção B (ver laudo Sprint 3). Criado [BeeIt-Inovacao/beeit-protheus-advpl](https://github.com/BeeIt-Inovacao/beeit-protheus-advpl) (privado) com os 3 fontes + README de compilação/contrato. Versionamento independente via tags `advpl-vX.Y.Z`.

### ADR-007 — Auth Hook injeta `tenant_id` no JWT
Função `custom_access_token_hook` grava `tenant_id` tanto no claim top-level quanto em `app_metadata.tenant_id`. Hook padrão escolhe **vínculo mais antigo** do usuário em `user_tenant`. Troca de tenant em runtime exige `supabase.auth.refreshSession()` (aceitável para o uso atual).

### ADR-008 — Adaptação por interceptor, não reescrita
Sprint 5 injeta `src/core/fetch-interceptor.js` no topo do HTML via build-time. Zero edição nas 46.786 linhas do monólito. Rollback = `git revert` do commit da Sprint 5. Decisão motivada por: (a) risco de regressão em código com declarações duplicadas intencionais, (b) velocidade de entrega, (c) preservação de assessments/rm-agents em produção.

### ADR-009 — Git Flow com `develop` como branch de integração
Adotado em 2026-04-27 para proteger `main` de commits diretos e isolar sprints de segurança do trabalho simultâneo de outros desenvolvedores.

**Topologia:**
```
main        ← produção estável (bloqueada para commits diretos)
develop     ← integração e staging (merge target de todas as feature branches)
feat/*      ← features e sprints (abertos de develop ou main conforme contexto)
fix/*       ← hotfixes (abertos de main, mergeados em main + develop)
```

**Regras:**
- `main` só recebe merges via PR revisado, nunca `git push` direto.
- `develop` é a branch oficial de staging — CI pode fazer deploy automático para ambiente de homologação.
- Feature branches são mergeadas em `develop` (não em `main`) e deletadas após o merge.
- Hotfixes em produção: abertos de `main`, mergeados em `main` **e** `develop` antes de fechar.

**Situação atual do conflito de merge (2026-04-27):**
O merge de `feat/modularization-security-v1` em `develop` foi abortado por conflito estrutural em `supabase/functions/protheus-proxy/index.ts`:
- `main`/`develop`: versão v2.1 (proxy simples, CORS `*`, sem JWT) + rotas ClickSign adicionadas pelo outro desenvolvedor.
- `feat`: versão v3.1 (rewrite completo — JWT obrigatório, CORS allow-list, Vault, audit log, legacy alias allow-list).

**Resolução necessária (aguardando instrução do usuário):** cherry-pick das rotas ClickSign (`/clicksign/` e `/clicksign-sandbox/`) da v2.1 para dentro da v3.1 na branch `feat`, antes de reattempt do merge em `develop`.

## Decisões pendentes

- [x] ~~Fontes Protheus (AdvPL/TLPP)~~ — Opção B executada (ver ADR-006)
- [x] ~~Rotação da senha admin no Supabase~~ — feito manualmente pelo usuário
- [x] ~~Git Flow~~ — ADR-009 adotado; `develop` criada e publicada em `origin/develop`
- [ ] **Conflito Edge Function:** integrar rotas ClickSign da v2.1 na v3.1 antes do merge em `develop` (ver ADR-009).
- [ ] **HTTP/2 no Hostinger:** confirmado? Determina se o build final vira multi-file com hash ou mantém single-file injetado.
- [ ] **Cadastro inicial de tenants:** 1 tenant (BeeIt) ou multi desde o dia 1?
- [ ] **Ativação do Auth Hook** (após deploy da migration): Dashboard → Authentication → Hooks → Customize Access Token → `public.custom_access_token_hook`.

# Roadmap — Modularização & Segurança

> Planejamento vivo. Atualize ao final de cada sprint.

## Topologia Git (2026-04-27 — sincronizada)

```
main                 b67829e  ← produção estável (Daniel's ClickSign)
  └── develop        3f95fae  ← integração (main + git-flow rules)
        ├── feature/os-rt-modularization  bb9bcfd  ← Bruno: Sprint 1-5 + ClickSign sincronizado
        └── feature/clicksign-daniel      3f95fae  ← Daniel: monólito atual
```

**Base sincronizada:** `feature/os-rt-modularization` incorporou `develop` via merge `bb9bcfd`. Edge v3.1 agora inclui rotas ClickSign (`/clicksign/*`, `/clicksign-sandbox/*`) com JWT obrigatório — upgrade de segurança sobre a v2.1 do Daniel. Ver regras detalhadas em [`.claude/rules/git-flow.md`](../.claude/rules/git-flow.md).

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
| **S2** | Migrations Supabase (snapshot, history, tenant_config, user_tenant) com RLS | ✅ deploy remoto concluído (2026-04-27) | 🟢 |
| **S3** | Hardening Edge `protheus-proxy` — CORS allow-list, JWT verify, path allow-list, audit | ✅ **deployada (2026-04-27)** — v3.1 online, health OK | 🟢 |
| **S4** | Auth Hook (`custom_access_token_hook`) + RPC `provision_tenant_protheus` + `scripts/setup-tenant.js` + plano Sprint 5 | ✅ feito | 🟢 |
| **S5** | Adaptação do monólito **sem reescrita** — fetch interceptor em `src/core/`, build injector, legacy-aliases allow-list na Edge. Plano completo em [SPRINT-5-PLAN.md](SPRINT-5-PLAN.md) | ✅ **CONCLUÍDA (2026-04-27)** — 5.2 ✅ 5.3 ✅ 5.4 ✅ 5.5 ✅ 5.6 ✅ · **5.7 ✅** — E2E browser validado: interceptor roteou chamada Protheus para Edge local → Edge validou JWT → chamou Protheus real → resposta recebida. `scripts/dev-server.js` injeta `BEEIT_EDGE_URL` + substitui URL Supabase em memória (zero impacto em produção). Chain completa: Browser → fetch-interceptor → Edge Function local → Protheus. | 🟢 |
| **S6** | Infraestrutura de Tenant e Auth Hook — trigger `set_tenant_vault_alias`, Auth Hook v2 (`vault_alias` no JWT), Edge v3.1 deployada, bifurcação SaaS Strangler Pattern | ✅ **CONCLUÍDA** (2026-04-27) · db push ✅ Auth Hook ✅ Edge v3.1 online ✅ · 🟡 provisionamento do tenant pendente (aguardando credenciais Protheus REST) | 🟢 |
| **S-local** | Supabase Local — ambiente de desenvolvimento isolado com `supabase start` (OrbStack) | ✅ rodando (2026-04-27) · Studio: `127.0.0.1:54323` · DB: `127.0.0.1:54322` · API: `127.0.0.1:54321` | 🟢 |
| **P0** | Hotfix segurança — `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` nas 4 tabelas legadas (`profiles`, `clientes`, `documentos`, `access_log`). Auth Hook suspenso manualmente no Dashboard durante homologação. | ✅ **deployado (2026-04-27)** via migration `20260427120000_enable_rls_legacy_tables.sql` | 🔴→🟢 |
| **S7** | Migrar paths legacy do monólito para Edge Function estruturada: (1) health check `/beeit/health` → `/health`; (2) FASE 3 test URL `/api/COMPANIES/` → `/protheus/COMPANIES/`; (3) detecção automática de Edge Function URL em FASE 1; (4) nova função `fetchDictBlueprintSA1SB1()` com botão "Dicionário SA1/SB1" na sync page (POST `/protheus/api/v1/bda/dictionary/blueprint`); (5) Edge `PROTHEUS_PATH_ALLOW_LEGACY` ampliado para `/api/framework/v1/company/{emp}/{fil}/{alias}` (fix para `syncTabela`); (6) labels de diagnóstico atualizadas (Edge Function no lugar de localhost:3030) | ✅ **CONCLUÍDA** | 🟢 |
| **R1** | Release 1 — UX e visualização de dados para validação do cliente: (1) URL gerenciada pós-login — `beeitShowApp` busca `tenant_protheus_config`, popula `#cfg-ptheus-url` readonly com badge "🔗 Conexão Gerenciada pela BeeIT", oculta "Salvar Configurações"; (2) Sync refatorado — remove botão "Sincronizar TUDO", "Sync grupo" do grupo Cadastros chama `fetchDictBlueprint(['SA1','SA2','SB1'])`; (3) `fetchDictBlueprint(aliases)` generalizado — aceita array, computa SHA-256 com `crypto.subtle`, persiste em `protheus_dict_snapshot` via `beeitSbFetch`; (4) Cards SA1/SA2/SB1 com badge 🟢/🟡 de snapshot + botão "📖 Ver Dicionário"; (5) Drawer lateral animado — filtro de campos, cópia JSON, exibe CAMPO/TIPO/TAM/TÍTULO de forma elegante. | ✅ **CONCLUÍDA (2026-04-27)** | 🟢 |
| **R1.1** | Expansão horizontal do Dicionário Blueprint para Contábil/Financeiro/Fiscal/AF — auditoria estática cross-directory dos fontes TLPP em `beeit-protheus-advpl` (`BdaDictApi.tlpp` 100% dinâmico para SX2/SX3 confirmado); injeção paralela de UX em 10 cards (CT1, CTT, CT5, SED, SE4, SE1, SE2, SA6, SEE, SF4, SB9, SN1, SN3) sem tocar `nav()`/`rndXXX()`/agentes IA legados; novos badges com sufixo `-hdr` para evitar colisão DOM com progress writers de `_syncCardAcoes`/`syncSEDTemplate`; `_DICT_TRACKED_ALIASES` (16 aliases) + `checkDictSnapshots`/`_refreshDictBadges` estendidos; bootstrap chama refresh após snapshot fetch. Débito técnico TLPP (SXB/F3 fora de SX5; mapa de dependências ExecAuto) formalmente aceito e movido para API v2 / iPaaS. | ✅ **CONCLUÍDA (2026-04-28)** | 🟢 |
| **SEC-1** | Auditoria de segurança CWE-602 — `fetchDictBlueprintSA1SB1` (legado, nunca chamada) removida; bloco IAM cliente (linhas 882–1214) marcado com `🚨 SECURITY WARNING`; laudo técnico em [`docs/SECURITY-AUDIT.md`](SECURITY-AUDIT.md) com plano de remediação Sprint 6 (migrar `beeitAdminCreateUser`, `beeitAdminSaveUser` etc. para Edge `admin-users`); verificação imediata da Edge `admin-users` para confirmar validação de papel no backend documentada. | ✅ **CONCLUÍDA (2026-04-29)** | 🔴→🟡 |
| **S8** | Hardening de rede no Protheus — firewall libera apenas IP do Supabase | ⏳ pendente | 🟠 |
| **S9** | Módulo prova `src/modules/dict-viewer` + extração MATA410/415/460 | ⏳ pendente | 🔴 |
| **S10** | Eliminar monólito, promover shell HTML puro com módulos externos | ⏳ paralelo | 🟠 |
| **API-v2** | **Backlog — Parser avançado de SXB e Mapeamento de Dependências ExecAuto no motor TLPP.** (a) Estender `BdaDictUtil:getBlueprint` para resolver Consultas Padrão SXB (interpretar `SELECT/WHILE`, joins inter-SX2/SX3, filtros multi-tenant) — hoje F3 só consulta SX5 ([BdaDictUtil.tlpp:215-226](https://github.com/BeeIt-Inovacao/beeit-protheus-advpl/blob/main/src/BdaDictUtil.tlpp)); (b) adicionar bloco `dependencies: [{alias, required, reason}]` no JSON do blueprint mapeando pré-requisitos ExecAuto (ex: SB1→SBM/SBZ, SA1→SA3) — hoje retorna apenas `arquitetura` + `rotina_padrao`; (c) completar router de `rotina_padrao` para CT5, SE1, SE2, SEE, SB9, SN3 (atualmente caem no fallback `cX2Rotina`); (d) avaliar filtro de tenant explícito por payload em vez de depender de `xFilial` da sessão Protheus. Diagnóstico completo em laudo da auditoria 2026-04-28. | ⏳ backlog | 🟠 |

## Descobertas (auditoria real do repo)

### 🔴 Críticas

1. **CWE-602 — IAM client-side**: Funções de provisionamento de usuários (`beeitAdminCreateUser`, `beeitAdminSaveUser`, `beeitAdminToggle`) e a constante `BEEIT_ADMIN_FN` estão no bundle do browser. Bloco marcado em `src/BeeIT-OS-RT-v2.html:882–1214`. Risco efetivo depende da validação de papel na Edge `admin-users` (ver [`docs/SECURITY-AUDIT.md`](SECURITY-AUDIT.md)). **Remediação: Sprint 6.**

2. **Edge `protheus-proxy` com `CORS *`** ([supabase/functions/protheus-proxy/index.ts:16](../supabase/functions/protheus-proxy/index.ts)) — qualquer origem pode chamar o proxy.
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

### ADR-010 — Trigger BEFORE INSERT para derivar vault alias do tenant_id

Decidido em Sprint 6 criar `set_tenant_vault_alias` como trigger BEFORE INSERT em
`tenant_protheus_config` em vez de depender exclusivamente do RPC `provision_tenant_protheus`.

Motivação: o RPC usava uma sequência INSERT('pending') → vault.create_secret → UPDATE(alias),
expondo uma janela onde `basic_auth_ref = 'pending'` era visível. O trigger elimina a
inconsistência transitória e garante que qualquer inserção — via RPC, SQL direto ou futura
UI de administração — respeite o padrão de nomeação sem código adicional.

Formato do alias: `tenant_<uuid_sem_hifens>_protheus_basicauth` (convenção já estabelecida).
O trigger é retrocompatível: o RPC continua funcionando sem modificação (o UPDATE vira no-op).

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

**Situação atual (2026-04-27 — revisão):**
Merge revertido. Duas frentes de trabalho paralelas e isoladas:
- `feature/os-rt-modularization` (`419529d`) — Bruno: Sprint 1-5, Edge v3.1, sem monólito.
- `feature/clicksign-daniel` (`b67829e`) — Daniel: monólito atual com ClickSign funcionando.
- Merge final planejado para quando ambas as frentes estiverem validadas em staging.

## Decisões pendentes

- [x] ~~Fontes Protheus (AdvPL/TLPP)~~ — Opção B executada (ver ADR-006)
- [x] ~~Rotação da senha admin no Supabase~~ — feito manualmente pelo usuário
- [x] ~~Git Flow~~ — ADR-009 adotado; frentes paralelas isoladas (ver topologia acima)
- [ ] **Merge final:** `feature/os-rt-modularization` + `feature/clicksign-daniel` → `develop` → `main` (coordenar com Daniel; resolver Edge v2.1 vs v3.1 neste ponto)
- [ ] **HTTP/2 no Hostinger:** confirmado? Determina se o build final vira multi-file com hash ou mantém single-file injetado.
- [ ] **Cadastro inicial de tenants:** 1 tenant (BeeIt) ou multi desde o dia 1?
- [x] ~~**Ativação do Auth Hook**~~ — passo-a-passo documentado em [SUPABASE-DEPLOY-PLAN.md](SUPABASE-DEPLOY-PLAN.md) (Passo 5). Ação manual no Dashboard após `supabase db push`.

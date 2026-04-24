# Skill: deploy-config — Restrições de Deploy

## Contrato de deploy

Este projeto **só** faz deploy via FTP Hostinger, via [.github/workflows/deploy.yml](../../../.github/workflows/deploy.yml).

Trigger: push em `main` que toque `public/**`, `src/**` ou o próprio workflow.

### Pipeline

```
push main ─► validate job ─► deploy job (FTP)
               │                 │
               ├─ node --check    ├─ cp src/BeeIT-OS-RT-v2.html public/index.html
               └─ upload artifact └─ FTP-Deploy-Action → /public_html/
```

Secrets necessários (em GitHub → Settings → Secrets and variables → Actions):
- `HOSTINGER_FTP_HOST`
- `HOSTINGER_FTP_USER`
- `HOSTINGER_FTP_PASSWORD`

Rotação: trocar senha FTP no hPanel Hostinger primeiro, atualizar o secret depois.

### O que NÃO fazer

- ❌ **Nunca** adicionar outro provider de deploy (Vercel, Netlify, Cloudflare Pages) sem pedido explícito. A stack atual é `Hostinger + FTP`, ponto.
- ❌ **Nunca** comitar credenciais FTP em arquivo versionado — tudo em GitHub Secrets.
- ❌ **Nunca** usar `dangerous-clean-slate: true` no FTP-Deploy-Action — apaga o diretório inteiro em caso de falha parcial.

## 🚫 Módulos em produção — INTOCÁVEIS

Os seguintes diretórios contêm código em produção servindo clientes reais e **não devem ser alterados** sem autorização explícita do usuário:

### `src/assessments/`

Sistema de assessments TOTVS em produção. Componentes:
- `agents.js` — definição de 4 agentes IA (orquestrador, protheus, rm, consolidador)
- `assessments-integration.js` — integração Supabase + Claude API
- `assessments-ui.html` + `assessments-import-ui.html` — interfaces
- `document-parser.js` — parse de docs de cliente
- `qdb-protheus.js` + `qdb-rm.js` — questões TOTVS

**Regra:** qualquer alteração exige pedido explícito + nova branch `fix/assessments-*` ou `feat/assessments-*`. Jamais misturar mudanças de assessments com mudanças do core modular.

### `src/rm-agents/`

Agents TOTVS RM (Recursos Materiais). Estrutura em `src/rm-agents/funcional/`.
Mesma regra do `assessments/`: read-only nesta branch, alteração exige pedido explícito.

## Fluxo seguro de deploy

1. Commit em branch feature (`feat/*`, `fix/*`, `chore/*`)
2. Pull Request → revisão → merge em `main`
3. GitHub Actions dispara `deploy.yml`:
   - `validate` job passa (node --check OK)
   - `deploy` job sobe para Hostinger
4. Smoke test em `https://implantacao.com.br` (ver [.claude/rules/testing.md](../../rules/testing.md))
5. Se falhar: revert do merge em `main` → pipeline redeploya versão anterior

## Rollback de emergência

Tag `v1.0-pre-modular` existe no `main` como ponto de rollback total do trabalho de modularização. Para acionar:

```bash
# Apenas em caso de catástrofe — destrói HEAD do main
git checkout main
git reset --hard v1.0-pre-modular
git push --force-with-lease origin main
# workflow deploya versão pré-modular no Hostinger
```

**⚠️** Requer confirmação explícita do usuário antes de qualquer `push --force*`.

## Observações sobre `.htaccess`

[public/.htaccess](../../../public/.htaccess) é **parte do deploy** — é copiado pelo FTP junto com `index.html`. Alterações nele afetam headers, cache e segurança em produção imediatamente. Tratar com a mesma cautela do código.

Pontos bons já configurados: HTTPS forçado, HSTS, X-Frame-Options, bloqueio de `.env/.git/.htaccess`, gzip, cache por MIME.

Pontos a evoluir (propostas futuras, não ativas):
- Adicionar Content Security Policy (CSP) restritivo
- Cache-busting por hash no filename (exige ajuste no build)

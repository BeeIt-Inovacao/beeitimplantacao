# CLAUDE.md — Contexto do Projeto BeeIT OS-RT v2

> Este arquivo é lido automaticamente pelo Claude Code em toda sessão.
> Mantenha-o atualizado conforme o projeto evolui.

---

## 🎯 Sobre o projeto

**BeeIT OS-RT v2** — SaaS single-file (HTML/CSS/JS) para acelerar implantações TOTVS Protheus.
Canal Homologado TOTVS. Domínio de produção: `implantacao.com.br`.

**Arquitetura:**
- Frontend: 1 arquivo HTML (~2.6MB, ~33.700 linhas) em `public/index.html`
- Backend: Supabase (projeto `dbaqvoatopfquaqgdptk`)
- Proxy Protheus: Edge Function `protheus-proxy` (substitui o antigo Node.js porta 3030)
- Hospedagem: Hostinger com domínio `implantacao.com.br`

**Ambiente Protheus:** `beeit207327.protheus.cloudtotvs.com.br:10607` · Empresa `01` · Filial `0101`

---

## 🧠 Princípios de trabalho (MUITO IMPORTANTE)

O Bee IT exige **código cirúrgico e assertivo** — sempre:

1. **Analise a causa real primeiro.** Não chute. Use logs, inspeção, validação. Só depois aplique fix.
2. **Valide antes de declarar resolvido.** Sempre rode `node --check` em JS, faça smoke test em endpoints, confira o comportamento antes de dizer "pronto".
3. **Mudanças minimalistas.** Mexa só no necessário. Não refatore código funcionando.
4. **Duplicate function declarations são intencionais no HTML principal.** O arquivo depende de last-declaration-wins. Se precisar alterar uma função, mexa na **segunda (vencedora)** — nunca na primeira.
5. **Evite regressões em variáveis globais.** `_pflt`, `_pq`, `_pLocked`, `PARTS`, `PARTS_MAP`, `EP` são críticas. Não as remova sem entender o impacto.
6. **PARTS vs EP:** `PARTS` = dados brutos SPED (dirige contadores topbar). `EP` = dados enriquecidos (dirige `rndP()`). Topbar populado NÃO confirma que EP está OK.
7. **Sempre use `PARTS_MAP` (Map O(1))** em vez de `PARTS.find()` em loops grandes.

---

## 🗂️ Estrutura do repositório

```
.
├── public/
│   ├── index.html            ← Arquivo servido em produção (copiado do src/)
│   └── .htaccess             ← HTTPS, compressão, security headers
├── src/
│   └── BeeIT-OS-RT-v2.html   ← Fonte editável (arquivo real ~2.6MB)
├── supabase/functions/protheus-proxy/
│   └── index.ts              ← Edge Function Deno (proxy unificado)
├── scripts/
│   └── migrate-proxy-urls.js ← Troca localhost:3030 → Edge Function
├── .github/workflows/
│   └── deploy.yml            ← CI/CD FTP Hostinger
└── docs/
    ├── QUICKSTART.md         ← Passo-a-passo de deploy
    └── DEPLOY.md             ← Guia detalhado Hostinger
```

---

## 🔑 URLs e endpoints críticos

| Recurso | URL |
|---|---|
| Supabase Project | https://dbaqvoatopfquaqgdptk.supabase.co |
| Edge Function Proxy | https://dbaqvoatopfquaqgdptk.supabase.co/functions/v1/protheus-proxy |
| Produção | https://implantacao.com.br |
| Repositório GitHub | (a criar) |
| Painel Hostinger | https://hpanel.hostinger.com |
| Painel Supabase | https://supabase.com/dashboard/project/dbaqvoatopfquaqgdptk |

---

## 🛠️ Comandos úteis

### Validação local
```bash
# Validar sintaxe JS do HTML principal (OBRIGATÓRIO antes de cada commit)
node --check <(sed -n '/<script>/,/<\/script>/p' src/BeeIT-OS-RT-v2.html | sed '1d;$d')

# Build público
cp src/BeeIT-OS-RT-v2.html public/index.html

# Migrar URLs do proxy
node scripts/migrate-proxy-urls.js src/BeeIT-OS-RT-v2.html

# Buscar referências residuais ao proxy local
grep -n "localhost:3030\|127.0.0.1:3030" src/BeeIT-OS-RT-v2.html
```

### Git workflow
```bash
git status
git add src/ public/
git commit -m "feat: descrição clara"
git push
# GitHub Actions faz deploy automático em ~2min
```

### Supabase
```bash
# CLI
npm install -g supabase
supabase login
supabase link --project-ref dbaqvoatopfquaqgdptk

# Deploy Edge Function
supabase functions deploy protheus-proxy --project-ref dbaqvoatopfquaqgdptk

# Ver logs
supabase functions serve protheus-proxy --project-ref dbaqvoatopfquaqgdptk
```

---

## ⚠️ Credenciais e autenticação

**NUNCA commit credenciais no repo.** Tudo vai em:
- GitHub Secrets (para Actions)
- Supabase Secrets (para Edge Functions)
- `.env` local (no `.gitignore`)

**Admin do sistema (produção):**
- Email: `admin@beeit.com.br`
- Senha: `BeeIT@2025!` (DEVE ser trocada após primeiro login em produção)

**Supabase Anon Key (pública, OK no HTML):** ver painel Supabase → Settings → API

---

## 📝 Histórico de sessões relevantes

- **v116** — Correção de bugs críticos de renderização SA1/SA2/SB1 pós-SPED (CSS `@keyframes pg-in`, race condition `nav('imp')`, variável `_pq` ausente)
- **Supabase auth** — Resolvido erro "Database error querying schema" causado por colunas token NULL em `auth.users`. Solução: criar usuário com todas as 6 colunas token como `''` em vez de NULL
- **Edge Function protheus-proxy** — Criada para substituir o Node.js porta 3030 (resolve CORS Protheus sem server local)

---

## 🚫 Não fazer

- Não usar `sudo npm install` — use `npm config set prefix ~/.npm-global` ou nvm
- Não reproduzir letras de música, código copyright, ou conteúdo de artigos extensos
- Não deletar "duplicatas aparentes" no HTML sem verificar se são intencionais
- Não reescrever `rndHome()`, `rndP()` ou `proc()` sem preservar estado global
- Não usar `temperature: 0` em chamadas Claude Sonnet 4 (causa HTTP 400)
- Não rodar `node --check` diretamente no HTML (precisa extrair scripts primeiro)

# 🎯 Prompt Mestre para Claude Code

Copie TODO o bloco abaixo e cole no Claude Code após rodar `claude` dentro da pasta `beeit-os-rt/`.

---

## 📋 COLE ISTO NO CLAUDE CODE:

```
Olá Claude. Sou do time Bee IT. Vou te pedir para executar o deploy completo do BeeIT OS-RT v2 de forma cirúrgica e assertiva. Leia o CLAUDE.md antes de qualquer ação — ele tem todo o contexto.

⚠️ PRINCÍPIOS NÃO-NEGOCIÁVEIS:
- Valide ANTES de declarar feito (node --check, smoke tests)
- Mudanças minimalistas (não refatore código funcionando)
- Pare e me pergunte se algo não estiver claro
- Nunca commit secrets

═══════════════════════════════════════════════════════════
FASE 1 — INVENTÁRIO E PREPARAÇÃO
═══════════════════════════════════════════════════════════

1. Liste a estrutura atual do projeto (ls -la, tree se disponível)
2. Verifique se existe src/BeeIT-OS-RT-v2.html. Se NÃO existir, me avise para eu mover o arquivo do Downloads para src/
3. Confira o tamanho e as primeiras/últimas 50 linhas do arquivo src/BeeIT-OS-RT-v2.html para confirmar que é o arquivo correto
4. Liste todas as referências a "localhost:3030" ou "127.0.0.1:3030" no HTML (quantas e em que linhas)
5. PARE e me mostre o resumo. Aguarde minha aprovação antes de seguir para Fase 2.

═══════════════════════════════════════════════════════════
FASE 2 — MIGRAÇÃO DE URLs (proxy local → Edge Function)
═══════════════════════════════════════════════════════════

6. Execute: node scripts/migrate-proxy-urls.js src/BeeIT-OS-RT-v2.html
7. Valide que o backup .bak foi criado
8. Rode novamente: grep -n "localhost:3030\|127.0.0.1:3030" src/BeeIT-OS-RT-v2.html
   → Deve retornar ZERO matches. Se não: investigue e me pergunte.
9. Verifique se as chamadas fetch() que batem na Edge Function têm o header Authorization: Bearer <supabase_jwt>.
   Procure por padrões como fetch(`${PROXY_URL}/protheus/ e confira se incluem o header.
10. Copie src/BeeIT-OS-RT-v2.html para public/index.html
11. Valide sintaxe JS: extraia os scripts inline e rode node --check em cada um
12. PARE e me mostre o relatório. Aguarde aprovação.

═══════════════════════════════════════════════════════════
FASE 3 — SUPABASE EDGE FUNCTION
═══════════════════════════════════════════════════════════

13. Verifique se Supabase CLI está instalado: supabase --version
    → Se não estiver: npm install -g supabase (ou instruir install se permissão falhar)
14. Faça login: supabase login (me avise a URL de auth que aparecer)
15. Link com o projeto: supabase link --project-ref dbaqvoatopfquaqgdptk
16. Deploy da função: supabase functions deploy protheus-proxy --project-ref dbaqvoatopfquaqgdptk
17. Teste o health endpoint:
    curl https://dbaqvoatopfquaqgdptk.supabase.co/functions/v1/protheus-proxy/health \
      -H "apikey: <ANON_KEY>" \
      -H "Authorization: Bearer <ANON_KEY>"
    → Deve retornar JSON com status: "ok"
    → Me peça a ANON_KEY se necessário (está em supabase.com/dashboard/project/dbaqvoatopfquaqgdptk/settings/api)
18. PARE e me mostre o resultado. Aguarde aprovação.

═══════════════════════════════════════════════════════════
FASE 4 — GITHUB
═══════════════════════════════════════════════════════════

19. Verifique se git está configurado: git config user.name e git config user.email
    → Se não: configure com meu nome (pergunte) e email
20. Verifique se já existe repositório remoto: git remote -v
    → Se não existir: me peça a URL do repo GitHub (formato: https://github.com/USUARIO/beeit-os-rt.git)
21. Inicialize git se necessário: git init, git branch -M main
22. Adicione os arquivos: git add .
23. MOSTRE o git status ANTES de commitar e me pergunte se posso prosseguir
24. Commit inicial: git commit -m "chore: deploy inicial BeeIT OS-RT v2"
25. Push: git push -u origin main (pode pedir credenciais GitHub — gere um PAT se preciso)
26. PARE e me avise quando o push concluir.

═══════════════════════════════════════════════════════════
FASE 5 — GITHUB SECRETS (para deploy FTP Hostinger)
═══════════════════════════════════════════════════════════

27. Liste os secrets que o workflow deploy.yml precisa:
    - HOSTINGER_FTP_HOST
    - HOSTINGER_FTP_USER
    - HOSTINGER_FTP_PASSWORD
28. Me oriente a pegar esses valores no painel Hostinger (Hosting → FTP Accounts)
29. Me oriente a adicionar no GitHub em Settings → Secrets and variables → Actions
30. NÃO peça nem receba as senhas — elas devem ser inseridas diretamente pelo humano no GitHub

═══════════════════════════════════════════════════════════
FASE 6 — VALIDAÇÃO E PRÓXIMOS PASSOS
═══════════════════════════════════════════════════════════

31. Monitore o GitHub Actions da primeira execução (gh run list se gh CLI estiver instalado)
32. Se houver erro no deploy FTP, capture o log e me explique o que aconteceu
33. Me instrua sobre os passos manuais restantes que NÃO podemos automatizar:
    - Apontar domínio Hostinger (se ainda não estiver)
    - Instalar SSL (Let's Encrypt) no painel
    - Testar acesso a https://implantacao.com.br
    - Trocar senha do admin@beeit.com.br em produção

═══════════════════════════════════════════════════════════
REGRAS FINAIS
═══════════════════════════════════════════════════════════

- Em QUALQUER dúvida, pare e pergunte. Assertividade > rapidez.
- Se algum comando falhar, NÃO improvise. Me mostre o erro completo e peça orientação.
- Se for alterar o HTML principal além do migrate-proxy-urls, me pergunte antes.
- Mantenha um resumo dos passos concluídos para eu acompanhar o progresso.

Vamos começar. Execute a Fase 1 e me reporte.
```

---

## 🔐 O que preparar ANTES de colar o prompt

### 1. Credenciais que o Claude Code vai precisar (deixe à mão):

| Item | Onde obter |
|---|---|
| **Supabase Anon Key** | https://supabase.com/dashboard/project/dbaqvoatopfquaqgdptk/settings/api |
| **GitHub username + Personal Access Token** | https://github.com/settings/tokens → Generate new token (classic) → escopo `repo` |
| **Hostinger FTP credentials** | Painel Hostinger → Hosting → Advanced → FTP Accounts |

### 2. Arquivo HTML no lugar certo

Antes de rodar `claude`, mova o arquivo do Downloads:

**Windows (PowerShell):**
```powershell
cd $HOME\Documents
# Se ainda não tem a pasta:
Expand-Archive -Path "$HOME\Downloads\beeit-os-rt-repo.tar.gz" -DestinationPath .
cd beeit-os-rt
Move-Item "$HOME\Downloads\BeeIT-OS-RT-v2_116.html" src\BeeIT-OS-RT-v2.html
```

**macOS / Linux (bash):**
```bash
cd ~/Documents
tar -xzf ~/Downloads/beeit-os-rt-repo.tar.gz
cd beeit-os-rt
mv ~/Downloads/BeeIT-OS-RT-v2_116.html src/BeeIT-OS-RT-v2.html
```

### 3. Iniciar Claude Code

```bash
cd beeit-os-rt
claude
```

→ Autentique no browser quando pedir
→ Cole o prompt mestre acima
→ O Claude Code vai executar fase por fase, pausando pra sua aprovação

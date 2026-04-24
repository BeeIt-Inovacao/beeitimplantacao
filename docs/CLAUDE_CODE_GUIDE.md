# 🤖 Usando Claude Code para Deploy do BeeIT OS-RT

> Este guia cobre a instalação do Claude Code e o fluxo completo de deploy.

---

## ⚡ Pré-requisitos

- [ ] Conta Anthropic com Claude Pro ($20/mês) ou Max
- [ ] Node.js 18+ instalado
- [ ] Git instalado
- [ ] Arquivo `BeeIT-OS-RT-v2_116.html` na pasta Downloads
- [ ] Pacote `beeit-os-rt-repo.tar.gz` (este repositório) na pasta Downloads

---

## 📦 Passo 1 — Instalar Claude Code

### 🍎 macOS (recomendado: instalador nativo)

```bash
# Opção A: Instalador nativo (sem Node.js necessário)
curl -fsSL claude.ai/install.sh | bash

# Opção B: via npm (se já usa Node/npm)
npm install -g @anthropic-ai/claude-code

# Validar
claude --version
```

### 🪟 Windows

**Requisito:** Git for Windows instalado (https://git-scm.com/download/win)

```powershell
# PowerShell (como usuário normal, NÃO Admin)
irm https://claude.ai/install.ps1 | iex

# OU via npm
npm install -g @anthropic-ai/claude-code

# Validar
claude --version
```

### 🐧 Linux

```bash
curl -fsSL claude.ai/install.sh | bash
claude --version
```

> **NÃO use `sudo npm install`** — causa problemas de permissão. Se der erro EACCES, configure o prefix do npm: `npm config set prefix ~/.npm-global` e adicione `~/.npm-global/bin` ao PATH.

---

## 📁 Passo 2 — Preparar o repositório local

### macOS / Linux
```bash
mkdir -p ~/projetos && cd ~/projetos
tar -xzf ~/Downloads/beeit-os-rt-repo.tar.gz
cd beeit-os-rt
# Move o HTML baixado para o src/
mv ~/Downloads/BeeIT-OS-RT-v2_116.html src/BeeIT-OS-RT-v2.html
# Valida
ls -la src/ public/
```

### Windows (PowerShell)
```powershell
# Criar pasta de projetos (se não existir)
New-Item -ItemType Directory -Force -Path "$HOME\projetos" | Out-Null
cd $HOME\projetos

# Extrair o repositório
tar -xzf "$HOME\Downloads\beeit-os-rt-repo.tar.gz"
cd beeit-os-rt

# Mover o HTML
Move-Item "$HOME\Downloads\BeeIT-OS-RT-v2_116.html" "src\BeeIT-OS-RT-v2.html"

# Validar
Get-ChildItem src, public
```

---

## 🔑 Passo 3 — Coletar credenciais (antes de abrir o Claude Code)

Deixe as 3 abaixo abertas em abas separadas pra você copiar quando o Claude Code pedir:

### 3.1 Supabase Anon Key
1. Abra: https://supabase.com/dashboard/project/dbaqvoatopfquaqgdptk/settings/api
2. Copie o valor de **`anon` `public`** (é uma string JWT longa)
3. Guarde como `SUPABASE_ANON_KEY`

### 3.2 GitHub Personal Access Token (PAT)
1. Abra: https://github.com/settings/tokens
2. **Generate new token** → **Generate new token (classic)**
3. Nome: `beeit-os-rt-deploy`
4. Expiration: 90 days
5. Escopos: marque **`repo`** (tudo dentro de repo)
6. **Generate token** → copie o valor (começa com `ghp_...`)
7. Guarde como `GITHUB_PAT`
8. Crie o repositório vazio: https://github.com/new → Nome: `beeit-os-rt` → **Private** → NÃO inicialize com README/.gitignore (já temos)

### 3.3 Hostinger FTP
1. Painel Hostinger → Hosting → sua hospedagem → Advanced → **FTP Accounts**
2. Anote:
   - **Hostname** (ex: `ftp.implantacao.com.br` ou um IP)
   - **Username** (ex: `u123456789.implantacao`)
   - **Password** (se esqueceu, mude e confirme)
3. Guarde como `HOSTINGER_FTP_HOST`, `HOSTINGER_FTP_USER`, `HOSTINGER_FTP_PASSWORD`

---

## 🚀 Passo 4 — Rodar Claude Code

```bash
# Entrar na pasta do projeto
cd ~/projetos/beeit-os-rt   # macOS/Linux
# OU
cd $HOME\projetos\beeit-os-rt   # Windows

# Iniciar Claude Code
claude
```

Na primeira execução:
1. Um navegador vai abrir para autenticação
2. Faça login com sua conta Anthropic (Claude Pro/Max)
3. Autorize o acesso
4. Volte ao terminal — vai mostrar o prompt do Claude Code

---

## 🎯 Passo 5 — Colar o prompt mestre

1. Abra o arquivo `CLAUDE_CODE_PROMPT.md` (está na raiz do repo)
2. Copie o **bloco de código dentro** (entre os `` ``` `` — começa com "Olá Claude. Sou do time Bee IT...")
3. Cole no terminal do Claude Code e pressione Enter
4. O Claude Code vai ler o `CLAUDE.md`, fazer inventário e pausar pra sua aprovação

---

## 📊 O que esperar durante o deploy

O Claude Code vai executar 6 fases, pausando em cada ponto crítico:

| Fase | O que faz | Seu papel |
|---|---|---|
| **1. Inventário** | Lista arquivos, conta refs do proxy local | Aprovar para seguir |
| **2. Migração URLs** | Roda `migrate-proxy-urls.js`, valida sintaxe | Aprovar |
| **3. Edge Function** | `supabase login`, `link`, `deploy`, teste `/health` | Autenticar no Supabase |
| **4. GitHub** | `git init`, commit, push | Autorizar com PAT |
| **5. GitHub Secrets** | Orienta você a adicionar credenciais FTP | Colar valores no painel GitHub |
| **6. Validação** | Acompanha GitHub Actions, smoke test produção | Confirmar funcional |

Tempo estimado total: **20–30 minutos**.

---

## 🆘 Troubleshooting

### "claude: command not found" após install
```bash
# macOS/Linux
echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Windows: reinicie o PowerShell
```

### "EACCES: permission denied" no npm install
```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.profile
source ~/.profile
# Agora tente de novo o npm install
```

### Claude Code pediu API key em vez de fazer OAuth
Se quiser usar API key em vez de subscription:
```bash
export ANTHROPIC_API_KEY="sk-ant-api03-..."
claude
```

### "git push" pedindo senha
- Use o Personal Access Token (PAT) como senha
- Ou configure SSH keys: https://docs.github.com/authentication/connecting-to-github-with-ssh

### Supabase CLI não deployou
```bash
# Tente manual depois que o Claude Code terminar:
supabase functions deploy protheus-proxy \
  --project-ref dbaqvoatopfquaqgdptk \
  --no-verify-jwt=false
```

---

## ✅ Checklist pós-deploy

Após o Claude Code concluir, valide manualmente:

- [ ] `https://implantacao.com.br` carrega
- [ ] Login com `admin@beeit.com.br` (senha definida no Supabase Dashboard) entra
- [ ] Console do browser sem erros críticos (F12)
- [ ] Testar importação de SPED
- [ ] Testar uma consulta Protheus via proxy (SA1 ou SB1)
- [ ] Testar cadastro com CEP (ViaCEP via proxy)
- [ ] **Trocar senha** do admin@beeit.com.br imediatamente

---

## 📞 Se precisar voltar ao Claude (web)

Você pode continuar aqui com:
- Dúvidas sobre a resposta do Claude Code
- Ajustes na Edge Function
- Novos bugs no HTML
- Revisão de código específico

É só colar o log do Claude Code aqui que eu ajudo a interpretar.

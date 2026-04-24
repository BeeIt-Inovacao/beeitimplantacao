# 🎯 Passo-a-passo Executável — Deploy Completo

Sequência exata, em ordem, para subir `implantacao.com.br` em produção.

---

## ⚡ Fase 0 — Preparação (10 min)

### 0.1 Criar repositório no GitHub
```bash
# No site: https://github.com/new
# Nome: beeit-os-rt
# Visibilidade: Private
# NÃO inicializar com README (já temos)
```

### 0.2 Inicializar Git local
```bash
cd /caminho/para/beeit-os-rt
git init
git add .
git commit -m "chore: estrutura inicial do repositório"
git branch -M main
git remote add origin https://github.com/SEU_USER/beeit-os-rt.git
git push -u origin main
```

---

## 🔧 Fase 1 — Supabase Edge Function (5 min)

### 1.1 Deploy da função
**Opção A — Via MCP (Claude):** pedir pra deployar (requer aprovação)

**Opção B — Via CLI:**
```bash
npm install -g supabase
supabase login
cd supabase/functions/protheus-proxy
supabase functions deploy protheus-proxy --project-ref dbaqvoatopfquaqgdptk
```

### 1.2 Validar
```bash
curl https://dbaqvoatopfquaqgdptk.supabase.co/functions/v1/protheus-proxy/health \
  -H "apikey: SUA_ANON_KEY" \
  -H "Authorization: Bearer SUA_ANON_KEY"
```
Deve retornar JSON com `status: "ok"`.

---

## 🔄 Fase 2 — Migrar URLs do HTML (3 min)

### 2.1 Copiar HTML atual para o repo
```bash
cp /home/claude/BeeIT-OS-RT-v2_116.html src/BeeIT-OS-RT-v2.html
```

### 2.2 Rodar migrator de URLs
```bash
node scripts/migrate-proxy-urls.js src/BeeIT-OS-RT-v2.html
```

### 2.3 Revisar manualmente
```bash
# Buscar referências residuais
grep -n "localhost:3030\|127.0.0.1:3030" src/BeeIT-OS-RT-v2.html
# Deve retornar ZERO matches
```

### 2.4 Ajustar headers Authorization nas chamadas fetch
Procurar no HTML por `fetch(` que batem na Edge Function e garantir:
```javascript
fetch(`${PROXY_URL}/protheus/rest/SA1`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${beeitSession.access_token}`,
    'apikey': SUPABASE_ANON_KEY,
    'x-protheus-auth': `Bearer ${protheusToken}` // JWT do Protheus
  }
})
```

### 2.5 Validar sintaxe JS
```bash
# Extrair e validar scripts inline
node --check <(grep -oP '(?<=<script>)[\s\S]*?(?=</script>)' src/BeeIT-OS-RT-v2.html 2>/dev/null || echo 'console.log("ok")')
```

### 2.6 Commit
```bash
git add src/
git commit -m "feat: migrar proxy local → Supabase Edge Function"
git push
```

---

## 🌐 Fase 3 — Hostinger (10 min)

### 3.1 Verificar plano
Painel Hostinger → Hosting → Ver recursos. Para Git integration: **Premium ou superior**.

### 3.2 Apontar domínio para hospedagem
Painel → **Domains** → `implantacao.com.br` → **Change Nameservers**:
- Se hosting + domínio na Hostinger: já tá configurado, pular
- Se domínio em outro registrador: apontar para `ns1.dns-parking.com` e `ns2.dns-parking.com`

### 3.3 Instalar SSL
Painel → **Hosting** → **Advanced** → **SSL** → **Install SSL** no domínio.

### 3.4 Configurar deploy (escolher uma opção)

#### 🟢 Opção A — Git integrado (recomendado)
1. Painel → **Hosting** → **Advanced** → **GIT**
2. **Create repository:**
   - Repository URL: `https://github.com/SEU_USER/beeit-os-rt.git`
   - Branch: `main`
   - Deploy path: `/public_html/`
3. Para repos privados: gerar Deploy Key (SSH) e adicionar no GitHub → Settings → Deploy keys
4. Ativar **Auto-deploy on push**
5. **Deploy now** para primeira sincronização

#### 🟡 Opção B — GitHub Actions FTP
1. Painel Hostinger → **Advanced** → **FTP Accounts** → anotar credenciais
2. GitHub → Settings → Secrets → adicionar:
   - `HOSTINGER_FTP_HOST`
   - `HOSTINGER_FTP_USER`
   - `HOSTINGER_FTP_PASSWORD`
3. Push no `main` dispara o workflow automaticamente

### 3.5 Configurar o File Manager (só se Opção A precisar ajuste)
Painel → **Files** → **File Manager** → `/public_html/`:
- Remover `default.php` e `.well-known/` extra, se houver
- Garantir que `index.html` existe
- Garantir que `.htaccess` está presente (copiado do repo)

---

## ✅ Fase 4 — Validação Final (5 min)

### 4.1 Testes de infraestrutura
```bash
# DNS
dig implantacao.com.br +short
nslookup implantacao.com.br

# HTTP→HTTPS redirect
curl -I http://implantacao.com.br
# Deve retornar 301 → https://

# HTTPS
curl -I https://implantacao.com.br
# Deve retornar 200

# HTML chegando
curl -s https://implantacao.com.br | grep -o '<title>.*</title>'
```

### 4.2 Testes funcionais
Abrir https://implantacao.com.br no browser:

- [ ] Página carrega sem erro
- [ ] Console limpo (F12 → Console)
- [ ] Login com `admin@beeit.com.br` (senha definida no Supabase Dashboard) entra no sistema
- [ ] Importar um SPED teste funciona
- [ ] Proxy Protheus responde (testar uma consulta SA1)
- [ ] ViaCEP responde (cadastro novo, digitar CEP)
- [ ] Agente IA (CT5, Fiscal) responde

### 4.3 Performance
- [ ] PageSpeed: https://pagespeed.web.dev/?url=https%3A%2F%2Fimplantacao.com.br
- [ ] Desktop score > 85
- [ ] Mobile score > 70

---

## 🔐 Fase 5 — Segurança Pós-Deploy (5 min)

### 5.1 Rotacionar credenciais
- [ ] Senha `admin@beeit.com.br` foi trocada por uma forte
- [ ] Criar usuários reais via painel admin
- [ ] Desativar `admin@beeit.com.br` ou usar só para setup

### 5.2 Revisar secrets
- [ ] `SUPABASE_SERVICE_ROLE_KEY` NÃO está no HTML (só `anon key`)
- [ ] FTP credentials só nos Secrets do GitHub
- [ ] `.env` no `.gitignore`

### 5.3 Configurar backups
- Supabase: **Database → Backups** (automático no plano Pro)
- GitHub: repo é o backup do código

---

## 📊 Monitoramento Contínuo

| O que | Onde |
|---|---|
| Uptime do site | https://uptimerobot.com (grátis, 5min check) |
| Logs Edge Function | Supabase → Functions → protheus-proxy → Logs |
| Erros JavaScript | Sentry.io (opcional) |
| Analytics | Cloudflare Web Analytics ou Plausible |

---

## 🆘 Se algo quebrar

1. **Site fora do ar** → Hostinger painel → **Hosting** → verificar status
2. **Login falha** → Supabase Dashboard → Logs → Auth
3. **Proxy retorna erro** → Supabase Dashboard → Functions → protheus-proxy → Logs
4. **Deploy não acontece** → GitHub → Actions → ver último workflow run

**Rollback rápido:**
```bash
git revert HEAD
git push
# GitHub Actions reverte automaticamente em ~2 min
```

---

🎉 **Produção no ar em ~35 minutos do zero ao deploy.**

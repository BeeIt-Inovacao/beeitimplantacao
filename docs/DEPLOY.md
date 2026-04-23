# 🚀 Guia de Deploy — BeeIT OS-RT v2

Deploy do BeeIT em `implantacao.com.br` via Hostinger.

---

## 📋 Pré-requisitos

- [ ] Plano Hostinger ativo (mínimo **Premium Web Hosting** para Git integration; **Business** para Node.js)
- [ ] Domínio `implantacao.com.br` apontando para a hospedagem
- [ ] Conta GitHub com repositório `beeit-os-rt` criado
- [ ] Supabase Edge Function `protheus-proxy` deployada
- [ ] HTML migrado (localhost:3030 → Edge Function)

---

## 🔧 Passo 1 — Configuração DNS (Hostinger)

Se o domínio **foi comprado na Hostinger** E a hospedagem **também é Hostinger**, o DNS geralmente já vem configurado. Validar:

### 1.1 Acessar painel DNS
1. Login em https://hpanel.hostinger.com
2. **Domains** → `implantacao.com.br` → **DNS / Nameservers**

### 1.2 Registros DNS necessários

| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| `A` | `@` | (IP do seu servidor Hostinger — mostra no painel) | 3600 |
| `A` | `www` | (mesmo IP acima) | 3600 |
| `CNAME` | `www` | `implantacao.com.br` | 3600 |
| `TXT` | `@` | `v=spf1 include:_spf.hostinger.com ~all` | 3600 |

> **Nota:** Use `A` **ou** `CNAME` para `www`, nunca os dois. Recomendação: `A` para ambos.

### 1.3 Nameservers

Se o domínio foi comprado em outro registrador (Registro.br etc.), configure os nameservers lá para:
```
ns1.dns-parking.com
ns2.dns-parking.com
```
(ou o que a Hostinger indicar no painel)

**Propagação:** até 24h, geralmente 15–60 minutos.

---

## 🌐 Passo 2 — SSL (HTTPS grátis)

1. Painel Hostinger → **Hosting** → seu plano → **Advanced** → **SSL**
2. Clique **Install SSL** no domínio `implantacao.com.br`
3. Aguarde ~5 minutos — Let's Encrypt provisiona automaticamente
4. Ative **Force HTTPS** (toggle na mesma tela)

---

## 📦 Passo 3 — Deploy do HTML

### Opção A — Git Deploy (recomendado, Hostinger Premium+)

1. Painel Hostinger → **Hosting** → **Git**
2. **Criar novo repositório**:
   - Repository: `https://github.com/SEU_USER/beeit-os-rt.git`
   - Branch: `main`
   - Path: `/public_html`
   - Build command: `cp src/BeeIT-OS-RT-v2.html public/index.html` (se usar src/)
3. **Auto-deploy**: ativar (faz pull a cada push)

### Opção B — GitHub Actions via FTP (funciona em qualquer plano)

1. **Obter credenciais FTP:**
   - Painel Hostinger → **Hosting** → **Advanced** → **FTP Accounts**
   - Anote: Host, User, Password

2. **Cadastrar secrets no GitHub:**
   - Repo GitHub → **Settings** → **Secrets and variables** → **Actions**
   - New repository secret:
     - `HOSTINGER_FTP_HOST` — ex: `ftp.implantacao.com.br`
     - `HOSTINGER_FTP_USER` — ex: `u123456789.implantacao`
     - `HOSTINGER_FTP_PASSWORD` — sua senha FTP

3. **O workflow `.github/workflows/deploy.yml` já está configurado.** Qualquer push em `main` que altere `public/` ou `src/` dispara deploy automático.

### Opção C — Upload manual (rápido para primeira publicação)

1. Painel Hostinger → **Files** → **File Manager**
2. Navegar até `/public_html/`
3. Deletar `default.php` e arquivos padrão
4. Upload do `public/index.html` (renomeado se necessário)

---

## 🔒 Passo 4 — Headers de segurança

Criar `/public_html/.htaccess` com:

```apache
# ────── HTTPS obrigatório ──────
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# ────── Compressão ──────
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json text/plain
</IfModule>

# ────── Cache estático ──────
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/html "access plus 0 seconds"
  ExpiresByType text/css "access plus 7 days"
  ExpiresByType application/javascript "access plus 7 days"
  ExpiresByType image/png "access plus 30 days"
</IfModule>

# ────── Security Headers ──────
<IfModule mod_headers.c>
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-Content-Type-Options "nosniff"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
  Header set Permissions-Policy "geolocation=(), microphone=(), camera=()"
  Header set Strict-Transport-Security "max-age=31536000; includeSubDomains" env=HTTPS
</IfModule>

# ────── Redirect www → non-www ──────
RewriteCond %{HTTP_HOST} ^www\.implantacao\.com\.br$ [NC]
RewriteRule ^(.*)$ https://implantacao.com.br/$1 [L,R=301]

# ────── SPA routing (se precisar de rotas internas) ──────
# Descomente se usar hash routing ou history API
# RewriteCond %{REQUEST_FILENAME} !-f
# RewriteCond %{REQUEST_FILENAME} !-d
# RewriteRule ^ index.html [L]
```

---

## ✅ Passo 5 — Validação pós-deploy

### 5.1 Testes básicos
```bash
# DNS resolvendo
dig implantacao.com.br +short

# HTTPS funcionando
curl -I https://implantacao.com.br

# HTML carregando
curl -s https://implantacao.com.br | head -50
```

### 5.2 Checklist funcional
- [ ] Acessar `https://implantacao.com.br` no browser → página carrega
- [ ] HTTP redireciona para HTTPS (cadeado verde)
- [ ] Login com `admin@beeit.com.br` funciona
- [ ] Abrir DevTools → Console → zero erros críticos
- [ ] Network tab → chamadas ao Supabase funcionam
- [ ] Testar proxy Protheus: fazer uma chamada pequena, ver resposta OK
- [ ] Testar ViaCEP via proxy: digitar CEP, ver retorno

### 5.3 Performance
- Teste em https://pagespeed.web.dev/ → Score > 80
- Teste em https://gtmetrix.com/ → A ou B

---

## 🔄 Workflow diário

```bash
# 1. Editar código localmente
vim src/BeeIT-OS-RT-v2.html

# 2. Validar sintaxe JS
node --check <(grep -oP '(?<=<script>)[\s\S]*?(?=</script>)' src/BeeIT-OS-RT-v2.html)

# 3. Commit + push
git add src/BeeIT-OS-RT-v2.html
git commit -m "feat: [descrição]"
git push origin main

# 4. GitHub Actions faz o deploy automático em ~2 minutos
# Acompanhar: https://github.com/SEU_USER/beeit-os-rt/actions
```

---

## 🆘 Troubleshooting

### "Domínio não resolve"
- Aguardar 24h para propagação DNS
- Verificar registros no painel Hostinger
- `dig implantacao.com.br` → deve mostrar IP do servidor

### "SSL not found / erro de certificado"
- SSL pode levar até 1h após DNS propagar
- Verificar em **SSL** no painel se está "Active"
- Se falhar: remover e reinstalar SSL

### "FTP deploy falhou"
- Verificar credenciais nos Secrets GitHub
- Testar manualmente: `ftp ftp.implantacao.com.br`
- Checar se o diretório `/public_html/` existe e tem permissão de escrita

### "Login com admin@beeit.com.br não funciona"
- Supabase auth já está OK (ver `docs/TROUBLESHOOTING.md`)
- Verificar console do browser por erros CORS

### "Proxy Protheus retorna 401"
- Headers do fetch precisam enviar `Authorization: Bearer <jwt_supabase>`
- Testar Edge Function direto:
  ```bash
  curl https://dbaqvoatopfquaqgdptk.supabase.co/functions/v1/protheus-proxy/health \
    -H "Authorization: Bearer SEU_JWT"
  ```

---

## 📞 Suporte

- **Hostinger:** hpanel.hostinger.com → chat 24h
- **Supabase:** https://supabase.com/dashboard/project/dbaqvoatopfquaqgdptk
- **GitHub Actions:** https://github.com/SEU_USER/beeit-os-rt/actions

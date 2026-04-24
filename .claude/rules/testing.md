# Testing — BeeIT OS-RT v2

## Validação obrigatória antes de commits

### JavaScript do monólito

Todo commit que toque em `src/BeeIT-OS-RT-v2.html` ou em qualquer arquivo em `src/core/`, `src/services/`, `src/security/`, `src/modules/` deve passar por `node --check` nos scripts extraídos:

```bash
# Extrair scripts inline do monólito e validar
node -e "
const fs = require('fs');
const html = fs.readFileSync('src/BeeIT-OS-RT-v2.html', 'utf8');
const scripts = [...html.matchAll(/<script(?:(?!type=\"(?:module|application\\/json)\")[^>])*>([\s\S]*?)<\\/script>/g)]
  .map(m => m[1]).filter(s => s.trim().length > 0);
let err = 0;
scripts.forEach((s, i) => {
  try { new Function(s); } catch (e) { console.error('❌ Script', i, ':', e.message); err++; }
});
if (err > 0) process.exit(1);
console.log('✅', scripts.length, 'scripts inline OK');
"
```

Módulos JS externos (`src/core/*.js`, `src/services/*.js`, etc.):

```bash
node --check src/core/<arquivo>.js
```

O pipeline [.github/workflows/deploy.yml](../../.github/workflows/deploy.yml) já executa essa validação — mas falhar localmente antes é obrigatório.

## Testes de sanidade REST

### Edge Function `protheus-proxy`

Após cada deploy da Edge, validar com curl (substitua `<JWT>` por um token válido de sessão):

```bash
# Health
curl -s https://dbaqvoatopfquaqgdptk.supabase.co/functions/v1/protheus-proxy/health | jq .

# Protheus (blueprint de uma tabela) — deve exigir Authorization
curl -s -X POST \
  https://dbaqvoatopfquaqgdptk.supabase.co/functions/v1/protheus-proxy/protheus/api/v1/bda/dictionary/blueprint \
  -H "Authorization: Bearer <JWT>" \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -H "x-protheus-auth: Bearer <PROTHEUS_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"aliases":["SA1"],"options":{"scope":"MANDATORY_AND_KEYS"}}' | jq .

# Sem Authorization → deve retornar 401 (verify_jwt=true)
curl -s -o /dev/null -w "%{http_code}\n" \
  https://dbaqvoatopfquaqgdptk.supabase.co/functions/v1/protheus-proxy/protheus/api/v1/bda/dictionary/blueprint
# esperado: 401
```

### AdvPL (API Protheus)

Após publicar um novo fonte TLPP no Protheus, smoke test:

```bash
# Direto no Protheus (só ambiente interno BeeIt)
curl -s -X POST \
  http://beeit207327.protheus.cloudtotvs.com.br:10607/api/v1/bda/dictionary/blueprint \
  -u "<user>:<pass>" \
  -H "Content-Type: application/json" \
  -d '{"aliases":["SA1","SB1"]}' | jq '.status, .blueprint | keys'
# esperado: "success" + ["SA1", "SB1"]
```

### Migrations Supabase

Antes de aplicar em produção, dry-run em branch database:

```bash
supabase db diff --file migrations/<nome>.sql --linked
supabase db push --dry-run
```

Validar RLS policies com usuário sintético:

```sql
-- Simular usuário do tenant A tentando ler dados do tenant B
select set_config('request.jwt.claims', json_build_object(
  'sub', '<user-A-uuid>',
  'tenant_id', '<tenant-B-uuid>'
)::text, true);

select count(*) from protheus_dict_snapshot;  -- deve retornar 0
```

## Smoke test pós-deploy

Checklist manual em `https://implantacao.com.br` após cada deploy:

1. Página carrega sem erros no console (F12)
2. Login com `admin@beeit.com.br` (senha do Supabase Dashboard) entra
3. Um endpoint Protheus responde via proxy (`/protheus/api/v1/...`)
4. ViaCEP responde (cadastro → CEP)
5. Nenhuma referência direta a `beeit207327.protheus.cloudtotvs.com.br` ou `localhost:3030` aparece no HTML público:
   ```bash
   curl -s https://implantacao.com.br/ | grep -cE "beeit207327|localhost:3030"
   # esperado: 0
   ```

## Cobertura mínima para módulos novos

Cada módulo em `src/modules/<nome>/` deve vir com:

- `schema.js` com JSON Schema do payload (validação input)
- Smoke test documentado em `<módulo>/README.md` — curl de um happy path
- Teste de RLS se o módulo lê/escreve em tabelas Supabase

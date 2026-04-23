# Edge Function: `protheus-proxy`

Proxy unificado que substitui o antigo servidor Node.js local (porta 3030).

## Endpoints

Base URL: `https://dbaqvoatopfquaqgdptk.supabase.co/functions/v1/protheus-proxy`

| Rota | Destino upstream | Método |
|---|---|---|
| `/protheus/*` | `http://beeit207327.protheus.cloudtotvs.com.br:10607/*` | Todos |
| `/ibge/*` | `https://servicodados.ibge.gov.br/api/v1/localidades/*` | GET |
| `/viacep/:cep` | `https://viacep.com.br/ws/:cep/json/` | GET |
| `/brasilapi/*` | `https://brasilapi.com.br/api/*` | GET |
| `/health` | Retorna status do proxy | GET |

## Autenticação

**Supabase JWT obrigatório** em TODAS as chamadas:
```
Authorization: Bearer <supabase_jwt>
```

Para o **Protheus**, o JWT do Protheus vai em header separado:
```
x-protheus-auth: Bearer <protheus_token>
```

## Exemplos

### Health check
```bash
curl https://dbaqvoatopfquaqgdptk.supabase.co/functions/v1/protheus-proxy/health \
  -H "Authorization: Bearer <SUPABASE_JWT>"
```

### Consultar CEP
```bash
curl https://dbaqvoatopfquaqgdptk.supabase.co/functions/v1/protheus-proxy/viacep/01310100 \
  -H "Authorization: Bearer <SUPABASE_JWT>"
```

### Chamada Protheus (exemplo: listar SA1)
```bash
curl https://dbaqvoatopfquaqgdptk.supabase.co/functions/v1/protheus-proxy/protheus/rest/SA1 \
  -H "Authorization: Bearer <SUPABASE_JWT>" \
  -H "x-protheus-auth: Bearer <PROTHEUS_JWT>"
```

## Deploy

Via Supabase CLI:
```bash
supabase functions deploy protheus-proxy --project-ref dbaqvoatopfquaqgdptk
```

Via MCP (neste repo):
```bash
# Já deployado. Verificar em:
# https://supabase.com/dashboard/project/dbaqvoatopfquaqgdptk/functions
```

## Variáveis de ambiente

- `PROTHEUS_BASE_URL` (opcional) — override do endpoint Protheus. Default: `http://beeit207327.protheus.cloudtotvs.com.br:10607`

Configurar no painel Supabase: **Project Settings → Edge Functions → Secrets**.

## Logs

```
https://supabase.com/dashboard/project/dbaqvoatopfquaqgdptk/functions/protheus-proxy/logs
```

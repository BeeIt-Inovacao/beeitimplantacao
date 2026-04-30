# Plano Tático — Motor de Sincronização Assíncrona via APIs Padrão TOTVS
**Versão:** 0.1-draft · **Status:** Aguardando aprovação · **Sprint alvo:** 7 (pós-modularization)

---

## 1. Requisitos Técnicos — O Fluxo de Memória Atual

### 1.1 Cadeia de dados: do SPED à memória

```
Upload SPED (arquivo .txt)
        │
        ▼
   proc()  (monólito, ~linha 6090)
        │
        ├─► PARTS[]     — array bruto de participantes (O(n) SPED raw)
        │   PARTS_MAP   — Map<cnpj, idx> para lookup O(1)
        │
        ├─► EP[]        — participantes enriquecidos, shape:
        │                 { raw: {tipo, cnpj, nome, ...},
        │                   payload: {A1_COD, A1_NOME, A1_CGC, ...},
        │                   status, issues[] }
        │   ┣ SA1 → EP.filter(x => x.raw.tipo !== 'FORNECEDOR')
        │   ┗ SA2 → EP.filter(x => x.raw.tipo !== 'CLIENTE')
        │
        └─► EPr[]       — produtos enriquecidos, shape:
                          { raw: {cod, descr, ncm, ...},
                            payload: {B1_COD, B1_DESC, B1_POSIPI, ...},
                            status, issues[] }
            ┗ SB1 → EPr.filter(x => x.payload?.B1_COD)
```

`getSystemData()` (linha 12697) é a função que faz o mapeamento final:
- **SA1** ← `EP[]` filtrado por `raw.tipo !== 'FORNECEDOR'` E `payload.A1_CGC` preenchido
- **SA2** ← `EP[]` filtrado por `raw.tipo !== 'CLIENTE'` E `payload.A1_CGC` preenchido
- **SB1** ← `EPr[]` filtrado por `payload.B1_COD` preenchido

### 1.2 O que está em memória quando o usuário aperta `🚀 Sincronizar`

| Alias | Fonte global | Campos disponíveis (amostra)                                                |
|-------|--------------|------------------------------------------------------------------------------|
| SA1   | `EP[]`       | `A1_FILIAL`, `A1_COD`, `A1_LOJA`, `A1_NOME`, `A1_NREDUZ`, `A1_PESSOA`, `A1_CGC`, `A1_INSCR`, `A1_CONTRIB`, `A1_SIMPLEC`, `A1_TIPO`, `A1_END`, `A1_BAIRRO`, `A1_MUN`, `A1_EST`, `A1_CEP`, `A1_PAIS` |
| SA2   | `EP[]`       | Mesmos campos com prefixo `A2_`, + `A2_TPFORN='1'` hardcoded               |
| SB1   | `EPr[]`      | `B1_FILIAL`, `B1_COD`, `B1_DESC`, `B1_TIPO`, `B1_UM`, `B1_GRUPO`, `B1_POSIPI`, `B1_CEST`, `B1_CONTA` |

> **Invariante crítica:** `getSystemData()` já aplica truncamentos SX3 (ex: `A1_NOME.slice(0,40)`). Os dados em memória já estão em formato Protheus ISAM — precisarão de re-mapeamento para o schema OData das APIs padrão.

### 1.3 Comportamento atual de `syncTabela(alias)` (linha 13370)

```
syncTabela(alias)
  │
  ├─ _getSyncConfig()  — lê URL, emp, fil, user/pass do cfgGet() → headers com Basic Auth hardcoded no browser (⚠️ PI exposta)
  ├─ _getSyncData(alias) → getSystemData() → filtra por alias
  │
  └─ loop em lotes de 10:
       POST {restBase}/api/framework/v1/company/{emp}/{fil}/{alias}
       payload = registro bruto (chaves _* removidas)
       sem confirmação | sem upsert | sem check de dicionário
       sem retry | sem fila | sem relatório pós-sync
```

**Problemas identificados:**
1. Rota legada `POST /api/framework/v1/company/{emp}/{fil}/{alias}` não existe nas APIs padrão TOTVS
2. Credenciais Basic Auth construídas no browser (`btoa(user:pass)`) — PI exposta
3. Zero confirmação UX, sem modal "quantos registros você vai enviar"
4. Sem verificação de existência (GET) — post cego pode criar duplicatas
5. Sem gate de dicionário — envia mesmo sem saber os campos obrigatórios do ERP

---

## 2. Lógica de Integração — O Novo Motor Assíncrono

### 2.1 Visão arquitetural do novo fluxo

```
Usuário clica 🚀 Sincronizar (SA1/SA2/SB1)
        │
        ▼
  [STEP 1] Modal de confirmação
  "Confirma sincronizar N registros de {label} com o ERP? SIM/NÃO"
        │ SIM
        ▼
  [STEP 2] Ping de conexão
  GET /protheus-proxy/health → verifica Edge alcançável
        │ OK
        ▼
  [STEP 3] Trava do Dicionário (Fail-Fast)
  window._protheusBlueprintFull?.[alias] populado?
  OU window._dictSnapshotStatus?.[alias]?.hasData === true?
        │ SIM — continua
        │ NÃO → ❌ "Necessário buscar dicionários ERP da tabela X antes de sincronizar"
        ▼
  [STEP 4] Loop Upsert assíncrono
  Para cada registro em memória:
    GET API/{key} → existe?
    ├─ NÃO → POST API  (criação)
    └─ SIM → SKIP + log (sem PUT nesta v1)
        │
        ▼
  [STEP 5] Todas as chamadas via Edge Function
  protheus-proxy → injeta Basic Auth do Vault + TenantId header
        │
        ▼
  Relatório final: N criados | M pulados | K erros
```

### 2.2 Step 1 — Modal de Confirmação

Modal nativo (sem dependência de lib) — `confirm()` no MVP, modal customizado em v2:

```
┌────────────────────────────────────────────────────┐
│  🚀 Sincronizar SA1 — Clientes                     │
│                                                    │
│  Serão enviados ao ERP Protheus:                   │
│  ┌──────────────────────────────────────────────┐  │
│  │  👥 127 registros de clientes (SA1)          │  │
│  │  Empresa: T1 · Filial: 01                   │  │
│  └──────────────────────────────────────────────┘  │
│  ⚠️ Esta operação cria registros no ERP de         │
│  produção. Duplicatas são detectadas por CNPJ.     │
│                                                    │
│          [ CANCELAR ]  [ ✅ CONFIRMAR ENVIO ]      │
└────────────────────────────────────────────────────┘
```

### 2.3 Step 2 — Validação de Conexão

Chamada leve (`GET /health`) na Edge Function com timeout de 5s:

```js
const healthOk = await fetch(`${EDGE_URL}/health`, { signal: AbortSignal.timeout(5000) })
  .then(r => r.ok).catch(() => false);
if (!healthOk) throw new Error('Edge Function inacessível — verifique conexão');
```

### 2.4 Step 3 — Trava do Dicionário (Fail-Fast)

Verifica **ambos** os caches (memória + snapshot Supabase):

```js
function _dictReady(alias) {
  const inMem  = !!window._protheusBlueprintFull?.[alias]?.campos?.length;
  const inSnap = window._dictSnapshotStatus?.[alias]?.hasData === true;
  return inMem || inSnap;
}
// Se !_dictReady(alias): abort com toast e link para "Buscar Dicionários"
```

Justificativa: o dicionário confirma quais campos são obrigatórios e seus tamanhos. Sem ele o motor não pode validar o payload antes do envio, aumentando o risco de erros 422 em série.

### 2.5 Step 4 — Lógica Upsert: GET → POST (skip se existe)

#### SA1/SA2 via `CustomerVendor_v1`

Chave de lookup: CNPJ (`A1_CGC` / `A2_CGC`)

```
GET /api/erp/v1/CustomerVendor?$filter=cnpj eq '{cnpj}'&company={emp}&branch={fil}
  ├─ 200 + items[] vazio → POST /api/erp/v1/CustomerVendor
  ├─ 200 + items[0]     → SKIP (log: "já existe, pulado") — sem PUT nesta v1
  └─ erro               → registrar na lista de falhas, continuar
```

> **Recomendação v1: sem PUT.** Atualizar um cadastro existente requer validação de negócio que está fora do escopo da implantação. A v1 foca em criação segura. PUT pode ser habilitado em v2 com flag explícita.

#### SB1 via `Products_v2`

Chave de lookup: código do produto (`B1_COD`)

```
GET /api/erp/v2/Products/{B1_COD}?company={emp}&branch={fil}
  ├─ 200 → SKIP (log: "produto já existe")
  ├─ 404 → POST /api/erp/v2/Products
  └─ erro → registrar na lista de falhas, continuar
```

#### Concorrência controlada

```
Processar em fila de concorrência máxima = 3 requisições paralelas
(GET + POST por registro = 2 chamadas → max 3 registros simultâneos = 6 calls)
Delay de 150ms entre lotes → respeita rate-limit do Protheus Cloud
```

### 2.6 Step 5 — Segurança de Rede via Edge Function

**Todos** os requests passam pela Edge Function `protheus-proxy`. Nunca chamada direta do browser ao Protheus.

A Edge Function precisará de **nova entrada na allow-list** para as rotas das APIs padrão:

```ts
// Adicionar em PROTHEUS_PATH_ALLOW (supabase/functions/protheus-proxy/index.ts):
"/api/erp/v1/CustomerVendor(/.*)?",
"/api/erp/v2/Products(/.*)?",
```

Headers injetados pela Edge (server-side, nunca pelo browser):
- `Authorization: Basic <base64>` — do Supabase Vault (`tenant_protheus_config`)
- `TenantId: {emp},{fil}` — empresa e filial por tenant
- `Content-Type: application/json`

---

## 3. Experiência do Usuário (UX) e Isolamento

### 3.1 Feedback visual durante processamento

Reutiliza os elementos DOM já existentes (`sync-pb-{alias}`, `sync-pf-{alias}`, `sync-st-{alias}`):

```
[== Passo 1/4: Verificando conexão =========]     ⏳ 0/127
[==== Passo 2/4: Validando dicionário ======]     ⏳ 0/127
[====== Passo 3/4: Sincronizando ===========]     ⏳ 63/127
[========================================= ]     ✅ 127 criados · 0 pulados · 0 erros
```

Pós-sync: exibe relatório inline no card (não em modal):
```
✅ SA1 — Clientes:  98 criados · 29 pulados (já existiam) · 0 erros
⚠️ SA2 — Fornecedores: 41 criados · 5 erros (ver detalhes ▼)
```

Botão "ver detalhes" expande lista de CNPJs com erro + código HTTP retornado.

### 3.2 Isolamento do módulo

O novo motor será criado em **`src/core/totvs-api-sync.js`** (módulo IIFE, sem dependência de framework):

```
src/core/totvs-api-sync.js
  ├─ Expõe: window.totvsSync.SA1(options)
  ├─ Expõe: window.totvsSync.SA2(options)
  ├─ Expõe: window.totvsSync.SB1(options)
  └─ Interno: _confirmModal, _pingEdge, _dictGate, _upsertLoop, _progressUpdate
```

**Integração com o monólito:** a função `syncTabela(alias)` existente (linha 13370) receberá um override **condicional** apenas para `SA1`, `SA2` e `SB1`. Para todos os outros aliases (CT1, CTT, SED, SF4, etc.) continua usando o fluxo legado:

```js
// Override no final do monólito (last-declaration-wins):
async function syncTabela(alias) {
  if (['SA1','SA2','SB1'].includes(alias)) {
    return window.totvsSync[alias]();  // novo motor
  }
  // ... código legado original para outros aliases
}
```

Isso garante:
- Contabilidade (CT1, CTT), Financeiro (SE1, SE2, SA6), RT 2026 (F2B, F2E...) **intocados**
- Sem risco de regressão em rotinas que já funcionam

---

## 4. Métricas de Sucesso — Mapper De/Para

### 4.1 SA1 (Clientes) → `CustomerVendor_v1`

| Campo Protheus ISAM | Tipo   | Campo API Padrão (`CustomerVendor_v1_000.json`) | Transformação                                           |
|---------------------|--------|-------------------------------------------------|---------------------------------------------------------|
| `A1_FILIAL`         | C(2)   | `branch`                                        | direto (`cfgGet('protheus_fil')`)                      |
| `A1_COD`            | C(6)   | `code`                                          | direto                                                  |
| `A1_LOJA`           | C(2)   | `store`                                         | direto                                                  |
| `A1_NOME`           | C(40)  | `name`                                          | `.slice(0,40).trim()`                                   |
| `A1_NREDUZ`         | C(20)  | `shortName`                                     | `.slice(0,20).trim()`                                   |
| `A1_CGC`            | C(14)  | `cnpj` / `cpf`                                  | `A1_PESSOA==='J'` → cnpj, `'F'` → cpf                  |
| `A1_PESSOA`         | C(1)   | `personType`                                    | `'J'`=PJ / `'F'`=PF                                    |
| `A1_INSCR`          | C(18)  | `stateRegistration`                             | direto                                                  |
| `A1_CONTRIB`        | C(1)   | `taxpayerType`                                  | `'1'`=contribuinte / `'2'`=não-contribuinte             |
| `A1_SIMPLEC`        | C(1)   | `simpleNationalOptant`                          | `'1'`=Sim / `'2'`=Não                                   |
| `A1_END`            | C(80)  | `address.street`                                | `.slice(0,80).trim()`                                   |
| `A1_BAIRRO`         | C(40)  | `address.neighborhood`                          | `.slice(0,40).trim()`                                   |
| `A1_MUN`            | C(60)  | `address.city`                                  | `.slice(0,60).trim()`                                   |
| `A1_EST`            | C(2)   | `address.state`                                 | direto (UF BR)                                          |
| `A1_CEP`            | C(8)   | `address.zipCode`                               | já sanitizado (`\D` removido)                           |
| `A1_PAIS`           | C(3)   | `address.countryCode`                           | `'105'` → `'BRA'` (ISO 3166-1 alpha-3)                  |
| —                   | —      | `customerVendorType`                            | fixo: `'Customer'` para SA1                             |
| —                   | —      | `company`                                       | `cfgGet('protheus_emp')`                                |

> ⚠️ Campos `address.*` podem exigir objeto aninhado dependendo da versão do Protheus (12.1.2210+). Validar contra schema real pré-implementação.

### 4.2 SA2 (Fornecedores) → `CustomerVendor_v1`

Mesma tabela acima, com:
- Prefix `A2_` em vez de `A1_`
- `customerVendorType` → `'Vendor'` (ou `'Both'` se CNPJ já constar em SA1)
- `A2_TPFORN` → `supplierType` (`'1'` = normal)

Chave de lookup para upsert: `cnpj` (igual SA1)

### 4.3 SB1 (Produtos) → `Products_v2`

| Campo Protheus ISAM | Tipo   | Campo API Padrão (`Products_v2_000.json`)       | Transformação                                           |
|---------------------|--------|-------------------------------------------------|---------------------------------------------------------|
| `B1_FILIAL`         | C(2)   | `branch`                                        | `cfgGet('protheus_fil')`                               |
| `B1_COD`            | C(15)  | `code`                                          | direto (chave primária do GET)                          |
| `B1_DESC`           | C(50)  | `description`                                   | `.slice(0,50).trim()`                                   |
| `B1_TIPO`           | C(2)   | `type`                                          | `'MC'`=mercadoria / `'PI'`=PI / etc.                   |
| `B1_UM`             | C(2)   | `unitOfMeasure`                                 | direto (`'UN'`, `'KG'`, `'CX'`...)                     |
| `B1_GRUPO`          | C(4)   | `productGroup`                                  | direto                                                  |
| `B1_POSIPI`         | C(10)  | `fiscalClassification` / `ncm`                  | já sanitizado (`\D` removido)                           |
| `B1_CEST`           | C(7)   | `cest`                                          | direto                                                  |
| `B1_CONTA`          | C(20)  | `accountingAccount`                             | direto                                                  |
| —                   | —      | `company`                                       | `cfgGet('protheus_emp')`                                |

---

## 5. Impactos na Edge Function

A allow-list `PROTHEUS_PATH_ALLOW` em `supabase/functions/protheus-proxy/index.ts` precisará incluir os novos paths das APIs padrão TOTVS **antes** de iniciar o desenvolvimento do módulo:

```ts
// Proposta de adição (Sprint 7):
const PROTHEUS_STANDARD_APIS = new RegExp(
  "^(" +
    "/api/erp/v1/CustomerVendor(/[A-Za-z0-9_.~%+-]*)?" +
    "|" +
    "/api/erp/v2/Products(/[A-Za-z0-9_.~%+-]*)?" +
  ")(\\?.*)?$",
  "i"
);
```

Lógica de roteamento: unir `PROTHEUS_PATH_ALLOW || PROTHEUS_STANDARD_APIS || PROTHEUS_PATH_ALLOW_LEGACY`.

---

## 6. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Schema `CustomerVendor_v1` diverge da versão do ambiente do cliente | Alta | Médio | Verificar blueprint via `GET /api/erp/v1/CustomerVendor/schema` antes do primeiro POST |
| CNPJ duplicado entre SA1 e SA2 (empresa é cliente e fornecedor) | Alta | Baixo | `customerVendorType: 'Both'` ou skip silencioso — a definir na implementação |
| Rate-limit do Protheus Cloud (TOTVS limita ~10req/s) | Média | Médio | Fila com concorrência = 3 + delay 150ms entre lotes |
| Fields obrigatórios faltando (422 em série) | Média | Alto | Validação local contra blueprint do dicionário **antes** de iniciar o loop |
| Usuário sincroniza sem SPED carregado (EP[] vazio) | Alta | Baixo | Já tratado: `if (!rows.length)` aborta antes do modal |

---

## 7. Pré-requisitos para Iniciar Desenvolvimento

- [ ] Confirmar versão do Protheus do ambiente do cliente (12.1.XXXX) → define schema real de `CustomerVendor_v1` e `Products_v2`
- [ ] Checar se as rotas `/api/erp/v1/CustomerVendor` e `/api/erp/v2/Products` estão habilitadas no RPO (REST Publishing Options) do ambiente TOTVS Cloud
- [ ] Aprovar adição dos novos paths na allow-list da Edge Function
- [ ] Definir comportamento para CNPJ que existe em SA1 E SA2 (Customer+Vendor)
- [ ] Confirmar se PUT está no escopo da v1 ou apenas POST (recomendação: apenas POST)

---

## 8. Estrutura de Arquivos a Criar

```
src/core/totvs-api-sync.js       ← módulo principal (IIFE)
  ├─ _confirmModal(alias, count)
  ├─ _pingEdge()
  ├─ _dictGate(alias)
  ├─ _mapperSA1(record)          ← De/Para ISAM → CustomerVendor_v1
  ├─ _mapperSA2(record)          ← De/Para ISAM → CustomerVendor_v1
  ├─ _mapperSB1(record)          ← De/Para ISAM → Products_v2
  ├─ _upsertLoop(alias, rows, mapper, apiConfig)
  ├─ _progressUpdate(alias, done, total, created, skipped, errors)
  └─ window.totvsSync.{SA1, SA2, SB1}

supabase/functions/protheus-proxy/index.ts
  └─ [edição] adicionar PROTHEUS_STANDARD_APIS à allow-list

src/BeeIT-OS-RT-v2.html
  └─ [edição] override de syncTabela() (last-declaration-wins, no final do arquivo)
```

---

*Aguardando aprovação do Bruno para iniciar Sprint 7 — Módulo `totvs-api-sync`.*

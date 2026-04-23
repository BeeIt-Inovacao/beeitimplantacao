# 🐝 BeeIT OS-RT v2.0

> **Acelerador de Implantação Protheus** · Canal Homologado TOTVS
> 
> Plataforma SaaS single-file para acelerar implantações do TOTVS Protheus ERP. Processa arquivos SPED fiscais (EFD-ICMS/IPI e EFD-Contribuições), automatiza enriquecimento e validação de dados, integra via REST API ao Protheus e gera documentação MIT041 assistida por IA.

![Status](https://img.shields.io/badge/status-production-brightgreen)
![Version](https://img.shields.io/badge/version-2.0-blue)
![Protheus](https://img.shields.io/badge/Protheus-12.1.33%2B-orange)
![License](https://img.shields.io/badge/license-Proprietary-red)

🌐 **Produção:** [implantacao.com.br](https://implantacao.com.br)

---

## 🎯 Visão Geral

BeeIT OS-RT é um **acelerador single-file** (HTML/CSS/JS) que cobre todo o ciclo de implantação Protheus:

| Módulo | Abrangência |
|---|---|
| **SPED Fiscal** | EFD-ICMS/IPI, EFD-Contribuições, cross-validation de CFOPs |
| **Cadastros** | SA1 (Clientes), SA2 (Fornecedores), SB1 (Produtos), CT5 (Lançamentos Padrão) |
| **Fiscal** | TES, CFOP, CST, NCM, alíquotas, Reforma Tributária (CBS/IBS/IS) |
| **Integração Protheus** | REST API com MATA410, MATA415, MATA460 e outros |
| **Agentes IA** | Diagnóstico de participantes, CT5 LP, especialista fiscal, MIT041 |
| **Documentação** | Geração automatizada do padrão MIT041 "Diagrama dos Processos" |

## 🏗️ Arquitetura

```
┌──────────────────────────────────────┐
│  implantacao.com.br (Hostinger)      │
│  └─ index.html (single-file SPA)     │
└──────────────┬───────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
┌─────────────┐   ┌──────────────────┐
│  Supabase   │   │  Edge Function   │
│  (Auth+DB)  │   │  protheus-proxy  │
└─────────────┘   └────────┬─────────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
      ┌──────────┐  ┌──────────┐  ┌──────────┐
      │ Protheus │  │  IBGE    │  │  ViaCEP  │
      │  Cloud   │  │          │  │          │
      └──────────┘  └──────────┘  └──────────┘
```

**Ambiente Protheus:** `beeit207327.protheus.cloudtotvs.com.br:10607` · Empresa `01` · Filial `0101`

## 📁 Estrutura do Repositório

```
beeit-os-rt/
├── public/
│   └── index.html              # Single-file SPA (~2.6MB)
├── supabase/
│   ├── functions/
│   │   └── protheus-proxy/     # Edge Function (substitui proxy local)
│   └── migrations/             # DDL versionado
├── scripts/
│   ├── build.sh                # Copia src → public
│   └── migrate-proxy-urls.js   # Troca localhost:3030 → Edge Function
├── docs/
│   ├── DEPLOY.md               # Guia de deploy Hostinger
│   ├── ARCHITECTURE.md         # Detalhes técnicos
│   └── CHANGELOG.md            # Histórico de versões
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD para Hostinger via FTP
├── src/
│   └── BeeIT-OS-RT-v2.html    # Fonte editável
└── README.md
```

## 🚀 Deploy

**Produção (automático):** `git push origin main` dispara GitHub Action que sincroniza via FTP para Hostinger.

**Manual:** ver [docs/DEPLOY.md](docs/DEPLOY.md).

## 🔐 Stack Técnico

| Camada | Tecnologia |
|---|---|
| Frontend | HTML5 + Vanilla JS (~33.700 linhas) |
| Backend (Auth/DB) | Supabase (PostgreSQL + GoTrue + PostgREST) |
| Proxy Protheus | Supabase Edge Function (Deno) |
| Hospedagem | Hostinger (domínio + web hosting) |
| IA | Claude Sonnet 4 (Anthropic API) |
| PDF | wkhtmltopdf (server-side render para validação) |

## 🧪 Validação Pré-Deploy

Antes de cada commit que altera o HTML principal:

```bash
node --check public/index.html    # valida sintaxe JS inline
```

## 📜 Termos e Propriedade

Software proprietário da **BeeIT Inovação Ltda.** — Canal Homologado TOTVS.

Uso restrito a clientes e consultores autorizados.

---

**Contato:** `contato@beeit.com.br` · **Web:** [implantacao.com.br](https://implantacao.com.br)

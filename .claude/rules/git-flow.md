# Git Flow — BeeIT OS-RT v2

## Topologia de branches

```
main                        ← produção estável (BLOQUEADA para commits diretos)
  └── develop               ← integração e staging (base para todas as features)
        ├── feature/os-rt-modularization   ← Sprint 1-5: segurança, interceptor, build
        └── feature/clicksign-daniel       ← Monólito: ClickSign + features do Daniel
```

## Regras inegociáveis

1. **NUNCA** faça commit direto em `main`.
2. **NUNCA** faça commit direto em `develop`.
3. Toda feature nova parte de `develop` via `git checkout -b feature/<nome>`.
4. Features entram em `develop` via **Pull Request** revisado.
5. `develop` → `main` apenas via PR aprovado pelo Bruno.

## Frentes de trabalho ativas (2026-04-27)

### 🔵 feature/os-rt-modularization — Bruno (segurança/modularização)
- **Base:** Sprint 1–5 concluídas (segurança da Edge, fetch interceptor, build system)
- **Próximo:** Sprint 6 (migração de paths legacy) + deploy da Edge v3.1
- **NÃO MISTURAR** com alterações do monólito ou ClickSign

### 🟢 feature/clicksign-daniel — Daniel (monólito/ClickSign)
- **Base:** `develop` = `main` = `b67829e` (monólito com ClickSign funcionando)
- **Ambiente de trabalho oficial:** `feature/clicksign-daniel`
- **IMPORTANTE para o Claude do Daniel:** Executar imediatamente ao iniciar a sessão:
  ```bash
  git checkout feature/clicksign-daniel
  git pull origin feature/clicksign-daniel
  ```
- Commits devem ficar nesta branch. Não misturar com `feature/os-rt-modularization`.

## Fluxo de merge futuro

Quando ambas as frentes estiverem validadas:
1. `feature/clicksign-daniel` → PR → `develop`
2. `feature/os-rt-modularization` → PR → `develop` (após resolver conflito da Edge Function)
3. Revisão conjunta em `develop` (staging)
4. `develop` → PR → `main` (deploy produção)

## Conflito conhecido: Edge Function

- `feature/os-rt-modularization` tem Edge v3.1 (JWT, Vault, CORS allow-list)
- `feature/clicksign-daniel` tem Edge v2.1 (CORS `*`, sem JWT) + rotas ClickSign
- Resolução planejada: portar rotas ClickSign para v3.1 no merge final (ver ADR-009 no ROADMAP)

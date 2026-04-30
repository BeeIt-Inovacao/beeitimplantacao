#!/usr/bin/env bash
# ============================================================================
# supabase-doctor.sh — Diagnóstico e recuperação Supabase · BeeIT OS-RT v2
# ----------------------------------------------------------------------------
# Uso: ./scripts/supabase-doctor.sh [comando]
#
# Comandos:
#   (sem args)    Diagnóstico completo + sugestão de fixes
#   fix           Diagnóstico + aplica todos os fixes automáticos
#   status        Resumo rápido de cada camada
#   restart       Reinicia Supabase local + Edge Function
#   deploy        Deploy da Edge Function para produção
#   logs          Logs da Edge Function (produção)
#   logs-local    Logs da Edge Function (local)
#   migrate       Aplica migrações pendentes (produção)
#   reset-local   Para Supabase local, limpa containers, reinicia
#   reset-auth    Remove sessão salva em localStorage (instrução para o browser)
# ============================================================================
set -euo pipefail

# ── Configurações do projeto ──────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$PROJECT_ROOT"

SB_PROJECT_REF="dbaqvoatopfquaqgdptk"
SB_URL="https://${SB_PROJECT_REF}.supabase.co"
SB_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiYXF2b2F0b3BmcXVhcWdkcHRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2OTkyNDMsImV4cCI6MjA5MjI3NTI0M30.83PsZqC9Jbdo9-UW85WaeSiNOybRMyA6Arf80pU3kKI"
EDGE_FN="protheus-proxy"
HEALTH_URL="${SB_URL}/functions/v1/${EDGE_FN}/health"
REST_URL="${SB_URL}/rest/v1/"
AUTH_URL="${SB_URL}/auth/v1/health"

PORT_SB_API=54321
PORT_SB_DB=54322
LOG_DIR="${PROJECT_ROOT}/.logs"
PID_DIR="/tmp/beeit-dev-pids"
PID_EDGE="${PID_DIR}/edge.pid"
EDGE_LOG="${LOG_DIR}/edge.log"

ENV_FILE="${PROJECT_ROOT}/.env.local"

# ── Cores ─────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GRN='\033[0;32m'; YEL='\033[0;33m'
CYN='\033[0;36m'; BLU='\033[0;34m'; MAG='\033[0;35m'
BLD='\033[1m'; DIM='\033[2m'; RST='\033[0m'

# ── Utilitários ───────────────────────────────────────────────────────────────
ok()    { echo -e "  ${GRN}✓${RST}  $*"; }
fail()  { echo -e "  ${RED}✗${RST}  $*"; }
warn()  { echo -e "  ${YEL}⚠${RST}  $*"; }
info()  { echo -e "  ${CYN}→${RST}  $*"; }
step()  { echo -e "\n${BLD}${CYN}$*${RST}"; }
title() {
  echo ""
  echo -e "${BLD}${CYN}╔═══════════════════════════════════════════════════════╗${RST}"
  printf  "${BLD}${CYN}║  %-53s║${RST}\n" "$1"
  echo -e "${BLD}${CYN}╚═══════════════════════════════════════════════════════╝${RST}"
  echo ""
}

port_in_use() { lsof -ti tcp:"$1" &>/dev/null; }
pid_alive()   { local f="$1"; [[ -f "$f" ]] && kill -0 "$(cat "$f")" 2>/dev/null; }
has_cmd()     { command -v "$1" &>/dev/null; }

# Faz HTTP e retorna código+corpo separados por "|"
http_check() {
  local url="$1"; shift
  curl -s -o /tmp/sb_doctor_body -w "%{http_code}" \
    --max-time 10 --connect-timeout 5 \
    "$@" "$url" 2>/dev/null || echo "000"
}

body() { cat /tmp/sb_doctor_body 2>/dev/null || echo ""; }

# ── Resultados do diagnóstico (flags para fix) ────────────────────────────────
ISSUES=()
add_issue() { ISSUES+=("$1"); }
has_issue()  { local s; for s in "${ISSUES[@]:-}"; do [[ "$s" == "$1" ]] && return 0; done; return 1; }

# ═════════════════════════════════════════════════════════════════════════════
# DIAGNÓSTICOS
# ═════════════════════════════════════════════════════════════════════════════

diag_network() {
  step "1/6 · Rede — DNS + HTTPS para Supabase"
  local code
  code=$(http_check "https://${SB_PROJECT_REF}.supabase.co" -I)
  if [[ "$code" == "000" ]]; then
    fail "Sem conexão com ${SB_PROJECT_REF}.supabase.co  (timeout/DNS)"
    add_issue "NO_NETWORK"
    warn "Verifique: VPN ativa? Proxy? Internet offline?"
    return
  fi
  ok "Supabase acessível (HTTP ${code})"
}

diag_auth_endpoint() {
  step "2/6 · Auth API"
  local code
  code=$(http_check "$AUTH_URL" -H "apikey: ${SB_ANON_KEY}")
  local b; b=$(body)
  case "$code" in
    200) ok "Auth API saudável  ✓" ;;
    503) fail "Auth API indisponível (503)"; add_issue "AUTH_DOWN"; warn "$(echo "$b" | head -c 200)" ;;
    000) fail "Auth API timeout/sem resposta"; add_issue "AUTH_DOWN" ;;
    *)   warn "Auth API retornou HTTP ${code}"; warn "$(echo "$b" | head -c 200)" ;;
  esac
}

diag_rest_api() {
  step "3/6 · REST API (PostgREST)"
  local code
  code=$(http_check "$REST_URL" -H "apikey: ${SB_ANON_KEY}")
  local b; b=$(body)
  case "$code" in
    200) ok "REST API saudável  ✓" ;;
    # 401 com anon key = PostgREST ativo, RLS bloqueando — comportamento correto
    401) ok "REST API ativa (401 esperado — RLS ativa em produção)  ✓" ;;
    503) fail "REST API offline (503)"; add_issue "REST_DOWN" ;;
    000) fail "REST API timeout"; add_issue "REST_DOWN" ;;
    *)   warn "REST API retornou HTTP ${code}: $(echo "$b" | head -c 150)" ;;
  esac
}

diag_edge_function() {
  step "4/6 · Edge Function ${EDGE_FN} /health"
  local code
  code=$(http_check "$HEALTH_URL")
  local b; b=$(body)
  case "$code" in
    200)
      ok "Edge Function ativa  ✓"
      local version; version=$(echo "$b" | grep -o '"version":"[^"]*"' | cut -d'"' -f4 || echo "?")
      [[ -n "$version" ]] && info "Versão: ${version}"
      ;;
    401|403)
      # /health é público — se está pedindo auth, algo está errado na rota
      fail "Edge Function retornou ${code} no /health — rota pode estar bloqueada"
      add_issue "EDGE_AUTH_ERROR"
      ;;
    500|502|503|504)
      fail "Edge Function com erro ${code}"
      add_issue "EDGE_DOWN"
      warn "$(echo "$b" | head -c 300)"
      ;;
    000)
      fail "Edge Function timeout — pode estar cold-start ou crashada"
      add_issue "EDGE_COLD"
      ;;
    *)
      warn "Edge Function retornou HTTP ${code}"
      warn "$(echo "$b" | head -c 200)"
      ;;
  esac
}

diag_edge_cors() {
  step "5/6 · CORS da Edge Function (simula browser)"
  local code
  code=$(http_check "${HEALTH_URL}" \
    -H "Origin: https://implantacao.com.br" \
    -H "Access-Control-Request-Method: POST" \
    -X OPTIONS)
  local b; b=$(body)
  local allow_origin
  allow_origin=$(curl -s -I --max-time 8 \
    -H "Origin: https://implantacao.com.br" \
    -X OPTIONS "$HEALTH_URL" 2>/dev/null \
    | grep -i "access-control-allow-origin" | head -1 || echo "")

  if echo "$allow_origin" | grep -qi "implantacao.com.br\|\*"; then
    ok "CORS OK — Origin implantacao.com.br aceita  ✓"
  elif [[ "$code" == "000" ]]; then
    warn "CORS: não foi possível testar (timeout)"
  else
    fail "CORS pode estar bloqueando — 'Access-Control-Allow-Origin' ausente ou incorreto"
    add_issue "CORS_BLOCKED"
    info "Cabeçalho recebido: '${allow_origin:-nenhum}'"
    info "Verifique ORIGIN_EXACT em supabase/functions/${EDGE_FN}/index.ts"
  fi
}

diag_local_supabase() {
  step "6/6 · Supabase local (dev)"
  if port_in_use "$PORT_SB_API"; then
    ok "Supabase local ATIVO — API :${PORT_SB_API}  DB :${PORT_SB_DB}"
    if pid_alive "$PID_EDGE"; then
      ok "Edge Function local ATIVA (PID $(cat "$PID_EDGE"))"
    else
      warn "Edge Function local PARADA"
      add_issue "LOCAL_EDGE_DOWN"
    fi
  else
    info "Supabase local não está rodando (normal — ambiente de produção)"
  fi
}

# ── Diagnóstico completo ──────────────────────────────────────────────────────
run_diagnostics() {
  diag_network
  if ! has_issue "NO_NETWORK"; then
    diag_auth_endpoint
    diag_rest_api
    diag_edge_function
    diag_edge_cors
  fi
  diag_local_supabase
}

# ═════════════════════════════════════════════════════════════════════════════
# RELATÓRIO + FIXES
# ═════════════════════════════════════════════════════════════════════════════

report_and_fix() {
  local auto_fix="${1:-false}"

  echo ""
  echo -e "${BLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RST}"
  echo -e "${BLD} Diagnóstico concluído${RST}"
  echo -e "${BLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RST}"

  if [[ ${#ISSUES[@]} -eq 0 ]]; then
    echo ""
    ok "Tudo OK — nenhum problema detectado."
    echo ""
    echo -e "  ${DIM}Se o browser ainda exibir 'Failed to fetch', o problema"
    echo -e "  provavelmente é um JWT expirado na sessão ativa. Execute:${RST}"
    echo ""
    echo -e "  ${BLD}$0 reset-auth${RST}  — mostra o comando para limpar a sessão"
    echo ""
    return 0
  fi

  echo ""
  echo -e "  ${RED}${BLD}Problemas encontrados:${RST}"
  for issue in "${ISSUES[@]}"; do
    echo -e "    ${RED}•${RST} ${issue}"
  done
  echo ""

  # ── NO_NETWORK ─────────────────────────────────────────────────────────
  if has_issue "NO_NETWORK"; then
    echo -e "${BLD}${YEL}FIX: Sem rede para Supabase${RST}"
    echo "  1. Verifique sua conexão com a internet."
    echo "  2. Se estiver em VPN, tente desativar e reconectar."
    echo "  3. Teste manualmente: curl -I https://${SB_PROJECT_REF}.supabase.co"
    echo "  4. Se precisar trabalhar offline, inicie o Supabase local:"
    echo "     ${BLD}./dev.sh start${RST}"
    echo ""
  fi

  # ── AUTH_DOWN ──────────────────────────────────────────────────────────
  if has_issue "AUTH_DOWN"; then
    echo -e "${BLD}${YEL}FIX: Auth API indisponível${RST}"
    echo "  → Pode ser outage temporário do Supabase."
    echo "  → Verifique: https://status.supabase.com"
    echo "  → Aguarde alguns minutos e rode novamente: $0 status"
    echo ""
  fi

  # ── REST_DOWN ─────────────────────────────────────────────────────────
  if has_issue "REST_DOWN"; then
    echo -e "${BLD}${YEL}FIX: REST API (PostgREST) offline${RST}"
    echo "  → Pode ser uma migration quebrada ou outage."
    echo "  → Verifique no Supabase Dashboard:"
    echo "    https://supabase.com/dashboard/project/${SB_PROJECT_REF}/logs/postgres-logs"
    echo "  → Se for migration com erro, inspecione com:"
    echo "    ${BLD}supabase db diff --linked${RST}"
    echo ""
  fi

  # ── JWT_EXPIRED ────────────────────────────────────────────────────────
  if has_issue "JWT_EXPIRED"; then
    echo -e "${BLD}${YEL}FIX: JWT expirado no browser${RST}"
    echo "  → Execute no console do browser (F12):"
    echo ""
    echo -e "  ${DIM}localStorage.removeItem('beeit_session');"
    echo "  localStorage.removeItem('supabase.auth.token');"
    echo "  sessionStorage.clear();"
    echo -e "  location.reload();${RST}"
    echo ""
    echo "  → Ou use: ${BLD}$0 reset-auth${RST}"
    echo ""
  fi

  # ── EDGE_DOWN / EDGE_COLD ─────────────────────────────────────────────
  if has_issue "EDGE_DOWN" || has_issue "EDGE_COLD"; then
    echo -e "${BLD}${YEL}FIX: Edge Function ${EDGE_FN} offline/crashada${RST}"
    if [[ "$auto_fix" == "true" ]]; then
      info "Forçando warm-up da Edge Function (curl duplo)..."
      curl -s "${HEALTH_URL}" --max-time 30 -o /dev/null || true
      sleep 3
      local code
      code=$(http_check "$HEALTH_URL")
      if [[ "$code" == "200" ]]; then
        ok "Edge Function respondeu após warm-up!"
      else
        warn "Edge Function ainda não responde (${code}). Fazendo re-deploy..."
        do_deploy_edge
      fi
    else
      echo "  Opções de fix:"
      echo "  a) Warm-up manual (cold-start):"
      echo "     ${BLD}curl ${HEALTH_URL}${RST}"
      echo "  b) Re-deploy da Edge Function:"
      echo "     ${BLD}$0 deploy${RST}"
      echo "  c) Ver logs de erro em produção:"
      echo "     ${BLD}$0 logs${RST}"
    fi
    echo ""
  fi

  # ── EDGE_AUTH_ERROR ────────────────────────────────────────────────────
  if has_issue "EDGE_AUTH_ERROR"; then
    echo -e "${BLD}${YEL}FIX: Edge Function bloqueando /health (deve ser público)${RST}"
    echo "  → A rota /health está retornando auth error."
    echo "  → Verifique se o deploy está com a versão correta (v3.1)."
    echo "  → Re-deploy: ${BLD}$0 deploy${RST}"
    echo ""
  fi

  # ── CORS_BLOCKED ──────────────────────────────────────────────────────
  if has_issue "CORS_BLOCKED"; then
    echo -e "${BLD}${YEL}FIX: CORS bloqueando requisições do browser${RST}"
    echo "  → Verifique em supabase/functions/${EDGE_FN}/index.ts:"
    echo "    ORIGIN_EXACT deve conter 'https://implantacao.com.br'"
    echo "  → Após corrigir, re-deploy: ${BLD}$0 deploy${RST}"
    echo ""
  fi

  # ── LOCAL_EDGE_DOWN ────────────────────────────────────────────────────
  if has_issue "LOCAL_EDGE_DOWN"; then
    echo -e "${BLD}${YEL}FIX: Edge Function local parada${RST}"
    if [[ "$auto_fix" == "true" ]]; then
      info "Iniciando Edge Function local..."
      start_local_edge
    else
      echo "  → Inicie: ${BLD}./dev.sh start${RST}  ou  ${BLD}./dev.sh restart${RST}"
    fi
    echo ""
  fi

}

# ═════════════════════════════════════════════════════════════════════════════
# COMANDOS
# ═════════════════════════════════════════════════════════════════════════════

# ── status ────────────────────────────────────────────────────────────────────
cmd_status() {
  title "BeeIT Supabase · Status Rápido"

  local code

  # Produção
  echo -e "${BLD}Produção (${SB_URL})${RST}"
  code=$(http_check "$HEALTH_URL")
  if   [[ "$code" == "200" ]]; then ok "Edge Function  ${GRN}ATIVA${RST}  (HTTP 200)"
  elif [[ "$code" == "000" ]]; then fail "Edge Function  ${RED}TIMEOUT${RST}"
  else                               warn "Edge Function  ${YEL}HTTP ${code}${RST}"
  fi

  code=$(http_check "$AUTH_URL" -H "apikey: ${SB_ANON_KEY}")
  if   [[ "$code" == "200" ]]; then ok "Auth API       ${GRN}OK${RST}"
  elif [[ "$code" == "000" ]]; then fail "Auth API       ${RED}TIMEOUT${RST}"
  else                               warn "Auth API       ${YEL}HTTP ${code}${RST}"
  fi

  code=$(http_check "$REST_URL" -H "apikey: ${SB_ANON_KEY}" -H "Authorization: Bearer ${SB_ANON_KEY}")
  if   [[ "$code" == "200" ]]; then ok "REST API       ${GRN}OK${RST}"
  elif [[ "$code" == "000" ]]; then fail "REST API       ${RED}TIMEOUT${RST}"
  else                               warn "REST API       ${YEL}HTTP ${code}${RST}"
  fi

  # Local
  echo ""
  echo -e "${BLD}Local (dev)${RST}"
  if port_in_use "$PORT_SB_API"; then
    ok "Supabase local ${GRN}ATIVO${RST}  (:${PORT_SB_API})"
  else
    info "Supabase local ${DIM}PARADO${RST}"
  fi
  if pid_alive "$PID_EDGE"; then
    ok "Edge local     ${GRN}ATIVA${RST}  (PID $(cat "$PID_EDGE"))"
  else
    info "Edge local     ${DIM}PARADA${RST}"
  fi
  echo ""
}

# ── deploy edge ───────────────────────────────────────────────────────────────
do_deploy_edge() {
  if ! has_cmd supabase; then
    fail "'supabase' CLI não encontrado.  brew install supabase/tap/supabase"
    return 1
  fi
  info "Deploy de ${EDGE_FN} → produção..."
  supabase functions deploy "$EDGE_FN" --project-ref "$SB_PROJECT_REF"
  echo ""
  info "Aguardando cold-start (5s)..."
  sleep 5
  local code
  code=$(http_check "$HEALTH_URL")
  if [[ "$code" == "200" ]]; then
    ok "Deploy OK — Edge Function ativa  ✓"
  else
    warn "Deploy enviado, mas /health retornou HTTP ${code}. Aguarde 30s e rode '$0 status'."
  fi
}

cmd_deploy() {
  title "Deploy Edge Function → Produção"
  do_deploy_edge
}

# ── logs produção ─────────────────────────────────────────────────────────────
cmd_logs() {
  if ! has_cmd supabase; then
    fail "'supabase' CLI não encontrado.  brew install supabase/tap/supabase"
    exit 1
  fi
  echo -e "${BLD}${CYN}Logs da Edge Function em produção (Ctrl+C para sair)${RST}"
  echo ""
  supabase functions logs "$EDGE_FN" --project-ref "$SB_PROJECT_REF" --scroll
}

# ── logs local ────────────────────────────────────────────────────────────────
cmd_logs_local() {
  if [[ ! -f "$EDGE_LOG" ]]; then
    warn "Log local não encontrado: ${EDGE_LOG}"
    info "Inicie o ambiente local primeiro: ./dev.sh start"
    exit 1
  fi
  echo -e "${BLD}${CYN}Logs locais da Edge Function (Ctrl+C para sair)${RST}"
  tail -f "$EDGE_LOG"
}

# ── restart local ─────────────────────────────────────────────────────────────
cmd_restart() {
  title "Restart Supabase Local + Edge Function"
  if ! has_cmd supabase; then
    fail "'supabase' CLI não encontrado.  brew install supabase/tap/supabase"
    exit 1
  fi

  step "Parando serviços locais..."
  if port_in_use "$PORT_SB_API"; then
    info "supabase stop..."
    supabase stop --workdir "$PROJECT_ROOT" || true
    ok "Supabase local parado"
  else
    info "Supabase local já estava parado"
  fi

  if pid_alive "$PID_EDGE"; then
    kill "$(cat "$PID_EDGE")" 2>/dev/null || true
    rm -f "$PID_EDGE"
    ok "Edge Function local parada"
  fi

  sleep 2

  step "Iniciando Supabase local..."
  supabase start --workdir "$PROJECT_ROOT"
  ok "Supabase local iniciado"

  start_local_edge
}

# ── start edge local ─────────────────────────────────────────────────────────
start_local_edge() {
  mkdir -p "$PID_DIR" "$LOG_DIR"
  if pid_alive "$PID_EDGE"; then
    ok "Edge Function local já está rodando (PID $(cat "$PID_EDGE"))"
    return
  fi
  local env_flag=""
  [[ -f "$ENV_FILE" ]] && env_flag="--env-file ${ENV_FILE}"
  info "Iniciando Edge Function local..."
  # shellcheck disable=SC2086
  nohup supabase functions serve "$EDGE_FN" \
    $env_flag \
    --workdir "$PROJECT_ROOT" \
    >> "$EDGE_LOG" 2>&1 &
  echo $! > "$PID_EDGE"
  sleep 3
  if pid_alive "$PID_EDGE"; then
    ok "Edge Function local ativa (PID $(cat "$PID_EDGE"))"
    info "Log: ${EDGE_LOG}"
  else
    warn "Edge Function pode ter falhado. Veja: tail -f ${EDGE_LOG}"
  fi
}

# ── reset-auth ────────────────────────────────────────────────────────────────
cmd_reset_auth() {
  title "Reset de Sessão — 'Failed to fetch' por JWT expirado"

  echo -e "${BLD}Opção A — Pelo browser (F12 → Console):${RST}"
  echo ""
  echo -e "${DIM}  // Cola no console e pressiona Enter${RST}"
  cat << 'JSEOF'
  localStorage.removeItem('beeit_session');
  localStorage.removeItem('supabase.auth.token');
  Object.keys(localStorage)
    .filter(k => k.startsWith('sb-') || k.includes('supabase'))
    .forEach(k => { console.log('removendo', k); localStorage.removeItem(k); });
  sessionStorage.clear();
  console.log('✓ Sessão limpa — recarregando...');
  setTimeout(() => location.reload(), 800);
JSEOF
  echo ""
  echo -e "${BLD}Opção B — Via curl (requer credenciais no .env.local):${RST}"
  echo ""
  if [[ -f "$ENV_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$ENV_FILE" 2>/dev/null || true
    local email="${BEEIT_ADMIN_EMAIL:-admin@beeit.com.br}"
    echo -e "  ${DIM}# Obtém novo access_token${RST}"
    echo "  curl -s -X POST '${SB_URL}/auth/v1/token?grant_type=password' \\"
    echo "    -H 'apikey: ${SB_ANON_KEY}' \\"
    echo "    -H 'Content-Type: application/json' \\"
    echo "    -d '{\"email\":\"${email}\",\"password\":\"SUA_SENHA\"}' | jq .access_token"
  else
    echo "  (crie .env.local com BEEIT_ADMIN_EMAIL e BEEIT_ADMIN_PASS para auto-preenchimento)"
  fi
  echo ""
}

# ── migrate ───────────────────────────────────────────────────────────────────
cmd_migrate() {
  title "Migrações Supabase → Produção"
  if ! has_cmd supabase; then
    fail "'supabase' CLI não encontrado.  brew install supabase/tap/supabase"
    exit 1
  fi

  step "Verificando diff de migrações..."
  supabase db diff --linked || true

  echo ""
  read -r -p "  Aplicar migrações em produção? [s/N] " confirm
  if [[ "${confirm,,}" == "s" ]]; then
    info "supabase db push..."
    supabase db push --project-ref "$SB_PROJECT_REF"
    ok "Migrações aplicadas"
  else
    info "Cancelado."
  fi
}

# ── reset-local ───────────────────────────────────────────────────────────────
cmd_reset_local() {
  title "Reset Completo — Supabase Local"
  if ! has_cmd supabase; then
    fail "'supabase' CLI não encontrado.  brew install supabase/tap/supabase"
    exit 1
  fi

  warn "Isso vai PARAR e reiniciar o Supabase local, apagando dados locais."
  read -r -p "  Continuar? [s/N] " confirm
  [[ "${confirm,,}" != "s" ]] && { info "Cancelado."; exit 0; }

  step "Parando e limpando containers Supabase..."
  supabase stop --no-backup --workdir "$PROJECT_ROOT" || true
  sleep 2

  step "Reiniciando Supabase local (supabase start)..."
  supabase start --workdir "$PROJECT_ROOT"
  ok "Supabase local reiniciado com schema limpo"

  step "Aplicando migrações locais..."
  supabase db push --local || supabase migration up --local || true

  start_local_edge
  echo ""
  ok "Ambiente local resetado e pronto."
  echo ""
  echo -e "  ${BLD}Studio:${RST} http://127.0.0.1:54323"
  echo -e "  ${BLD}API:${RST}    http://127.0.0.1:${PORT_SB_API}"
  echo -e "  ${BLD}DB:${RST}     postgresql://postgres:postgres@127.0.0.1:${PORT_SB_DB}/postgres"
  echo ""
}

# ── doctor (diagnóstico completo) ─────────────────────────────────────────────
cmd_doctor() {
  local auto_fix="${1:-false}"
  local mode_label="Diagnóstico completo"
  [[ "$auto_fix" == "true" ]] && mode_label="Diagnóstico + Fix automático"
  title "BeeIT Supabase Doctor · ${mode_label}"
  run_diagnostics
  report_and_fix "$auto_fix"
}

# ── help ──────────────────────────────────────────────────────────────────────
cmd_help() {
  echo ""
  echo -e "${BLD}Uso:${RST} ./scripts/supabase-doctor.sh [comando]"
  echo ""
  echo -e "${BLD}Comandos:${RST}"
  printf "  %-18s %s\n" "(sem args)"    "Diagnóstico completo + sugestão de fixes"
  printf "  %-18s %s\n" "fix"           "Diagnóstico + aplica fixes automáticos"
  printf "  %-18s %s\n" "status"        "Resumo rápido de cada camada"
  printf "  %-18s %s\n" "restart"       "Reinicia Supabase local + Edge Function"
  printf "  %-18s %s\n" "deploy"        "Deploy da Edge Function para produção"
  printf "  %-18s %s\n" "logs"          "Logs em tempo real (produção)"
  printf "  %-18s %s\n" "logs-local"    "Logs locais da Edge Function"
  printf "  %-18s %s\n" "migrate"       "Aplica migrações pendentes (produção)"
  printf "  %-18s %s\n" "reset-local"   "Para, limpa e reinicia Supabase local"
  printf "  %-18s %s\n" "reset-auth"    "Mostra como limpar sessão JWT do browser"
  echo ""
  echo -e "${DIM}Exemplo de uso rápido após 'Failed to fetch':${RST}"
  echo "  ./scripts/supabase-doctor.sh"
  echo "  ./scripts/supabase-doctor.sh fix"
  echo ""
}

# ═════════════════════════════════════════════════════════════════════════════
# ENTRADA
# ═════════════════════════════════════════════════════════════════════════════
CMD="${1:-doctor}"

case "$CMD" in
  ""|doctor)    cmd_doctor "false"  ;;
  fix)          cmd_doctor "true"   ;;
  status)       cmd_status          ;;
  restart)      cmd_restart         ;;
  deploy)       cmd_deploy          ;;
  logs)         cmd_logs            ;;
  logs-local)   cmd_logs_local      ;;
  migrate)      cmd_migrate         ;;
  reset-local)  cmd_reset_local     ;;
  reset-auth)   cmd_reset_auth      ;;
  help|--help|-h) cmd_help          ;;
  *)
    echo -e "  ${RED}✗${RST}  Comando desconhecido: '${CMD}'"
    echo "  Uso: ./scripts/supabase-doctor.sh [doctor|fix|status|restart|deploy|logs|migrate|reset-local|reset-auth]"
    exit 1
    ;;
esac

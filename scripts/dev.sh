#!/usr/bin/env bash
# dev.sh — Gerenciador de serviços locais BeeIT OS-RT v2
# Uso: ./dev.sh <start|stop|status|restart|logs>
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Configurações ──────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

PID_DIR="/tmp/beeit-dev-pids"
LOG_DIR="${PROJECT_ROOT}/.logs"

PID_EDGE="${PID_DIR}/edge.pid"
PID_DEV="${PID_DIR}/dev.pid"
LOG_EDGE="${LOG_DIR}/edge.log"
LOG_DEV="${LOG_DIR}/dev.log"

PORT_SB_API=54321
PORT_SB_DB=54322
PORT_DEV=5000

EDGE_FUNCTION="protheus-proxy"
SB_PROJECT_REF="dbaqvoatopfquaqgdptk"

# ── Cores ──────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GRN='\033[0;32m'; YEL='\033[0;33m'
CYN='\033[0;36m'; BLD='\033[1m';    RST='\033[0m'
DIM='\033[2m'

# ── Helpers ────────────────────────────────────────────────────────────────────
header() {
  echo ""
  echo -e "${BLD}${CYN}┌─────────────────────────────────────────────────────┐${RST}"
  echo -e "${BLD}${CYN}│  BeeIT OS-RT v2 — Dev Services                     │${RST}"
  echo -e "${BLD}${CYN}└─────────────────────────────────────────────────────┘${RST}"
  echo ""
}

ok()   { echo -e "  ${GRN}✓${RST}  $*"; }
fail() { echo -e "  ${RED}✗${RST}  $*"; }
info() { echo -e "  ${CYN}→${RST}  $*"; }
warn() { echo -e "  ${YEL}⚠${RST}  $*"; }
step() { echo -e "\n${BLD}$*${RST}"; }

port_in_use() { lsof -ti tcp:"$1" &>/dev/null; }

pid_alive() {
  local f="$1"
  [[ -f "$f" ]] && kill -0 "$(cat "$f")" 2>/dev/null
}

require_cmd() {
  if ! command -v "$1" &>/dev/null; then
    fail "Comando '${1}' não encontrado. Instale com: ${2:-}"
    exit 1
  fi
}

# ── Status de cada serviço ─────────────────────────────────────────────────────
status_supabase() {
  if port_in_use "$PORT_SB_API"; then
    echo -e "  ${GRN}●${RST} ${BLD}Supabase${RST}       ${GRN}ATIVO${RST}   ${DIM}API :${PORT_SB_API}  DB :${PORT_SB_DB}${RST}"
    return 0
  else
    echo -e "  ${RED}○${RST} ${BLD}Supabase${RST}       ${RED}PARADO${RST}"
    return 1
  fi
}

status_edge() {
  if pid_alive "$PID_EDGE"; then
    local pid
    pid=$(cat "$PID_EDGE")
    echo -e "  ${GRN}●${RST} ${BLD}Edge Function${RST}  ${GRN}ATIVO${RST}   ${DIM}PID ${pid}  (via Supabase :${PORT_SB_API})${RST}"
    return 0
  else
    echo -e "  ${RED}○${RST} ${BLD}Edge Function${RST}  ${RED}PARADO${RST}"
    return 1
  fi
}

status_dev() {
  if port_in_use "$PORT_DEV"; then
    local pid=""
    pid_alive "$PID_DEV" && pid="PID $(cat "$PID_DEV")  "
    echo -e "  ${GRN}●${RST} ${BLD}Dev Server${RST}     ${GRN}ATIVO${RST}   ${DIM}${pid}http://127.0.0.1:${PORT_DEV}${RST}"
    return 0
  else
    echo -e "  ${RED}○${RST} ${BLD}Dev Server${RST}     ${RED}PARADO${RST}"
    return 1
  fi
}

# ── Comandos ───────────────────────────────────────────────────────────────────
cmd_status() {
  header
  echo -e "${BLD}Serviços:${RST}"
  status_supabase || true
  status_edge     || true
  status_dev      || true
  echo ""
  echo -e "${DIM}Logs: ${LOG_DIR}/${RST}"
  echo ""
}

cmd_start() {
  header
  require_cmd supabase "brew install supabase/tap/supabase"
  require_cmd node     "https://nodejs.org"

  mkdir -p "$PID_DIR" "$LOG_DIR"

  # ── 1. Supabase ──────────────────────────────────────────────────────────
  step "1/3 Supabase local"
  if port_in_use "$PORT_SB_API"; then
    ok "Supabase já está rodando na porta ${PORT_SB_API}"
  else
    info "Iniciando supabase start..."
    if supabase start --workdir "$PROJECT_ROOT" 2>&1 | tee -a "${LOG_DIR}/supabase-start.log"; then
      ok "Supabase iniciado"
    else
      fail "Falha ao iniciar Supabase. Verifique se OrbStack/Docker está ativo."
      exit 1
    fi
  fi

  # ── 2. Edge Function ─────────────────────────────────────────────────────
  step "2/3 Edge Function — ${EDGE_FUNCTION}"
  if pid_alive "$PID_EDGE"; then
    ok "Edge Function já está rodando (PID $(cat "$PID_EDGE"))"
  else
    info "Iniciando supabase functions serve ${EDGE_FUNCTION}..."
    nohup supabase functions serve "$EDGE_FUNCTION" \
      --env-file "${PROJECT_ROOT}/.env.local" \
      --workdir "$PROJECT_ROOT" \
      >> "$LOG_EDGE" 2>&1 &
    echo $! > "$PID_EDGE"
    sleep 2
    if pid_alive "$PID_EDGE"; then
      ok "Edge Function rodando (PID $(cat "$PID_EDGE"))"
      info "Log: ${LOG_EDGE}"
    else
      warn "Edge Function pode ter falhado. Verifique: tail -f ${LOG_EDGE}"
    fi
  fi

  # ── 3. Dev Server ────────────────────────────────────────────────────────
  step "3/3 Dev Server (porta ${PORT_DEV})"
  if port_in_use "$PORT_DEV"; then
    ok "Dev Server já está rodando na porta ${PORT_DEV}"
  else
    info "Iniciando node scripts/dev-server.js..."
    nohup node "${PROJECT_ROOT}/scripts/dev-server.js" \
      >> "$LOG_DEV" 2>&1 &
    echo $! > "$PID_DEV"
    sleep 1
    if port_in_use "$PORT_DEV"; then
      ok "Dev Server rodando (PID $(cat "$PID_DEV"))"
      info "Log: ${LOG_DEV}"
    else
      warn "Dev Server pode ter falhado. Verifique: tail -f ${LOG_DEV}"
    fi
  fi

  echo ""
  echo -e "${BLD}${GRN}✓ Ambiente local pronto!${RST}"
  echo ""
  echo -e "  ${BLD}App:${RST}          http://127.0.0.1:${PORT_DEV}"
  echo -e "  ${BLD}Supabase API:${RST} http://127.0.0.1:${PORT_SB_API}"
  echo -e "  ${BLD}Supabase DB:${RST}  postgresql://postgres:postgres@127.0.0.1:${PORT_SB_DB}/postgres"
  echo -e "  ${BLD}Studio:${RST}       http://127.0.0.1:54323"
  echo ""
  echo -e "${DIM}Para encerrar: ./dev.sh stop${RST}"
  echo ""
}

cmd_stop() {
  header
  step "Encerrando serviços..."

  # ── Dev Server ───────────────────────────────────────────────────────────
  if pid_alive "$PID_DEV"; then
    local dev_pid; dev_pid=$(cat "$PID_DEV")
    kill "$dev_pid" 2>/dev/null; sleep 1
    if kill -0 "$dev_pid" 2>/dev/null; then
      kill -9 "$dev_pid" 2>/dev/null && ok "Dev Server encerrado (SIGKILL)" || warn "Dev Server: falha ao encerrar"
    else
      ok "Dev Server encerrado"
    fi
    rm -f "$PID_DEV"
  elif port_in_use "$PORT_DEV"; then
    local stale; stale=$(lsof -ti tcp:"$PORT_DEV" 2>/dev/null || true)
    if [[ -n "$stale" ]]; then
      kill "$stale" 2>/dev/null; sleep 1
      kill -9 "$stale" 2>/dev/null || true
      ok "Dev Server encerrado (por porta, SIGKILL)"
    fi
  else
    info "Dev Server já estava parado"
  fi

  # ── Edge Function ────────────────────────────────────────────────────────
  if pid_alive "$PID_EDGE"; then
    local edge_pid; edge_pid=$(cat "$PID_EDGE")
    kill "$edge_pid" 2>/dev/null; sleep 1
    if kill -0 "$edge_pid" 2>/dev/null; then
      kill -9 "$edge_pid" 2>/dev/null && ok "Edge Function encerrada (SIGKILL)" || warn "Edge Function: falha ao encerrar"
    else
      ok "Edge Function encerrada"
    fi
    rm -f "$PID_EDGE"
  else
    info "Edge Function já estava parada"
  fi

  # ── Supabase ─────────────────────────────────────────────────────────────
  if port_in_use "$PORT_SB_API"; then
    info "Parando supabase stop..."
    if supabase stop --workdir "$PROJECT_ROOT" 2>&1 | tee -a "${LOG_DIR}/supabase-stop.log"; then
      ok "Supabase parado"
    else
      warn "supabase stop retornou erro — verifique manualmente"
    fi
  else
    info "Supabase já estava parado"
  fi

  echo ""
  echo -e "${BLD}${YEL}Todos os serviços encerrados.${RST}"
  echo ""
}

cmd_restart() {
  cmd_stop
  sleep 2
  cmd_start
}

cmd_logs() {
  local svc="${2:-}"
  case "$svc" in
    edge)  tail -f "$LOG_EDGE" ;;
    dev)   tail -f "$LOG_DEV"  ;;
    sb|supabase)
      require_cmd supabase
      supabase functions logs "$EDGE_FUNCTION" --project-ref "$SB_PROJECT_REF" ;;
    *)
      echo ""
      echo -e "${BLD}Logs disponíveis:${RST}"
      echo "  ./dev.sh logs edge       — Edge Function (local)"
      echo "  ./dev.sh logs dev        — Dev Server (local)"
      echo "  ./dev.sh logs supabase   — Edge Function (produção, via CLI)"
      echo ""
      ;;
  esac
}

# ── Entrada ────────────────────────────────────────────────────────────────────
CMD="${1:-help}"

case "$CMD" in
  start)   cmd_start   ;;
  stop)    cmd_stop    ;;
  restart) cmd_restart ;;
  status)  cmd_status  ;;
  logs)    cmd_logs "$@" ;;
  help|--help|-h)
    echo ""
    echo -e "${BLD}Uso:${RST} ./dev.sh <comando>"
    echo ""
    echo -e "${BLD}Comandos:${RST}"
    echo "  start    Sobe Supabase, Edge Function e Dev Server"
    echo "  stop     Encerra todos os serviços"
    echo "  restart  Para e reinicia tudo"
    echo "  status   Mostra estado de cada serviço"
    echo "  logs     Exibe logs (edge | dev | supabase)"
    echo ""
    ;;
  *)
    fail "Comando desconhecido: '${CMD}'"
    echo ""
    echo "  Uso: ./dev.sh <start|stop|restart|status|logs>"
    echo ""
    exit 1
    ;;
esac

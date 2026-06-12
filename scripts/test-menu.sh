#!/usr/bin/env bash
# scripts/test-menu.sh
# Interactive test runner (arrow-key menu) so `npm test` is the one command to
# remember. Handles the e2e Docker lifecycle when e2e tests are selected.
# Adapted from budget_eddiefamily/scripts/test-menu.sh.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
E2E_DB_STARTED=0

# Non-interactive shells (CI, pipes) can't drive an arrow-key menu — point them
# at the explicit scripts instead of hanging on a prompt.
if [ ! -t 0 ] || [ -n "${CI:-}" ]; then
  echo "npm test opens an interactive menu and needs a terminal."
  echo "In a non-interactive shell, run a specific script, e.g.:"
  echo "  npm run test:unit       # vitest (unit + integration), once"
  echo "  npm run test:coverage   # vitest with coverage"
  echo "  npm run test:e2e        # Playwright e2e"
  exit 1
fi

stop_e2e_db() {
  echo ""
  echo "🧹 Stopping e2e database..."
  docker compose --env-file "$REPO_ROOT/e2e/.env" \
    -f "$REPO_ROOT/docker-compose.e2e.yml" down
  E2E_DB_STARTED=0
}

run_unit() {
  echo ""
  echo "==================================="
  echo "🧪 Unit & integration tests"
  echo "==================================="
  npx vitest run
}

run_unit_watch() {
  echo ""
  echo "==================================="
  echo "👀 Unit & integration tests (watch)"
  echo "==================================="
  npx vitest
}

run_coverage() {
  echo ""
  echo "==================================="
  echo "📊 Tests + coverage"
  echo "==================================="
  npx vitest run --coverage
}

run_e2e() {
  echo ""
  echo "==================================="
  echo "🎭 Playwright e2e tests"
  echo "==================================="
  # Mark the DB as started before invoking the runner: if Playwright fails, the
  # container is still up and the teardown prompt must fire (it won't if we only
  # set this on success).
  E2E_DB_STARTED=1
  "$SCRIPT_DIR/test-e2e.sh"
}

run_e2e_ui() {
  echo ""
  echo "==================================="
  echo "🎭 Playwright e2e tests (UI mode)"
  echo "==================================="
  E2E_DB_STARTED=1
  "$SCRIPT_DIR/test-e2e.sh" --ui
}

run_all() {
  echo ""
  echo "==================================="
  echo "📊 Tests + coverage"
  echo "==================================="
  npx vitest run --coverage

  echo ""
  echo "==================================="
  echo "🎭 Playwright e2e tests"
  echo "==================================="
  E2E_DB_STARTED=1
  "$SCRIPT_DIR/test-e2e.sh"
}

# ── Arrow-key menu ──────────────────────────────────────────────────

MENU_ITEMS=(
  "Unit & integration tests (run once)"
  "Unit & integration tests (watch mode)"
  "Unit & integration tests + coverage"
  "E2e tests (Playwright)"
  "E2e tests (Playwright UI)"
  "All tests (coverage + e2e)"
  "Stop e2e database"
  "Quit"
)
MENU_COUNT=${#MENU_ITEMS[@]}
SELECTED=0

draw_menu() {
  echo ""
  echo "  Test Runner"
  echo ""
  for i in "${!MENU_ITEMS[@]}"; do
    if [ "$i" -eq "$SELECTED" ]; then
      echo "  $(tput bold)$(tput setaf 6)› ${MENU_ITEMS[$i]}$(tput sgr0)"
    else
      echo "    ${MENU_ITEMS[$i]}"
    fi
  done
  echo ""
  echo "  ↑/↓ navigate · Enter select · q quit"
}

# Read a single keypress including escape sequences. Uses -n1 then a short
# timeout read for the rest of an escape sequence (bash 3.2 compatible —
# macOS default shell).
read_key() {
  local key rest
  IFS= read -r -s -n1 key
  if [[ "$key" == $'\x1b' ]]; then
    IFS= read -r -s -n2 -t 1 rest 2>/dev/null || true
    key="${key}${rest}"
  fi
  printf '%s' "$key"
}

select_menu_item() {
  tput civis          # hide cursor
  tput smcup          # alternate screen
  clear
  draw_menu

  while true; do
    local key prev
    key=$(read_key)
    prev=$SELECTED

    case "$key" in
      $'\x1b[A' | $'\x1b[D' | 'k') # up / left / k
        ((SELECTED--)) || true
        [ "$SELECTED" -lt 0 ] && SELECTED=$((MENU_COUNT - 1))
        ;;
      $'\x1b[B' | $'\x1b[C' | 'j') # down / right / j
        ((SELECTED++)) || true
        [ "$SELECTED" -ge "$MENU_COUNT" ] && SELECTED=0
        ;;
      '' | $'\n' | $'\r') # Enter
        break
        ;;
      'q' | 'Q')
        SELECTED=$((MENU_COUNT - 1)) # point at Quit
        break
        ;;
    esac

    if [ "$SELECTED" -ne "$prev" ]; then
      clear
      draw_menu
    fi
  done

  tput rmcup          # restore screen
  tput cnorm          # show cursor
}

select_menu_item

echo "› ${MENU_ITEMS[$SELECTED]}"
echo ""

# Suspend `set -e` for the dispatch: a failing test run must not abort the
# script before the teardown prompt below — otherwise the e2e container is left
# running with no chance to stop it.
set +e
case "$SELECTED" in
  0) run_unit ;;
  1) run_unit_watch ;;
  2) run_coverage ;;
  3) run_e2e ;;
  4) run_e2e_ui ;;
  5) run_all ;;
  6) stop_e2e_db; exit 0 ;;
  7) echo "Bye."; exit 0 ;;
esac
EXIT_CODE=$?
set -e

# After a one-shot e2e run, offer to tear the container down (the e2e DB stays
# up otherwise, so re-runs are instant).
if [ "$E2E_DB_STARTED" -eq 1 ]; then
  echo ""
  read -r -p "Stop e2e database? [y/N] " stop_choice
  if [[ "$stop_choice" =~ ^[Yy]$ ]]; then
    stop_e2e_db
  else
    echo "E2e DB still running. To stop: npm test → Stop e2e database."
  fi
fi

exit $EXIT_CODE

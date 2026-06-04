#!/usr/bin/env bash
# Brings up the localhost e2e Postgres (schema + seed), then runs Playwright,
# which builds the production bundle once and starts the two `next start`
# servers (see playwright.config.ts). Pass -c/--cleanup to tear the DB down
# afterward; any remaining args pass through to `playwright test`.
#
#   npm run test:e2e            # keep the DB up after the run
#   npm run test:e2e:clean      # tear the DB down afterward (--cleanup)
#   npm run test:e2e:ui         # Playwright UI mode (--ui)
#   npm run test:e2e -- <args>  # passthrough for combining flags / a file
#
# `npx playwright test` remains usable directly for iteration once the DB is up.
set -euo pipefail

CLEANUP=0
PLAYWRIGHT_ARGS=()
for arg in "$@"; do
  case "$arg" in
    --cleanup | -c) CLEANUP=1 ;;
    *) PLAYWRIGHT_ARGS+=("$arg") ;;
  esac
done

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# shellcheck source=scripts/setup-e2e-db.sh
source "$(dirname "${BASH_SOURCE[0]}")/setup-e2e-db.sh"

if [[ "$CLEANUP" -eq 1 ]]; then
  cleanup() {
    echo ""
    echo "🧹 Stopping the e2e Postgres sidecar..."
    docker compose --env-file "$REPO_ROOT/e2e/.env" \
      -f "$REPO_ROOT/docker-compose.e2e.yml" down
  }
  trap cleanup EXIT
fi

echo ""
echo "🎭 Running the Playwright e2e suite..."
# Guarded expansion so an empty args array is safe under `set -u`.
npx playwright test ${PLAYWRIGHT_ARGS[@]+"${PLAYWRIGHT_ARGS[@]}"}

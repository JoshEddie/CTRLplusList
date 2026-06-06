#!/usr/bin/env bash
# Local preview against the Docker Postgres with auth bypassed. Brings up +
# seeds the localhost DB, then runs `next dev` with USE_PG_DRIVER=1 (which
# routes the app at the local DB AND turns on the auth bypass — session
# defaults to dev-test-viewer). Replaces the old AUTH_BYPASS=true workflow.
# See CLAUDE.md "Local dev + e2e".
set -euo pipefail

# setup-e2e-db.sh exports the e2e/.env values (incl. DATABASE_URL) into this shell.
# shellcheck source=scripts/setup-e2e-db.sh
source "$(dirname "${BASH_SOURCE[0]}")/setup-e2e-db.sh"

echo ""
echo "🌱 Seeding the canonical fixture (preserves any rows created via the UI)..."
USE_PG_DRIVER=1 DATABASE_URL="$DATABASE_URL" npm run db:seed:dev

echo ""
echo "🚀 Starting next dev in local mode (USE_PG_DRIVER=1)..."
USE_PG_DRIVER=1 DATABASE_URL="$DATABASE_URL" exec next dev

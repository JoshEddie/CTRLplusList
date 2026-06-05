#!/usr/bin/env bash
# Shared e2e / local-dev database bring-up. Checks Docker, starts the localhost
# Postgres sidecar, waits until it is healthy, applies the schema via
# `drizzle-kit push`, and seeds the canonical fixture — all against the
# single-source localhost DATABASE_URL in e2e/.env. Sourced by dev-local.sh
# and test-e2e.sh (it exports the e2e/.env values into the caller's shell).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$REPO_ROOT/e2e/.env"

# Single source of truth for the localhost DB connection (committed, non-secret).
# We `source` (not `node --env-file` / `docker --env-file`) on purpose: those
# loaders DON'T override a variable already in the environment, so an ambient
# DATABASE_URL could silently win and point the schema-apply/seed below at the
# wrong database. A shell assignment overrides, forcing this file's localhost
# values — the safe behavior when we're about to mutate a DB.
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# Refuse to run against anything that smells like a hosted DB. The schema-apply
# below is `drizzle-kit push`; aiming it at a real Postgres would risk a schema
# clobber. e2e/.env always sets localhost, but this catches a leaked shell
# DATABASE_URL before any damage. Mirrors budget_eddiefamily's docker setup.
case "${DATABASE_URL:-}" in
  *neon.tech* | *vercel-storage.com* | *neon.build* | *supabase.co* | *amazonaws.com*)
    echo "❌ Refusing to run e2e setup: DATABASE_URL points at a hosted Postgres."
    exit 1
    ;;
esac
if [[ "${DATABASE_URL:-}" != *localhost* && "${DATABASE_URL:-}" != *127.0.0.1* ]]; then
  echo "❌ Refusing to run e2e setup: DATABASE_URL is not localhost."
  exit 1
fi

echo "🔍 Checking Docker..."
if ! command -v docker &>/dev/null; then
  echo "❌ Docker not found. Install Docker Desktop and retry."
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  if [[ "${OSTYPE:-}" == darwin* ]]; then
    echo "🚀 Docker engine is not running — starting Docker Desktop (macOS)..."
    open -a Docker
    printf "⏳ Waiting for the Docker daemon"
    until docker info >/dev/null 2>&1; do
      sleep 2
      printf "."
    done
    echo " ready."
  else
    echo "❌ Docker daemon is not running. Start it and retry."
    exit 1
  fi
fi

COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$REPO_ROOT/docker-compose.e2e.yml")

echo "🐘 Starting the e2e Postgres sidecar (waiting for healthy)..."
# `--wait` blocks until the service's compose healthcheck (pg_isready) passes —
# the native replacement for a hand-rolled wait loop.
"${COMPOSE[@]}" up -d --wait
echo "✅ Postgres is ready."

echo "🗄️  Applying schema (drizzle-kit push)..."
DATABASE_URL="$DATABASE_URL" npx drizzle-kit push

echo "🌱 Seeding the canonical fixture..."
USE_PG_DRIVER=1 DATABASE_URL="$DATABASE_URL" npm run db:seed:dev

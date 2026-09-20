#!/usr/bin/env bash
# Provisions the toolchain the fleet skills shell out to. Cloud sessions start
# from a bare clone: no node_modules, no global CLIs, no Docker daemon.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "${BASH_SOURCE[0]}")/../..}"

# Pinned: openspec/schemas/spec-driven-review is a fork of this package version's
# spec-driven schema. Bump both together, never one alone.
OPENSPEC_VERSION="1.9.0"

npm install --no-audit --no-fund

if [ "$(openspec --version 2>/dev/null || true)" != "$OPENSPEC_VERSION" ]; then
  npm install -g "@fission-ai/openspec@${OPENSPEC_VERSION}"
fi

# The image ships the Docker client without a running daemon; e2e and dev:local
# both need one. Best-effort — a session that never runs them is still usable.
if command -v dockerd >/dev/null 2>&1 && ! docker info >/dev/null 2>&1; then
  nohup dockerd >/tmp/dockerd.log 2>&1 &
  for _ in $(seq 1 15); do
    docker info >/dev/null 2>&1 && break
    sleep 1
  done
fi

if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo 'export OPENSPEC_TELEMETRY=0' >>"$CLAUDE_ENV_FILE"
fi

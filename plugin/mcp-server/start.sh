#!/usr/bin/env bash
# Bootstrap script — installs dependencies on first run, then starts the MCP server.
# Non-technical users never need to touch this file or run Terminal commands.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

# Install dependencies if missing (fresh install or clean clone).
# Tries bun first (preferred), falls back to npm.
if [ ! -d node_modules ]; then
  bun install --frozen-lockfile 2>/dev/null || npm install
fi

# Config lives in ~/.config/drape/ — the plugin install directory is read-only.
# Fall back to .env beside this script (dev/local clone use).
CONFIG_DIR="${HOME}/.config/drape"
HOME_ENV="${CONFIG_DIR}/.env"
LOCAL_ENV="${DIR}/.env"

if [ -f "${HOME_ENV}" ]; then
  exec bun run --env-file "${HOME_ENV}" src/index.ts
elif [ -f "${LOCAL_ENV}" ]; then
  exec bun run --env-file "${LOCAL_ENV}" src/index.ts
else
  # No credentials yet — server starts without them.
  # Tools will return a setup prompt.
  exec bun run src/index.ts
fi

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

# Start the server. Load .env if it exists (credentials configured),
# otherwise start without — tools will return setup instructions.
if [ -f .env ]; then
  exec bun run --env-file .env src/index.ts
else
  exec bun run src/index.ts
fi

#!/usr/bin/env bash
# Starts the Drape MCP server using the pre-compiled Node.js bundle.
# Credentials are loaded from ~/.config/drape/.env (written by /drape:setup).
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"

# Load credentials if they exist, then start the server.
HOME_ENV="${HOME}/.config/drape/.env"
LOCAL_ENV="${DIR}/.env"

if [ -f "${HOME_ENV}" ]; then
  set -a
  # shellcheck source=/dev/null
  source "${HOME_ENV}"
  set +a
elif [ -f "${LOCAL_ENV}" ]; then
  set -a
  # shellcheck source=/dev/null
  source "${LOCAL_ENV}"
  set +a
fi

exec node "${DIR}/dist/index.js"

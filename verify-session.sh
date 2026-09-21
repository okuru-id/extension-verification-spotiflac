#!/usr/bin/env bash
# SpotiFLAC one-shot session verification — no project clone needed.
#
#   curl -fsSL https://raw.githubusercontent.com/<user>/<repo>/main/verify-session.sh | bash -s -- \
#     https://your-server.example.com username password
#
# or download it first:
#   bash verify-session.sh [server-url] [username] [password]
#
# Everything (playwright + chromium + the node script) is cached in
# ~/.cache/spotiflac-verify, so only the first run downloads anything.
# Windows: run from Git Bash / WSL, or fetch verify-session.mjs and run
# it directly with node after `npm i playwright && npx playwright install chromium --no-shell`.
set -euo pipefail

RAW="https://raw.githubusercontent.com/okuru-id/extension-verification-spotiflac/main"

CACHE="${HOME}/.cache/spotiflac-verify"
mkdir -p "$CACHE"
cd "$CACHE"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 18+ is required — install it from https://nodejs.org" >&2
  exit 1
fi
if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required." >&2
  exit 1
fi

# always fetch the latest script (tiny download)
curl -fsSL "$RAW/verify-session.mjs" -o verify-session.mjs

if [ ! -d node_modules/playwright ]; then
  echo "installing playwright + chromium (one-time, ~150MB)…"
  [ -f package.json ] || npm init -y >/dev/null
  npm install playwright >/dev/null
  npx playwright install chromium --no-shell
fi

# headless Linux needs a virtual display for the Turnstile checkbox
if [ -n "${DISPLAY:-}" ] || [ "$(uname)" != "Linux" ]; then
  exec node verify-session.mjs "$@"
elif command -v xvfb-run >/dev/null 2>&1; then
  exec xvfb-run -a node verify-session.mjs "$@"
else
  echo "headless Linux detected — install Xvfb first (e.g. sudo apt install xvfb)" >&2
  exit 1
fi

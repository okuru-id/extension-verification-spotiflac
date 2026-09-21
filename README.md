# SpotiFLAC — Extension Session Verification

One-shot script that verifies a SpotiFLAC extension session against the
Zarz gateway (Turnstile solved in a real Chromium window) and imports the
session into a SpotiFLAC-Web instance. No project clone needed.

## Usage

```bash
# Linux / macOS / Git Bash (WSL)
curl -fsSL https://raw.githubusercontent.com/okuru-id/extension-verification-spotiflac/main/verify-session.sh | bash -s -- \
  https://YOUR-SERVER USERNAME PASSWORD
```

```powershell
# Windows — PowerShell
curl.exe -fsSL https://raw.githubusercontent.com/okuru-id/extension-verification-spotiflac/main/verify-session.mjs -o verify.mjs
npm install playwright
npx playwright install chromium --no-shell
node verify.mjs https://YOUR-SERVER USERNAME PASSWORD
```

```bash
# Android — Termux (install from F-Droid / GitHub, not Play Store)
pkg update && pkg install proot-distro
proot-distro install ubuntu && proot-distro login ubuntu
apt update && apt install -y curl xvfb nodejs npm
curl -fsSL https://raw.githubusercontent.com/okuru-id/extension-verification-spotiflac/main/verify-session.sh | bash -s -- \
  https://YOUR-SERVER USERNAME PASSWORD
```

Playwright + Chromium (~150 MB) are downloaded once into
`~/.cache/spotiflac-verify`; later runs are instant.

## Requirements

- Node.js 18+, curl
- A display (or Xvfb on headless Linux — used automatically)
- The target SpotiFLAC-Web account (username + password) for the import step

Credit: inspired by [SpotiFLAC-Mobile](https://github.com/spotiflacapp/SpotiFLAC-Mobile).

## Provider scripts

Each signed-session extension has its own script:

```text
verify-qobuz.mjs   qobuz-web@1.2.15
verify-deezer.mjs  deezer@1.3.5
verify-tidal.mjs   tidal-web@1.2.5
verify-amazon.mjs  amzn@2.3.8
```

Usage is same as `verify-session.mjs`. YouTube Music, SoundCloud, Spotify Web,
and Apple Music do not expose `signedSession` in their manifests, so this
verification flow does not apply to them.

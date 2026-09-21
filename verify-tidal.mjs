#!/usr/bin/env node
// One-shot SpotiFLAC extension session verification, usable as a plain
// script (no web UI needed):
//
//   bash/node script -> headful Chromium solves the gateway challenge ->
//   grant captured via window.zarzGateway ("zarz_grant" postMessage path) ->
//   session exchanged -> written to a local file -> optionally imported into
//   a SpotiFLAC-Web instance (local or VM) via its session/import API.
//
// Run locally on any desktop: every step (bootstrap, solve, exchange) shares
// this machine's IP, so the gateway's network-binding check passes. The
// resulting session is not IP-bound while in use (the Android app roams) and
// is refreshed server-side, so importing it into the VM serves every user.
//
// Usage:
//   scripts/verify-session.sh                                  # verify only, writes ./session.qobuz-web.json
//   scripts/verify-session.sh https://vm.example admin s3cret  # verify + import into that instance
//
// Requires: playwright chromium (npx playwright install chromium).
// On a headless box: xvfb-run -a scripts/verify-session.sh (the wrapper does
// this automatically when DISPLAY is unset). Headless-shell is rejected by
// the Turnstile widget; a real headed Chromium passes.

import { execFileSync } from 'child_process';
import { randomBytes } from 'crypto';
import { writeFileSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createRequire } from 'module';

const APP_VERSION = 'tidal-web@1.2.5';
const GATEWAY = 'https://api.zarz.moe/v2';
const UA = 'SpotiFLAC-Mobile/' + APP_VERSION;
const EXT_ID = 'tidal-web';

const [, , target, user, password] = process.argv;

function curl(args) {
  return execFileSync('curl', ['-s', '-m', '30', ...args], { encoding: 'utf8' });
}

// --- 1. bootstrap: create the challenge bound to OUR install id and IP ---
const installId = randomBytes(16).toString('hex');
const boot = JSON.parse(curl([
  `${GATEWAY}/bootstrap?app_version=${encodeURIComponent(APP_VERSION)}&install_id=${installId}`,
  '-H', `User-Agent: ${UA}`,
]));
if (!boot.challenge_id) {
  console.error('bootstrap failed:', JSON.stringify(boot));
  process.exit(1);
}
console.log('challenge:', boot.challenge_id);

// An https callback is dropped by the challenge page, which activates its
// documented "popup window opened by an extension or web client" path: the
// grant is exposed as window.zarzGrant instead of a deep-link redirect.
const cb = 'https://localhost/unused-cb';
const challengeURL = `${GATEWAY}/challenge?id=${boot.challenge_id}&cb=${encodeURIComponent(cb)}`;

// --- 2. solve: headful Chromium, click the Turnstile checkbox ---
const require_ = createRequire(import.meta.url);
const { chromium } = require_('playwright');
let browser;
try {
  browser = await chromium.launch({ channel: 'chromium', args: ['--disable-dev-shm-usage', '--no-sandbox'] });
} catch {
  browser = await chromium.launch({ args: ['--disable-dev-shm-usage', '--no-sandbox'] });
}
const page = await (
  await browser.newContext({
    viewport: { width: 480, height: 720 },
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36',
  })
).newPage();
// Turnstile ignores synthetic interaction when navigator.webdriver is exposed.
await page.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
});
await page.goto(challengeURL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(6000);

const box = await page.locator('.cf-turnstile').boundingBox().catch(() => null);
if (box) {
  await page.mouse.click(box.x + 25, box.y + box.height / 2);
  console.log('clicked the Turnstile checkbox — if the window stays open, click it manually');
}

let grant = '';
for (let i = 0; i < 22; i++) {
  await page.waitForTimeout(4000);
  grant = await page.evaluate(() => window.zarzGrant || '').catch(() => '');
  if (grant) break;
  if (i === 5 && box) {
    await page.mouse.click(box.x + 25, box.y + box.height / 2).catch(() => {});
  }
}
if (!grant) {
  await page.screenshot({ path: 'session-verify-failure.png' }).catch(() => {});
}
await browser.close();
if (!grant) {
  console.error('no grant captured within 90s — run on a desktop and click the checkbox manually (screenshot: session-verify-failure.png)');
  process.exit(1);
}
console.log('grant:', grant.slice(0, 16) + '…');

// --- 3. exchange: same install id + same IP as the bootstrap ---
const exchangeRaw = curl([
  '-X', 'POST', `${GATEWAY}/session/exchange`,
  '-H', 'Content-Type: application/json',
  '-H', 'Accept: application/json',
  '-H', `User-Agent: ${UA}`,
  '--data-binary', JSON.stringify({
    grant, install_id: installId, app_version: APP_VERSION, platform: 'extension',
  }),
]);
const session = JSON.parse(exchangeRaw);
if (!session.session_id || !session.session_secret || !session.expires_at) {
  console.error('exchange failed:', exchangeRaw.slice(0, 300));
  process.exit(1);
}
console.log('session ok, expires', session.expires_at);

// --- 4. persist the record (the server re-stamps scope from its manifest) ---
const record = {
  install_id: installId,
  session_id: session.session_id,
  session_secret: session.session_secret,
  expires_at: session.expires_at,
};
const outFile = `session.${EXT_ID}.json`;
writeFileSync(outFile, JSON.stringify(record, null, 2) + '\n', { mode: 0o600 });
console.log('wrote', outFile);

// --- 5. optional: import into a SpotiFLAC-Web instance (local or VM) ---
if (target) {
  if (!user || !password) {
    console.error('target URL given but missing username/password');
    process.exit(1);
  }
  const jar = join(mkdtempSync(join(tmpdir(), 'spotiflac-verify-')), 'cookies');
  const base = target.replace(/\/+$/, '');
  const login = curl([
    '-X', 'POST', `${base}/api/auth/login`,
    '-H', 'Content-Type: application/json',
    '-c', jar,
    '--data-binary', JSON.stringify({ username: user, password }),
  ]);
  if (!/"user"/.test(login)) {
    console.error('login failed:', login.slice(0, 200));
    process.exit(1);
  }
  const imported = curl([
    '-X', 'POST', `${base}/api/extensions/session/import?id=${encodeURIComponent(EXT_ID)}`,
    '-b', jar,
    '-H', 'Content-Type: application/json',
    '--data-binary', `@${outFile}`,
    '-w', '\n%{http_code}',
  ]);
  const codeMatch = imported.match(/(\d{3})\s*$/);
  const body = imported.slice(0, codeMatch ? codeMatch.index : undefined).trim();
  if (!codeMatch || codeMatch[1] !== '200') {
    console.error(`import failed (HTTP ${codeMatch ? codeMatch[1] : '?'}):`, body.slice(0, 200));
    process.exit(1);
  }
  console.log(`imported into ${base}:`, body);
  rmSync(jar, { force: true });
}

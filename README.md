# SpotiFLAC — Extension Session Verification

Script verifikasi sesi ekstensi SpotiFLAC. Script membuka Chromium, menyelesaikan Turnstile melalui gateway Zarz, lalu mengimpor sesi ke SpotiFLAC-Web. Tidak perlu clone project.

## Ekstensi yang didukung

Satu ekstensi, satu script:

| Ekstensi | Deskripsi dari manifest | File | Versi gateway | Import ID |
|---|---|---|---:|---|
| Qobuz | Qobuz metadata and download provider for SpotiFLAC Mobile with resilient album search and track recovery, complete release metadata, credits, multi-disc totals, and original artwork. | `verify-qobuz.mjs` | `qobuz-web@1.2.15` | `qobuz-web` |
| Deezer | Deezer metadata and lossless download provider with complete release, disc, barcode, credits, explicit, genre, rights, link, and high-resolution artwork metadata. | `verify-deezer.mjs` | `deezer@1.3.5` | `deezer` |
| TIDAL | TIDAL metadata and search provider for SpotiFLAC Mobile using TIDAL public web endpoints. | `verify-tidal.mjs` | `tidal-web@1.2.5` | `tidal-web` |
| Amazon Music | Amazon Music metadata & download provider for SpotiFLAC Mobile. Browse tracks, albums, artists, playlists from Amazon Music links and search. Downloads lossless and Dolby Atmos audio. | `verify-amazon.mjs` | `amzn@2.3.8` | `amazon` |

YouTube Music, SoundCloud, Spotify Web, dan Apple Music tidak memakai `signedSession`, jadi tidak memakai alur script ini.

## Deskripsi semua ekstensi

Deskripsi berikut diambil dari `manifest.json` masing-masing ekstensi:

| Ekstensi | Deskripsi |
|---|---|
| Qobuz | Qobuz metadata and download provider for SpotiFLAC Mobile with resilient album search and track recovery, complete release metadata, credits, multi-disc totals, and original artwork. |
| Deezer | Deezer metadata and lossless download provider with complete release, disc, barcode, credits, explicit, genre, rights, link, and high-resolution artwork metadata. |
| TIDAL | TIDAL metadata and search provider for SpotiFLAC Mobile using TIDAL public web endpoints. |
| Amazon Music | Amazon Music metadata & download provider for SpotiFLAC Mobile. Browse tracks, albums, artists, playlists from Amazon Music links and search. Downloads lossless and Dolby Atmos audio. |
| YouTube Music | YouTube Music metadata and download provider with native album, artist, explicit, release, and song-credit metadata plus validated catalog enrichment. |
| SoundCloud | SoundCloud metadata and download provider. Search tracks, albums, playlists, artists. Downloads via direct SoundCloud streams. |
| Spotify Web | Spotify metadata provider for SpotiFLAC Mobile with complete native release, disc, catalog ID, credits, and artwork metadata plus guarded genre enrichment. |
| Apple Music | Apple Music metadata and lyrics provider for SpotiFLAC Mobile with guarded track matching, bounded caching, resilient requests, and complete release metadata. |

## Linux / macOS / Git Bash (WSL)

Wrapper otomatis memasang Playwright + Chromium saat pertama kali dijalankan. Ganti `verify-qobuz.mjs` dengan script ekstensi yang dibutuhkan.

```bash
curl -fsSL https://raw.githubusercontent.com/okuru-id/extension-verification-spotiflac/main/verify-session.sh | bash -s -- \
  https://YOUR-SERVER USERNAME PASSWORD
```

Wrapper di atas kompatibel dengan entrypoint lama `verify-session.mjs` (Qobuz). Untuk ekstensi lain, unduh script spesifik lalu jalankan Node:

```bash
curl -fsSL https://raw.githubusercontent.com/okuru-id/extension-verification-spotiflac/main/verify-qobuz.mjs -o verify-qobuz.mjs
npm install playwright
npx playwright install chromium --no-shell
node verify-qobuz.mjs https://YOUR-SERVER USERNAME PASSWORD
```

Contoh Deezer:

```bash
curl -fsSL https://raw.githubusercontent.com/okuru-id/extension-verification-spotiflac/main/verify-deezer.mjs -o verify-deezer.mjs
node verify-deezer.mjs https://YOUR-SERVER USERNAME PASSWORD
```

## Windows — PowerShell

```powershell
curl.exe -fsSL https://raw.githubusercontent.com/okuru-id/extension-verification-spotiflac/main/verify-qobuz.mjs -o verify-qobuz.mjs
npm install playwright
npx playwright install chromium --no-shell
node verify-qobuz.mjs https://YOUR-SERVER USERNAME PASSWORD
```

Ganti `qobuz` dengan `deezer`, `tidal`, atau `amazon` sesuai ekstensi.

Untuk Linux/macOS/Git Bash/WSL, gunakan `curl` (bukan `curl.exe`) dan jalankan dari folder tempat file script diunduh:

```bash
cd ~/Downloads
curl -fsSL https://raw.githubusercontent.com/okuru-id/extension-verification-spotiflac/main/verify-amazon.mjs -o verify-amazon.mjs
npm install playwright
npx playwright install chromium --no-shell
node verify-amazon.mjs https://YOUR-SERVER USERNAME PASSWORD
```

## Android — Termux

```bash
pkg update && pkg install proot-distro
proot-distro install ubuntu && proot-distro login ubuntu
apt update && apt install -y curl xvfb nodejs npm
curl -fsSL https://raw.githubusercontent.com/okuru-id/extension-verification-spotiflac/main/verify-session.sh | bash -s -- \
  https://YOUR-SERVER USERNAME PASSWORD
```

Perintah wrapper memakai entrypoint Qobuz lama. Ekstensi lain perlu menjalankan file `.mjs` spesifik seperti contoh Linux.

## Persyaratan dan hasil

- Node.js 18+ dan `curl`.
- Linux headless perlu Xvfb; wrapper mendeteksi dan memakai `xvfb-run` otomatis.
- Chromium dan Playwright disimpan di `~/.cache/spotiflac-verify` oleh wrapper.
- Saat gagal, screenshot tersimpan sebagai `session-verify-failure.png`.
- Saat berhasil, sesi lokal tersimpan sebagai `session.<import-id>.json` dengan permission `0600`.
- Jika target server diberikan, script langsung mengimpor sesi ke server. Kredensial dipakai hanya untuk login import.

## Keamanan

Jalankan hanya dari jaringan stabil. Gateway mengikat challenge dan pertukaran sesi ke jaringan yang sama. Jangan commit file `session.*.json`; file berisi grant sesi.

Credit: inspired by [SpotiFLAC-Mobile](https://github.com/spotiflacapp/SpotiFLAC-Mobile).

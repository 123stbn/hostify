# 🎧 Hostify: Personal Music Cloud (Self-Hosted Spotify Alternative)

**Hostify** is a turnkey software appliance designed to transform a technical Docker container stack into a private, high-fidelity music streaming cloud (FLAC/Opus/MP3). It delivers the polished, seamless user experience of Spotify while keeping you in 100% control of your library and data.

It completely eliminates the need to edit terminal YAML files, debug Linux permissions, or struggle with complex reverse proxy network configurations through its intuitive web-based **Setup Wizard** and **Unified Management Dashboard**.

> 🇪🇸 **Documentación en Español**: Consulta [README.es.md](./docs/README.es.md).

---

## 🌟 Key Features

- 🚀 **Onboarding in < 5 minutes:** Step-by-step browser wizard (*Setup Wizard*) that autodetects music paths, provisions directory trees, and validates credentials.
- ⚡ **Ultra-Lightweight Streaming:** Engine powered by **Navidrome** (built in Go, consuming < 60 MB RAM), replacing resource-heavy alternatives with full **OpenSubsonic API** compatibility.
- 📱 **Client Ecosystem:** Seamless native compatibility with **Feishin** (Spotify-like modern desktop player for macOS, Windows, and Linux), **Symfonium** (Android client with parametric EQ and offline caching), and **SubSonify / Amperfy** (iOS & CarPlay).
- 🏷️ **Smart Metadata & Scrobbling:** Decoupled integration with **Multi-Scrobbler**, tag normalization via **MusicBrainz**, and automatic listen-logging to **ListenBrainz**.
- 🗂️ **Segmented Ingestion Architecture:** Independent download modules (**Slskd** for Soulseek P2P, **Explo** for automated playlist curator downloads, and the **Lidarr + Prowlarr + qBittorrent** combo with an isolated temporary download buffer) depositing into dedicated subfolders under a unified music root.
- 🔒 **Flexible Remote Access:** Built-in support for **Tailscale** private mesh networks (0 router ports exposed to the Internet) as well as **Reverse Proxies** with custom HTTPS domains (Caddy / Nginx / Traefik / Cloudflare Tunnel).
- 📊 **Operational Dashboard:** Real-time container health and memory monitoring, live log inspection, storage analytics, and copy-paste connection parameters for third-party music clients.

---

## 🏗️ Storage Architecture

To preserve metadata integrity and prevent half-downloaded tracks from breaking Navidrome's tag scanner, Hostify enforces a segregated storage directory tree:

```text
/volume1/music/                          <-- Mounted into Navidrome (/music:ro)
├── personal/                            <-- Personal collection & manual uploads (CD/vinyl rips, own files)
│   └── Artist/Album/track.flac
├── explo/                               <-- Dedicated to smart curator downloads (Explo)
│   └── Artist/Album/track.flac
├── slskd/                               <-- Dedicated to Soulseek P2P (Slskd)
│   └── Artist/Album/track.flac
└── torrents/                            <-- Completed BitTorrent downloads (qBittorrent)
    └── Artist - Album/track.flac

/volume1/docker/qbittorrent/incomplete  <-- Isolated scratch buffer for active torrents (Navidrome NEVER scans this)
```

**Golden Rule:** Navidrome mounts `/volume1/music` strictly in read-only mode (`:ro`) and scans all subdirectories recursively. You get a single, consolidated, clean discography across all your player applications.

---

## 🚀 Quick Start & Deployment (Cross-Platform)

The automated installer detects your host operating system, checks for Docker availability, and if missing or stopped, **installs and configures it to start automatically on system boot**:
- **macOS:** If Docker is not found, installs and starts **Colima** (lightweight open-source container runtime) and registers it with `brew services` for auto-start upon login.
- **Linux / NAS:** Provisions official **Docker Engine** via `get.docker.com` and enables `systemctl enable --now docker`.
- **Windows:** Detects Docker Desktop or installs it automatically via `winget` with startup integration.

### 🍎 macOS / 🐧 Linux / 🖧 NAS / 💻 WSL:
```bash
curl -fsSL https://raw.githubusercontent.com/123stbn/hostify/main/install.sh | bash
```

### 🪟 Windows (Run PowerShell as Administrator):
```powershell
irm https://raw.githubusercontent.com/123stbn/hostify/main/install.ps1 | iex
```

### Or Manually via Git & Docker Compose:
```bash
git clone https://github.com/123stbn/hostify.git
cd hostify
./install.sh   # On macOS/Linux
.\install.ps1  # On Windows PowerShell
```

Once installed, open your browser at:
👉 **`http://hostify.local:3500`** (or `http://localhost:3500` / `http://<YOUR-SERVER-IP>:3500`) to launch the **Setup Wizard**.

---

## 💻 Local Appliance Development

In accordance with Hostify repository rules, **`pnpm`** must always be used for dependency and package management:

```bash
cd app

# Install dependencies
pnpm install

# Start development server (Express backend + Vite React client)
pnpm run dev

# Compile for production
pnpm run build

# Run production build
pnpm start
```

---

## 📱 Connecting Players & Apps

Hostify acts as an **OpenSubsonic** music server. You can connect any of the following recommended apps:

### 1. Feishin (Desktop - macOS / Windows / Linux)
1. Download from [Feishin Releases](https://github.com/jeffvli/feishin/releases).
2. Select server type: **Navidrome / Subsonic**.
3. Server URL: `http://<HOST-IP>:4533` (or your HTTPS domain / Tailscale IP).
4. Enter your admin credentials created during the setup wizard.

### 2. Symfonium (Android)
1. Install **Symfonium** from Google Play Store.
2. Add new media provider -> **Subsonic**.
3. Enter server URL (`http://<HOST-IP>:4533`) and credentials.
4. Enable offline caching to listen to lossless music on the go.

### 3. SubSonify / Amperfy (iOS & CarPlay)
1. Install **SubSonify** or **Amperfy** from the iOS App Store.
2. Add a new Subsonic account with your server URL and login.
3. Enjoy CarPlay integration and background playback.

---

## 🔐 Remote Access Setup

### Option A: Tailscale (Recommended)
- Zero router ports exposed to the Internet, secured with WireGuard end-to-end encryption.
- Use your host's existing Tailscale daemon or activate the sidecar container in `docker-compose.yml` (`--profile tailscale`) with your Auth Key.

### Option B: Reverse Proxy (Custom Domain with SSL)
Hostify provides ready-to-copy configurations under the **Remote Access** tab:
- **Caddyfile:**
  ```caddy
  music.your-domain.com {
      reverse_proxy hostify-navidrome:4533
  }
  ```
- **Nginx:** Preconfigured with `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`, and WebSocket `Upgrade` headers.

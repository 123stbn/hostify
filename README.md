# 🎧 Hostify: Personal Music Cloud (Self-Hosted Spotify Alternative)

<p align="center">
  <a href="https://www.buymeacoffee.com/123stbn" target="_blank">
    <img src="https://img.shields.io/badge/🍕_Buy_me_a_pizza-123stbn-FFDD00?style=for-the-badge&logoColor=000&labelColor=1f2937" alt="Buy Me A Pizza" />
  </a>
</p>

**Hostify** is a turnkey software appliance designed to transform a technical Docker container stack into a private, high-fidelity music streaming cloud (FLAC/Opus/MP3). It delivers the polished, seamless user experience of Spotify while keeping you in 100% control of your library and data.

It completely eliminates the need to edit terminal YAML files, debug Linux permissions, or struggle with complex reverse proxy network configurations through its intuitive web-based **Setup Wizard** and **Unified Management Dashboard**.

> 📖 **Technical Architecture**: See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | **Contributing**: See [CONTRIBUTING.md](./docs/CONTRIBUTING.md)

---

## 🎯 Project Purpose

Commercial music streaming services lock your music behind monthly subscriptions, remove songs due to licensing disputes, alter audio masters without notice, collect listening telemetry, and restrict offline listening with aggressive DRM.

**Hostify** was created to restore **true digital ownership** to music lovers and audiophiles:
- **Your Music, Your Rules:** Turn any old PC, Mac, VPS, or NAS into a private, self-hosted streaming server running on your home network or private VPN.
- **Bit-Perfect Audio Fidelity:** Native bit-perfect playback for lossless FLAC, ALAC, Opus, and high-bitrate MP3s with zero unwanted compression.
- **Modern User Experience:** You don't have to sacrifice modern UX. Enjoy Spotify-like desktop interfaces (Feishin), mobile apps with parametric equalizers (Symfonium on Android, SubSonify on iOS), and Apple CarPlay support.
- **Zero Configuration Friction:** No need to write complex YAMLs, configure reverse proxy headers manually, or battle Unix permissions. The web Setup Wizard automates provisioning end-to-end.

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

## 🚀 Quick Start & Installation Alternatives

Hostify can be deployed in whichever way best fits your infrastructure:

### Method 1: Automated Turnkey Installer (Recommended)

The automated script checks for Docker, installs and starts it if missing (e.g. Colima on macOS, Docker Engine on Linux, Docker Desktop on Windows), pulls the official image, and starts Hostify:

#### 🍎 macOS / 🐧 Linux / 🖧 NAS / 💻 WSL:
```bash
curl -fsSL https://raw.githubusercontent.com/123stbn/hostify/main/install.sh | bash
```

#### 🪟 Windows (Run PowerShell as Administrator):
```powershell
irm https://raw.githubusercontent.com/123stbn/hostify/main/install.ps1 | iex
```

---

### Method 2: Portainer / Synology / QNAP / CasaOS (Pre-Built Image)

If you manage your NAS or home server via **Portainer**, **Dockge**, **CasaOS**, or **Synology Container Manager**, deploy a single Stack using the official lightweight image:

```yaml
version: '3.8'

services:
  hostify:
    image: ghcr.io/123stbn/hostify/appliance:latest
    container_name: hostify-appliance
    restart: unless-stopped
    ports:
      - "3500:3500"
    environment:
      - NODE_ENV=production
      - HOSTIFY_PORT=3500
      - DOCKER_SOCK=/var/run/docker.sock
      - COMPOSE_PROJECT_DIR=/app/project
      - PUID=1000
      - PGID=10
      - TZ=America/Lima
      - HOST_HOSTNAME=hostify
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      # Persistent workspace where Hostify stores state, .env, and generated configs
      - /volume1/docker/hostify/project:/app/project
      # Your music storage root directory
      - /volume1/music:/music
      # Data directory for satellite downloaders & databases
      - /volume1/docker/hostify:/volume1/docker/hostify

  # mDNS (Bonjour) LAN broadcaster: allows access via http://hostify.local:3500 on all local devices
  avahi:
    image: flungo/avahi:latest
    container_name: hostify-avahi
    restart: unless-stopped
    network_mode: host
    environment:
      - SERVER_HOST_NAME=hostify
      - SERVER_DOMAIN_NAME=local
      - SERVER_ENABLE_DBUS=no
      - SERVER_USE_IPV4=yes
      - SERVER_USE_IPV6=no
      - PUBLISH_PUBLISH_WORKSTATION=yes
```

---

### Method 3: Standard Docker Compose (Git Clone)

If you prefer to keep the full repository locally:

```bash
git clone https://github.com/123stbn/hostify.git
cd hostify

# Deploy using the automated script:
./install.sh     # macOS / Linux
.\install.ps1    # Windows PowerShell

# Or directly with Docker Compose:
docker compose up -d hostify
```

---

### 🌐 Accessing the Setup Wizard

Once started via any of the methods above, open your browser:
👉 **`http://hostify.local:3500`** *(or `http://localhost:3500` / `http://<YOUR-SERVER-IP>:3500`)*

The wizard will guide you step-by-step through configuring your music directories, admin credentials, downloader tools, and remote access.

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

---

## 🍕 Support the Project

If you love Hostify and want to support its active open-source development:

[![Buy Me A Pizza](https://img.shields.io/badge/🍕_Buy_me_a_pizza-123stbn-FFDD00?style=for-the-badge&logoColor=000&labelColor=1f2937)](https://www.buymeacoffee.com/123stbn)

---

## 📄 License

Hostify is free and open-source software licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**. See the [LICENSE](./LICENSE) file for details.


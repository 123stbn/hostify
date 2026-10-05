# Hostify Project Guidelines, Architecture & AI Agent Instructions

> **Notice for AI Assistants & Autonomous Coding Agents:**
> This repository is an open-source, turnkey software appliance. When inspecting, modifying, refactoring, or generating code in this repository, you **must strictly adhere** to the architectural principles, conventions, and rules detailed below.

---

## 1. Non-Negotiable Operational Rules

### 1.1 Package Manager: Mandatory `pnpm`
- **Exclusively `pnpm`**: For all Node.js, Frontend, and Backend dependencies, installations, and scripts, **always use `pnpm`** (`pnpm install`, `pnpm add`, `pnpm run dev`, `pnpm test`, `pnpm build`).
- **Forbidden**: Never execute or propose `npm` or `yarn` commands.

### 1.2 Language & Comments: Strictly English
- **Code Comments & Docstrings**: All source code comments, function JSDocs, interface annotations, script headers (`.sh`, `.ps1`), and configuration files (`.yml`, `.json`) **must be written in English**.
- **Git Commit Messages**: Use clear, conventional commit messages in English (e.g., `feat(player): ...`, `fix(proxy): ...`).
- **UI Internationalization**: Any user-facing string added to the Web UI must be registered in [app/src/i18n.tsx](file:///Users/123stbn/Repos_Stbn/hostify/app/src/i18n.tsx) supporting both English (`en`) and Spanish (`es`).

---

## 2. Architecture & System Principles

### 2.1 Hostify Core (`hostify-appliance`)
- **Docker Socket Integration**: Container orchestration and monitoring communicate directly with the Docker Engine API via the mounted Unix socket `/var/run/docker.sock`.
- **Decoupled API & Proxy Gateway**:
  - Express backend acts as both an API service and a reverse proxy gateway using `http-proxy-middleware`.
  - **Critical Express Middleware Order**: Reverse proxy middlewares (`navidromeProxyMiddleware`, `feishinProxyMiddleware`, `slskdProxyMiddleware`, etc.) **must be mounted BEFORE `express.json()`** to avoid buffering and breaking raw streaming bodies, WebSockets, or large audio payloads.

### 2.2 Storage & Ingestion Segregation Model
- **Read-Only Music Mount (`/music:ro`)**: Navidrome mounts the root music directory strictly read-only (`:ro`) to scan and index all tracks without the ability to mutate files.
- **Dedicated Subfolder Segregation**:
  ```text
  ${MUSIC_ROOT}/
  ├── personal/    <-- User-owned collections, CD/vinyl rips, manual uploads
  ├── explo/       <-- Automated playlist curator downloads
  ├── slskd/       <-- Soulseek P2P downloads
  └── torrents/    <-- Completed BitTorrent downloads (Lidarr + qBittorrent)
  ```
- **Incomplete / Scratch Isolation**: Temporary or in-progress downloads (e.g., active BitTorrent pieces in `${DOCKER_DATA}/qbittorrent/incomplete`) **must remain strictly outside** the `${MUSIC_ROOT}` scan path to prevent corrupting Navidrome's tag scanner and SQLite database.

### 2.3 Remote Access & Network Topologies
- **Tailscale Mesh VPN**: Optional zero-config sidecar container or host daemon integration for secure WireGuard mesh access with zero router port forwarding.
- **Reverse Proxies**: Transparent support for external HTTPS reverse proxies (Caddy, Nginx, Traefik, Cloudflare Tunnel) with automatic snippet generation in the UI.
- **Local mDNS**: Automatic local broadcast under `http://hostify.local:3500` via Bonjour (macOS) and Avahi (Linux/WSL).

---

## 3. Satellite Services & Ports

| Service | Container Name | Internal Port | Host Dev Port (Override) | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Hostify Appliance** | `hostify-appliance` | `3500` | `3500` | Management Web Dashboard & Gateway |
| **Navidrome** | `hostify-navidrome` | `4533` | `4533` | OpenSubsonic Music Streaming Server |
| **Feishin** | `hostify-feishin` | `9180` | `9182` | Modern Spotify-style Web Client |
| **Slskd** | `hostify-slskd` | `5030` | `5030` | Soulseek P2P Download Daemon & Web UI |
| **Explo** | `hostify-explo` | `7288` | `7288` | Smart Playlist & Curator Download Agent |
| **Multi-Scrobbler** | `hostify-multi-scrobbler` | `9078` | `9078` | Scrobble aggregator (ListenBrainz/Last.fm) |
| **Prowlarr** | `hostify-prowlarr` | `9696` | `9696` | BitTorrent Indexer Manager |
| **Lidarr** | `hostify-lidarr` | `8686` | `8686` | Automated Music Discography Manager |
| **qBittorrent** | `hostify-qbittorrent` | `8080` / `6881` | `8080` / `6881` | Torrent client with isolated buffer |

> **Note on Feishin Port Collision**: On macOS hosts, port `9180` is often bound by local background software (e.g., Logitech G HUB `lghub_updater`). In development mode on host, Feishin's host port is explicitly remapped to `9182` in `docker-compose.override.yml` and routed via `resolveServiceTarget('feishin', 9180, 9182)`.

---

## 4. Local Development & Testing Workflow

### 4.1 Development Server (Vite HMR + Express)
To work on frontend UI or backend routes with instant hot reloading:
```bash
# Start satellite docker containers
docker compose up -d

# Run dev server on http://localhost:3500
cd app
pnpm install
pnpm run dev
```

### 4.2 Quality Assurance & Build Checks
Before finishing any task or committing changes:
```bash
cd app
# 1. Run automated unit and integration tests
pnpm test

# 2. Validate client and server builds
pnpm run build
```

---

## 5. UI & Design Standards

- **Aesthetic Direction**: Hi-Fi Obsidian, dark-mode first, glassmorphism card surfaces, typographic hierarchy, and curated accent colors.
- **Dynamic Elements**: Smooth transitions, live soundwave equalizers that react strictly to playback states (`playing` vs `paused`/`idle`), and zero layout shifts.
- **No Placeholder UI**: Ensure every interactive button, status badge, modal, and link functions end-to-end with proper error handling and fallback states.

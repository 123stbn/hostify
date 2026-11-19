# Hostify Architecture & System Design

**Hostify** is an open-source, turnkey software appliance designed to package a containerized self-hosted music cloud stack into an automated, zero-configuration appliance. It bridges the gap between complex self-hosted server components and the fluid, intuitive experience of modern music streaming platforms (e.g., Spotify, Apple Music, Tidal).

---

## 1. High-Level Architectural Overview

Hostify is composed of several decoupled layers that interact via Docker networking, the OpenSubsonic protocol, and RESTful reverse proxies:

```
+-------------------------------------------------------------------------+
|                              CLIENT LAYER                               |
|   +-------------------+  +-------------------+  +-------------------+   |
|   | Feishin (Web/Desk)|  | Symfonium (Android|  | SubSonify (iOS)   |   |
|   +-------------------+  +-------------------+  +-------------------+   |
+------------------------------------+------------------------------------+
                                     | OpenSubsonic / HTTP / WebSockets
+------------------------------------v------------------------------------+
|                         HOSTIFY GATEWAY & APPLIANCE                     |
|  - Web UI (React + Vite + Tailwind/Custom Hi-Fi Theme)                  |
|  - API Gateway (Express 4 + Node.js 20)                                 |
|  - Docker Engine Orchestrator (/var/run/docker.sock)                   |
|  - Reverse Proxies (Feishin, DroppedNeedle, Slskd, Beets, Scrobbler)     |
|  - State Sync & Subsonic Bridge (/api/now-playing, cover art, stream)   |
+------------------------------------+------------------------------------+
                                     |
+------------------------------------v------------------------------------+
|                       STREAMING & CATALOG ENGINE                        |
|  - Navidrome (Go-based OpenSubsonic Streaming Server)                   |
|  - SQLite / Tag Metadata Cache                                          |
|  - Read-Only Music Mount (/music:ro)                                    |
+------------------------------------+------------------------------------+
                                     |
+------------------------------------v------------------------------------+
|                      CONTENT DISCOVERY & INGESTION                      |
|  +----------------------------------+  +------------------------------+ |
|  | DroppedNeedle (Rust)             |  | Slskd (Soulseek P2P)         | |
|  | Discovery, Missing Albums & UI   |  | High-Fidelity P2P Client     | |
|  +----------------------------------+  +------------------------------+ |
+------------------------------------+------------------------------------+
                                     | Write to segregated folders
+------------------------------------v------------------------------------+
|                       STORAGE & METADATA LAYER                          |
|  - /volume1/music/personal/                                             |
|  - /volume1/music/discover/                                             |
|  - /volume1/music/slskd/                                                |
+-------------------------------------------------------------------------+
```

---

## 2. Core Appliance Layer (`hostify-appliance`)

The Hostify Appliance container serves as the brain and orchestrator of the entire ecosystem:

### 2.1 Backend Runtime
- **Node.js (LTS) & TypeScript**: Strict typing across server routes and services.
- **Docker Engine API via Socket (`/var/run/docker.sock`)**: Interacts directly with Docker to monitor container status, capture streaming logs, enforce restarts, and compute live memory/CPU consumption.
- **Docker Compose Integration**: Manages lifecycle (`up`, `down`, `pull`, `restart`) across all satellite services defined in `docker-compose.yml`.
- **Subsonic API Client**: Maintains live bi-directional state synchronization with Navidrome to detect current playing track, player state (`playing`, `paused`, `idle`), bitrate, sample rate, bit depth, and cover art.

### 2.2 Frontend Client
- **React 18 + Vite**: Instant HMR development and optimized production bundles.
- **Design System**: Hi-Fi Obsidian design philosophy with glassmorphism surfaces, dynamic soundwave equalizers, live container telemetry, and internationalization (`en` / `es`).
- **Interactive Setup Wizard**: Guided 4-step onboarding that detects music paths, provisions folder structures, configures admin credentials, and automates satellite container deployment.

### 2.3 Transparent Reverse Proxy Gateway
Hostify embeds an HTTP reverse proxy gateway powered by `http-proxy-middleware`:
- **Subsonic Core (`/rest/**`, `/share/**`)**: Proxied transparently to Navidrome with authentication header injection.
- **Feishin Web Player (`/feishin/**`)**: Proxies the web SPA with zero-configuration auto-login synchronization.
- **DroppedNeedle Discovery (`/tools/discover/**`)**: Proxies DroppedNeedle's web interface and APIs transparently using its native `BASE_PATH=/tools/discover` and trusted proxy headers.
- **Slskd UI & API (`/tools/slskd/**`, `/api/v0/**`, `/hub/**`)**: Preserves SignalR WebSocket connections and dynamic base path routing.
- **Beets & Multi-Scrobbler (`/tools/beets/**`, `/tools/scrobbler/**`)**: Exposes metadata enrichment and scrobbling dashboards behind the unified gateway.

---

## 3. Storage Hierarchy & Segregation Model

To prevent corrupted ID3 tags and keep curated imports separated from raw downloads, Hostify enforces a clean directory segregation pattern:

```text
${MUSIC_ROOT}/                              <-- Mounted into Navidrome (/music:ro)
├── personal/                               <-- Personal library, CD/vinyl rips, own albums
│   └── Artist/Album/track.flac
├── discover/                               <-- Verified & tagged imports from DroppedNeedle
│   └── Artist/Album/track.flac
└── slskd/                                  <-- Raw/completed Soulseek P2P downloads
    └── Artist/Album/track.flac
```

### Golden Rules:
1. **Read-Only Scanner Mount (`:ro`)**: Navidrome mounts `${MUSIC_ROOT}` strictly read-only. It scans all subdirectories recursively, indexing all music into a unified library without being able to modify or delete files.
2. **Atomic Move Architecture**: DroppedNeedle mounts `${MUSIC_ROOT}:/data:rw` and reads `SLSKD_DOWNLOADS_PATH=/data/slskd`, allowing fast verification and atomic file moves into `${MUSIC_ROOT}/discover/` without cross-volume copies.

---

## 4. Streaming Engine (Navidrome & OpenSubsonic)

The core streaming engine is powered by **Navidrome**:
- **Resource Footprint**: Written in Go; typically consumes under 60 MB of RAM even with collections exceeding 50,000 tracks.
- **OpenSubsonic Specification**: Compatible with modern OpenSubsonic extensions (transcoding on the fly, lyrics synchronization, playlist sharing, user management).
- **Direct Playback**: Supports bit-perfect native streaming of FLAC, ALAC, WAV, AIFF, Opus, and MP3.

---

## 5. Ingestion & Automation Ecosystem

### 5.1 DroppedNeedle (Discovery, Catalog Tracking & Requests)
- Lightweight Rust-based engine (< 80 MB RAM) replacing Lidarr and Explo.
- Surfaces trending charts, personalized carousels, Spotify playlist imports, and artist discographies showing owned vs. missing releases.
- Validates and tags requested tracks before importing them into `${MUSIC_ROOT}/discover/`.

### 5.2 Slskd (Soulseek P2P)
- Provides access to rare tracks, independent releases, and lossless community rips.
- Communicates through an isolated web interface, SignalR event stream, and direct HTTP API consumed by DroppedNeedle.

---

## 6. Remote Access & Security

Hostify provides two primary methods for listening to your library outside your home LAN:

### 6.1 Private Mesh Networking (Tailscale)
- **Zero-Port Exposure**: No port forwarding required on home routers.
- **WireGuard Encryption**: Point-to-point authenticated VPN.
- **Sidecar Mode**: Optional Docker container (`hostify-tailscale`) or host daemon integration.

### 6.2 Reverse Proxy with Custom HTTPS Domain
For public domain access (`https://music.yourdomain.com`), Hostify includes pre-tested configuration snippets for:
- **Caddy**: Automatic Let's Encrypt SSL provisioning.
- **Nginx**: Production-grade proxy headers and WebSocket support.
- **Traefik & Cloudflare Tunnel**: Dynamic service discovery.

---

## 7. Configuration & Environment Variables

All configuration is consolidated in `.env` at the root of the project:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `MUSIC_ROOT` | Host path to root music library | `/volume1/music` |
| `DOCKER_DATA` | Host path to persistent container configs | `/volume1/docker` |
| `HOSTIFY_PORT` | Port for the Hostify management dashboard | `3500` |
| `NAVIDROME_PORT` | Port for Navidrome OpenSubsonic server | `4533` |
| `FEISHIN_PORT` | Port mapped for the Feishin web client | `9188` (or `9180` in container) |
| `PUID` / `PGID` | Process UID and GID for file permissions | `1000` / `10` |
| `TZ` | Container timezone | `America/Lima` |
| `BASE_URL` | Optional public HTTPS domain | Empty (local) |

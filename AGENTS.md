# Hostify Project Guidelines and Rules

## Package Manager
- **Mandatory use of pnpm**: For all Node.js, Frontend, and Backend dependencies and scripts in this repository, always use `pnpm` (`pnpm install`, `pnpm add`, `pnpm run ...`, etc.), never `npm` or `yarn`.

## Architecture Principles
- **Hostify Core**: Container management and orchestration based on the Docker Engine API (`/var/run/docker.sock`).
- **Ingestion Segregation**: All music downloaded or organized must be placed into dedicated subfolders (`personal/`, `explo/`, `slskd/`, `torrents/`) inside the root music directory mounted into Navidrome as read-only (`:ro`).
- **Incomplete Files**: Temporary or in-progress downloads (e.g., torrents) are stored outside Navidrome's scan path to prevent corrupting ID3 tag databases.
- **Remote Access**: Built-in support for both Tailscale (optional sidecar) and Reverse Proxies (Caddy, Nginx, Traefik, Cloudflare Tunnel).

## Code Language and Comments
- **Code comments strictly in English**: All comments, docstrings, and headers inside source code files, Dockerfiles, bash/PowerShell scripts, and configuration files (YAML, JSON, XML, etc.) must always be written in English.

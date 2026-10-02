# Reglas y Pautas del Proyecto Hostify

## Gestor de Paquetes
- **Uso obligatorio de pnpm**: Para todas las dependencias, scripts y proyectos Node.js/Frontend/Backend en este repositorio se debe utilizar siempre `pnpm` (`pnpm install`, `pnpm add`, `pnpm run ...`, etc.), nunca `npm` ni `yarn`.

## Principios de Arquitectura
- **Hostify Core**: Contenedores y orquestación basados en Docker Engine API (`/var/run/docker.sock`).
- **Segregación de Ingesta**: Todo archivo de música descargado u organizado debe distribuirse en subcarpetas (`personal/`, `explo/`, `slskd/`, `torrents/`) dentro del directorio raíz montado en Navidrome como solo lectura (`:ro`).
- **Archivos incompletos**: Las descargas temporales o en progreso (ej. torrents) se almacenan fuera de la ruta de escaneo de Navidrome para evitar corromper etiquetas ID3.
- **Acceso Remoto**: Soporte integrado tanto para Tailscale (sidecar opcional) como para Proxies Reversos (Caddy / Nginx / Traefik / Cloudflare Tunnel).

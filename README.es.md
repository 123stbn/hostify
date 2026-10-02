# 🎧 Hostify: Personal Music Cloud (Self-Hosted Spotify Alternative)

**Hostify** es un *appliance* de software llave en mano diseñado para transformar un stack técnico de contenedores Docker en una nube privada de streaming de audio en alta fidelidad (FLAC/Opus/MP3), con la experiencia de usuario fluida y elegante de Spotify, pero bajo control 100% propio.

Elimina por completo la necesidad de editar archivos YAML en la terminal, gestionar permisos de Linux o lidiar con configuraciones complejas gracias a su **Setup Wizard** web inicial y a su **Dashboard unificado**.

> 🇬🇧 **English documentation**: See [README.md](./README.md).

---

## 🌟 Características Principales

- 🚀 **Onboarding en < 5 minutos:** Asistente web paso a paso (*Setup Wizard*) que autodetecta rutas, crea subdirectorios y valida credenciales.
- ⚡ **Streaming Ultra-Ligero:** Motor basado en **Navidrome** (escrito en Go, consumo de < 60 MB RAM), reemplazando a servidores pesados con total compatibilidad con la API de **OpenSubsonic**.
- 📱 **Ecosistema de Clientes:** Compatible de forma nativa con **Feishin** (cliente de escritorio idéntico a Spotify para macOS, Windows y Linux) y **Symfonium** (el mejor reproductor para Android con ecualizador paramétrico y caché offline).
- 🏷️ **Scrobbling y Metadatos Inteligentes:** Integración desacoplada con **Multi-Scrobbler**, normalización de etiquetas vía **MusicBrainz** y registro automático en **ListenBrainz**.
- 🗂️ **Arquitectura de Ingesta Segmentada:** Módulos de descarga independientes (**Slskd** para Soulseek, **Explo** para descargas directas y el combo **Lidarr + Prowlarr + qBittorrent** para automatización de discografías y tracks con búfer temporal aislado) que depositan en subcarpetas de una biblioteca unificada.
- 🔒 **Acceso Remoto Flexible:** Soporte preparado tanto para redes privadas mesh con **Tailscale** (0 puertos abiertos en el router) como para **Proxies Reversos** con HTTPS propio (Caddy / Nginx / Traefik / Cloudflare Tunnel).
- 📊 **Dashboard Operativo:** Monitoreo en tiempo real del estado de los componentes, visor de logs, inspección de almacenamiento y parámetros de conexión para clientes externos.

---

## 🏗️ Arquitectura de Almacenamiento

Para garantizar la integridad de los metadatos y evitar que archivos incompletos generen errores de indexación, Hostify implementa una estructura de carpetas segmentada:

```text
/volume1/music/                  <-- Montado en Navidrome (/music:ro)
├── explo/                       <-- Destino exclusivo de descargas directas (Explo)
│   └── Artista/Álbum/track.flac
├── slskd/                       <-- Destino exclusivo de Soulseek P2P (Slskd)
│   └── Artista/Álbum/track.flac
└── torrents/                    <-- Descargas BitTorrent COMPLETADAS (qBittorrent)
    └── Artista - Álbum/track.flac

/volume1/docker/qbittorrent/incomplete  <-- Búfer aislado para torrents en progreso (Navidrome NO lo indexa)
```

**Regla de Oro:** Navidrome monta `/volume1/music` en modo solo lectura (`:ro`) y escanea recursivamente todas las subcarpetas. El usuario ve una sola discografía consolidada y limpia en sus aplicaciones.

---

## 🚀 Despliegue Rápido (Multi-Plataforma)

El instalador detecta tu sistema operativo, verifica la presencia de Docker y, si no existe o está detenido, **lo instala y configura automáticamente para iniciar junto con tu sistema operativo**:
- **macOS:** Si falta Docker, instala e inicializa **Colima** (motor ligero open-source) configurándolo con `brew services` para arranque automático con el login.
- **Linux / NAS:** Instala **Docker Engine** oficial vía `get.docker.com` y activa `systemctl enable --now docker`.
- **Windows:** Detecta Docker Desktop o lo aprovisiona automáticamente vía `winget` con inicio automático.

### 🍎 macOS / 🐧 Linux / 🖧 NAS / 💻 WSL:
```bash
curl -fsSL https://raw.githubusercontent.com/123stbn/hostify/main/install.sh | bash
```

### 🪟 Windows (PowerShell como Administrador):
```powershell
irm https://raw.githubusercontent.com/123stbn/hostify/main/install.ps1 | iex
```

### O manual con Git & Docker Compose:
```bash
git clone https://github.com/123stbn/hostify.git
cd hostify
./install.sh   # En macOS/Linux
.\install.ps1  # En Windows PowerShell
```

Una vez desplegado, abre en tu navegador:
👉 **`http://localhost:3000`** (o `http://<IP-DE-TU-SERVIDOR>:3000`) para iniciar el **Setup Wizard**.

---

## 💻 Desarrollo Local del Appliance

Siguiendo las pautas de desarrollo de Hostify, este proyecto utiliza **`pnpm`** de forma obligatoria para la gestión de paquetes:

```bash
cd app

# Instalar dependencias
pnpm install

# Iniciar servidor de desarrollo (Backend Express + Frontend Vite)
pnpm run dev

# Compilar para producción
pnpm run build

# Ejecutar el build de producción
pnpm start
```

---

## 📱 Vinculación de Clientes

### 1. Feishin (Escritorio - Mac / Windows / Linux)
1. Descarga [Feishin Releases](https://github.com/jeffvli/feishin/releases).
2. Selecciona tipo de servidor: **Navidrome / Subsonic**.
3. Servidor URL: `http://<IP-HOST>:4533` (o tu dominio HTTPS / IP de Tailscale).
4. Ingresa las credenciales creadas en tu primer acceso a Navidrome.

### 2. Symfonium (Android)
1. Descarga **Symfonium** en Google Play Store.
2. Añade nuevo proveedor -> **Subsonic**.
3. Ingresa la URL (`http://<IP-HOST>:4533`) y tus credenciales de fonoteca.
4. Activa la sincronización offline para llevar tu música en alta fidelidad donde vayas.

---

## 🔐 Configuración de Acceso Remoto

### Opción A: Tailscale (Recomendada)
- Sin abrir puertos en tu router y con cifrado WireGuard.
- Puedes utilizar el cliente Tailscale ya instalado en tu host/NAS o activar el contenedor sidecar en `docker-compose.yml` (`--profile tailscale`) con tu Auth Key.

### Opción B: Proxy Reverso (Dominio Propio con SSL)
Hostify genera automáticamente la configuración lista para usar en la pestaña **Acceso Remoto**:
- **Caddyfile:**
  ```caddy
  musica.tu-dominio.com {
      reverse_proxy hostify-navidrome:4533
  }
  ```
- **Nginx:** Cabeceras `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto` y `Upgrade` ya preconfiguradas.

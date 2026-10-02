#!/usr/bin/env bash
# ==============================================================================
# HOSTIFY - CROSS-PLATFORM INSTALLER & BOOTSTRAPPER (macOS, Linux, WSL)
# ==============================================================================
# Instala Hostify y asegura un Docker Engine con inicio automático en el SO:
# - macOS: Detecta Docker Desktop o instala y arranca Colima vía brew services
# - Linux: Instala Docker Engine oficial y habilita systemctl enable --now docker
# - Windows: Redirige automáticamente al instalador nativo install.ps1
# ==============================================================================
set -e

COLOR_GREEN="\033[0;32m"
COLOR_CYAN="\033[0;36m"
COLOR_YELLOW="\033[1;33m"
COLOR_RED="\033[0;31m"
COLOR_BOLD="\033[1m"
COLOR_RESET="\033[0m"

echo -e "${COLOR_CYAN}"
echo "  _    _           _   _  __       "
echo " | |  | |         | | (_)/ _|      "
echo " | |__| | ___  ___| |_ _| |_ _   _ "
echo " |  __  |/ _ \/ __| __| |  _| | | |"
echo " | |  | | (_) \__ \ |_| | | | |_| |"
echo " |_|  |_|\___/|___/\__|_|_|  \__, |"
echo "                              __/ |"
echo "                             |___/ "
echo " Personal Music Cloud (Self-Hosted Spotify Alternative)"
echo -e "${COLOR_RESET}"

# Helper para preguntas interactivas (incluso cuando se ejecuta via pipe curl ... | bash)
prompt_confirm() {
    local prompt_msg="$1"
    local default_yes="${2:-true}"
    local response

    if [ "$AUTO_YES" = "true" ] || [ "$CI" = "true" ]; then
        return 0
    fi

    if [ -e /dev/tty ]; then
        if [ "$default_yes" = "true" ]; then
            echo -en "${COLOR_YELLOW}${prompt_msg} [S/n]: ${COLOR_RESET}" > /dev/tty
            read -r response < /dev/tty
            response=${response:-S}
        else
            echo -en "${COLOR_YELLOW}${prompt_msg} [s/N]: ${COLOR_RESET}" > /dev/tty
            read -r response < /dev/tty
            response=${response:-N}
        fi
        case "$response" in
            [sS][iI]|[sS]|y|Y) return 0 ;;
            *) return 1 ;;
        esac
    fi
    return 0
}

# ------------------------------------------------------------------------------
# 1. Detección de Sistema Operativo
# ------------------------------------------------------------------------------
OS_NAME="$(uname -s)"
case "$OS_NAME" in
    Linux*)
        if grep -qi microsoft /proc/version 2>/dev/null; then
            PLATFORM="wsl"
        else
            PLATFORM="linux"
        fi
        ;;
    Darwin*)
        PLATFORM="macos"
        ;;
    CYGWIN*|MINGW*|MSYS*)
        PLATFORM="windows"
        ;;
    *)
        PLATFORM="unknown"
        ;;
esac

echo -e "${COLOR_GREEN}==> Plataforma detectada: ${COLOR_BOLD}${PLATFORM}${COLOR_RESET}"

# ------------------------------------------------------------------------------
# 2. Si es Windows nativo (Git Bash / MSYS), delegar en PowerShell
# ------------------------------------------------------------------------------
if [ "$PLATFORM" = "windows" ]; then
    echo -e "${COLOR_CYAN}==> Windows detectado. Lanzando instalador nativo de PowerShell (install.ps1)...${COLOR_RESET}"
    if [ -f "./install.ps1" ]; then
        powershell.exe -ExecutionPolicy Bypass -File "./install.ps1"
        exit 0
    elif command -v powershell.exe &> /dev/null; then
        powershell.exe -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/123stbn/hostify/main/install.ps1 | iex"
        exit 0
    else
        echo -e "${COLOR_RED}[Error] powershell.exe no encontrado en PATH. Ejecuta install.ps1 desde PowerShell.${COLOR_RESET}"
        exit 1
    fi
fi

# ------------------------------------------------------------------------------
# 3. Verificación y Aprovisionamiento del Motor Docker con Autostart
# ------------------------------------------------------------------------------
ensure_docker_engine() {
    echo -e "${COLOR_GREEN}==> Comprobando disponibilidad de Docker Engine...${COLOR_RESET}"

    # Caso A: Docker ya está activo y respondiendo
    if docker info &> /dev/null; then
        echo -e "${COLOR_GREEN}✔ Docker Engine está activo y operativo.${COLOR_RESET}"

        # Si estamos en macOS con Colima, asegurar que esté configurado el inicio automático con el SO
        if [ "$PLATFORM" = "macos" ] && command -v colima &> /dev/null && command -v brew &> /dev/null; then
            if ! brew services list 2>/dev/null | grep -q "colima.*started"; then
                if prompt_confirm "¿Deseas que Colima (Docker) inicie automáticamente cada vez que inicies sesión en macOS?"; then
                    echo -e "${COLOR_CYAN}==> Configurando inicio automático de Colima con macOS (brew services)...${COLOR_RESET}"
                    brew services start colima 2>/dev/null || true
                fi
            fi
        fi

        # Si estamos en Linux, asegurar que systemd tenga docker habilitado al inicio
        if [ "$PLATFORM" = "linux" ] && command -v systemctl &> /dev/null; then
            if ! systemctl is-enabled docker &> /dev/null; then
                echo -e "${COLOR_CYAN}==> Habilitando inicio automático de Docker en el arranque del sistema (systemctl)...${COLOR_RESET}"
                sudo systemctl enable docker 2>/dev/null || true
            fi
        fi
        return 0
    fi

    # Caso B: Docker no está respondiendo. Resolver según la plataforma.
    echo -e "${COLOR_YELLOW}[!] Docker Engine no está en ejecución.${COLOR_RESET}"

    if [ "$PLATFORM" = "macos" ]; then
        # 1. Comprobar si Colima ya está instalado
        if command -v colima &> /dev/null; then
            echo -e "${COLOR_CYAN}==> Colima detectado en macOS. Iniciando motor...${COLOR_RESET}"
            if command -v brew &> /dev/null; then
                echo -e "${COLOR_GREEN}==> Iniciando y configurando Colima con inicio automático del SO (brew services)...${COLOR_RESET}"
                brew services start colima 2>/dev/null || colima start
            else
                colima start
            fi
            docker context use colima 2>/dev/null || true
        # 2. Comprobar si Docker Desktop está instalado
        elif [ -d "/Applications/Docker.app" ]; then
            echo -e "${COLOR_CYAN}==> Docker Desktop detectado. Abriendo la aplicación...${COLOR_RESET}"
            open -a Docker
            echo -e "${COLOR_YELLOW}Esperando a que Docker Desktop termine de iniciar...${COLOR_RESET}"
            local attempts=0
            while ! docker info &> /dev/null && [ $attempts -lt 30 ]; do
                sleep 2
                attempts=$((attempts + 1))
                echo -n "."
            done
            echo ""
        # 3. No hay ningún motor instalado en macOS
        else
            echo -e "${COLOR_YELLOW}No se encontró ningún motor Docker en este Mac.${COLOR_RESET}"
            echo -e "${COLOR_CYAN}Hostify puede instalar Colima (motor Docker ligero, de código abierto y sin coste de licencias).${COLOR_RESET}"
            
            if prompt_confirm "¿Deseas instalar Colima y configurarlo para iniciar automáticamente con macOS?"; then
                if ! command -v brew &> /dev/null; then
                    echo -e "${COLOR_CYAN}==> Homebrew no detectado. Instalando Homebrew...${COLOR_RESET}"
                    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
                    if [ -f "/opt/homebrew/bin/brew" ]; then
                        eval "$(/opt/homebrew/bin/brew shellenv)"
                    elif [ -f "/usr/local/bin/brew" ]; then
                        eval "$(/usr/local/bin/brew shellenv)"
                    fi
                fi

                echo -e "${COLOR_CYAN}==> Instalando Colima, Docker CLI y Docker Compose vía Homebrew...${COLOR_RESET}"
                brew install colima docker docker-compose

                echo -e "${COLOR_GREEN}==> Configurando Colima para iniciar automáticamente con macOS...${COLOR_RESET}"
                brew services start colima 2>/dev/null || colima start
                docker context use colima 2>/dev/null || true
            else
                echo -e "${COLOR_RED}[Error] Se requiere un motor Docker para ejecutar Hostify.${COLOR_RESET}"
                echo "Instala Docker Desktop (https://www.docker.com/products/docker-desktop/) o Colima manualmente."
                exit 1
            fi
        fi

    elif [ "$PLATFORM" = "linux" ] || [ "$PLATFORM" = "wsl" ]; then
        if ! command -v docker &> /dev/null; then
            echo -e "${COLOR_YELLOW}Docker no está instalado en este sistema Linux.${COLOR_RESET}"
            if prompt_confirm "¿Deseas que Hostify instale Docker Engine oficial y lo configure para iniciar con el sistema?"; then
                echo -e "${COLOR_CYAN}==> Descargando e instalando Docker Engine oficial (get.docker.com)...${COLOR_RESET}"
                curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
                sudo sh /tmp/get-docker.sh
                rm -f /tmp/get-docker.sh

                if command -v systemctl &> /dev/null; then
                    echo -e "${COLOR_GREEN}==> Habilitando inicio automático con el sistema (systemctl enable --now docker)...${COLOR_RESET}"
                    sudo systemctl enable --now docker
                else
                    sudo service docker start || true
                fi

                # Agregar usuario al grupo docker para evitar requerir sudo
                if [ "$USER" != "root" ] && [ -n "$USER" ]; then
                    sudo usermod -aG docker "$USER" 2>/dev/null || true
                    echo -e "${COLOR_YELLOW}[Nota] Tu usuario ($USER) ha sido añadido al grupo 'docker'.${COLOR_RESET}"
                fi
            else
                echo -e "${COLOR_RED}[Error] Docker es requerido para ejecutar Hostify.${COLOR_RESET}"
                exit 1
            fi
        else
            # Docker está instalado pero el demonio está parado
            echo -e "${COLOR_CYAN}==> Iniciando servicio de Docker...${COLOR_RESET}"
            if command -v systemctl &> /dev/null; then
                sudo systemctl enable --now docker 2>/dev/null || sudo systemctl start docker
            else
                sudo service docker start 2>/dev/null || true
            fi
        fi
    fi

    # Verificar que Docker quedó activo
    if ! docker info &> /dev/null; then
        echo -e "${COLOR_RED}[Error] No fue posible establecer comunicación con Docker Engine.${COLOR_RESET}"
        echo "Verifica que el demonio de Docker esté corriendo o reinicia tu sesión de usuario."
        exit 1
    fi
}

ensure_docker_engine

# ------------------------------------------------------------------------------
# 4. Comprobar Docker Compose
# ------------------------------------------------------------------------------
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo -e "${COLOR_YELLOW}==> Docker Compose no encontrado. Intentando instalar plugin...${COLOR_RESET}"
    if [ "$PLATFORM" = "macos" ] && command -v brew &> /dev/null; then
        brew install docker-compose
        DOCKER_COMPOSE_CMD="docker compose"
    elif [ "$PLATFORM" = "linux" ]; then
        sudo apt-get update && sudo apt-get install -y docker-compose-plugin 2>/dev/null || true
        DOCKER_COMPOSE_CMD="docker compose"
    else
        echo -e "${COLOR_RED}[Error] Docker Compose no está disponible. Por favor instálalo.${COLOR_RESET}"
        exit 1
    fi
fi

# ------------------------------------------------------------------------------
# 5. Preparar Directorio de Hostify
# ------------------------------------------------------------------------------
# Si el script se ejecuta dentro de un repositorio ya clonado con docker-compose.yml
if [ -f "./docker-compose.yml" ] && [ -d "./app" ]; then
    INSTALL_DIR="$(pwd)"
    echo -e "${COLOR_CYAN}==> Ejecutando en repositorio local: ${INSTALL_DIR}${COLOR_RESET}"
else
    INSTALL_DIR="${HOSTIFY_DIR:-$HOME/hostify}"
    echo -e "${COLOR_CYAN}==> Directorio de instalación: ${INSTALL_DIR}${COLOR_RESET}"
    mkdir -p "$INSTALL_DIR"
    cd "$INSTALL_DIR"

    # Si no están los archivos, clonar o descargar desde GitHub
    if [ ! -f "docker-compose.yml" ]; then
        echo -e "${COLOR_CYAN}==> Descargando archivos de Hostify...${COLOR_RESET}"
        if command -v git &> /dev/null; then
            git clone https://github.com/123stbn/hostify.git .
        else
            curl -fsSL https://github.com/123stbn/hostify/archive/refs/heads/main.tar.gz | tar -xz --strip-components=1
        fi
    fi
fi

cd "$INSTALL_DIR"

# ------------------------------------------------------------------------------
# 6. Detección de Rutas Inteligentes y Configuración de .env
# ------------------------------------------------------------------------------
DEFAULT_MUSIC="/volume1/music"
DEFAULT_DOCKER="/volume1/docker"

if [ "$PLATFORM" = "macos" ]; then
    DEFAULT_MUSIC="$HOME/Music"
    DEFAULT_DOCKER="$HOME/docker"
elif [ "$PLATFORM" = "linux" ] || [ "$PLATFORM" = "wsl" ]; then
    if [ ! -d "/volume1" ]; then
        DEFAULT_MUSIC="$HOME/Music"
        DEFAULT_DOCKER="$HOME/docker"
    fi
fi

DETECTED_PUID="$(id -u 2>/dev/null || echo 1000)"
DETECTED_PGID="$(id -g 2>/dev/null || echo 10)"

# Detección de Zona Horaria
DETECTED_TZ="America/Lima"
if [ "$PLATFORM" = "macos" ]; then
    LOCALTIME_LINK="$(readlink /etc/localtime 2>/dev/null || true)"
    if [[ "$LOCALTIME_LINK" =~ zoneinfo/(.*) ]]; then
        DETECTED_TZ="${BASH_REMATCH[1]}"
    fi
elif [ "$PLATFORM" = "linux" ]; then
    if command -v timedatectl &> /dev/null; then
        DETECTED_TZ="$(timedatectl show --property=Timezone --value 2>/dev/null || echo America/Lima)"
    elif [ -f /etc/timezone ]; then
        DETECTED_TZ="$(cat /etc/timezone)"
    fi
fi

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
    else
        echo -e "${COLOR_YELLOW}==> Generando archivo de configuración inicial (.env)...${COLOR_RESET}"
        cat << EOF > .env
# ==============================================================================
# HOSTIFY APPLIANCE - AUTO-GENERATED CONFIGURATION
# ==============================================================================
PUID=${DETECTED_PUID}
PGID=${DETECTED_PGID}
TZ=${DETECTED_TZ}
HOSTIFY_PORT=3000
NAVIDROME_PORT=4533
FEISHIN_PORT=9188
NAVIDROME_ADMIN_USER=admin
NAVIDROME_ADMIN_PASSWORD=admin
MUSIC_ROOT=${DEFAULT_MUSIC}
DOCKER_DATA=${DEFAULT_DOCKER}
BASE_URL=
LZ_USER=
LZ_TOKEN=
SLSKD_USERNAME=hostify_user
SLSKD_PASSWORD=$(LC_ALL=C tr -dc 'a-zA-Z0-9' < /dev/urandom 2>/dev/null | head -c 12 || echo "hostify_pass")
SLSKD_API_KEY=$(LC_ALL=C tr -dc 'a-zA-Z0-9' < /dev/urandom 2>/dev/null | head -c 24 || echo "hostify_api_key")
LIDARR_API_KEY=$(LC_ALL=C tr -dc 'a-zA-Z0-9' < /dev/urandom 2>/dev/null | head -c 32 || echo "lidarr_secret_key")
PROWLARR_API_KEY=$(LC_ALL=C tr -dc 'a-zA-Z0-9' < /dev/urandom 2>/dev/null | head -c 32 || echo "prowlarr_secret_key")
EOF
        # Permisos estrictos para evitar lectura de credenciales por otros usuarios
        chmod 600 .env 2>/dev/null || true
    fi
fi

# ------------------------------------------------------------------------------
# 7. Despliegue de Hostify Appliance
# ------------------------------------------------------------------------------
echo -e "${COLOR_GREEN}==> Desplegando Hostify Appliance...${COLOR_RESET}"
$DOCKER_COMPOSE_CMD up -d --build hostify

# ------------------------------------------------------------------------------
# 8. Obtener Dirección IP y Mostrar Mensaje de Bienvenida
# ------------------------------------------------------------------------------
HOST_IP="localhost"
if [ "$PLATFORM" = "macos" ]; then
    HOST_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "127.0.0.1")"
elif [ "$PLATFORM" = "linux" ]; then
    HOST_IP="$(hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")"
fi

echo ""
echo -e "${COLOR_GREEN}================================================================${COLOR_RESET}"
echo -e "${COLOR_BOLD}${COLOR_GREEN}  ¡Hostify Appliance desplegado y listo!                        ${COLOR_RESET}"
echo -e "${COLOR_GREEN}================================================================${COLOR_RESET}"
echo ""
echo -e "Abre el Asistente de Configuración (Wizard) en tu navegador:"
echo -e "  Local:        ${COLOR_CYAN}http://localhost:3000${COLOR_RESET}"
if [ "$HOST_IP" != "127.0.0.1" ] && [ "$HOST_IP" != "localhost" ]; then
    echo -e "  Red Local:    ${COLOR_CYAN}http://${HOST_IP}:3000${COLOR_RESET}"
fi
echo ""
echo -e "El asistente te guiará para:"
echo -e "  1. Seleccionar carpetas de música y datos."
echo -e "  2. Definir tus credenciales maestras y conectar ListenBrainz."
echo -e "  3. Elegir motores de descarga (Explo, Slskd, Torrents, Lidarr)."
echo -e "  4. Configurar acceso remoto con Tailscale o Reverse Proxy."
echo ""
echo -e "${COLOR_GREEN}Tu motor Docker se encuentra configurado para iniciar automáticamente con tu sistema operativo.${COLOR_RESET}"
echo ""

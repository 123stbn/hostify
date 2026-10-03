#!/usr/bin/env bash
# ==============================================================================
# HOSTIFY - CROSS-PLATFORM INSTALLER & BOOTSTRAPPER (macOS, Linux, WSL)
# ==============================================================================
# Installs Hostify and ensures Docker Engine with automatic boot in OS:
# - macOS: Detects Docker Desktop or installs and starts Colima via brew services
# - Linux: Installs official Docker Engine and enables systemctl enable --now docker
# - Windows: Automatically redirects to native PowerShell installer install.ps1
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

# Helper for interactive prompts (even when piped through curl ... | bash)
prompt_confirm() {
    local prompt_msg="$1"
    local default_yes="${2:-true}"
    local response

    if [ "$AUTO_YES" = "true" ] || [ "$CI" = "true" ]; then
        return 0
    fi

    if [ -e /dev/tty ]; then
        if [ "$default_yes" = "true" ]; then
            echo -en "${COLOR_YELLOW}${prompt_msg} [Y/n]: ${COLOR_RESET}" > /dev/tty
            read -r response < /dev/tty
            response=${response:-Y}
        else
            echo -en "${COLOR_YELLOW}${prompt_msg} [y/N]: ${COLOR_RESET}" > /dev/tty
            read -r response < /dev/tty
            response=${response:-N}
        fi
        case "$response" in
            [yY][eE][sS]|[yY]|[sS][iI]|[sS]) return 0 ;;
            *) return 1 ;;
        esac
    fi
    return 0
}

# ------------------------------------------------------------------------------
# 1. Operating System Detection
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

echo -e "${COLOR_GREEN}==> Detected platform: ${COLOR_BOLD}${PLATFORM}${COLOR_RESET}"

# ------------------------------------------------------------------------------
# 2. Windows Native (Git Bash / MSYS) delegation to PowerShell
# ------------------------------------------------------------------------------
if [ "$PLATFORM" = "windows" ]; then
    echo -e "${COLOR_CYAN}==> Windows detected. Launching native PowerShell installer (install.ps1)...${COLOR_RESET}"
    if [ -f "./install.ps1" ]; then
        powershell.exe -ExecutionPolicy Bypass -File "./install.ps1"
        exit 0
    elif command -v powershell.exe &> /dev/null; then
        powershell.exe -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/123stbn/hostify/main/install.ps1 | iex"
        exit 0
    else
        echo -e "${COLOR_RED}[Error] powershell.exe not found in PATH. Please run install.ps1 directly from PowerShell.${COLOR_RESET}"
        exit 1
    fi
fi

# ------------------------------------------------------------------------------
# 3. Check and Provision Docker Engine with Autostart
# ------------------------------------------------------------------------------
ensure_docker_engine() {
    echo -e "${COLOR_GREEN}==> Checking Docker Engine availability...${COLOR_RESET}"

    # Case A: Docker is already running and responding
    if docker info &> /dev/null; then
        echo -e "${COLOR_GREEN}✔ Docker Engine is up and running.${COLOR_RESET}"

        # If on macOS with Colima, ensure automatic startup on login
        if [ "$PLATFORM" = "macos" ] && command -v colima &> /dev/null && command -v brew &> /dev/null; then
            if ! brew services list 2>/dev/null | grep -q "colima.*started"; then
                if prompt_confirm "Do you want Colima (Docker) to start automatically whenever you log into macOS?"; then
                    echo -e "${COLOR_CYAN}==> Configuring Colima autostart with macOS (brew services)...${COLOR_RESET}"
                    brew services start colima 2>/dev/null || true
                fi
            fi
        fi

        # If on Linux, ensure systemd has docker enabled on boot
        if [ "$PLATFORM" = "linux" ] && command -v systemctl &> /dev/null; then
            if ! systemctl is-enabled docker &> /dev/null; then
                echo -e "${COLOR_CYAN}==> Enabling Docker autostart on system boot (systemctl)...${COLOR_RESET}"
                sudo systemctl enable docker 2>/dev/null || true
            fi
        fi
        return 0
    fi

    # Case B: Docker is not running. Resolve by platform.
    echo -e "${COLOR_YELLOW}[!] Docker Engine is not currently running.${COLOR_RESET}"

    if [ "$PLATFORM" = "macos" ]; then
        # 1. Check if Colima is already installed
        if command -v colima &> /dev/null; then
            echo -e "${COLOR_CYAN}==> Colima detected on macOS. Starting engine...${COLOR_RESET}"
            if command -v brew &> /dev/null; then
                echo -e "${COLOR_GREEN}==> Starting and configuring Colima with OS autostart (brew services)...${COLOR_RESET}"
                brew services start colima 2>/dev/null || colima start
            else
                colima start
            fi
            docker context use colima 2>/dev/null || true
        # 2. Check if Docker Desktop is installed
        elif [ -d "/Applications/Docker.app" ]; then
            echo -e "${COLOR_CYAN}==> Docker Desktop detected. Launching application...${COLOR_RESET}"
            open -a Docker
            echo -e "${COLOR_YELLOW}Waiting for Docker Desktop to finish booting...${COLOR_RESET}"
            local attempts=0
            while ! docker info &> /dev/null && [ $attempts -lt 30 ]; do
                sleep 2
                attempts=$((attempts + 1))
                echo -n "."
            done
            echo ""
        # 3. No Docker engine installed on macOS
        else
            echo -e "${COLOR_YELLOW}No Docker engine was found on this Mac.${COLOR_RESET}"
            echo -e "${COLOR_CYAN}Hostify can install Colima (a lightweight, open-source Docker engine with zero license fees).${COLOR_RESET}"
            
            if prompt_confirm "Do you want to install Colima and configure it to start automatically with macOS?"; then
                if ! command -v brew &> /dev/null; then
                    echo -e "${COLOR_CYAN}==> Homebrew not detected. Installing Homebrew...${COLOR_RESET}"
                    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
                    if [ -f "/opt/homebrew/bin/brew" ]; then
                        eval "$(/opt/homebrew/bin/brew shellenv)"
                    elif [ -f "/usr/local/bin/brew" ]; then
                        eval "$(/usr/local/bin/brew shellenv)"
                    fi
                fi

                echo -e "${COLOR_CYAN}==> Installing Colima, Docker CLI and Docker Compose via Homebrew...${COLOR_RESET}"
                brew install colima docker docker-compose

                echo -e "${COLOR_GREEN}==> Configuring Colima to start automatically with macOS...${COLOR_RESET}"
                brew services start colima 2>/dev/null || colima start
                docker context use colima 2>/dev/null || true
            else
                echo -e "${COLOR_RED}[Error] A Docker engine is required to run Hostify.${COLOR_RESET}"
                echo "Please install Docker Desktop (https://www.docker.com/products/docker-desktop/) or Colima manually."
                exit 1
            fi
        fi

    elif [ "$PLATFORM" = "linux" ] || [ "$PLATFORM" = "wsl" ]; then
        if ! command -v docker &> /dev/null; then
            echo -e "${COLOR_YELLOW}Docker is not installed on this Linux system.${COLOR_RESET}"
            if prompt_confirm "Do you want Hostify to install official Docker Engine and enable autostart?"; then
                echo -e "${COLOR_CYAN}==> Downloading and installing official Docker Engine (get.docker.com)...${COLOR_RESET}"
                curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
                sudo sh /tmp/get-docker.sh
                rm -f /tmp/get-docker.sh

                if command -v systemctl &> /dev/null; then
                    echo -e "${COLOR_GREEN}==> Enabling Docker autostart on system boot (systemctl enable --now docker)...${COLOR_RESET}"
                    sudo systemctl enable --now docker
                else
                    sudo service docker start || true
                fi

                # Add user to docker group to avoid sudo
                if [ "$USER" != "root" ] && [ -n "$USER" ]; then
                    sudo usermod -aG docker "$USER" 2>/dev/null || true
                    echo -e "${COLOR_YELLOW}[Note] Your user ($USER) has been added to the 'docker' group.${COLOR_RESET}"
                fi
            else
                echo -e "${COLOR_RED}[Error] Docker is required to run Hostify.${COLOR_RESET}"
                exit 1
            fi
        else
            # Docker is installed but daemon is stopped
            echo -e "${COLOR_CYAN}==> Starting Docker service...${COLOR_RESET}"
            if command -v systemctl &> /dev/null; then
                sudo systemctl enable --now docker 2>/dev/null || sudo systemctl start docker
            else
                sudo service docker start 2>/dev/null || true
            fi
        fi
    fi

    # Verify Docker is responsive
    if ! docker info &> /dev/null; then
        echo -e "${COLOR_RED}[Error] Could not establish communication with Docker Engine.${COLOR_RESET}"
        echo "Make sure the Docker daemon is running or log out and log back in."
        exit 1
    fi
}

ensure_docker_engine

# ------------------------------------------------------------------------------
# 4. Check Docker Compose
# ------------------------------------------------------------------------------
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo -e "${COLOR_YELLOW}==> Docker Compose not found. Attempting to install plugin...${COLOR_RESET}"
    if [ "$PLATFORM" = "macos" ] && command -v brew &> /dev/null; then
        brew install docker-compose
        DOCKER_COMPOSE_CMD="docker compose"
    elif [ "$PLATFORM" = "linux" ]; then
        sudo apt-get update && sudo apt-get install -y docker-compose-plugin 2>/dev/null || true
        DOCKER_COMPOSE_CMD="docker compose"
    else
        echo -e "${COLOR_RED}[Error] Docker Compose is not available. Please install it.${COLOR_RESET}"
        exit 1
    fi
fi

# ------------------------------------------------------------------------------
# 5. Prepare Hostify Directory
# ------------------------------------------------------------------------------
# If running inside an already cloned repository with docker-compose.yml
if [ -f "./docker-compose.yml" ] && [ -d "./app" ]; then
    INSTALL_DIR="$(pwd)"
    echo -e "${COLOR_CYAN}==> Running inside local repository: ${INSTALL_DIR}${COLOR_RESET}"
else
    INSTALL_DIR="${HOSTIFY_DIR:-$HOME/hostify}"
    echo -e "${COLOR_CYAN}==> Installation directory: ${INSTALL_DIR}${COLOR_RESET}"
    mkdir -p "$INSTALL_DIR"
    cd "$INSTALL_DIR"

    # If files are missing, clone or download from GitHub
    if [ ! -f "docker-compose.yml" ]; then
        echo -e "${COLOR_CYAN}==> Downloading Hostify files...${COLOR_RESET}"
        if command -v git &> /dev/null; then
            git clone https://github.com/123stbn/hostify.git .
        else
            curl -fsSL https://github.com/123stbn/hostify/archive/refs/heads/main.tar.gz | tar -xz --strip-components=1
        fi
    elif [ -d ".git" ] && command -v git &> /dev/null; then
        echo -e "${COLOR_CYAN}==> Checking for Hostify code updates (git pull)...${COLOR_RESET}"
        git pull --quiet 2>/dev/null || true
    fi
fi

cd "$INSTALL_DIR"

# ------------------------------------------------------------------------------
# 6. Smart Path Detection and Initial .env Setup
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

# Timezone Detection
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

# Host LAN IP and Hostname Detection
DETECTED_HOST_IP="127.0.0.1"
DETECTED_HOSTNAME="hostify"
DETECTED_AVAHI_IFACE="eth0"
if [ "$PLATFORM" = "macos" ]; then
    DETECTED_HOST_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "127.0.0.1")"
    # En macOS la interfaz real suele ser en0 (WiFi) o en1 (Ethernet)
    DETECTED_AVAHI_IFACE="$(route -n get default 2>/dev/null | awk '/interface:/{print $2}' | head -1 || echo "en0")"
elif [ "$PLATFORM" = "linux" ]; then
    DETECTED_HOST_IP="$(hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")"
    # Detectar interfaz con ruta default (eth0, ens3, enp3s0, wlan0, etc.)
    DETECTED_AVAHI_IFACE="$(ip route show default 2>/dev/null | awk '/default/{print $5}' | head -1 || echo "eth0")"
fi

if [ ! -f .env ]; then
    echo -e "${COLOR_YELLOW}==> Generating initial configuration file (.env)...${COLOR_RESET}"
    cat << EOF > .env
# ==============================================================================
# HOSTIFY APPLIANCE - AUTO-GENERATED CONFIGURATION
# ==============================================================================
PUID=${DETECTED_PUID}
PGID=${DETECTED_PGID}
TZ=${DETECTED_TZ}
HOST_IP=${DETECTED_HOST_IP}
HOST_HOSTNAME=${DETECTED_HOSTNAME}
AVAHI_IFACE=${DETECTED_AVAHI_IFACE}
HOSTIFY_PORT=3500
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
    # Strict permissions to protect credentials from other users
    chmod 600 .env 2>/dev/null || true
else
    # Update HOST_IP in .env if not present or stale
    if ! grep -q "^HOST_IP=" .env; then
        echo "HOST_IP=${DETECTED_HOST_IP}" >> .env
    elif [ "$DETECTED_HOST_IP" != "127.0.0.1" ]; then
        sed -i.bak "s/^HOST_IP=.*/HOST_IP=${DETECTED_HOST_IP}/" .env && rm -f .env.bak
    fi
    # Update AVAHI_IFACE in .env if not present
    if ! grep -q "^AVAHI_IFACE=" .env; then
        echo "AVAHI_IFACE=${DETECTED_AVAHI_IFACE}" >> .env
    fi
fi

# ------------------------------------------------------------------------------
# 7. Deploy & Update Hostify Services
# ------------------------------------------------------------------------------
echo -e "${COLOR_GREEN}==> Updating Docker images to latest versions...${COLOR_RESET}"
$DOCKER_COMPOSE_CMD pull -q 2>/dev/null || true

if [ -f .hostify_configured.json ]; then
    echo -e "${COLOR_GREEN}==> Hostify already configured. Updating and redeploying entire stack...${COLOR_RESET}"
    $DOCKER_COMPOSE_CMD up -d --build --remove-orphans
else
    echo -e "${COLOR_GREEN}==> Deploying Hostify Appliance...${COLOR_RESET}"
    $DOCKER_COMPOSE_CMD up -d --build hostify
fi

# ------------------------------------------------------------------------------
# 8. mDNS Registration: hostify.local
# ------------------------------------------------------------------------------
# Strategy:
#   - macOS: Register with Bonjour (dns-sd) via a LaunchAgent — works with both
#            Docker Desktop and Colima since it runs on the Mac itself.
#   - Linux: Avahi sidecar in docker-compose handles this natively.
# ------------------------------------------------------------------------------
MDNS_HOSTNAME="${HOST_HOSTNAME:-hostify}"

if [ "$PLATFORM" = "macos" ] && command -v dns-sd &>/dev/null; then
    echo -e "${COLOR_CYAN}==> Registering ${MDNS_HOSTNAME}.local with macOS Bonjour (mDNS)...${COLOR_RESET}"

    HOSTIFY_PORT_VAL="${HOSTIFY_PORT:-3500}"
    NAVIDROME_PORT_VAL="${NAVIDROME_PORT:-4533}"

    # Create a LaunchAgent plist that keeps dns-sd running at login
    PLIST_DIR="${HOME}/Library/LaunchAgents"
    PLIST_FILE="${PLIST_DIR}/com.hostify.mdns.plist"
    mkdir -p "${PLIST_DIR}"

    cat > "${PLIST_FILE}" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.hostify.mdns</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/dns-sd</string>
        <string>-P</string>
        <string>Hostify</string>
        <string>_http._tcp</string>
        <string>local</string>
        <string>${HOSTIFY_PORT_VAL}</string>
        <string>${MDNS_HOSTNAME}.local</string>
        <string>127.0.0.1</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/hostify-mdns.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/hostify-mdns-err.log</string>
</dict>
</plist>
PLIST

    # Unload previous registration if exists, then load new one
    launchctl unload "${PLIST_FILE}" 2>/dev/null || true
    launchctl load -w "${PLIST_FILE}"
    echo -e "${COLOR_GREEN}  ✓ ${MDNS_HOSTNAME}.local registered. Resolvable on this Mac and all LAN devices.${COLOR_RESET}"
fi

# ------------------------------------------------------------------------------
# 9. Get Host IP and Show Welcome Message
# ------------------------------------------------------------------------------
HOST_IP="localhost"
if [ "$PLATFORM" = "macos" ]; then
    HOST_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "127.0.0.1")"
elif [ "$PLATFORM" = "linux" ]; then
    HOST_IP="$(hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")"
fi

HOSTIFY_PORT_VAL="${HOSTIFY_PORT:-3500}"
NAVIDROME_PORT_VAL="${NAVIDROME_PORT:-4533}"

echo ""
echo -e "${COLOR_GREEN}================================================================${COLOR_RESET}"
echo -e "${COLOR_BOLD}${COLOR_GREEN}  Hostify Appliance successfully deployed and ready!           ${COLOR_RESET}"
echo -e "${COLOR_GREEN}================================================================${COLOR_RESET}"
echo ""
echo -e "Open the Setup Wizard in your browser:"
echo -e "  ${COLOR_BOLD}mDNS (recomendado):${COLOR_RESET} ${COLOR_CYAN}http://${MDNS_HOSTNAME}.local:${HOSTIFY_PORT_VAL}${COLOR_RESET}"
echo -e "  Local:              ${COLOR_CYAN}http://localhost:${HOSTIFY_PORT_VAL}${COLOR_RESET}"
if [ "$HOST_IP" != "127.0.0.1" ] && [ "$HOST_IP" != "localhost" ]; then
    echo -e "  Red local (IP):     ${COLOR_CYAN}http://${HOST_IP}:${HOSTIFY_PORT_VAL}${COLOR_RESET}"
fi
echo ""
echo -e "El wizard te guiará para:"
echo -e "  1. Seleccionar tu directorio de música."
echo -e "  2. Definir credenciales y conectar ListenBrainz."
echo -e "  3. Elegir descargadores (Explo, Slskd, Torrents, Lidarr)."
echo -e "  4. Configurar acceso remoto con Tailscale o Proxy Reverso."
echo ""
echo -e "${COLOR_GREEN}Docker está configurado para iniciarse automáticamente con tu sistema operativo.${COLOR_RESET}"
echo ""

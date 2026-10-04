# ==============================================================================
# HOSTIFY - CROSS-PLATFORM POWERSHELL INSTALLER & BOOTSTRAPPER (WINDOWS)
# ==============================================================================
# Installs Hostify on Windows and ensures Docker Engine with automatic boot in OS:
# - Checks if Docker Desktop is installed and running
# - If missing, installs it automatically via winget or downloads official installer
# - Configures Windows environment variables and starts the stack
# ==============================================================================
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "  _    _           _   _  __       " -ForegroundColor Cyan
Write-Host " | |  | |         | | (_)/ _|      " -ForegroundColor Cyan
Write-Host " | |__| | ___  ___| |_ _| |_ _   _ " -ForegroundColor Cyan
Write-Host " |  __  |/ _ \/ __| __| |  _| | | |" -ForegroundColor Cyan
Write-Host " | |  | | (_) \__ \ |_| | | | |_| |" -ForegroundColor Cyan
Write-Host " |_|  |_|\___/|___/\__|_|_|  \__, |" -ForegroundColor Cyan
Write-Host "                              __/ |" -ForegroundColor Cyan
Write-Host "                             |___/ " -ForegroundColor Cyan
Write-Host " Personal Music Cloud (Self-Hosted Spotify Alternative)" -ForegroundColor White
Write-Host ""

function Prompt-Confirm ($message) {
    Write-Host "$message [Y/n]: " -ForegroundColor Yellow -NoNewline
    $response = Read-Host
    if ([string]::IsNullOrWhiteSpace($response) -or $response -match '^[yYsS]') {
        return $true
    }
    return $false
}

# ------------------------------------------------------------------------------
# 1. Check Docker Desktop Availability
# ------------------------------------------------------------------------------
function Ensure-DockerEngine {
    Write-Host "==> Checking Docker Engine availability..." -ForegroundColor Green
    
    $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
    if ($dockerCmd) {
        $dockerReady = & docker info 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✔ Docker Desktop is up and running." -ForegroundColor Green
            return
        } else {
            Write-Host "==> Docker is installed but not currently running." -ForegroundColor Yellow
            $desktopPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
            if (Test-Path $desktopPath) {
                Write-Host "==> Starting Docker Desktop..." -ForegroundColor Cyan
                Start-Process $desktopPath
                Write-Host "Waiting for Docker engine to start..." -ForegroundColor Yellow
                $attempts = 0
                while ($attempts -lt 30) {
                    Start-Sleep -Seconds 3
                    $attempts++
                    & docker info 2>$null
                    if ($LASTEXITCODE -eq 0) {
                        Write-Host "`n✔ Docker Desktop successfully started." -ForegroundColor Green
                        return
                    }
                    Write-Host -NoNewline "."
                }
                Write-Host ""
            }
        }
    }

    # If Docker is not installed
    Write-Host "[!] Docker Engine / Docker Desktop is not installed on this machine." -ForegroundColor Yellow
    if (Prompt-Confirm "Do you want Hostify to install Docker Desktop automatically?") {
        $wingetCmd = Get-Command winget -ErrorAction SilentlyContinue
        if ($wingetCmd) {
            Write-Host "==> Installing Docker Desktop via Windows Package Manager (winget)..." -ForegroundColor Cyan
            & winget install -e --id Docker.DockerDesktop --accept-source-agreements --accept-package-agreements
        } else {
            Write-Host "==> Downloading official Docker Desktop installer..." -ForegroundColor Cyan
            $installerUrl = "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe"
            $tempInstaller = "$env:TEMP\DockerDesktopInstaller.exe"
            Invoke-WebRequest -Uri $installerUrl -OutFile $tempInstaller
            Write-Host "==> Running Docker Desktop installer..." -ForegroundColor Cyan
            Start-Process -FilePath $tempInstaller -ArgumentList "install", "--quiet" -Wait
            Remove-Item $tempInstaller -Force -ErrorAction SilentlyContinue
        }

        # Start Docker Desktop
        $desktopPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
        if (Test-Path $desktopPath) {
            Write-Host "==> Starting Docker Desktop..." -ForegroundColor Green
            Start-Process $desktopPath
            Write-Host "Waiting for Docker engine to initialize (may take about a minute)..." -ForegroundColor Yellow
            $attempts = 0
            while ($attempts -lt 40) {
                Start-Sleep -Seconds 3
                $attempts++
                & docker info 2>$null
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "`n✔ Docker Desktop is operational." -ForegroundColor Green
                    return
                }
                Write-Host -NoNewline "."
            }
        }
    } else {
        Write-Error "Docker Desktop is required to run Hostify on Windows. Install it from: https://www.docker.com/products/docker-desktop/"
        exit 1
    }
}

Ensure-DockerEngine

# ------------------------------------------------------------------------------
# 2. Hostify Installation Directory
# ------------------------------------------------------------------------------
$InstallDir = if ($env:HOSTIFY_DIR) { $env:HOSTIFY_DIR } else { "$HOME\hostify" }
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir | Out-Null
}
Set-Location $InstallDir

# Download files if missing or pull updates if git repository exists
if (-not (Test-Path "docker-compose.yml")) {
    Write-Host "==> Downloading Hostify files..." -ForegroundColor Cyan
    $gitCmd = Get-Command git -ErrorAction SilentlyContinue
    if ($gitCmd) {
        git clone https://github.com/123stbn/hostify.git .
    } else {
        Invoke-WebRequest -Uri "https://github.com/123stbn/hostify/archive/refs/heads/main.zip" -OutFile "hostify.zip"
        Expand-Archive -Path "hostify.zip" -DestinationPath "$env:TEMP\hostify_unzip" -Force
        Copy-Item -Path "$env:TEMP\hostify_unzip\hostify-main\*" -Destination $InstallDir -Recurse -Force
        Remove-Item "hostify.zip" -Force
        Remove-Item "$env:TEMP\hostify_unzip" -Recurse -Force
    }
} elseif (Test-Path ".git") {
    $gitCmd = Get-Command git -ErrorAction SilentlyContinue
    if ($gitCmd) {
        Write-Host "==> Checking for Hostify code updates (git pull)..." -ForegroundColor Cyan
        git pull --quiet 2>$null
    }
}

# ------------------------------------------------------------------------------
# 3. Initial .env Configuration for Windows
# ------------------------------------------------------------------------------
$HostIp = "127.0.0.1"
try {
    $HostIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch "vEthernet|Loopback|Docker" -and $_.IPAddress -notlike "169.254*" } | Select-Object -First 1).IPAddress
} catch {}

if (-not (Test-Path ".env")) {
    Write-Host "==> Generating initial configuration file (.env)..." -ForegroundColor Yellow
    
    # Default Windows paths
    $MusicPath = "$HOME\Music"
    $DockerPath = "$HOME\docker"
    if (Test-Path "C:\music") { $MusicPath = "C:\music" }
    if (Test-Path "C:\docker") { $DockerPath = "C:\docker" }

        @"
# ==============================================================================
# HOSTIFY APPLIANCE - AUTO-GENERATED CONFIGURATION (WINDOWS)
# ==============================================================================
PUID=1000
PGID=10
TZ=America/Lima
HOST_IP=$HostIp
HOST_HOSTNAME=hostify
AVAHI_IFACE=eth0
HOSTIFY_PORT=3500
NAVIDROME_PORT=4533
FEISHIN_PORT=9188
NAVIDROME_ADMIN_USER=
NAVIDROME_ADMIN_PASSWORD=
MUSIC_ROOT=$MusicPath
DOCKER_DATA=$DockerPath
BASE_URL=
LZ_USER=
LZ_TOKEN=
SLSKD_USERNAME=hostify_user
SLSKD_PASSWORD=$(-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 12 | ForEach-Object {[char]$_}))
SLSKD_API_KEY=$(-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 24 | ForEach-Object {[char]$_}))
LIDARR_API_KEY=$(-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_}))
PROWLARR_API_KEY=$(-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_}))
"@ | Out-File -Encoding utf8 .env
}

# ------------------------------------------------------------------------------
# 4. Deploy & Update Hostify Services
# ------------------------------------------------------------------------------
Write-Host "==> Updating Docker images to latest versions..." -ForegroundColor Green
docker compose pull -q 2>$null

if (Test-Path ".hostify_configured.json") {
    Write-Host "==> Hostify already configured. Updating and redeploying entire stack..." -ForegroundColor Green
    docker compose up -d --build --remove-orphans
} else {
    Write-Host "==> Deploying Hostify Appliance..." -ForegroundColor Green
    docker compose up -d --build hostify
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  Hostify Appliance successfully deployed and ready!           " -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Open the Setup Wizard in your browser:" -ForegroundColor White
Write-Host "  mDNS (recommended): http://hostify.local:3500" -ForegroundColor Cyan
Write-Host "  Local:              http://localhost:3500" -ForegroundColor Cyan
if ($HostIp -ne "127.0.0.1") {
    Write-Host "  LAN Network (IP):   http://${HostIp}:3500" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "Note: On Windows, hostify.local requires Avahi (WSL2) or Bonjour (Print Services)." -ForegroundColor Yellow
Write-Host "Docker Desktop is configured to start automatically with Windows." -ForegroundColor Green
Write-Host ""

# ==============================================================================
# HOSTIFY - CROSS-PLATFORM POWERSHELL INSTALLER & BOOTSTRAPPER (WINDOWS)
# ==============================================================================
# Instala Hostify en Windows y asegura Docker Engine con inicio automático en el SO:
# - Detecta si Docker Desktop está instalado y corriendo
# - Si falta, lo instala automáticamente vía winget o descarga el instalador oficial
# - Configura variables de entorno para Windows e inicia el stack
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
    Write-Host "$message [S/n]: " -ForegroundColor Yellow -NoNewline
    $response = Read-Host
    if ([string]::IsNullOrWhiteSpace($response) -or $response -match '^[sSyY]') {
        return $true
    }
    return $false
}

# ------------------------------------------------------------------------------
# 1. Comprobar Disponibilidad de Docker Desktop
# ------------------------------------------------------------------------------
function Ensure-DockerEngine {
    Write-Host "==> Verificando disponibilidad de Docker Engine..." -ForegroundColor Green
    
    $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
    if ($dockerCmd) {
        $dockerReady = & docker info 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✔ Docker Desktop está activo y operativo." -ForegroundColor Green
            return
        } else {
            Write-Host "==> Docker está instalado pero no se encuentra en ejecución." -ForegroundColor Yellow
            $desktopPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
            if (Test-Path $desktopPath) {
                Write-Host "==> Iniciando Docker Desktop..." -ForegroundColor Cyan
                Start-Process $desktopPath
                Write-Host "Esperando a que el motor Docker inicie..." -ForegroundColor Yellow
                $attempts = 0
                while ($attempts -lt 30) {
                    Start-Sleep -Seconds 3
                    $attempts++
                    & docker info 2>$null
                    if ($LASTEXITCODE -eq 0) {
                        Write-Host "`n✔ Docker Desktop iniciado correctamente." -ForegroundColor Green
                        return
                    }
                    Write-Host -NoNewline "."
                }
                Write-Host ""
            }
        }
    }

    # Si Docker no está instalado
    Write-Host "[!] Docker Engine / Docker Desktop no está instalado en este equipo." -ForegroundColor Yellow
    if (Prompt-Confirm "¿Deseas que Hostify instale Docker Desktop automáticamente?") {
        $wingetCmd = Get-Command winget -ErrorAction SilentlyContinue
        if ($wingetCmd) {
            Write-Host "==> Instalando Docker Desktop vía Windows Package Manager (winget)..." -ForegroundColor Cyan
            & winget install -e --id Docker.DockerDesktop --accept-source-agreements --accept-package-agreements
        } else {
            Write-Host "==> Descargando instalador oficial de Docker Desktop..." -ForegroundColor Cyan
            $installerUrl = "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe"
            $tempInstaller = "$env:TEMP\DockerDesktopInstaller.exe"
            Invoke-WebRequest -Uri $installerUrl -OutFile $tempInstaller
            Write-Host "==> Ejecutando instalador de Docker Desktop..." -ForegroundColor Cyan
            Start-Process -FilePath $tempInstaller -ArgumentList "install", "--quiet" -Wait
            Remove-Item $tempInstaller -Force -ErrorAction SilentlyContinue
        }

        # Iniciar Docker Desktop
        $desktopPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
        if (Test-Path $desktopPath) {
            Write-Host "==> Iniciando Docker Desktop..." -ForegroundColor Green
            Start-Process $desktopPath
            Write-Host "Esperando a que el motor termine de inicializar (puede tardar un minuto)..." -ForegroundColor Yellow
            $attempts = 0
            while ($attempts -lt 40) {
                Start-Sleep -Seconds 3
                $attempts++
                & docker info 2>$null
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "`n✔ Docker Desktop operativo." -ForegroundColor Green
                    return
                }
                Write-Host -NoNewline "."
            }
        }
    } else {
        Write-Error "Docker Desktop es obligatorio para ejecutar Hostify en Windows. Instálalo desde: https://www.docker.com/products/docker-desktop/"
        exit 1
    }
}

Ensure-DockerEngine

# ------------------------------------------------------------------------------
# 2. Directorio de Instalación de Hostify
# ------------------------------------------------------------------------------
$InstallDir = if ($env:HOSTIFY_DIR) { $env:HOSTIFY_DIR } else { "$HOME\hostify" }
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir | Out-Null
}
Set-Location $InstallDir

# Descargar archivos si no existen
if (-not (Test-Path "docker-compose.yml")) {
    Write-Host "==> Descargando archivos de Hostify..." -ForegroundColor Cyan
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
}

# ------------------------------------------------------------------------------
# 3. Configuración Inicial de .env para Windows
# ------------------------------------------------------------------------------
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
    } else {
        Write-Host "==> Generando archivo de configuración inicial (.env)..." -ForegroundColor Yellow
        
        # Rutas por defecto en Windows
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
HOSTIFY_PORT=3000
NAVIDROME_PORT=4533
FEISHIN_PORT=9188
NAVIDROME_ADMIN_USER=admin
NAVIDROME_ADMIN_PASSWORD=admin
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
}

# ------------------------------------------------------------------------------
# 4. Desplegar Contenedor de Hostify
# ------------------------------------------------------------------------------
Write-Host "==> Desplegando Hostify Appliance..." -ForegroundColor Green
docker compose up -d --build hostify

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  ¡Hostify Appliance desplegado y listo!                        " -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Abre el Asistente de Configuración (Wizard) en tu navegador:" -ForegroundColor White
Write-Host "  Local:        http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Docker Desktop se encuentra configurado para iniciar automáticamente con Windows." -ForegroundColor Green
Write-Host ""

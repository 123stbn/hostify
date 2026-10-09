import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { DeploymentState } from '../types/index.js';
import { PROJECT_DIR, ENV_FILE_PATH, CONFIG_FLAG_PATH, parseEnv, writeEnv } from '../utils/env.js';
import { dockerClient } from './docker.service.js';
import { ensureProwlarrLidarrSetup } from './provisioner.service.js';
import { ensureNavidromeAdmin, triggerNavidromeScan, NavidromeCredentials } from './subsonic.service.js';

let deploymentState: DeploymentState = {
  isDeploying: false,
  logs: [],
  lastError: null,
  startedAt: null,
  finishedAt: null,
};

export function getDeploymentState(): DeploymentState {
  return deploymentState;
}

/**
 * Attach this appliance container to the satellite network (hostify-net).
 * Standalone/Portainer deployments start the appliance in its own stack network, so the
 * reverse proxy gateway could not resolve navidrome, feishin, etc. by service name.
 * Safe to call repeatedly: Docker reports an error if already connected, which is ignored.
 */
export function joinHostifyNetwork(): void {
  if (!fs.existsSync('/.dockerenv') || !dockerClient.isAvailable()) return;
  const self = process.env.HOSTNAME || 'hostify-appliance';
  const proc = spawn('docker', ['network', 'connect', 'hostify-net', self]);
  proc.on('error', () => {});
  proc.on('close', (code) => {
    if (code === 0) console.log('[Hostify Gateway] Appliance attached to hostify-net');
  });
}

/**
 * Compose runs inside this container but bind-mount paths are resolved by the host Docker daemon.
 * If a path (e.g. /music) is a mount destination of this container, return its host source
 * (e.g. /volume1/music). Returns the input unchanged when no mapping is found.
 */
export function toHostPath(p: string): string {
  if (!p || !fs.existsSync('/.dockerenv') || !dockerClient.isAvailable()) return p;
  try {
    const self = process.env.HOSTNAME || 'hostify-appliance';
    const out = execFileSync('docker', ['inspect', '--format', '{{json .Mounts}}', self], { encoding: 'utf8', timeout: 5000 });
    const mounts: { Source: string; Destination: string }[] = JSON.parse(out);
    const match = mounts
      .filter((m) => p === m.Destination || p.startsWith(m.Destination.replace(/\/$/, '') + '/'))
      .sort((a, b) => b.Destination.length - a.Destination.length)[0];
    if (!match) return p;
    return path.posix.join(match.Source, p.slice(match.Destination.length));
  } catch {
    return p;
  }
}

/** Rewrite MUSIC_ROOT / DOCKER_DATA in .env to host paths so satellite mounts resolve on the host. */
function normalizeHostPaths(): void {
  try {
    const env = parseEnv(ENV_FILE_PATH);
    let changed = false;
    for (const key of ['MUSIC_ROOT', 'DOCKER_DATA']) {
      const hostPath = toHostPath(env[key]);
      if (hostPath !== env[key]) {
        env[key] = hostPath;
        changed = true;
      }
    }
    if (changed) writeEnv(ENV_FILE_PATH, env);
  } catch {
    // Best effort: keep existing .env on any failure
  }
}

/**
 * Función global de despliegue con streaming de logs y reintentos automáticos
 */
export function triggerDeploy(previousNavidromeCreds: NavidromeCredentials[] = []): boolean {
  if (!dockerClient.isAvailable()) {
    deploymentState.lastError = 'Docker Engine está apagado. Inicie Colima o Docker Desktop.';
    return false;
  }

  if (deploymentState.isDeploying) {
    return false;
  }

  normalizeHostPaths();

  const composePath = path.join(PROJECT_DIR, 'docker-compose.yml');
  // Standalone/Portainer deployments (no Git checkout) always use the compose template bundled
  // in the image, so image upgrades also refresh a stale docker-compose.yml left in PROJECT_DIR.
  const isGitCheckout = fs.existsSync(path.join(PROJECT_DIR, '.git')) || fs.existsSync(path.join(PROJECT_DIR, 'app'));
  const bundledTemplate = path.join(process.cwd(), 'templates', 'docker-compose.yml');
  if ((!fs.existsSync(composePath) || !isGitCheckout) && fs.existsSync(bundledTemplate)) {
    try {
      if (!fs.existsSync(PROJECT_DIR)) fs.mkdirSync(PROJECT_DIR, { recursive: true });
      fs.copyFileSync(bundledTemplate, composePath);
    } catch (err: any) {
      console.warn('Could not copy internal docker-compose template:', err.message);
    }
  }

  if (!fs.existsSync(composePath)) {
    deploymentState.lastError = 'docker-compose.yml not found';
    return false;
  }

  // Read active modules configuration
  let selectedServices = ['navidrome', 'feishin', 'multi-scrobbler', 'beets'];
  let modulesActive: Record<string, boolean> = {};
  if (fs.existsSync(CONFIG_FLAG_PATH)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_FLAG_PATH, 'utf-8'));
      if (cfg.modules) {
        modulesActive = cfg.modules;
        if (cfg.modules.explo) selectedServices.push('explo');
        if (cfg.modules.slskd) selectedServices.push('slskd');
        if (cfg.modules.qbittorrent) selectedServices.push('qbittorrent');
        if (cfg.modules.prowlarr) selectedServices.push('prowlarr');
        if (cfg.modules.lidarr) selectedServices.push('lidarr');
      }
    } catch {}
  } else {
    selectedServices.push('explo', 'slskd', 'qbittorrent', 'prowlarr', 'lidarr');
    modulesActive = { explo: true, slskd: true, qbittorrent: true, prowlarr: true, lidarr: true };
  }

  // Pre-configure Explo (.env and config) to automatically bypass its setup wizard
  if (modulesActive.explo) {
    try {
      const env = parseEnv(ENV_FILE_PATH);
      const dockerData = env.DOCKER_DATA || '/volume1/docker';
      const exploConfigDir = path.join(dockerData, 'explo', 'config');
      if (!fs.existsSync(exploConfigDir)) {
        fs.mkdirSync(exploConfigDir, { recursive: true });
      }

      let lidarrApiKey = '';
      const lidarrXmlPath = path.join(dockerData, 'lidarr', 'config.xml');
      if (fs.existsSync(lidarrXmlPath)) {
        try {
          const xml = fs.readFileSync(lidarrXmlPath, 'utf-8');
          const m = xml.match(/<ApiKey>(.*?)<\/ApiKey>/i);
          if (m && m[1]) lidarrApiKey = m[1];
        } catch {}
      }

      const downloadServicesList: string[] = [];
      if (modulesActive.slskd) downloadServicesList.push('slskd');
      if (modulesActive.lidarr) downloadServicesList.push('lidarr');

      const exploEnvContent = [
        `WIZARD_COMPLETE=true`,
        `WEB_UI=true`,
        `DISCOVERY_SERVICE=listenbrainz`,
        `LISTENBRAINZ_USER=${env.LZ_USER || ''}`,
        `LISTENBRAINZ_USER_TOKEN=${env.LZ_TOKEN || ''}`,
        `LISTENBRAINZ_DISCOVERY=playlist`,
        `ENRICH_TRACK_METADATA=true`,
        `EXPLO_SYSTEM=subsonic`,
        `SYSTEM_URL=http://hostify-navidrome:${env.NAVIDROME_PORT || 4533}`,
        `SYSTEM_USERNAME=${env.NAVIDROME_ADMIN_USER || ''}`,
        `SYSTEM_PASSWORD=${env.NAVIDROME_ADMIN_PASSWORD || ''}`,
        `DOWNLOAD_SERVICES=${downloadServicesList.join(',')}`,
        `SLSKD_URL=http://hostify-slskd:5030`,
        `SLSKD_API_KEY=${env.SLSKD_API_KEY || ''}`,
        `LIDARR_URL=http://hostify-lidarr:8686`,
        `LIDARR_API_KEY=${lidarrApiKey}`,
        `DOWNLOAD_DIR=/data/`,
        `USE_SUBDIRECTORY=true`,
        `SINGLE_ARTIST=true`,
        `PLAYLISTNAME_FORMAT=week`,
        `LOG_LEVEL=INFO`,
        `WEEKLY_EXPLORATION_SCHEDULE=15 00 * * 2`,
        `WEEKLY_EXPLORATION_FLAGS=--playlist weekly-exploration`,
        `WEEKLY_JAMS_SCHEDULE=30 00 * * 1`,
        `WEEKLY_JAMS_FLAGS=--playlist weekly-jams`,
        `DAILY_JAMS_SCHEDULE=15 01 * * *`,
        `DAILY_JAMS_FLAGS=--playlist daily-jams`,
        `ON_REPEAT_SCHEDULE=00 12 1 * *`,
        `ON_REPEAT_FLAGS=--playlist on-repeat`,
        ``
      ].join('\n');

      fs.writeFileSync(path.join(exploConfigDir, '.env'), exploEnvContent, 'utf-8');
    } catch (err: any) {
      console.warn('Error pre-configurando Explo:', err.message);
    }
  }

  deploymentState = {
    isDeploying: true,
    logs: [
      `[${new Date().toLocaleTimeString()}] 🚀 Iniciando despliegue de servicios: ${selectedServices.join(', ')}...`,
      `[${new Date().toLocaleTimeString()}] 📦 Descargando imágenes y levantando contenedores...`
    ],
    lastError: null,
    startedAt: new Date().toISOString(),
    finishedAt: null,
  };

  const runCompose = (retryCount = 0) => {
    // Explicitly pin the compose project name to 'hostify' and override process.env with updated .env
    const envFromFile = parseEnv(ENV_FILE_PATH);
    const spawnEnv: NodeJS.ProcessEnv = {
      ...process.env,
      ...envFromFile,
    };

    const cmdArgs = [
      'compose',
      '--env-file', ENV_FILE_PATH,
      '-p', 'hostify',
      '-f', composePath,
    ];

    const overridePath = path.join(PROJECT_DIR, 'docker-compose.override.yml');
    if (fs.existsSync(overridePath)) {
      cmdArgs.push('-f', overridePath);
    }

    cmdArgs.push(
      'up',
      '-d',
      '--remove-orphans',
      ...selectedServices,
    );

    const proc = spawn('docker', cmdArgs, {
      cwd: PROJECT_DIR,
      env: spawnEnv,
    });

    const cleanLine = (str: string) => str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').trim();

    proc.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').map(cleanLine).filter(Boolean);
      for (const line of lines) {
        deploymentState.logs.push(`[${new Date().toLocaleTimeString()}] ${line}`);
      }
    });

    proc.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').map(cleanLine).filter(Boolean);
      for (const line of lines) {
        deploymentState.logs.push(`[${new Date().toLocaleTimeString()}] ${line}`);
      }
    });

    proc.on('close', (code) => {
      // hostify-net exists as soon as compose starts, even if a satellite failed afterwards
      joinHostifyNetwork();
      if (code === 0) {
        deploymentState.isDeploying = false;
        deploymentState.finishedAt = new Date().toISOString();
        deploymentState.logs.push(`[${new Date().toLocaleTimeString()}] ✅ ¡Despliegue completado con éxito! Todos los servicios están activos.`);

        const env = parseEnv(ENV_FILE_PATH);
        const dockerData = env.DOCKER_DATA || '/volume1/docker';
        ensureProwlarrLidarrSetup(dockerData, 0);
        // Align Navidrome's admin account with the credentials chosen in the wizard
        ensureNavidromeAdmin(previousNavidromeCreds).catch((err) => {
          console.warn('[Hostify Navidrome] Admin sync failed:', err?.message || err);
        });

        // Trigger library scan on Navidrome so new/updated music folders are immediately indexed
        setTimeout(() => {
          triggerNavidromeScan().then((scanRes) => {
            if (scanRes) {
              console.log('[Hostify Navidrome] Library scan triggered successfully after deploy');
            }
          }).catch((err) => {
            console.warn('[Hostify Navidrome] Library scan trigger failed:', err?.message || err);
          });
        }, 4000);
      } else {
        if (retryCount < 2) {
          const delaySec = (retryCount + 1) * 3;
          deploymentState.logs.push(`[${new Date().toLocaleTimeString()}] ⚠️ Registro ocupado o límite de tasa detectado. Reintentando en ${delaySec} segundos (intento ${retryCount + 2}/3)...`);
          setTimeout(() => {
            runCompose(retryCount + 1);
          }, delaySec * 1000);
        } else {
          deploymentState.isDeploying = false;
          deploymentState.finishedAt = new Date().toISOString();
          deploymentState.lastError = `docker compose finalizó con código ${code}`;
          deploymentState.logs.push(`[${new Date().toLocaleTimeString()}] ❌ Error en despliegue (código ${code}). Puedes pulsar "Reintentar Despliegue".`);
        }
      }
    });
  };

  runCompose(0);
  return true;
}

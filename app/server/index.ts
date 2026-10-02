import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { exec, execSync, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import crypto from 'node:crypto';
import { DockerClient } from './docker.js';

const execAsync = promisify(exec);

// Registro en memoria de logs globales de despliegue/instalación
let deploymentState: {
  isDeploying: boolean;
  logs: string[];
  lastError: string | null;
  startedAt: string | null;
  finishedAt: string | null;
} = {
  isDeploying: false,
  logs: [],
  lastError: null,
  startedAt: null,
  finishedAt: null,
};

const app = express();
const PORT = process.env.HOSTIFY_PORT || 3000;
const dockerClient = new DockerClient();

// Detección automática y rigurosa de Tailscale en el sistema
function detectTailscale(): { detected: boolean; ip: string | null } {
  // 1. Intentar consultar el CLI nativo de Tailscale si está instalado (Linux / macOS)
  try {
    const tailscaleBin = fs.existsSync('/Applications/Tailscale.app/Contents/MacOS/Tailscale')
      ? '/Applications/Tailscale.app/Contents/MacOS/Tailscale'
      : 'tailscale';
    const statusOut = execSync(`${tailscaleBin} status --json`, { stdio: ['pipe', 'pipe', 'ignore'], timeout: 1500 }).toString();
    const parsed = JSON.parse(statusOut);
    if (parsed.BackendState === 'Running' && parsed.TailscaleIPs?.length > 0) {
      const v4 = parsed.TailscaleIPs.find((ip: string) => !ip.includes(':'));
      if (v4) {
        return { detected: true, ip: v4 };
      }
    }
  } catch {}

  // 2. Inspeccionar interfaces de red (descartando 100.64.0.1 que es la puerta de enlace/bucle virtual de macOS NetworkExtension inactiva)
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        // En Tailscale las IPs reales de nodos van en el rango 100.64.0.0/10 pero nunca son 100.64.0.1 (gateway virtual)
        if (net.address.startsWith('100.') && net.address !== '100.64.0.1') {
          return { detected: true, ip: net.address };
        }
        if (name.toLowerCase().includes('tailscale') && net.address !== '100.64.0.1') {
          return { detected: true, ip: net.address };
        }
      }
    }
  }
  return { detected: false, ip: null };
}

app.use(cors());
app.use(express.json());

// Ubicación del proyecto
const PROJECT_DIR = process.env.COMPOSE_PROJECT_DIR || path.resolve(process.cwd(), '..');
const ENV_FILE_PATH = path.join(PROJECT_DIR, '.env');
const CONFIG_FLAG_PATH = path.join(PROJECT_DIR, '.hostify_configured.json');

// Helper: Parsear .env
function parseEnv(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf-8');
  const result: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.substring(0, idx).trim();
      const val = trimmed.substring(idx + 1).trim();
      result[key] = val;
    }
  }
  return result;
}

// Helper: Guardar .env
function writeEnv(filePath: string, env: Record<string, string>): void {
  let content = '# ==============================================================================\n';
  content += '# HOSTIFY APPLIANCE - AUTO-GENERATED CONFIGURATION\n';
  content += '# ==============================================================================\n\n';
  for (const [key, value] of Object.entries(env)) {
    content += `${key}=${value}\n`;
  }
  fs.writeFileSync(filePath, content, 'utf-8');
}

// Helper: Auto-aprovisionar credenciales y configuración Zero-Config para qBittorrent, Prowlarr y Lidarr
function autoConfigureIngestionServices(dockerData: string, musicRoot: string, envData?: Record<string, string>): void {
  try {
    // 1. qBittorrent Zero-Config (Bypass de autenticación local y asignación de carpetas completadas/incompletas)
    const qbitDir = path.join(dockerData, 'qbittorrent', 'config', 'qBittorrent');
    const qbitIncomplete = path.join(dockerData, 'qbittorrent', 'incomplete');
    const torrentsCompleted = path.join(musicRoot, 'torrents');

    if (!fs.existsSync(qbitDir)) fs.mkdirSync(qbitDir, { recursive: true });
    if (!fs.existsSync(qbitIncomplete)) fs.mkdirSync(qbitIncomplete, { recursive: true });
    if (!fs.existsSync(torrentsCompleted)) fs.mkdirSync(torrentsCompleted, { recursive: true });

    const qbitConfPath = path.join(qbitDir, 'qBittorrent.conf');
    let qbitLines: string[] = [];
    if (fs.existsSync(qbitConfPath)) {
      qbitLines = fs.readFileSync(qbitConfPath, 'utf-8').split('\n');
    }

    const qbitKeys: Record<string, string> = {
      'WebUI\\Address': 'WebUI\\Address=*',
      'WebUI\\Port': 'WebUI\\Port=8080',
      'WebUI\\AuthSubnetWhitelist': 'WebUI\\AuthSubnetWhitelist=0.0.0.0/0, ::/0',
      'WebUI\\AuthSubnetWhitelistEnabled': 'WebUI\\AuthSubnetWhitelistEnabled=true',
      'WebUI\\LocalHostAuth': 'WebUI\\LocalHostAuth=false',
      'WebUI\\UseUPnP': 'WebUI\\UseUPnP=false',
      'Downloads\\SavePath': 'Downloads\\SavePath=/downloads/completed/',
      'Downloads\\TempPath': 'Downloads\\TempPath=/downloads/incomplete/',
      'Downloads\\TempPathEnabled': 'Downloads\\TempPathEnabled=true',
      'Connection\\PortRangeMin': 'Connection\\PortRangeMin=6881',
      'Connection\\UPnP': 'Connection\\UPnP=false',
    };

    let hasPreferences = false;
    let hasLegalNotice = false;
    const finalQbitLines: string[] = [];
    const seenKeys = new Set<string>();

    for (const line of qbitLines) {
      if (line.trim() === '[Preferences]') hasPreferences = true;
      if (line.trim() === '[LegalNotice]') hasLegalNotice = true;

      let matched = false;
      for (const [k, fullVal] of Object.entries(qbitKeys)) {
        if (line.startsWith(k + '=')) {
          finalQbitLines.push(fullVal);
          seenKeys.add(k);
          matched = true;
          break;
        }
      }
      if (!matched) {
        finalQbitLines.push(line);
      }
    }

    if (!hasLegalNotice) {
      finalQbitLines.unshift('[LegalNotice]', 'Accepted=true', '');
    }

    if (!hasPreferences) {
      finalQbitLines.push('[Preferences]');
    }

    const prefIdx = finalQbitLines.findIndex(l => l.trim() === '[Preferences]');
    for (const [k, fullVal] of Object.entries(qbitKeys)) {
      if (!seenKeys.has(k)) {
        finalQbitLines.splice(prefIdx + 1, 0, fullVal);
      }
    }

    fs.writeFileSync(qbitConfPath, finalQbitLines.join('\n').trim() + '\n', 'utf-8');

    // 2. Prowlarr Zero-Config (Sin credenciales en red local y API key configurada)
    const prowlarrDir = path.join(dockerData, 'prowlarr');
    if (!fs.existsSync(prowlarrDir)) fs.mkdirSync(prowlarrDir, { recursive: true });
    const prowlarrConfPath = path.join(prowlarrDir, 'config.xml');
    if (fs.existsSync(prowlarrConfPath)) {
      let xml = fs.readFileSync(prowlarrConfPath, 'utf-8');
      xml = xml.replace(/<AuthenticationMethod>.*?<\/AuthenticationMethod>/g, '<AuthenticationMethod>None</AuthenticationMethod>');
      xml = xml.replace(/<AuthenticationRequired>.*?<\/AuthenticationRequired>/g, '<AuthenticationRequired>DisabledForLocalAddresses</AuthenticationRequired>');
      const match = xml.match(/<ApiKey>(.*?)<\/ApiKey>/);
      if (match && match[1] && envData) {
        envData.PROWLARR_API_KEY = match[1];
      }
      fs.writeFileSync(prowlarrConfPath, xml, 'utf-8');
    } else {
      const apiKey = envData?.PROWLARR_API_KEY || crypto.randomBytes(16).toString('hex');
      if (envData) envData.PROWLARR_API_KEY = apiKey;
      const xml = `<Config>\n  <BindAddress>*</BindAddress>\n  <Port>9696</Port>\n  <EnableSsl>False</EnableSsl>\n  <ApiKey>${apiKey}</ApiKey>\n  <AuthenticationMethod>None</AuthenticationMethod>\n  <AuthenticationRequired>DisabledForLocalAddresses</AuthenticationRequired>\n  <Branch>master</Branch>\n  <LogLevel>info</LogLevel>\n  <UrlBase></UrlBase>\n  <InstanceName>Prowlarr</InstanceName>\n  <UpdateMechanism>Docker</UpdateMechanism>\n</Config>\n`;
      fs.writeFileSync(prowlarrConfPath, xml, 'utf-8');
    }

    // 3. Lidarr Zero-Config (Sin credenciales en red local y API key configurada)
    const lidarrDir = path.join(dockerData, 'lidarr');
    if (!fs.existsSync(lidarrDir)) fs.mkdirSync(lidarrDir, { recursive: true });
    const lidarrConfPath = path.join(lidarrDir, 'config.xml');
    if (fs.existsSync(lidarrConfPath)) {
      let xml = fs.readFileSync(lidarrConfPath, 'utf-8');
      xml = xml.replace(/<AuthenticationMethod>.*?<\/AuthenticationMethod>/g, '<AuthenticationMethod>None</AuthenticationMethod>');
      xml = xml.replace(/<AuthenticationRequired>.*?<\/AuthenticationRequired>/g, '<AuthenticationRequired>DisabledForLocalAddresses</AuthenticationRequired>');
      const match = xml.match(/<ApiKey>(.*?)<\/ApiKey>/);
      if (match && match[1] && envData) {
        envData.LIDARR_API_KEY = match[1];
      }
      fs.writeFileSync(lidarrConfPath, xml, 'utf-8');
    } else {
      const apiKey = envData?.LIDARR_API_KEY || crypto.randomBytes(16).toString('hex');
      if (envData) envData.LIDARR_API_KEY = apiKey;
      const xml = `<Config>\n  <BindAddress>*</BindAddress>\n  <Port>8686</Port>\n  <EnableSsl>False</EnableSsl>\n  <ApiKey>${apiKey}</ApiKey>\n  <AuthenticationMethod>None</AuthenticationMethod>\n  <AuthenticationRequired>DisabledForLocalAddresses</AuthenticationRequired>\n  <Branch>master</Branch>\n  <LogLevel>info</LogLevel>\n  <UrlBase></UrlBase>\n  <InstanceName>Lidarr</InstanceName>\n  <UpdateMechanism>Docker</UpdateMechanism>\n</Config>\n`;
      fs.writeFileSync(lidarrConfPath, xml, 'utf-8');
    }

    // 4. Feishin Zero-Config (Garantizar existencia del template de auto-conexión y credenciales)
    const feishinDir = path.join(PROJECT_DIR, 'docker', 'feishin');
    if (!fs.existsSync(feishinDir)) fs.mkdirSync(feishinDir, { recursive: true });
    const feishinTemplatePath = path.join(feishinDir, 'settings.js.template');
    if (!fs.existsSync(feishinTemplatePath)) {
      const templateContent = `"use strict";

(function() {
  var envUrl = "\${SERVER_URL}";
  var ndPort = "\${NAVIDROME_PORT}" || "4533";
  var host = (typeof window !== "undefined" && window.location && window.location.hostname) ? window.location.hostname : "127.0.0.1";
  var proto = (typeof window !== "undefined" && window.location && window.location.protocol) ? window.location.protocol : "http:";
  var dynamicNavidromeUrl = proto + "//" + host + ":" + ndPort;

  if (!envUrl || envUrl.indexOf("hostify-navidrome") !== -1 || envUrl === "http://:4533" || envUrl === "") {
    window.SERVER_URL = dynamicNavidromeUrl;
  } else {
    window.SERVER_URL = envUrl;
  }
})();

window.REMOTE_URL = "\${REMOTE_URL}";
window.SERVER_NAME = "\${SERVER_NAME:-Hostify}";
window.SERVER_TYPE = "navidrome";
window.SERVER_LOCK = "true";
window.LEGACY_AUTHENTICATION = "\${LEGACY_AUTHENTICATION}";
window.ANALYTICS_DISABLED = "\${ANALYTICS_DISABLED:-true}";
window.FS_GENERAL_THEME = "\${FS_GENERAL_THEME:-defaultDark}";

(function autoAuthHostify() {
  var adminUser = "\${NAVIDROME_ADMIN_USER}" || "admin";
  var adminPass = "\${NAVIDROME_ADMIN_PASSWORD}" || "";
  var serverUrl = window.SERVER_URL;
  var serverName = window.SERVER_NAME || "Hostify";

  if (!adminPass || !serverUrl) return;

  function tryAutoAuth() {
    try {
      var stored = localStorage.getItem("store_authentication");
      if (stored) {
        var parsed = JSON.parse(stored);
        var curr = parsed && parsed.state && parsed.state.currentServer;
        if (curr && curr.url === serverUrl && curr.username === adminUser && curr.credential) {
          return;
        }
      }

      var xhr = new XMLHttpRequest();
      xhr.open("POST", serverUrl + "/auth/login", false);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.send(JSON.stringify({ username: adminUser, password: adminPass }));

      if (xhr.status === 200) {
        var res = JSON.parse(xhr.responseText);
        var serverId = "hostify-navidrome";
        var sItem = {
          id: serverId,
          name: serverName,
          type: "navidrome",
          url: serverUrl,
          remoteUrl: "",
          username: res.username || adminUser,
          userId: res.id || null,
          isAdmin: Boolean(res.isAdmin),
          credential: "u=" + (res.username || adminUser) + "&s=" + res.subsonicSalt + "&t=" + res.subsonicToken,
          ndCredential: res.token,
          savePassword: true
        };

        var deviceId = "hostify-" + Math.random().toString(36).substring(2, 9);
        if (stored) {
          try {
            var old = JSON.parse(stored);
            if (old && old.state && old.state.deviceId) deviceId = old.state.deviceId;
          } catch (e) {}
        }

        var newStore = {
          state: {
            currentServer: sItem,
            deviceId: deviceId,
            serverList: {}
          },
          version: 2
        };
        newStore.state.serverList[serverId] = sItem;
        localStorage.setItem("store_authentication", JSON.stringify(newStore));
      }
    } catch (err) {}
  }

  tryAutoAuth();
})();
`;
      fs.writeFileSync(feishinTemplatePath, templateContent, 'utf-8');
    }
  } catch (err: any) {
    console.error('Error auto-configurando qbittorrent/prowlarr/lidarr/feishin:', err.message);
  }
}

// -----------------------------------------------------------------------------
// ENDPOINTS DE LA API
// -----------------------------------------------------------------------------

// Estado general de la aplicación
app.get('/api/status', (req, res) => {
  const isConfigured = fs.existsSync(CONFIG_FLAG_PATH);
  const currentEnv = parseEnv(ENV_FILE_PATH);

  // Autodetección de PUID y PGID en Linux/macOS
  const detectedPuid = typeof process.getuid === 'function' ? process.getuid() : 1000;
  const detectedPgid = typeof process.getgid === 'function' ? process.getgid() : 10;
  const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Lima';

  // Rutas inteligentes por defecto según el SO
  let defaultMusic = '/volume1/music';
  let defaultDocker = '/volume1/docker';
  if (process.platform === 'darwin') {
    defaultMusic = path.join(os.homedir(), 'Music');
    defaultDocker = path.join(os.homedir(), 'docker');
  } else if (process.platform === 'win32') {
    defaultMusic = 'C:\\music';
    defaultDocker = 'C:\\docker';
  }

  const ts = detectTailscale();

  let configuredModules = null;
  let remoteAccess = null;
  let enableListenBrainzSaved: boolean | null = null;
  const flagFile = fs.existsSync(CONFIG_FLAG_PATH) ? CONFIG_FLAG_PATH : (fs.existsSync(CONFIG_FLAG_PATH + '.bak') ? CONFIG_FLAG_PATH + '.bak' : null);
  if (flagFile) {
    try {
      const cfg = JSON.parse(fs.readFileSync(flagFile, 'utf-8'));
      configuredModules = cfg.modules || null;
      remoteAccess = cfg.remoteAccess || null;
      if (typeof cfg.enableListenBrainz === 'boolean') {
        enableListenBrainzSaved = cfg.enableListenBrainz;
      }
    } catch {}
  }

  res.json({
    app: 'Hostify Appliance',
    version: '1.0.0',
    isConfigured,
    dockerAvailable: dockerClient.isAvailable(),
    musicRoot: currentEnv.MUSIC_ROOT || defaultMusic,
    dockerData: currentEnv.DOCKER_DATA || defaultDocker,
    navidromePort: currentEnv.NAVIDROME_PORT || '4533',
    feishinPort: currentEnv.FEISHIN_PORT || '9188',
    navidromeAdminUser: currentEnv.NAVIDROME_ADMIN_USER || 'admin',
    navidromeAdminPassword: currentEnv.NAVIDROME_ADMIN_PASSWORD || 'admin',
    listenBrainzUser: currentEnv.LZ_USER || '',
    listenBrainzToken: currentEnv.LZ_TOKEN || '',
    enableListenBrainz: enableListenBrainzSaved !== null 
      ? enableListenBrainzSaved 
      : Boolean(currentEnv.LZ_TOKEN || currentEnv.LZ_USER),
    modules: configuredModules,
    remoteAccess: remoteAccess || (currentEnv.BASE_URL ? 'proxy' : (ts.detected ? 'tailscale' : 'local')),
    domain: currentEnv.BASE_URL ? currentEnv.BASE_URL.replace(/^https?:\/\//, '') : '',
    hostIp: getHostIp(),
    detectedPuid: currentEnv.PUID || String(detectedPuid),
    detectedPgid: currentEnv.PGID || String(detectedPgid),
    detectedTz: currentEnv.TZ || detectedTz,
    tailscaleDetected: ts.detected,
    tailscaleIp: ts.ip,
  });
});

function getMemoryStats() {
  const total = os.totalmem();
  let available = os.freemem();

  if (process.platform === 'darwin') {
    try {
      const out = execSync('vm_stat', { stdio: ['pipe', 'pipe', 'ignore'], timeout: 1000 }).toString();
      const pageSizeMatch = out.match(/page size of (\d+) bytes/);
      const pageSize = pageSizeMatch ? parseInt(pageSizeMatch[1], 10) : 16384;
      const freePages = parseInt((out.match(/Pages free:\s+(\d+)/) || [])[1] || '0', 10);
      const inactivePages = parseInt((out.match(/Pages inactive:\s+(\d+)/) || [])[1] || '0', 10);
      const speculativePages = parseInt((out.match(/Pages speculative:\s+(\d+)/) || [])[1] || '0', 10);
      const purgeablePages = parseInt((out.match(/Pages purgeable:\s+(\d+)/) || [])[1] || '0', 10);

      const realAvailable = (freePages + inactivePages + speculativePages + purgeablePages) * pageSize;
      if (realAvailable > 0 && realAvailable < total) {
        available = realAvailable;
      }
    } catch {}
  } else if (process.platform === 'linux') {
    try {
      const meminfo = fs.readFileSync('/proc/meminfo', 'utf-8');
      const match = meminfo.match(/MemAvailable:\s+(\d+)\s+kB/);
      if (match) {
        available = parseInt(match[1], 10) * 1024;
      }
    } catch {}
  }

  const used = Math.max(0, total - available);
  return {
    totalMb: Math.round(total / (1024 * 1024)),
    usedMb: Math.round(used / (1024 * 1024)),
    freeMb: Math.round(available / (1024 * 1024)),
    percent: Math.min(100, Math.max(1, Math.round((used / total) * 100))),
  };
}

// Métricas de sistema del servidor
app.get('/api/system', (req, res) => {
  const mem = getMemoryStats();

  res.json({
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    uptimeSeconds: os.uptime(),
    cpus: os.cpus().length,
    cpuModel: os.cpus()[0]?.model || 'Generic CPU',
    memoryTotalMb: mem.totalMb,
    memoryUsedMb: mem.usedMb,
    memoryFreeMb: mem.freeMb,
    memoryUsagePercent: mem.percent,
    hostIp: getHostIp(),
  });
});

// Contenedores del stack
app.get('/api/containers', async (req, res) => {
  try {
    const containers = await dockerClient.listHostifyContainers();
    res.json(containers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Acción sobre un contenedor (start / stop / restart)
app.post('/api/containers/:id/:action', async (req, res) => {
  const { id, action } = req.params;
  if (!['start', 'stop', 'restart'].includes(action)) {
    return res.status(400).json({ error: 'Acción no válida' });
  }

  try {
    await dockerClient.containerAction(id, action as any);
    res.json({ success: true, message: `Acción ${action} ejecutada sobre ${id}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Logs de un contenedor
app.get('/api/containers/:id/logs', async (req, res) => {
  const { id } = req.params;
  const lines = parseInt(req.query.lines as string) || 100;
  try {
    const logs = await dockerClient.getContainerLogs(id, lines);
    res.json({ id, logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Logs e Historial de despliegue general de la suite
app.get('/api/compose/status', (req, res) => {
  res.json(deploymentState);
});

// Helper: Función global de despliegue con streaming de logs y reintentos automáticos
function triggerDeploy(): boolean {
  if (!dockerClient.isAvailable()) {
    deploymentState.lastError = 'Docker Engine está apagado. Inicie Colima o Docker Desktop.';
    return false;
  }

  if (deploymentState.isDeploying) {
    return false;
  }

  const composePath = path.join(PROJECT_DIR, 'docker-compose.yml');
  if (!fs.existsSync(composePath)) {
    deploymentState.lastError = 'docker-compose.yml no encontrado';
    return false;
  }

  // Leer configuración de módulos activos
  let selectedServices = ['navidrome', 'feishin', 'multi-scrobbler'];
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

  // Pre-configurar Explo (.env y config) para saltar automáticamente su Wizard
  if (modulesActive.explo) {
    try {
      const env = parseEnv(ENV_FILE_PATH);
      const dockerData = env.DOCKER_DATA || '/volume1/docker';
      const exploConfigDir = path.join(dockerData, 'explo', 'config');
      if (!fs.existsSync(exploConfigDir)) {
        fs.mkdirSync(exploConfigDir, { recursive: true });
      }

      // Detectar API Key de Lidarr si existe en su config.xml
      let lidarrApiKey = '';
      const lidarrXmlPath = path.join(dockerData, 'lidarr', 'config.xml');
      if (fs.existsSync(lidarrXmlPath)) {
        try {
          const xml = fs.readFileSync(lidarrXmlPath, 'utf-8');
          const m = xml.match(/<ApiKey>(.*?)<\/ApiKey>/i);
          if (m && m[1]) lidarrApiKey = m[1];
        } catch {}
      }

      // Lista prioritaria de servicios según lo seleccionado en Hostify (Hi-Fi / Lossless sin YouTube)
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
        `SYSTEM_USERNAME=${env.NAVIDROME_ADMIN_USER || 'admin'}`,
        `SYSTEM_PASSWORD=${env.NAVIDROME_ADMIN_PASSWORD || 'admin'}`,
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

  // Función interna para ejecutar comando docker
  const runCompose = (retryCount = 0) => {
    const cmdArgs = ['compose', '-f', composePath, 'up', '-d', ...selectedServices];
    const proc = spawn('docker', cmdArgs, { cwd: PROJECT_DIR });

    proc.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        deploymentState.logs.push(`[${new Date().toLocaleTimeString()}] ${line}`);
      }
    });

    proc.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        deploymentState.logs.push(`[${new Date().toLocaleTimeString()}] ${line}`);
      }
    });

    proc.on('close', (code) => {
      if (code === 0) {
        deploymentState.isDeploying = false;
        deploymentState.finishedAt = new Date().toISOString();
        deploymentState.logs.push(`[${new Date().toLocaleTimeString()}] ✅ ¡Despliegue completado con éxito! Todos los servicios están activos.`);
      } else {
        // Si falló por rate-limit o corte transitorio del registry, reintentar automáticamente
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

// Desplegar / Iniciar el stack completo seleccionado manualmente
app.post('/api/compose/deploy', async (req, res) => {
  if (!dockerClient.isAvailable()) {
    return res.status(400).json({ error: 'Docker Engine está apagado. Inicie Docker Desktop o Colima.' });
  }

  if (deploymentState.isDeploying) {
    return res.status(409).json({ error: 'Ya hay un despliegue en progreso' });
  }

  const started = triggerDeploy();
  if (!started) {
    return res.status(500).json({ error: 'No se pudo iniciar el despliegue' });
  }

  res.json({ success: true, message: 'Despliegue iniciado en segundo plano' });
});

// Seguimiento en memoria del conteo de pistas para disparar auto-escaneo en Navidrome
let lastKnownTrackCount = -1;

async function triggerNavidromeScan(): Promise<any> {
  const env = parseEnv(ENV_FILE_PATH);
  const ndPort = env.NAVIDROME_PORT || '4533';
  const ndUser = env.NAVIDROME_ADMIN_USER || 'admin';
  const ndPass = env.NAVIDROME_ADMIN_PASSWORD || 'admin';
  try {
    const scanUrl = `http://127.0.0.1:${ndPort}/rest/startScan.view?u=${encodeURIComponent(ndUser)}&p=${encodeURIComponent(ndPass)}&v=1.16.1&c=hostify&f=json&fullScan=true`;
    const resp = await fetch(scanUrl);
    return await resp.json();
  } catch (err: any) {
    console.warn('[Hostify] Error disparando escaneo en Navidrome:', err.message);
    return null;
  }
}

// Inspección del almacenamiento de música
app.get('/api/storage', async (req, res) => {
  const env = parseEnv(ENV_FILE_PATH);
  const musicRoot = env.MUSIC_ROOT || '/volume1/music';

  const subdirs = ['personal', 'explo', 'slskd', 'torrents'];
  const folderStatus: Record<string, { exists: boolean; path: string; fileCount: number }> = {};

  let totalFiles = 0;
  for (const sub of subdirs) {
    const fullPath = path.join(musicRoot, sub);
    const exists = fs.existsSync(fullPath);
    let count = 0;
    if (exists) {
      try {
        count = countFilesRecursively(fullPath);
        totalFiles += count;
      } catch {
        count = 0;
      }
    }
    folderStatus[sub] = { exists, path: fullPath, fileCount: count };
  }

  // Si se detectan archivos nuevos o modificados, auto-disparar escaneo en Navidrome
  if (lastKnownTrackCount !== -1 && lastKnownTrackCount !== totalFiles) {
    console.log(`[Hostify Storage] Conteo de pistas cambió de ${lastKnownTrackCount} a ${totalFiles}. Auto-escaneando Navidrome...`);
    triggerNavidromeScan().catch(() => {});
  }
  lastKnownTrackCount = totalFiles;

  res.json({
    musicRoot,
    exists: fs.existsSync(musicRoot),
    folders: folderStatus,
    totalTrackCount: totalFiles,
  });
});

// Disparar escaneo manual de Navidrome desde el frontend
app.post('/api/navidrome/scan', async (req, res) => {
  try {
    const data = await triggerNavidromeScan();
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Inicializar y crear subcarpetas de ingesta
app.post('/api/storage/init', (req, res) => {
  const { musicRoot } = req.body;
  const targetRoot = musicRoot || parseEnv(ENV_FILE_PATH).MUSIC_ROOT || '/volume1/music';

  try {
    if (!fs.existsSync(targetRoot)) {
      fs.mkdirSync(targetRoot, { recursive: true });
    }
    const subdirs = ['personal', 'explo', 'slskd', 'torrents'];
    for (const sub of subdirs) {
      const p = path.join(targetRoot, sub);
      if (!fs.existsSync(p)) {
        fs.mkdirSync(p, { recursive: true });
      }
    }
    res.json({ success: true, message: 'Estructura de carpetas creada correctamente' });
  } catch (err: any) {
    res.status(500).json({ error: `Error creando carpetas: ${err.message}` });
  }
});

// Explorador de archivos del Host Multiplataforma (macOS, Windows, Linux, NAS)
app.get('/api/browse', (req, res) => {
  const queryPath = (req.query.path as string) || '';
  const isWindows = process.platform === 'win32';
  const isMac = process.platform === 'darwin';

  let targetPath = '';

  if (queryPath) {
    targetPath = path.resolve(queryPath);
  } else {
    // Rutas iniciales inteligentes según el Sistema Operativo
    if (isWindows) {
      targetPath = process.env.USERPROFILE || 'C:\\';
    } else if (isMac) {
      targetPath = os.homedir();
    } else {
      targetPath = fs.existsSync('/volume1') ? '/volume1' : os.homedir();
    }
  }

  if (!fs.existsSync(targetPath)) {
    targetPath = os.homedir() || (isWindows ? 'C:\\' : '/');
  }

  try {
    const stat = fs.statSync(targetPath);
    if (!stat.isDirectory()) {
      targetPath = path.dirname(targetPath);
    }

    // Leer entradas del directorio
    let directories: Array<{ name: string; path: string }> = [];
    try {
      const entries = fs.readdirSync(targetPath, { withFileTypes: true });
      directories = entries
        .filter(e => {
          try {
            return e.isDirectory() && !e.name.startsWith('$') && !e.name.startsWith('.');
          } catch {
            return false;
          }
        })
        .map(e => ({
          name: e.name,
          path: path.join(targetPath, e.name),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    } catch (readErr: any) {
      console.warn(`No se pudo leer el contenido de ${targetPath}:`, readErr.message);
    }

    // Generar breadcrumbs compatibles con Windows y POSIX
    const breadcrumbs: Array<{ name: string; path: string }> = [];
    if (isWindows) {
      const parsed = path.parse(targetPath);
      const rootDrive = parsed.root; // ej. 'C:\\'
      breadcrumbs.push({ name: rootDrive, path: rootDrive });

      const relativeParts = targetPath.slice(rootDrive.length).split(path.sep).filter(Boolean);
      let currentAcc = rootDrive;
      for (const part of relativeParts) {
        currentAcc = path.join(currentAcc, part);
        breadcrumbs.push({ name: part, path: currentAcc });
      }
    } else {
      breadcrumbs.push({ name: '/', path: '/' });
      const parts = targetPath.split(path.sep).filter(Boolean);
      let accPath = '';
      for (const part of parts) {
        accPath += path.sep + part;
        breadcrumbs.push({ name: part, path: accPath });
      }
    }

    // Calcular directorio padre
    const parent = path.dirname(targetPath);
    const parentPath = (parent === targetPath) ? null : parent;

    // Atajos comunes dinámicos según el Sistema Operativo
    const commonShortcuts: string[] = [];
    if (isWindows) {
      for (const letter of 'CDEFGHIJKLMNOPQRSTUVWXYZ') {
        const drive = `${letter}:\\`;
        try {
          if (fs.existsSync(drive)) commonShortcuts.push(drive);
        } catch {}
      }
      const userHome = os.homedir();
      if (userHome && !commonShortcuts.includes(userHome)) commonShortcuts.push(userHome);
      const musicFolder = path.join(userHome, 'Music');
      if (fs.existsSync(musicFolder)) commonShortcuts.push(musicFolder);
    } else if (isMac) {
      const macCandidates = [os.homedir(), path.join(os.homedir(), 'Music'), '/Volumes', '/'];
      for (const cand of macCandidates) {
        if (fs.existsSync(cand) && !commonShortcuts.includes(cand)) commonShortcuts.push(cand);
      }
    } else {
      const linuxCandidates = ['/volume1', '/volume2', '/media', '/mnt', '/home', os.homedir(), '/'];
      for (const cand of linuxCandidates) {
        if (fs.existsSync(cand) && !commonShortcuts.includes(cand)) commonShortcuts.push(cand);
      }
    }

    // Comprobación de permisos de escritura
    let canWrite = true;
    try {
      fs.accessSync(targetPath, fs.constants.W_OK);
    } catch {
      canWrite = false;
    }

    res.json({
      platform: process.platform,
      currentPath: targetPath,
      parentPath,
      breadcrumbs,
      directories,
      commonShortcuts,
      canWrite,
    });
  } catch (err: any) {
    res.status(500).json({ error: `Error explorando ruta: ${err.message}`, currentPath: targetPath });
  }
});

// Crear una nueva carpeta en la ruta indicada
app.post('/api/mkdir', (req, res) => {
  const { parentPath, folderName } = req.body;
  if (!parentPath || !folderName) {
    return res.status(400).json({ error: 'Ruta padre y nombre de carpeta son requeridos' });
  }

  // Sanitizar nombre
  const sanitized = folderName.trim().replace(/[/\\]/g, '');
  if (!sanitized) {
    return res.status(400).json({ error: 'Nombre de carpeta inválido' });
  }

  const newPath = path.join(parentPath, sanitized);
  try {
    if (fs.existsSync(newPath)) {
      return res.status(400).json({ error: 'La carpeta ya existe' });
    }
    fs.mkdirSync(newPath, { recursive: true });
    res.json({ success: true, createdPath: newPath });
  } catch (err: any) {
    res.status(500).json({ error: `Error creando carpeta: ${err.message}` });
  }
});


// Validar Token de ListenBrainz
app.post('/api/validate-token', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ valid: false, error: 'Token requerido' });

  try {
    const response = await fetch('https://api.listenbrainz.org/1/validate-token', {
      headers: { Authorization: `Token ${token}` },
      signal: AbortSignal.timeout(6000),
    });
    const data = await response.json() as any;
    if (data.valid) {
      res.json({ valid: true, userName: data.user_name });
    } else {
      res.json({ valid: false, message: data.message || 'Token inválido' });
    }
  } catch (err: any) {
    // Si no hay internet o falla el request, permitimos continuar
    res.json({ valid: true, note: 'No se pudo contactar a ListenBrainz pero el token fue guardado' });
  }
});

// Generador de Snippets para Proxy Reverso
app.get('/api/proxy-snippets', (req, res) => {
  const domain = (req.query.domain as string) || 'musica.tu-dominio.com';
  const naviPort = (req.query.port as string) || '4533';

  const caddy = `${domain} {\n    reverse_proxy hostify-navidrome:${naviPort}\n}`;

  const nginx = `server {\n    listen 80;\n    server_name ${domain};\n    return 301 https://$host$request_uri;\n}\n\nserver {\n    listen 443 ssl http2;\n    server_name ${domain};\n\n    # Certificados SSL...\n\n    location / {\n        proxy_pass http://hostify-navidrome:${naviPort};\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n        proxy_set_header Upgrade $http_upgrade;\n        proxy_set_header Connection "upgrade";\n    }\n}`;

  res.json({ caddy, nginx, domain });
});

// Estado de Reproducción en Vivo (Now Playing desde Navidrome)
app.get('/api/now-playing', async (req, res) => {
  try {
    const currentEnv = parseEnv(ENV_FILE_PATH);
    const naviPort = currentEnv.NAVIDROME_PORT || '4533';
    const user = currentEnv.NAVIDROME_ADMIN_USER || 'admin';
    const pass = currentEnv.NAVIDROME_ADMIN_PASSWORD || 'admin';

    const url = `http://127.0.0.1:${naviPort}/rest/getNowPlaying?u=${encodeURIComponent(user)}&p=${encodeURIComponent(pass)}&v=1.16.1&c=hostify-dashboard&f=json`;
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) {
      return res.json({ active: false, track: null });
    }

    const data = await response.json() as any;
    const entries = data?.['subsonic-response']?.nowPlaying?.entry;
    if (entries && Array.isArray(entries) && entries.length > 0) {
      // Tomamos la pista más reciente o activa
      const current = entries[0];
      return res.json({
        active: true,
        track: {
          id: current.id,
          title: current.title || 'Desconocido',
          artist: current.artist || 'Artista desconocido',
          album: current.album || 'Álbum',
          coverArtId: current.coverArt || null,
          coverArtUrl: current.coverArt ? `/api/cover-art?id=${encodeURIComponent(current.coverArt)}` : null,
          streamUrl: `/api/stream?id=${encodeURIComponent(current.id)}`,
          duration: current.duration || 0,
          positionMs: current.positionMs || 0,
          playerName: current.playerName || 'Feishin',
          state: current.state || 'playing',
        }
      });
    }

    res.json({ active: false, track: null });
  } catch (err: any) {
    res.json({ active: false, track: null, error: err.message });
  }
});

// Proxy de Carátula de Álbum desde Navidrome
app.get('/api/cover-art', async (req, res) => {
  const artId = req.query.id as string;
  if (!artId) return res.status(400).send('Missing id');

  try {
    const currentEnv = parseEnv(ENV_FILE_PATH);
    const naviPort = currentEnv.NAVIDROME_PORT || '4533';
    const user = currentEnv.NAVIDROME_ADMIN_USER || 'admin';
    const pass = currentEnv.NAVIDROME_ADMIN_PASSWORD || 'admin';

    const url = `http://127.0.0.1:${naviPort}/rest/getCoverArt?u=${encodeURIComponent(user)}&p=${encodeURIComponent(pass)}&v=1.16.1&c=hostify-dashboard&f=json&id=${encodeURIComponent(artId)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) {
      return res.status(response.status).send('Cover not found');
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    res.status(500).send('Error fetching cover art');
  }
});

// Proxy de Transmisión de Audio para el widget del Dashboard
app.get('/api/stream', async (req, res) => {
  const songId = req.query.id as string;
  if (!songId) return res.status(400).send('Missing song id');

  try {
    const currentEnv = parseEnv(ENV_FILE_PATH);
    const naviPort = currentEnv.NAVIDROME_PORT || '4533';
    const user = currentEnv.NAVIDROME_ADMIN_USER || 'admin';
    const pass = currentEnv.NAVIDROME_ADMIN_PASSWORD || 'admin';

    const url = `http://127.0.0.1:${naviPort}/rest/stream?u=${encodeURIComponent(user)}&p=${encodeURIComponent(pass)}&v=1.16.1&c=hostify-dashboard&f=json&id=${encodeURIComponent(songId)}`;
    
    // Redirigir directamente al stream de Navidrome o pasar audio con soporte de chunks
    const streamRes = await fetch(url);
    if (!streamRes.ok) {
      return res.status(streamRes.status).send('Stream error');
    }

    const contentType = streamRes.headers.get('content-type') || 'audio/flac';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');

    if (streamRes.body) {
      // @ts-ignore Node 18+ Web Stream to Node Stream
      const { Readable } = await import('stream');
      // @ts-ignore
      Readable.fromWeb(streamRes.body).pipe(res);
    } else {
      res.status(500).send('No stream body');
    }
  } catch (err: any) {
    res.status(500).send('Error streaming track: ' + err.message);
  }
});

// Guardar Configuración y Completar Wizard
app.post('/api/setup', async (req, res) => {
  if (!dockerClient.isAvailable()) {
    return res.status(400).json({ error: 'Docker Engine está apagado. Inicie Docker Desktop o Colima para configurar Hostify.' });
  }

  const payload = req.body;

  try {
    const currentEnv = parseEnv(ENV_FILE_PATH);
    const envData: Record<string, string> = {
      PUID: String(payload.puid || 1000),
      PGID: String(payload.pgid || 10),
      TZ: payload.tz || 'America/Lima',
      HOSTIFY_PORT: '3000',
      NAVIDROME_PORT: String(payload.navidromePort || 4533),
      FEISHIN_PORT: String(payload.feishinPort || currentEnv.FEISHIN_PORT || 9188),
      NAVIDROME_ADMIN_USER: payload.navidromeAdminUser || 'admin',
      NAVIDROME_ADMIN_PASSWORD: payload.navidromeAdminPassword || 'admin',
      MUSIC_ROOT: payload.musicRoot || '/volume1/music',
      DOCKER_DATA: payload.dockerData || '/volume1/docker',
      BASE_URL: payload.domain ? `https://${payload.domain}` : '',
      LZ_USER: payload.listenBrainzUser || '',
      LZ_TOKEN: payload.listenBrainzToken || '',
      SLSKD_USERNAME: payload.slskdUser || 'hostify_user',
      SLSKD_PASSWORD: payload.slskdPass || crypto.randomBytes(8).toString('hex'),
      SLSKD_API_KEY: payload.slskdApiKey || crypto.randomBytes(16).toString('hex'),
      LIDARR_API_KEY: payload.lidarrApiKey || currentEnv.LIDARR_API_KEY || crypto.randomBytes(16).toString('hex'),
      PROWLARR_API_KEY: payload.prowlarrApiKey || currentEnv.PROWLARR_API_KEY || crypto.randomBytes(16).toString('hex'),
    };

    // 1. Crear subcarpetas requeridas
    const musicRoot = envData.MUSIC_ROOT;
    const subdirs = ['personal', 'explo', 'slskd', 'torrents'];
    for (const sub of subdirs) {
      const p = path.join(musicRoot, sub);
      if (!fs.existsSync(p)) {
        try { fs.mkdirSync(p, { recursive: true }); } catch {}
      }
    }

    // 2. Pre-aprovisionar Zero-Config (sin login) para qBittorrent, Prowlarr y Lidarr
    autoConfigureIngestionServices(envData.DOCKER_DATA, envData.MUSIC_ROOT, envData);

    // 3. Guardar .env (incluyendo los API keys sincronizados)
    writeEnv(ENV_FILE_PATH, envData);

    // 3. Marcar como configurado
    fs.writeFileSync(CONFIG_FLAG_PATH, JSON.stringify({
      configuredAt: new Date().toISOString(),
      modules: payload.modules || {},
      remoteAccess: payload.remoteAccess || 'local',
      enableListenBrainz: payload.enableListenBrainz !== undefined ? payload.enableListenBrainz : Boolean(payload.listenBrainzToken),
    }, null, 2));

    // 4. Iniciar automáticamente el despliegue del stack con tracking de logs
    if (dockerClient.isAvailable()) {
      setTimeout(() => {
        triggerDeploy();
      }, 500);
    }

    res.json({ success: true, message: 'Hostify configurado exitosamente' });
  } catch (err: any) {
    res.status(500).json({ error: `Error durante setup: ${err.message}` });
  }
});

// Reiniciar Wizard (permite volver a pasar el onboarding manteniendo configuraciones previas)
app.post('/api/reset-wizard', (req, res) => {
  if (!dockerClient.isAvailable()) {
    return res.status(400).json({ error: 'Docker Engine no está disponible. Inicie Docker antes de reconfigurar.' });
  }

  try {
    if (fs.existsSync(CONFIG_FLAG_PATH)) {
      try {
        const cfg = fs.readFileSync(CONFIG_FLAG_PATH, 'utf-8');
        fs.writeFileSync(CONFIG_FLAG_PATH + '.bak', cfg, 'utf-8');
      } catch {}
      fs.unlinkSync(CONFIG_FLAG_PATH);
    }
    res.json({ success: true, message: 'Wizard reactivado' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Configurar o actualizar credenciales de ListenBrainz en caliente
app.post('/api/settings/listenbrainz', async (req, res) => {
  const { user, token } = req.body;
  if (!token || !token.trim()) {
    return res.status(400).json({ error: 'El User Token de ListenBrainz es obligatorio' });
  }

  try {
    const env = parseEnv(ENV_FILE_PATH);
    env.LZ_USER = (user && user.trim()) || env.LZ_USER || '';
    env.LZ_TOKEN = token.trim();
    writeEnv(ENV_FILE_PATH, env);

    // Actualizar también en Explo si existe su configuración
    const exploDir = path.join(env.DOCKER_DATA || '/volume1/docker', 'explo', 'config');
    const exploEnv = path.join(exploDir, '.env');
    if (fs.existsSync(exploEnv)) {
      try {
        let content = fs.readFileSync(exploEnv, 'utf-8');
        content = content.replace(/^LISTENBRAINZ_USER=.*$/m, `LISTENBRAINZ_USER=${env.LZ_USER}`);
        content = content.replace(/^LISTENBRAINZ_USER_TOKEN=.*$/m, `LISTENBRAINZ_USER_TOKEN=${env.LZ_TOKEN}`);
        fs.writeFileSync(exploEnv, content, 'utf-8');
      } catch {}
    }

    // Reiniciar multi-scrobbler y explo para que tomen las nuevas credenciales
    const composePath = path.join(PROJECT_DIR, 'docker-compose.yml');
    const proc = spawn('docker', ['compose', '-f', composePath, 'up', '-d', 'multi-scrobbler', 'explo'], { cwd: PROJECT_DIR });
    proc.on('close', (code) => {
      console.log(`[Hostify] Actualizadas credenciales de ListenBrainz. Contenedores reiniciados con código ${code}`);
    });

    res.json({ success: true, message: 'Credenciales de ListenBrainz actualizadas y servicios sincronizados' });
  } catch (err: any) {
    res.status(500).json({ error: `Error guardando credenciales: ${err.message}` });
  }
});

// 404 JSON para rutas de API no existentes (evita retornar HTML en llamadas a la API)
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `Ruta API no encontrada: ${req.method} ${req.path}` });
});

function getHostIp(): string {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

function countFilesRecursively(dirPath: string): number {
  let count = 0;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        count += countFilesRecursively(path.join(dirPath, entry.name));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (['.flac', '.mp3', '.m4a', '.ogg', '.wav', '.opus'].includes(ext)) {
          count++;
        }
      }
    }
  } catch {}
  return count;
}

// Iniciar servidor con soporte HMR automático en desarrollo o estáticos en producción
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // Modo Desarrollo: Vite Dev Server integrado como Middleware (HMR y recarga automática instantánea)
    try {
      const { createServer } = await import('vite');
      const vite = await createServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);

      app.use('*', async (req, res, next) => {
        const url = req.originalUrl;
        try {
          const indexPath = path.resolve(process.cwd(), 'index.html');
          if (fs.existsSync(indexPath)) {
            let template = fs.readFileSync(indexPath, 'utf-8');
            template = await vite.transformIndexHtml(url, template);
            res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
          } else {
            next();
          }
        } catch (e: any) {
          vite.ssrFixStacktrace(e);
          next(e);
        }
      });
      console.log('[Hostify Appliance] ⚡ Modo desarrollo: Vite HMR activo con recarga automática');
    } catch (err: any) {
      console.warn('[Hostify Appliance] No se pudo iniciar Vite middleware, fallback a dist:', err.message);
      const clientDistPath = path.resolve(process.cwd(), 'dist/client');
      if (fs.existsSync(clientDistPath)) {
        app.use(express.static(clientDistPath));
        app.get('*', (req, res) => {
          res.sendFile(path.join(clientDistPath, 'index.html'));
        });
      }
    }
  } else {
    // Modo Producción: Servir bundle optimizado de dist/client
    const clientDistPath = path.resolve(process.cwd(), 'dist/client');
    if (fs.existsSync(clientDistPath)) {
      app.use(express.static(clientDistPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(clientDistPath, 'index.html'));
      });
    }
  }

  // Auto-configuración inicial al arrancar el servidor
  const startupEnv = parseEnv(ENV_FILE_PATH);
  if (startupEnv.DOCKER_DATA && startupEnv.MUSIC_ROOT) {
    autoConfigureIngestionServices(startupEnv.DOCKER_DATA, startupEnv.MUSIC_ROOT, startupEnv);
  }

  app.listen(PORT, () => {
    console.log(`[Hostify Appliance] Servidor escuchando en http://localhost:${PORT}`);
    console.log(`[Hostify Appliance] Directorio de proyecto: ${PROJECT_DIR}`);
  });
}

startServer();

import { Router, Request, Response } from 'express';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { parseEnv, ENV_FILE_PATH, CONFIG_FLAG_PATH } from '../utils/env.js';
import { dockerClient } from '../services/docker.service.js';
import { detectTailscale, getHostIp, getLocalHostname, getMemoryStats } from '../services/network.service.js';
import { getLicenseStatus } from '../services/license.service.js';

export const systemRouter = Router();

// General application status
systemRouter.get('/status', (_req: Request, res: Response) => {
  const isConfigured = fs.existsSync(CONFIG_FLAG_PATH);
  const currentEnv = parseEnv(ENV_FILE_PATH);

  // Auto-detect PUID and PGID on Linux/macOS
  const detectedPuid = typeof process.getuid === 'function' ? process.getuid() : 1000;
  const detectedPgid = typeof process.getgid === 'function' ? process.getgid() : 10;
  const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Lima';

  // Smart default paths based on OS and Docker environment
  const hostHome = process.env.HOST_HOME;
  let defaultMusic = '/volume1/music';
  let defaultDocker = '/volume1/docker';

  if (hostHome && fs.existsSync(hostHome)) {
    // Docker with mounted host home volume: prioritize real user Music folder
    defaultMusic = path.join(hostHome, 'Music');
    defaultDocker = path.join(hostHome, 'docker');
  } else if (process.platform === 'darwin') {
    defaultMusic = path.join(os.homedir(), 'Music');
    defaultDocker = path.join(os.homedir(), 'docker');
  } else if (process.platform === 'win32') {
    defaultMusic = 'C:\\music';
    defaultDocker = 'C:\\docker';
  } else {
    // Direct Linux host
    const linuxHome = os.homedir();
    if (linuxHome && linuxHome !== '/' && linuxHome !== '/root') {
      defaultMusic = path.join(linuxHome, 'Music');
      defaultDocker = path.join(linuxHome, 'docker');
    }
  }

  const ts = detectTailscale();

  let configuredModules = null;
  let remoteAccess = null;
  let enableListenBrainzSaved: boolean | null = null;
  const flagFile = fs.existsSync(CONFIG_FLAG_PATH)
    ? CONFIG_FLAG_PATH
    : (fs.existsSync(CONFIG_FLAG_PATH + '.bak') ? CONFIG_FLAG_PATH + '.bak' : null);

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
    license: getLicenseStatus(),
    musicRoot: currentEnv.MUSIC_ROOT || defaultMusic,
    dockerData: currentEnv.DOCKER_DATA || defaultDocker,
    hostifyPort: currentEnv.HOSTIFY_PORT || '3500',
    navidromePort: currentEnv.NAVIDROME_PORT || '4533',
    feishinPort: currentEnv.FEISHIN_PORT || '9188',
    navidromeAdminUser: currentEnv.NAVIDROME_ADMIN_USER || '',
    navidromeAdminPassword: currentEnv.NAVIDROME_ADMIN_PASSWORD || '',
    listenBrainzUser: currentEnv.LZ_USER || '',
    listenBrainzToken: currentEnv.LZ_TOKEN || '',
    enableListenBrainz: enableListenBrainzSaved !== null 
      ? enableListenBrainzSaved 
      : Boolean(currentEnv.LZ_TOKEN || currentEnv.LZ_USER),
    modules: configuredModules,
    remoteAccess: remoteAccess || (currentEnv.BASE_URL ? 'proxy' : (ts.detected ? 'tailscale' : 'local')),
    domain: currentEnv.BASE_URL ? currentEnv.BASE_URL.replace(/^https?:\/\//, '') : '',
    hostIp: getHostIp(_req.headers.host),
    localHostname: getLocalHostname(),
    detectedPuid: currentEnv.PUID || String(detectedPuid),
    detectedPgid: currentEnv.PGID || String(detectedPgid),
    detectedTz: currentEnv.TZ || detectedTz,
    tailscaleDetected: ts.detected,
    tailscaleIp: ts.ip,
  });
});

// Server system metrics
systemRouter.get('/system', (_req: Request, res: Response) => {
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

// Validate ListenBrainz user token
systemRouter.post('/validate-token', async (req: Request, res: Response) => {
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
  } catch {
    // If no internet connection or request failure, allow continuing
    res.json({ valid: true, note: 'No se pudo contactar a ListenBrainz pero el token fue guardado' });
  }
});

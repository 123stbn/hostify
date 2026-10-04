import { Router, Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import {
  PROJECT_DIR,
  ENV_FILE_PATH,
  CONFIG_FLAG_PATH,
  parseEnv,
  writeEnv,
} from '../utils/env.js';
import { dockerClient } from '../services/docker.service.js';
import { generateProxySnippets } from '../services/network.service.js';
import { autoConfigureIngestionServices } from '../services/provisioner.service.js';
import { triggerDeploy } from '../services/compose.service.js';
import { previousNavidromeCandidates } from '../services/subsonic.service.js';
import { requireActiveLicenseOrTrial } from './license.routes.js';
import { activateLicenseKey } from '../services/license.service.js';

export const setupRouter = Router();

// Snippet generator for Reverse Proxy configurations
setupRouter.get('/proxy-snippets', (req: Request, res: Response) => {
  const domain = (req.query.domain as string) || 'musica.tu-dominio.com';
  const naviPort = (req.query.port as string) || '4533';
  res.json(generateProxySnippets(domain, naviPort));
});

// Save configuration and finalize setup wizard
setupRouter.post('/setup', requireActiveLicenseOrTrial, async (req: Request, res: Response) => {
  if (!dockerClient.isAvailable()) {
    return res.status(400).json({ error: 'Docker Engine está apagado. Inicie Docker Desktop o Colima para configurar Hostify.' });
  }

  const payload = req.body;

  if (payload?.licenseKey) {
    activateLicenseKey(payload.licenseKey);
  }

  try {
    const currentEnv = parseEnv(ENV_FILE_PATH);
    const envData: Record<string, string> = {
      PUID: String(payload.puid || 1000),
      PGID: String(payload.pgid || 10),
      TZ: payload.tz || 'America/Lima',
      HOST_IP: payload.hostIp || currentEnv.HOST_IP || '',
      HOST_HOSTNAME: payload.localHostname || currentEnv.HOST_HOSTNAME || 'hostify',
      AVAHI_IFACE: currentEnv.AVAHI_IFACE || 'eth0',
      HOSTIFY_PORT: String(payload.hostifyPort || currentEnv.HOSTIFY_PORT || '3500'),
      NAVIDROME_PORT: String(payload.navidromePort || 4533),
      FEISHIN_PORT: String(payload.feishinPort || currentEnv.FEISHIN_PORT || 9188),
      NAVIDROME_ADMIN_USER: payload.navidromeAdminUser || currentEnv.NAVIDROME_ADMIN_USER || '',
      NAVIDROME_ADMIN_PASSWORD: payload.navidromeAdminPassword || currentEnv.NAVIDROME_ADMIN_PASSWORD || '',
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

    // Auto-resolve ListenBrainz username if only user token was provided
    if (envData.LZ_TOKEN && !envData.LZ_USER) {
      try {
        const lzRes = await fetch('https://api.listenbrainz.org/1/validate-token', {
          headers: { Authorization: `Token ${envData.LZ_TOKEN}` },
          signal: AbortSignal.timeout(4000),
        });
        const lzData = await lzRes.json() as any;
        if (lzData.valid && lzData.user_name) {
          envData.LZ_USER = lzData.user_name;
        }
      } catch {
        // Silent fallback if no internet connectivity during initial setup
      }
    }

    // 1. Create required subfolders (best-effort: path may be read-only inside the
    //    container if it lives under HOST_HOME which is mounted :ro for browsing).
    //    The subdirs will also be created by the ingestion containers on first start.
    const musicRoot = envData.MUSIC_ROOT;
    const subdirs = ['personal', 'explo', 'slskd', 'torrents'];
    for (const sub of subdirs) {
      const p = path.join(musicRoot, sub);
      if (!fs.existsSync(p)) {
        try { fs.mkdirSync(p, { recursive: true }); } catch { /* read-only or missing — ok */ }
      }
    }

    // 2. Pre-provision Zero-Config (no login) for qBittorrent, Prowlarr, and Lidarr
    autoConfigureIngestionServices(envData.DOCKER_DATA, envData.MUSIC_ROOT, envData);

    // 3. Persist .env (including synchronized API keys)
    writeEnv(ENV_FILE_PATH, envData);

    // 4. Mark appliance as configured
    fs.writeFileSync(CONFIG_FLAG_PATH, JSON.stringify({
      configuredAt: new Date().toISOString(),
      modules: payload.modules || {},
      remoteAccess: payload.remoteAccess || 'local',
      enableListenBrainz: payload.enableListenBrainz !== undefined ? payload.enableListenBrainz : Boolean(payload.listenBrainzToken),
    }, null, 2));

    // 5. Automatically trigger stack deployment with log streaming; previous Navidrome
    //    credentials let the deploy step update an already-provisioned admin.
    const previousCreds = previousNavidromeCandidates(currentEnv);
    if (dockerClient.isAvailable()) {
      setTimeout(() => {
        triggerDeploy(previousCreds);
      }, 500);
    }

    res.json({ success: true, message: 'Hostify configurado exitosamente' });
  } catch (err: any) {
    res.status(500).json({ error: `Error durante setup: ${err.message}` });
  }
});

// Reset wizard state while preserving existing env configuration
setupRouter.post('/reset-wizard', (_req: Request, res: Response) => {
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

// Restore previous configured state if wizard re-run is aborted/cancelled
setupRouter.post('/cancel-wizard', (_req: Request, res: Response) => {
  try {
    if (!fs.existsSync(CONFIG_FLAG_PATH) && fs.existsSync(CONFIG_FLAG_PATH + '.bak')) {
      fs.copyFileSync(CONFIG_FLAG_PATH + '.bak', CONFIG_FLAG_PATH);
    }
    res.json({ success: true, message: 'Wizard cancelado' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Configure or update ListenBrainz credentials at runtime
setupRouter.post('/settings/listenbrainz', async (req: Request, res: Response) => {
  const { user, token } = req.body;
  if (!token || !token.trim()) {
    return res.status(400).json({ error: 'El User Token de ListenBrainz es obligatorio' });
  }

  try {
    const env = parseEnv(ENV_FILE_PATH);
    env.LZ_USER = (user && user.trim()) || env.LZ_USER || '';
    env.LZ_TOKEN = token.trim();
    writeEnv(ENV_FILE_PATH, env);

    // Update Explo configuration if directory exists
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

    // Restart multi-scrobbler and explo to pick up new credentials
    const composePath = path.join(PROJECT_DIR, 'docker-compose.yml');
    const proc = spawn('docker', ['compose', '-f', composePath, 'up', '-d', 'multi-scrobbler', 'explo'], { cwd: PROJECT_DIR });
    proc.on('close', (code) => {
      console.log(`[Hostify] ListenBrainz credentials updated. Containers restarted with code ${code}`);
    });

    res.json({ success: true, message: 'Credenciales de ListenBrainz actualizadas y servicios sincronizados' });
  } catch (err: any) {
    res.status(500).json({ error: `Error guardando credenciales: ${err.message}` });
  }
});

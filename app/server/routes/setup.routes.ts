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

export const setupRouter = Router();

// Generador de Snippets para Proxy Reverso
setupRouter.get('/proxy-snippets', (req: Request, res: Response) => {
  const domain = (req.query.domain as string) || 'musica.tu-dominio.com';
  const naviPort = (req.query.port as string) || '4533';
  res.json(generateProxySnippets(domain, naviPort));
});

// Guardar Configuración y Completar Wizard
setupRouter.post('/setup', async (req: Request, res: Response) => {
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

    // Auto-resolver nombre de usuario de ListenBrainz si solo se ingresó el token
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
        // Fallback silencioso si no hay conexión a internet en el momento del setup
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

    // 2. Pre-aprovisionar Zero-Config (sin login) para qBittorrent, Prowlarr y Lidarr
    autoConfigureIngestionServices(envData.DOCKER_DATA, envData.MUSIC_ROOT, envData);

    // 3. Guardar .env (incluyendo los API keys sincronizados)
    writeEnv(ENV_FILE_PATH, envData);

    // 4. Marcar como configurado
    fs.writeFileSync(CONFIG_FLAG_PATH, JSON.stringify({
      configuredAt: new Date().toISOString(),
      modules: payload.modules || {},
      remoteAccess: payload.remoteAccess || 'local',
      enableListenBrainz: payload.enableListenBrainz !== undefined ? payload.enableListenBrainz : Boolean(payload.listenBrainzToken),
    }, null, 2));

    // 5. Iniciar automáticamente el despliegue del stack con tracking de logs
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

// Configurar o actualizar credenciales de ListenBrainz en caliente
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

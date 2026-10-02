import { Readable } from 'node:stream';
import { parseEnv, ENV_FILE_PATH } from '../utils/env.js';
import { NowPlayingTrack } from '../types/index.js';

/**
 * Disparar escaneo de biblioteca en Navidrome
 */
export async function triggerNavidromeScan(): Promise<any> {
  const env = parseEnv(ENV_FILE_PATH);
  const ndPort = env.NAVIDROME_PORT || '4533';
  const ndUser = env.NAVIDROME_ADMIN_USER || 'admin';
  const ndPass = env.NAVIDROME_ADMIN_PASSWORD || 'admin';

  try {
    const scanUrl = `http://127.0.0.1:${ndPort}/rest/startScan.view?u=${encodeURIComponent(ndUser)}&p=${encodeURIComponent(ndPass)}&v=1.16.1&c=hostify&f=json&fullScan=true`;
    const resp = await fetch(scanUrl, { signal: AbortSignal.timeout(5000) });
    return await resp.json();
  } catch (err: any) {
    console.warn('[Hostify Subsonic] Error disparando escaneo en Navidrome:', err.message);
    return null;
  }
}

/**
 * Obtener la pista en reproducción actual desde Navidrome
 */
export async function getNowPlaying(): Promise<{ active: boolean; track: NowPlayingTrack | null; error?: string }> {
  try {
    const currentEnv = parseEnv(ENV_FILE_PATH);
    const naviPort = currentEnv.NAVIDROME_PORT || '4533';
    const user = currentEnv.NAVIDROME_ADMIN_USER || 'admin';
    const pass = currentEnv.NAVIDROME_ADMIN_PASSWORD || 'admin';

    const url = `http://127.0.0.1:${naviPort}/rest/getNowPlaying?u=${encodeURIComponent(user)}&p=${encodeURIComponent(pass)}&v=1.16.1&c=hostify-dashboard&f=json`;
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) {
      return { active: false, track: null };
    }

    const data = await response.json() as any;
    const entries = data?.['subsonic-response']?.nowPlaying?.entry;
    if (entries && Array.isArray(entries) && entries.length > 0) {
      const current = entries[0];
      return {
        active: true,
        track: {
          id: current.id,
          title: current.title || 'Desconocido',
          artist: current.artist || 'Artista desconocido',
          album: current.album || 'Álbum',
          coverArtId: current.coverArt || null,
          coverArtUrl: current.coverArt ? `/api/cover-art?id=${encodeURIComponent(current.coverArt)}` : undefined,
          streamUrl: `/api/stream?id=${encodeURIComponent(current.id)}`,
          duration: current.duration || 0,
          positionMs: current.positionMs || 0,
          playerName: current.playerName || 'Feishin',
          state: current.state || 'playing',
        }
      };
    }

    return { active: false, track: null };
  } catch (err: any) {
    return { active: false, track: null, error: err.message };
  }
}

/**
 * Obtener carátula de álbum desde Navidrome
 */
export async function getCoverArt(artId: string): Promise<{ contentType: string; data: Buffer } | null> {
  const currentEnv = parseEnv(ENV_FILE_PATH);
  const naviPort = currentEnv.NAVIDROME_PORT || '4533';
  const user = currentEnv.NAVIDROME_ADMIN_USER || 'admin';
  const pass = currentEnv.NAVIDROME_ADMIN_PASSWORD || 'admin';

  const url = `http://127.0.0.1:${naviPort}/rest/getCoverArt?u=${encodeURIComponent(user)}&p=${encodeURIComponent(pass)}&v=1.16.1&c=hostify-dashboard&f=json&id=${encodeURIComponent(artId)}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
  if (!response.ok) {
    return null;
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const arrayBuffer = await response.arrayBuffer();
  return {
    contentType,
    data: Buffer.from(arrayBuffer),
  };
}

/**
 * Transmisión (stream) de audio desde Navidrome
 */
export async function getAudioStream(songId: string): Promise<{ contentType: string; stream: any } | null> {
  const currentEnv = parseEnv(ENV_FILE_PATH);
  const naviPort = currentEnv.NAVIDROME_PORT || '4533';
  const user = currentEnv.NAVIDROME_ADMIN_USER || 'admin';
  const pass = currentEnv.NAVIDROME_ADMIN_PASSWORD || 'admin';

  const url = `http://127.0.0.1:${naviPort}/rest/stream?u=${encodeURIComponent(user)}&p=${encodeURIComponent(pass)}&v=1.16.1&c=hostify-dashboard&f=json&id=${encodeURIComponent(songId)}`;
  const streamRes = await fetch(url);
  if (!streamRes.ok || !streamRes.body) {
    return null;
  }

  const contentType = streamRes.headers.get('content-type') || 'audio/flac';
  // Node 18+ Web Stream to Node Stream
  const nodeStream = Readable.fromWeb(streamRes.body as any);
  return {
    contentType,
    stream: nodeStream,
  };
}

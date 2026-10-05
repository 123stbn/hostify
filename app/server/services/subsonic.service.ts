import { Readable } from 'node:stream';
import { parseEnv, ENV_FILE_PATH } from '../utils/env.js';
import { NowPlayingTrack } from '../types/index.js';
import { getNavidromeTarget } from '../routes/proxy.routes.js';

export interface NavidromeCredentials {
  user: string;
  pass: string;
}

/**
 * Retrieve user-configured Navidrome credentials without hardcoded fallbacks
 */
function getNavidromeCredentials(): NavidromeCredentials | null {
  const env = parseEnv(ENV_FILE_PATH);
  const user = env.NAVIDROME_ADMIN_USER?.trim();
  const pass = env.NAVIDROME_ADMIN_PASSWORD?.trim();
  if (!user || !pass) {
    return null;
  }
  return { user, pass };
}

/**
 * Build the list of credentials a Navidrome admin may currently have, derived
 * from a previous .env snapshot. Older Hostify releases relied on Navidrome's
 * dev auto-create option, which always created the user "admin" with the
 * configured password regardless of the configured username, so that pairing is
 * included to be able to migrate such databases.
 */
export function previousNavidromeCandidates(prevEnv: Record<string, string>): NavidromeCredentials[] {
  const pass = prevEnv.NAVIDROME_ADMIN_PASSWORD?.trim();
  const user = prevEnv.NAVIDROME_ADMIN_USER?.trim();
  const candidates: NavidromeCredentials[] = [];
  if (user && pass) candidates.push({ user, pass });
  if (pass) candidates.push({ user: 'admin', pass });
  if (user) candidates.push({ user, pass: 'admin' });
  candidates.push({ user: 'admin', pass: 'admin' });
  return candidates;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function navidromeLogin(target: string, creds: NavidromeCredentials): Promise<{ id: string; token: string } | null> {
  try {
    const res = await fetch(`${target}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: creds.user, password: creds.pass }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json() as any;
    return data?.token ? { id: data.id, token: data.token } : null;
  } catch {
    return null;
  }
}

/**
 * Make Navidrome's admin account match the credentials chosen in the wizard.
 *  1. Wait until Navidrome answers.
 *  2. Already valid -> nothing to do.
 *  3. Fresh database (no users) -> create the first admin.
 *  4. Existing admin with previous credentials -> rename it and set the new password.
 */
export async function ensureNavidromeAdmin(previous: NavidromeCredentials[] = []): Promise<boolean> {
  const desired = getNavidromeCredentials();
  if (!desired) return false;
  const target = getNavidromeTarget();

  let up = false;
  for (let i = 0; i < 40 && !up; i++) {
    up = await fetch(`${target}/ping`, { signal: AbortSignal.timeout(3000) }).then((r) => r.ok).catch(() => false);
    if (!up) await sleep(3000);
  }
  if (!up) {
    console.warn('[Hostify Navidrome] Navidrome did not become reachable; admin sync skipped');
    return false;
  }

  if (await navidromeLogin(target, desired)) return true;

  // Fresh database: Navidrome only accepts createAdmin while it has no users
  try {
    const res = await fetch(`${target}/auth/createAdmin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: desired.user, password: desired.pass }),
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok && await navidromeLogin(target, desired)) {
      console.log(`[Hostify Navidrome] Admin "${desired.user}" created`);
      return true;
    }
  } catch {}

  // Existing admin created with previous credentials: update it in place
  for (const prev of previous) {
    const session = await navidromeLogin(target, prev);
    if (!session) continue;
    try {
      const res = await fetch(`${target}/api/user/${session.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-ND-Authorization': `Bearer ${session.token}` },
        body: JSON.stringify({
          userName: desired.user,
          name: desired.user,
          isAdmin: true,
          password: desired.pass,
          currentPassword: prev.pass,
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok && await navidromeLogin(target, desired)) {
        console.log(`[Hostify Navidrome] Admin updated to "${desired.user}"`);
        return true;
      }
    } catch {}
  }

  console.warn('[Hostify Navidrome] Could not sync admin credentials: Navidrome already has an admin with unknown credentials');
  return false;
}

/**
 * Trigger library scan on Navidrome
 */
export async function triggerNavidromeScan(): Promise<any> {
  const creds = getNavidromeCredentials();
  if (!creds) {
    console.warn('[Hostify Subsonic] Cannot trigger scan: Navidrome credentials not configured');
    return null;
  }
  const target = getNavidromeTarget();

  try {
    const scanUrl = `${target}/rest/startScan.view?u=${encodeURIComponent(creds.user)}&p=${encodeURIComponent(creds.pass)}&v=1.16.1&c=hostify&f=json&fullScan=true`;
    const resp = await fetch(scanUrl, {
      headers: {
        'Remote-User': creds.user,
      },
      signal: AbortSignal.timeout(5000),
    });
    return await resp.json();
  } catch (err: any) {
    console.warn('[Hostify Subsonic] Error triggering scan on Navidrome:', err.message);
    return null;
  }
}

/**
 * Retrieve total count of indexed tracks directly from Navidrome
 */
export async function getNavidromeLibraryCount(): Promise<number | null> {
  const creds = getNavidromeCredentials();
  if (!creds) {
    return null;
  }
  const target = getNavidromeTarget();

  // 1. Try Subsonic getScanStatus endpoint
  try {
    const scanUrl = `${target}/rest/getScanStatus?u=${encodeURIComponent(creds.user)}&p=${encodeURIComponent(creds.pass)}&v=1.16.1&c=hostify-dashboard&f=json`;
    const res = await fetch(scanUrl, {
      headers: { 'Remote-User': creds.user },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json() as any;
      const count = data?.['subsonic-response']?.scanStatus?.count;
      if (typeof count === 'number' && count >= 0) {
        return count;
      }
    }
  } catch {}

  // 2. Try Navidrome REST endpoint with Remote-User header
  try {
    const res = await fetch(`${target}/api/song?_end=1&_start=0`, {
      headers: {
        'Remote-User': creds.user,
      },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const totalHeader = res.headers.get('x-total-count');
      if (totalHeader) {
        const count = parseInt(totalHeader, 10);
        if (!isNaN(count) && count >= 0) {
          return count;
        }
      }
    }
  } catch {}

  return null;
}

/**
 * Fetch currently playing track from Navidrome
 */
export async function getNowPlaying(): Promise<{ active: boolean; track: NowPlayingTrack | null; error?: string }> {
  try {
    const creds = getNavidromeCredentials();
    if (!creds) {
      return { active: false, track: null };
    }
    const target = getNavidromeTarget();

    const url = `${target}/rest/getNowPlaying?u=${encodeURIComponent(creds.user)}&p=${encodeURIComponent(creds.pass)}&v=1.16.1&c=hostify-dashboard&f=json`;
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) {
      return { active: false, track: null };
    }

    const data = await response.json() as any;
    const entries = data?.['subsonic-response']?.nowPlaying?.entry;
    if (entries && Array.isArray(entries) && entries.length > 0) {
      const current = entries[0];
      const minutesAgo = typeof current.minutesAgo === 'number' ? current.minutesAgo : 0;
      
      const rawState = String(current.state || current.playerState || current.status || '').toLowerCase();
      let state: 'playing' | 'paused' | 'stopped' = 'playing';

      if (rawState === 'paused' || rawState === 'pause') {
        state = 'paused';
      } else if (rawState === 'stopped' || rawState === 'stop') {
        state = 'stopped';
      } else if (minutesAgo > 0) {
        state = 'paused';
      } else if (rawState === 'playing' || rawState === 'play') {
        state = 'playing';
      }

      return {
        active: state === 'playing',
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
          minutesAgo,
          playerName: current.playerName || 'Feishin',
          state,
          suffix: current.suffix,
          bitRate: current.bitRate,
          samplingRate: current.samplingRate,
          bitDepth: current.bitDepth,
          contentType: current.contentType,
        }
      };
    }

    return { active: false, track: null };
  } catch (err: any) {
    return { active: false, track: null, error: err.message };
  }
}

/**
 * Fetch album cover art from Navidrome
 */
export async function getCoverArt(artId: string): Promise<{ contentType: string; data: Buffer } | null> {
  const creds = getNavidromeCredentials();
  if (!creds) {
    return null;
  }
  const target = getNavidromeTarget();

  const url = `${target}/rest/getCoverArt?u=${encodeURIComponent(creds.user)}&p=${encodeURIComponent(creds.pass)}&v=1.16.1&c=hostify-dashboard&f=json&id=${encodeURIComponent(artId)}`;
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
 * Audio stream relay from Navidrome
 */
export async function getAudioStream(songId: string): Promise<{ contentType: string; stream: any } | null> {
  const creds = getNavidromeCredentials();
  if (!creds) {
    return null;
  }
  const target = getNavidromeTarget();

  const url = `${target}/rest/stream?u=${encodeURIComponent(creds.user)}&p=${encodeURIComponent(creds.pass)}&v=1.16.1&c=hostify-dashboard&f=json&id=${encodeURIComponent(songId)}`;
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

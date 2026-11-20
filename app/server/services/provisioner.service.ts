import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_DIR, ENV_FILE_PATH, parseEnv, writeEnv } from '../utils/env.js';
import { resolveServiceTarget } from '../routes/proxy.routes.js';

/**
 * Provision directories and Zero-Config templates for DroppedNeedle, Feishin, Beets, and Multi-Scrobbler
 */
export function autoConfigureIngestionServices(dockerData: string, musicRoot: string, _envData?: Record<string, string>): void {
  try {
    // 1. DroppedNeedle & Slskd directories (cache uses named Docker volume for SQLite compatibility)
    for (const sub of ['config', 'plugins']) {
      const dnDir = path.join(dockerData, 'droppedneedle', sub);
      if (!fs.existsSync(dnDir)) {
        try { fs.mkdirSync(dnDir, { recursive: true }); } catch {}
      }
    }
    const inContainer = fs.existsSync('/.dockerenv') || process.env.CONTAINER === 'true';
    const effectiveMusicRoot = (!fs.existsSync(musicRoot) && inContainer && fs.existsSync('/music'))
      ? '/music'
      : musicRoot;
    for (const sub of ['personal', 'discover', 'slskd']) {
      const subDir = path.join(effectiveMusicRoot, sub);
      if (!fs.existsSync(subDir)) {
        try { fs.mkdirSync(subDir, { recursive: true }); } catch {}
      }
      if (sub === 'discover' || sub === 'slskd') {
        try { fs.chmodSync(subDir, 0o777); } catch {}
      }
      if (sub === 'slskd') {
        // Keep raw Soulseek staging downloads out of Navidrome until DroppedNeedle imports them into /discover
        const ndignorePath = path.join(subDir, '.ndignore');
        if (!fs.existsSync(ndignorePath)) {
          try { fs.writeFileSync(ndignorePath, '', 'utf-8'); } catch {}
        }
      }
    }

    // Ignore NAS recycle bins, metadata directories, and raw slskd staging at music root
    const rootNdignorePath = path.join(effectiveMusicRoot, '.ndignore');
    const rootNdignoreContent = [
      '# Ignore NAS recycle bins, system metadata, and raw staging folders',
      '\\#recycle/',
      '.recycle/',
      '@Recycle/',
      '.Recycle.Bin/',
      '@eaDir/',
      '.Trash*/',
      'slskd/',
      '',
    ].join('\n');
    try {
      const existing = fs.existsSync(rootNdignorePath) ? fs.readFileSync(rootNdignorePath, 'utf-8') : '';
      if (!existing.includes('\\#recycle/')) {
        fs.writeFileSync(rootNdignorePath, rootNdignoreContent, 'utf-8');
      }
    } catch {}

    // 2. Feishin Zero-Config (Ensure settings.js template exists in DOCKER_DATA)
    const feishinDataDir = path.join(dockerData, 'feishin');
    if (!fs.existsSync(feishinDataDir)) fs.mkdirSync(feishinDataDir, { recursive: true });
    const feishinTemplatePath = path.join(feishinDataDir, 'settings.js.template');

    // Also synchronize with PROJECT_DIR if present
    const feishinProjectDir = path.join(PROJECT_DIR, 'docker', 'feishin');
    if (!fs.existsSync(feishinProjectDir)) {
      try { fs.mkdirSync(feishinProjectDir, { recursive: true }); } catch {}
    }
    const projectTemplateFile = path.join(feishinProjectDir, 'settings.js.template');
    const bundledFeishinTemplate = path.join(process.cwd(), 'templates', 'feishin', 'settings.js.template');

    if (fs.existsSync(projectTemplateFile) && !fs.existsSync(feishinTemplatePath)) {
      try { fs.copyFileSync(projectTemplateFile, feishinTemplatePath); } catch {}
    } else if (fs.existsSync(bundledFeishinTemplate) && !fs.existsSync(feishinTemplatePath)) {
      try { fs.copyFileSync(bundledFeishinTemplate, feishinTemplatePath); } catch {}
    }

    if (!fs.existsSync(feishinTemplatePath)) {
      const templateContent = `"use strict";

(function() {
  var envUrl = "\${SERVER_URL}";
  var hostifyGatewayUrl = (typeof window !== "undefined" && window.location && window.location.origin) ? window.location.origin : "http://127.0.0.1:3500";

  if (!envUrl || envUrl.indexOf("hostify-navidrome") !== -1 || envUrl === "http://:4533" || envUrl === "") {
    window.SERVER_URL = hostifyGatewayUrl;
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
  var adminUser = "\${NAVIDROME_ADMIN_USER}";
  var adminPass = "\${NAVIDROME_ADMIN_PASSWORD}";
  var serverUrl = window.SERVER_URL;
  var serverName = window.SERVER_NAME || "Hostify";

  if (!adminUser || !adminPass || !serverUrl) return;

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
      if (!fs.existsSync(projectTemplateFile)) {
        try { fs.writeFileSync(projectTemplateFile, templateContent, 'utf-8'); } catch {}
      }
    }

    // 4. Beets Zero-Config
    const beetsConfigDir = path.join(dockerData, 'beets', 'config');
    const personalDir = path.join(musicRoot, 'personal');

    if (!fs.existsSync(beetsConfigDir)) fs.mkdirSync(beetsConfigDir, { recursive: true });
    if (!fs.existsSync(personalDir)) {
      try { fs.mkdirSync(personalDir, { recursive: true }); } catch {}
    }

    configureBeetsYaml(path.join(beetsConfigDir, 'config.yaml'));

    // 5. Multi-Scrobbler directory permissions (ensures writeable permissions for distroless user and host UID)
    const msConfigDir = path.join(dockerData, 'multi-scrobbler', 'config');
    if (!fs.existsSync(msConfigDir)) {
      try { fs.mkdirSync(msConfigDir, { recursive: true }); } catch {}
    }
    try { fs.chmodSync(msConfigDir, 0o777); } catch {}
  } catch (err: any) {
    console.error('Error auto-configurando droppedneedle/feishin/beets/multi-scrobbler:', err.message);
  }
}

/**
 * Canonical configuration for Beets (MusicBrainz autotagger, artwork fetcher & embedder)
 */
export const BEETS_CONFIG_YAML = `# Beets Configuration provisioned automatically by Hostify
# In-place transparent tagging across /music (personal, slskd, explo, torrents)
directory: /music
library: /config/musiclibrary.db

plugins: chroma embedart fetchart fromfilename info lyrics musicbrainz scrub web

asciify_paths: yes

import:
  copy: no
  move: no
  write: yes
  autotag: yes
  resume: yes
  incremental: yes
  incremental_skip_later: yes
  quiet_fallback: asis
  group_albums: yes
  log: /config/beet.log

match:
  strong_rec_thresh: 0.25
  medium_rec_thresh: 0.50
  rec_gap_thresh: 0.15
  max_rec:
    missing_tracks: strong
    unmatched_tracks: strong

musicbrainz:
  searchlimit: 10

lyrics:
  auto: yes
  sources:
    - lrclib

web:
  host: 0.0.0.0
  port: 8337
  reverse_proxy: yes

paths:
  default: $albumartist/$album%aunique{}/$track - $title
  singleton: Non-Album/$artist - $title
  comp: Compilations/$album%aunique{}/$track - $title

fetchart:
  auto: yes
  fetch_for_asis: yes
  maxwidth: 1200
  sources:
    - filesystem
    - coverart
    - itunes
    - amazon
    - albumart

embedart:
  auto: yes
  remove_art_file: no
  ifempty: yes

scrub:
  auto: yes
`;

/**
 * Auto-provision config.yaml for Beets
 */
export function configureBeetsYaml(configPath: string): void {
  // Always write the clean canonical Hostify configuration from scratch
  fs.writeFileSync(configPath, BEETS_CONFIG_YAML, 'utf-8');
}

export interface DroppedNeedleSetupResult {
  success: boolean;
  reason?: string;
}

let cachedDnSession: { value: string; obtainedAt: number } | null = null;
let inFlightDnSession: Promise<string | null> | null = null;
const DN_SESSION_TTL_MS = 6 * 60 * 60 * 1000;

export function invalidateDroppedNeedleSessionCookie(): void {
  cachedDnSession = null;
}

/**
 * Obtain and cache a valid droppedneedle_sid session cookie for passwordless reverse-proxy access
 */
export async function getDroppedNeedleSessionCookie(): Promise<string | null> {
  if (cachedDnSession && (Date.now() - cachedDnSession.obtainedAt) < DN_SESSION_TTL_MS) {
    return cachedDnSession.value;
  }
  if (inFlightDnSession) return inFlightDnSession;

  inFlightDnSession = (async () => {
    try {
      const env = parseEnv(ENV_FILE_PATH);
      const adminUser = (env.NAVIDROME_ADMIN_USER || '').trim();
      const adminPass = env.NAVIDROME_ADMIN_PASSWORD || '';
      if (!adminUser || !adminPass) return null;

      const apiBase = `${resolveServiceTarget('droppedneedle', 8688)}/tools/discover/api/v3`;
      const loginRes = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: adminUser,
          password: adminPass,
          transport: 'cookie',
        }),
        signal: AbortSignal.timeout(4000),
      }).catch(() => null);

      if (!loginRes || !loginRes.ok) return null;

      const setCookies: string[] = typeof (loginRes.headers as any).getSetCookie === 'function'
        ? (loginRes.headers as any).getSetCookie()
        : [loginRes.headers.get('set-cookie') || ''];

      for (const raw of setCookies) {
        const match = raw.match(/(?:^|,\s*)droppedneedle_sid=([^;]+)/i);
        if (match && match[1]) {
          cachedDnSession = { value: match[1], obtainedAt: Date.now() };
          return match[1];
        }
      }
      return null;
    } catch {
      return null;
    } finally {
      inFlightDnSession = null;
    }
  })();

  return inFlightDnSession;
}

/**
 * Auto-provision DroppedNeedle admin user, Slskd client, library roots, Navidrome & ListenBrainz
 */
export async function ensureDroppedNeedleSetup(retry = 0): Promise<DroppedNeedleSetupResult> {
  const maxRetries = 12;
  const apiBase = `${resolveServiceTarget('droppedneedle', 8688)}/tools/discover/api/v3`;

  try {
    const statusRes = await fetch(`${apiBase}/auth/setup/status`, {
      signal: AbortSignal.timeout(3000),
    }).catch(() => null);

    if (!statusRes || !statusRes.ok) {
      if (retry < maxRetries) {
        setTimeout(() => ensureDroppedNeedleSetup(retry + 1), 3000);
      }
      return { success: false, reason: 'unreachable' };
    }

    const setupStatus = (await statusRes.json()) as { setup_required?: boolean; code_required?: boolean };
    if (setupStatus.code_required) {
      return { success: false, reason: 'code_required' };
    }

    const env = parseEnv(ENV_FILE_PATH);
    const adminUser = (env.NAVIDROME_ADMIN_USER || '').trim();
    const adminPass = env.NAVIDROME_ADMIN_PASSWORD || '';
    if (!adminUser || !adminPass) {
      return { success: false, reason: 'missing_credentials' };
    }

    let token: string | null = null;

    if (setupStatus.setup_required) {
      if (adminUser.length < 3 || adminPass.length < 12) {
        console.warn('[Hostify Provisioner] DroppedNeedle auto-admin skipped: password must be at least 12 characters (and username 3+ chars).');
        return { success: false, reason: 'password_too_short' };
      }

      const setupRes = await fetch(`${apiBase}/auth/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: adminUser,
          password: adminPass,
          display_name: adminUser,
          transport: 'bearer',
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (!setupRes.ok) {
        const errBody = await setupRes.text().catch(() => '');
        console.warn(`[Hostify Provisioner] DroppedNeedle setup failed (${setupRes.status}): ${errBody}`);
        return { success: false, reason: 'setup_failed' };
      }

      const setupData = (await setupRes.json()) as { token?: string };
      token = setupData.token || null;
      console.log(`[Hostify Provisioner] DroppedNeedle admin '${adminUser}' provisioned automatically.`);
    } else {
      const loginRes = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: adminUser,
          password: adminPass,
          transport: 'bearer',
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (!loginRes.ok) {
        return { success: false, reason: 'login_failed' };
      }

      const loginData = (await loginRes.json()) as { token?: string };
      token = loginData.token || null;
    }

    if (!token) {
      return { success: false, reason: 'no_token' };
    }

    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // 1. Configure Slskd download client
    try {
      const dlRes = await fetch(`${apiBase}/settings/download-client/config`, {
        headers: authHeaders,
        signal: AbortSignal.timeout(4000),
      });
      if (dlRes.ok) {
        const dlCfg = (await dlRes.json()) as Record<string, any>;
        const targetUrl = 'http://hostify-slskd:5030';
        const targetKey = env.SLSKD_API_KEY || 'hostify_secret_key';
        if (!dlCfg.enabled || dlCfg.url !== targetUrl || dlCfg.downloads_subpath === 'slskd') {
          await fetch(`${apiBase}/settings/download-client/config`, {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify({
              ...dlCfg,
              enabled: true,
              url: targetUrl,
              api_key: targetKey,
              downloads_subpath: '',
            }),
            signal: AbortSignal.timeout(4000),
          });
          console.log('[Hostify Provisioner] DroppedNeedle linked with Slskd successfully.');
        }
      }
    } catch (err: any) {
      console.warn('[Hostify Provisioner] DroppedNeedle Slskd config failed:', err?.message || err);
    }

    // 2. Configure Library roots (/data/discover & /data/personal)
    try {
      const libRes = await fetch(`${apiBase}/settings/library`, {
        headers: authHeaders,
        signal: AbortSignal.timeout(4000),
      });
      if (libRes.ok) {
        const libData = (await libRes.json()) as Record<string, any>;
        if (!Array.isArray(libData.library_roots) || libData.library_roots.length === 0) {
          await fetch(`${apiBase}/settings/library`, {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify({
              expected_policy_revision: libData.policy_revision,
              settings: {
                enabled: libData.enabled ?? true,
                acoustid_api_key: libData.acoustid_api_key || '',
                staging_path: libData.staging_path || '',
                naming_script: libData.naming_script,
                library_roots: [
                  { id: 'discover', label: 'DroppedNeedle Discover', path: '/data/discover', policy: 'automatic', rules: [] },
                  { id: 'personal', label: 'Personal Collection', path: '/data/personal', policy: 'automatic', rules: [] },
                ],
              },
            }),
            signal: AbortSignal.timeout(4000),
          });
          console.log('[Hostify Provisioner] DroppedNeedle library roots (/data/discover, /data/personal) configured.');
        }
      }
    } catch (err: any) {
      console.warn('[Hostify Provisioner] DroppedNeedle library config failed:', err?.message || err);
    }

    // 3. Configure Navidrome integration
    try {
      const naviRes = await fetch(`${apiBase}/settings/navidrome`, {
        headers: authHeaders,
        signal: AbortSignal.timeout(4000),
      });
      if (naviRes.ok) {
        const naviCfg = (await naviRes.json()) as Record<string, any>;
        const targetNaviUrl = `http://hostify-navidrome:${env.NAVIDROME_PORT || 4533}`;
        if (!naviCfg.enabled || naviCfg.navidrome_url !== targetNaviUrl || naviCfg.username !== adminUser) {
          await fetch(`${apiBase}/settings/navidrome`, {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify({
              ...naviCfg,
              enabled: true,
              navidrome_url: targetNaviUrl,
              username: adminUser,
              password: adminPass,
            }),
            signal: AbortSignal.timeout(4000),
          });
          console.log('[Hostify Provisioner] DroppedNeedle linked with Navidrome successfully.');
        }
      }
    } catch (err: any) {
      console.warn('[Hostify Provisioner] DroppedNeedle Navidrome config failed:', err?.message || err);
    }

    // 4. Configure ListenBrainz connection when token is present
    const lzToken = (env.LZ_TOKEN || '').trim();
    if (lzToken) {
      try {
        const existingConnRes = await fetch(`${apiBase}/me/connections`, {
          headers: authHeaders,
          signal: AbortSignal.timeout(4000),
        }).catch(() => null);
        const existingConnData = existingConnRes && existingConnRes.ok
          ? ((await existingConnRes.json()) as { connections?: Array<{ service?: string; provider?: string }> })
          : null;
        const alreadyLinked = Boolean(
          existingConnData?.connections?.some(c => (c.service || c.provider || '').toLowerCase() === 'listenbrainz')
        );

        if (!alreadyLinked) {
          let lzUser = (env.LZ_USER || '').trim();
          if (!lzUser) {
            const valRes = await fetch('https://api.listenbrainz.org/1/validate-token', {
              headers: { Authorization: `Token ${lzToken}` },
              signal: AbortSignal.timeout(15000),
            }).catch(() => null);
            if (valRes && valRes.ok) {
              const valData = (await valRes.json()) as { valid?: boolean; user_name?: string };
              if (valData.valid && valData.user_name) {
                lzUser = valData.user_name;
                env.LZ_USER = lzUser;
                writeEnv(ENV_FILE_PATH, env);
              }
            }
          }

          await fetch(`${apiBase}/settings/listenbrainz`, {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify({ reads_enabled: true }),
            signal: AbortSignal.timeout(4000),
          });

          if (lzUser) {
            const linkRes = await fetch(`${apiBase}/me/connections/listenbrainz`, {
              method: 'PUT',
              headers: authHeaders,
              body: JSON.stringify({ username: lzUser, user_token: lzToken }),
              signal: AbortSignal.timeout(15000),
            });
            if (linkRes.ok) {
              console.log(`[Hostify Provisioner] DroppedNeedle linked with ListenBrainz (${lzUser}).`);
            } else {
              const errText = await linkRes.text().catch(() => '');
              console.warn(`[Hostify Provisioner] DroppedNeedle ListenBrainz link returned ${linkRes.status}: ${errText}`);
            }
          } else {
            console.warn('[Hostify Provisioner] Could not resolve ListenBrainz username (api.listenbrainz.org timed out or rejected token).');
          }
        }
      } catch (err: any) {
        console.warn('[Hostify Provisioner] DroppedNeedle ListenBrainz config failed:', err?.message || err);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.warn('[Hostify Provisioner] Error in ensureDroppedNeedleSetup:', err?.message || err);
    if (retry < maxRetries) {
      setTimeout(() => ensureDroppedNeedleSetup(retry + 1), 4000);
    }
    return { success: false, reason: 'exception' };
  }
}

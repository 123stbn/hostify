import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_DIR } from '../utils/env.js';

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
    const discoverDir = path.join(musicRoot, 'discover');
    const slskdDir = path.join(musicRoot, 'slskd');
    if (!fs.existsSync(discoverDir)) {
      try { fs.mkdirSync(discoverDir, { recursive: true }); } catch {}
    }
    if (!fs.existsSync(slskdDir)) {
      try { fs.mkdirSync(slskdDir, { recursive: true }); } catch {}
    }

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

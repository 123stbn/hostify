import { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware, responseInterceptor } from 'http-proxy-middleware';
import fs from 'node:fs';
import { parseEnv, ENV_FILE_PATH } from '../utils/env.js';

// Helper to resolve internal container DNS or localhost
export function resolveServiceTarget(serviceName: string, defaultPort: number, hostDevPort?: number): string {
  if (fs.existsSync('/.dockerenv') || process.env.CONTAINER === 'true') {
    return `http://${serviceName}:${defaultPort}`;
  }
  return `http://127.0.0.1:${hostDevPort ?? defaultPort}`;
}

// Resolve Navidrome upstream target URL
export function getNavidromeTarget(): string {
  if (process.env.NAVIDROME_URL) return process.env.NAVIDROME_URL;
  return resolveServiceTarget('navidrome', 4533);
}

// Transparent Subsonic reverse proxy middleware
export const navidromeProxyMiddleware = createProxyMiddleware({
  pathFilter: ['/rest/**', '/share/**', '/auth/**', '/app/**'],
  router: () => getNavidromeTarget(),
  changeOrigin: true,
  ws: true,
  on: {
    proxyReq: (proxyReq, req: any) => {
      const env = parseEnv(ENV_FILE_PATH);
      const adminUser = env.NAVIDROME_ADMIN_USER?.trim() || 'admin';
      const reqPath = req.originalUrl || req.url || '';
      // Inject Remote-User header for Navidrome Web UI and auth sessions
      if (!reqPath.startsWith('/rest') && !reqPath.startsWith('/share')) {
        proxyReq.setHeader('Remote-User', adminUser);
      }
    },
    error: (err: any, _req: any, res: any) => {
      console.error('[Hostify Gateway] Navidrome upstream error:', err?.message || err);
      if (res && !res.headersSent && typeof res.status === 'function') {
        res.status(502).json({ error: 'Navidrome service unreachable or starting up' });
      }
    }
  }
});

// Feishin web client proxy. Its settings.js ships with an empty SERVER_URL (invalid with SERVER_LOCK),
// so we rewrite it on the fly with the origin the browser used to reach this gateway.
export const feishinProxyMiddleware = createProxyMiddleware({
  pathFilter: '/feishin/**',
  router: () => resolveServiceTarget('feishin', 9180, Number(process.env.FEISHIN_HOST_PORT) || 9182),
  pathRewrite: { '^/feishin': '' },
  changeOrigin: true,
  ws: true,
  selfHandleResponse: true,
  on: {
    proxyReq: (proxyReq) => {
      // Avoid compressed upstream bodies so the interceptor can edit settings.js
      proxyReq.setHeader('accept-encoding', 'identity');
    },
    proxyRes: responseInterceptor(async (buffer, proxyRes, req: any) => {
      const reqPath: string = req.originalUrl || req.url || '';
      if (!/\/settings\.js(\?|$)/.test(reqPath)) return buffer;
      const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
      const origin = `${proto}://${req.headers['x-forwarded-host'] || req.headers.host}`;
      const env = parseEnv(ENV_FILE_PATH);
      const adminUser = env.NAVIDROME_ADMIN_USER?.trim() || 'admin';
      const adminPass = env.NAVIDROME_ADMIN_PASSWORD?.trim() || '';

      let content = buffer
        .toString('utf8')
        .replace(/(window\.SERVER_URL\s*=\s*)"[^"]*"/, `$1${JSON.stringify(origin)}`);

      // If credentials exist, append the zero-config auto-authentication engine
      if (adminPass) {
        const autoAuthCode = `
;/* [Hostify] Zero-Config Auto-Authentication Engine */
(function autoAuthHostify() {
  var adminUser = ${JSON.stringify(adminUser)};
  var adminPass = ${JSON.stringify(adminPass)};
  var serverUrl = window.SERVER_URL || ${JSON.stringify(origin)};
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

  window.addEventListener("DOMContentLoaded", function() {
    var checkCount = 0;
    var timer = setInterval(function() {
      checkCount++;
      if (checkCount > 40) {
        clearInterval(timer);
        return;
      }

      var hash = window.location.hash || "";
      if (hash.indexOf("action-required") !== -1 || hash.indexOf("login") !== -1) {
        var passInput = document.querySelector('input[type="password"]');
        var userInput = document.querySelector('input[data-autofocus]') || document.querySelector('input[type="text"]:not([readonly])');

        if (passInput && userInput) {
          try {
            var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            setter.call(userInput, adminUser);
            userInput.dispatchEvent(new Event("input", { bubbles: true }));
            setter.call(passInput, adminPass);
            passInput.dispatchEvent(new Event("input", { bubbles: true }));

            setTimeout(function() {
              var btn = document.querySelector('button[type="submit"]');
              if (btn && !btn.disabled) {
                btn.click();
                clearInterval(timer);
              }
            }, 150);
          } catch (e) {}
        }
      } else if (hash === "" || hash === "#/" || hash.indexOf("home") !== -1) {
        clearInterval(timer);
      }
    }, 250);
  });
})();
`;
        content += autoAuthCode;
      }

      return content;
    }),
    error: (err: any, _req: any, res: any) => {
      console.error('[Hostify Gateway] Feishin upstream error:', err?.message || err);
      if (res && !res.headersSent && typeof res.status === 'function') {
        res.status(502).json({ error: 'Feishin service unreachable or starting up' });
      }
    }
  }
});


// Slskd Soulseek P2P web UI proxy (preserves /tools/slskd SLSKD_URL_BASE)
export const slskdProxyMiddleware = createProxyMiddleware({
  pathFilter: '/tools/slskd/**',
  router: () => resolveServiceTarget('slskd', 5030),
  changeOrigin: true,
  ws: true
});

// Slskd API proxy
export const slskdApiProxyMiddleware = createProxyMiddleware({
  pathFilter: '/api/v0/**',
  router: () => resolveServiceTarget('slskd', 5030),
  changeOrigin: true,
  ws: true
});

// Slskd SignalR Hubs proxy (events, searches, logs, metrics)
export const slskdHubProxyMiddleware = createProxyMiddleware({
  pathFilter: '/hub/**',
  router: () => resolveServiceTarget('slskd', 5030),
  changeOrigin: true,
  ws: true
});

// Explo curator web UI proxy (rewrites asset references so scripts load under /tools/explo/assets/)
export const exploProxyMiddleware = createProxyMiddleware({
  pathFilter: '/tools/explo/**',
  router: () => resolveServiceTarget('explo', 7288),
  pathRewrite: { '^/tools/explo': '' },
  changeOrigin: true,
  ws: true,
  selfHandleResponse: true,
  on: {
    proxyRes: responseInterceptor(async (responseBuffer, proxyRes) => {
      const contentType = proxyRes.headers['content-type'] || '';
      if (contentType.includes('text/html')) {
        let html = responseBuffer.toString('utf8');
        html = html.replace(/(src|href)="\/(assets\/[^"]+)"/g, '$1="/tools/explo/$2"');
        return html;
      }
      if (contentType.includes('javascript')) {
        let js = responseBuffer.toString('utf8');
        js = js.replace(/"\/assets\//g, '"/tools/explo/assets/');
        return js;
      }
      return responseBuffer;
    })
  }
});

// Explo UI API & SSE/Events proxy
export const exploApiProxyMiddleware = createProxyMiddleware({
  pathFilter: '/api/ui/**',
  router: () => resolveServiceTarget('explo', 7288),
  changeOrigin: true,
  ws: true
});

// qBittorrent web UI proxy (injects base href and normalizes Origin/Referer to avoid 401)
export const qbittorrentProxyMiddleware = createProxyMiddleware({
  pathFilter: '/tools/qbittorrent/**',
  router: () => resolveServiceTarget('qbittorrent', 8080),
  pathRewrite: { '^/tools/qbittorrent': '' },
  changeOrigin: true,
  ws: true,
  selfHandleResponse: true,
  on: {
    proxyReq: (proxyReq, req) => {
      const target = resolveServiceTarget('qbittorrent', 8080);
      const hostOnly = target.replace(/^https?:\/\//, '');
      proxyReq.setHeader('host', hostOnly);
      proxyReq.setHeader('x-forwarded-host', (req.headers['host'] as string) || hostOnly);
      // qBittorrent requires Origin and Referer to strictly match its internal Host to prevent 401 Unauthorized
      proxyReq.setHeader('origin', target);
      proxyReq.setHeader('referer', `${target}/`);
    },
    proxyRes: responseInterceptor(async (responseBuffer, proxyRes) => {
      const contentType = proxyRes.headers['content-type'] || '';
      if (contentType.includes('text/html')) {
        let html = responseBuffer.toString('utf8');
        if (!html.includes('<base ')) {
          html = html.replace('<head>', '<head>\n    <base href="/tools/qbittorrent/">');
        }
        return html;
      }
      return responseBuffer;
    })
  }
});

// Prowlarr indexer web UI proxy (preserves /tools/prowlarr UrlBase)
export const prowlarrProxyMiddleware = createProxyMiddleware({
  pathFilter: '/tools/prowlarr/**',
  router: () => resolveServiceTarget('prowlarr', 9696),
  changeOrigin: true,
  ws: true
});

// Lidarr music manager web UI proxy (preserves /tools/lidarr UrlBase)
export const lidarrProxyMiddleware = createProxyMiddleware({
  pathFilter: '/tools/lidarr/**',
  router: () => resolveServiceTarget('lidarr', 8686),
  changeOrigin: true,
  ws: true
});

// Multi-scrobbler web UI proxy (preserves /tools/scrobbler base path)
export const scrobblerProxyMiddleware = createProxyMiddleware({
  pathFilter: '/tools/scrobbler/**',
  router: () => resolveServiceTarget('multi-scrobbler', 9078),
  changeOrigin: true,
  ws: true
});

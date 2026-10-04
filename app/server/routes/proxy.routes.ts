import { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware, responseInterceptor } from 'http-proxy-middleware';
import fs from 'node:fs';
import { parseEnv, ENV_FILE_PATH } from '../utils/env.js';

// Helper to resolve internal container DNS or localhost
export function resolveServiceTarget(serviceName: string, defaultPort: number): string {
  if (fs.existsSync('/.dockerenv') || process.env.CONTAINER === 'true') {
    return `http://${serviceName}:${defaultPort}`;
  }
  return `http://127.0.0.1:${defaultPort}`;
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

// Feishin web client proxy
export const feishinProxyMiddleware = createProxyMiddleware({
  pathFilter: '/feishin/**',
  router: () => resolveServiceTarget('feishin', 9180),
  pathRewrite: { '^/feishin': '' },
  changeOrigin: true,
  ws: true
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

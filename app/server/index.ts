import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { apiRouter } from './routes/index.js';
import { 
  navidromeProxyMiddleware,
  feishinProxyMiddleware,
  slskdProxyMiddleware,
  slskdApiProxyMiddleware,
  slskdHubProxyMiddleware,
  exploProxyMiddleware,
  exploApiProxyMiddleware,
  qbittorrentProxyMiddleware,
  prowlarrProxyMiddleware,
  lidarrProxyMiddleware,
  scrobblerProxyMiddleware
} from './routes/proxy.routes.js';
import { PROJECT_DIR, ENV_FILE_PATH, parseEnv } from './utils/env.js';
import { autoConfigureIngestionServices, ensureProwlarrLidarrSetup } from './services/provisioner.service.js';
import { ensureNavidromeAdmin, previousNavidromeCandidates } from './services/subsonic.service.js';
import { joinHostifyNetwork } from './services/compose.service.js';

export const app = express();
const PORT = process.env.PORT || process.env.HOSTIFY_PORT || 3500;

// Enable CORS with full exposure of pagination, auth and range headers for Navidrome / OpenSubsonic clients
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Range, Accept');
  res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count, Content-Range, X-ND-Authorization, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Normalize tool paths with trailing slashes so relative HTML assets load properly
const TOOL_SUBPATHS = [
  '/tools/scrobbler',
  '/tools/slskd',
  '/tools/explo',
  '/tools/qbittorrent',
  '/tools/prowlarr',
  '/tools/lidarr',
  '/feishin',
  '/app'
];

app.use((req, res, next) => {
  if (TOOL_SUBPATHS.includes(req.path)) {
    const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    return res.redirect(301, `${req.path}/${query}`);
  }
  next();
});

// Mount Subsonic API & Satellite tools reverse proxies BEFORE express.json() to preserve raw streaming body
app.use(navidromeProxyMiddleware);
app.use(feishinProxyMiddleware);
app.use(slskdProxyMiddleware);
app.use(slskdApiProxyMiddleware);
app.use(slskdHubProxyMiddleware);
app.use(exploProxyMiddleware);
app.use(exploApiProxyMiddleware);
app.use(qbittorrentProxyMiddleware);
app.use(prowlarrProxyMiddleware);
app.use(lidarrProxyMiddleware);
app.use(scrobblerProxyMiddleware);

app.use(express.json());

// Mount all modular routes under /api prefix
app.use('/api', apiRouter);

function serveStaticBundle(appInstance: express.Express) {
  const clientDistPath = path.resolve(process.cwd(), 'dist/client');
  if (fs.existsSync(clientDistPath)) {
    appInstance.use(express.static(clientDistPath));
    appInstance.get('*', (_req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }
}

// Start server with automatic Vite HMR in development or static distribution in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // Development mode: Vite Dev Server integrated as Express middleware
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
      console.log('[Hostify Appliance] ⚡ Development mode: Vite HMR active with instant reload');
    } catch (err: any) {
      console.warn('[Hostify Appliance] Could not start Vite dev middleware, fallback to static dist:', err.message);
      serveStaticBundle(app);
    }
  } else {
    // Production mode: Serve pre-built static bundle from dist/client
    serveStaticBundle(app);
  }

  // Automatic provisioner setup on initial server startup
  const startupEnv = parseEnv(ENV_FILE_PATH);
  if (startupEnv.DOCKER_DATA && startupEnv.MUSIC_ROOT) {
    autoConfigureIngestionServices(startupEnv.DOCKER_DATA, startupEnv.MUSIC_ROOT, startupEnv);
    ensureProwlarrLidarrSetup(startupEnv.DOCKER_DATA, 0);
  }

  // Align Navidrome admin credentials on startup if configured
  if (startupEnv.NAVIDROME_ADMIN_USER && startupEnv.NAVIDROME_ADMIN_PASSWORD) {
    const candidates = previousNavidromeCandidates(startupEnv);
    ensureNavidromeAdmin(candidates).catch((err) => {
      console.warn('[Hostify Navidrome] Initial admin sync failed:', err?.message || err);
    });
  }

  // Standalone/Portainer: make satellites resolvable by the gateway (no-op if already attached)
  joinHostifyNetwork();

  app.listen(PORT, () => {
    console.log(`[Hostify Appliance] Server running on http://localhost:${PORT}`);
    console.log(`[Hostify Appliance] Project directory: ${PROJECT_DIR}`);
  });
}

startServer();

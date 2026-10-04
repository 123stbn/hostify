import { Router, Request, Response } from 'express';
import { systemRouter } from './system.routes.js';
import { containersRouter } from './containers.routes.js';
import { storageRouter } from './storage.routes.js';
import { playerRouter } from './player.routes.js';
import { setupRouter } from './setup.routes.js';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { getNavidromeTarget } from './proxy.routes.js';
import { ENV_FILE_PATH, parseEnv } from '../utils/env.js';

export const apiRouter = Router();

apiRouter.use(systemRouter);
apiRouter.use(containersRouter);
apiRouter.use(storageRouter);
apiRouter.use(playerRouter);
apiRouter.use(setupRouter);

// Transparent fallback for Navidrome internal API requests (e.g. /api/user, /api/listenbrainz)
apiRouter.use(createProxyMiddleware({
  router: () => getNavidromeTarget(),
  pathRewrite: (path) => `/api${path}`,
  changeOrigin: true,
  ws: true,
  on: {
    proxyReq: (proxyReq) => {
      const env = parseEnv(ENV_FILE_PATH);
      const adminUser = env.NAVIDROME_ADMIN_USER?.trim() || 'admin';
      proxyReq.setHeader('Remote-User', adminUser);
    },
    error: (_err: any, req: Request, res: any) => {
      if (res && !res.headersSent && typeof res.status === 'function') {
        res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
      }
    }
  }
}));

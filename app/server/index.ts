import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { apiRouter } from './routes/index.js';
import { PROJECT_DIR, ENV_FILE_PATH, parseEnv } from './utils/env.js';
import { autoConfigureIngestionServices, ensureProwlarrLidarrSetup } from './services/provisioner.service.js';

export const app = express();
const PORT = process.env.PORT || process.env.HOSTIFY_PORT || 3500;

app.use(cors());
app.use(express.json());

// Montar todas las rutas modulares bajo el prefijo /api
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

// Iniciar servidor con soporte HMR automático en desarrollo o estáticos en producción
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // Modo Desarrollo: Vite Dev Server integrado como Middleware (HMR instantáneo)
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
      console.log('[Hostify Appliance] ⚡ Modo desarrollo: Vite HMR activo con recarga automática');
    } catch (err: any) {
      console.warn('[Hostify Appliance] No se pudo iniciar Vite middleware, fallback a dist:', err.message);
      serveStaticBundle(app);
    }
  } else {
    // Modo Producción: Servir bundle optimizado de dist/client
    serveStaticBundle(app);
  }

  // Auto-configuración inicial al arrancar el servidor
  const startupEnv = parseEnv(ENV_FILE_PATH);
  if (startupEnv.DOCKER_DATA && startupEnv.MUSIC_ROOT) {
    autoConfigureIngestionServices(startupEnv.DOCKER_DATA, startupEnv.MUSIC_ROOT, startupEnv);
    ensureProwlarrLidarrSetup(startupEnv.DOCKER_DATA, 0);
  }

  app.listen(PORT, () => {
    console.log(`[Hostify Appliance] Servidor escuchando en http://localhost:${PORT}`);
    console.log(`[Hostify Appliance] Directorio de proyecto: ${PROJECT_DIR}`);
  });
}

startServer();

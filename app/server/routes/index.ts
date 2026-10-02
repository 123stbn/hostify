import { Router, Request, Response } from 'express';
import { systemRouter } from './system.routes.js';
import { containersRouter } from './containers.routes.js';
import { storageRouter } from './storage.routes.js';
import { playerRouter } from './player.routes.js';
import { setupRouter } from './setup.routes.js';

export const apiRouter = Router();

apiRouter.use(systemRouter);
apiRouter.use(containersRouter);
apiRouter.use(storageRouter);
apiRouter.use(playerRouter);
apiRouter.use(setupRouter);

// 404 JSON para rutas de API no existentes (evita retornar HTML en llamadas a la API)
apiRouter.all('*', (req: Request, res: Response) => {
  res.status(404).json({ error: `Ruta API no encontrada: ${req.method} ${req.path}` });
});

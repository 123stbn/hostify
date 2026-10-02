import { Router, Request, Response } from 'express';
import {
  getStorageStatus,
  initStorageFolders,
  browseDirectory,
  createDirectory,
} from '../services/storage.service.js';
import { triggerNavidromeScan } from '../services/subsonic.service.js';

export const storageRouter = Router();

// Inspección del almacenamiento de música
storageRouter.get('/storage', async (_req: Request, res: Response) => {
  try {
    const status = await getStorageStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Disparar escaneo manual de Navidrome desde el frontend
storageRouter.post('/navidrome/scan', async (_req: Request, res: Response) => {
  try {
    const data = await triggerNavidromeScan();
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Inicializar y crear subcarpetas de ingesta
storageRouter.post('/storage/init', (req: Request, res: Response) => {
  const { musicRoot } = req.body;
  try {
    const result = initStorageFolders(musicRoot);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: `Error creando carpetas: ${err.message}` });
  }
});

// Explorador de archivos del Host Multiplataforma (macOS, Windows, Linux, NAS)
storageRouter.get('/browse', (req: Request, res: Response) => {
  const queryPath = (req.query.path as string) || '';
  try {
    const result = browseDirectory(queryPath);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: `Error explorando ruta: ${err.message}`, currentPath: queryPath });
  }
});

// Crear una nueva carpeta en la ruta indicada
storageRouter.post('/mkdir', (req: Request, res: Response) => {
  const { parentPath, folderName } = req.body;
  if (!parentPath || !folderName) {
    return res.status(400).json({ error: 'Ruta padre y nombre de carpeta son requeridos' });
  }

  try {
    const result = createDirectory(parentPath, folderName);
    res.json(result);
  } catch (err: any) {
    res.status(err.message === 'La carpeta ya existe' || err.message === 'Nombre de carpeta inválido' ? 400 : 500)
      .json({ error: `Error creando carpeta: ${err.message}` });
  }
});

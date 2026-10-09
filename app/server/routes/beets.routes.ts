import { Router, Request, Response } from 'express';
import { getBeetsStatus, triggerBeetsScan } from '../services/beets.service.js';

export const beetsRouter = Router();

// Retrieve Beets tagging status, logs, and stats
beetsRouter.get('/tools/beets/status', (_req: Request, res: Response) => {
  res.json(getBeetsStatus());
});

// Trigger an in-place MusicBrainz tagging scan across /music
beetsRouter.post('/tools/beets/scan', async (req: Request, res: Response) => {
  const targetPath = (req.body && req.body.path) || '/music';
  const result = await triggerBeetsScan(targetPath);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

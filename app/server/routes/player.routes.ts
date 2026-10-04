import { Router, Request, Response } from 'express';
import { getNowPlaying, getCoverArt, getAudioStream } from '../services/subsonic.service.js';

export const playerRouter = Router();

// Live Playback State (Now Playing from Navidrome)
playerRouter.get('/now-playing', async (_req: Request, res: Response) => {
  const result = await getNowPlaying();
  res.json(result);
});

// Album Cover Art Proxy from Navidrome
playerRouter.get('/cover-art', async (req: Request, res: Response) => {
  const artId = req.query.id as string;
  if (!artId) return res.status(400).send('Missing id');

  try {
    const art = await getCoverArt(artId);
    if (!art) {
      return res.status(404).send('Cover not found');
    }

    res.setHeader('Content-Type', art.contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(art.data);
  } catch {
    res.status(500).send('Error fetching cover art');
  }
});

// Audio Stream Proxy for Dashboard Hi-Fi widget
playerRouter.get('/stream', async (req: Request, res: Response) => {
  const songId = req.query.id as string;
  if (!songId) return res.status(400).send('Missing song id');

  try {
    const audio = await getAudioStream(songId);
    if (!audio) {
      return res.status(500).send('Stream error');
    }

    res.setHeader('Content-Type', audio.contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    audio.stream.pipe(res);
  } catch (err: any) {
    res.status(500).send('Error streaming track: ' + err.message);
  }
});

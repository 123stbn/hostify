import { spawn } from 'node:child_process';
import { triggerNavidromeScan } from './subsonic.service.js';
import { dockerClient } from './docker.service.js';

export interface BeetsStatus {
  isScanning: boolean;
  lastScanAt: string | null;
  lastError: string | null;
  lastLogs: string[];
  totalTagged: number;
}

let beetsStatus: BeetsStatus = {
  isScanning: false,
  lastScanAt: null,
  lastError: null,
  lastLogs: [],
  totalTagged: 0,
};

export function getBeetsStatus(): BeetsStatus {
  return beetsStatus;
}

/**
 * Triggers an in-place MusicBrainz tagging scan on /music using the Beets container.
 * Runs non-interactively in the background and notifies Navidrome when completed.
 */
export async function triggerBeetsScan(targetPath: string = '/music'): Promise<{ success: boolean; message: string }> {
  if (beetsStatus.isScanning) {
    return { success: false, message: 'Un escaneo de Beets ya se encuentra en progreso' };
  }

  if (!dockerClient.isAvailable()) {
    return { success: false, message: 'Docker Engine no está disponible' };
  }

  beetsStatus.isScanning = true;
  beetsStatus.lastError = null;
  beetsStatus.lastLogs = [`[${new Date().toLocaleTimeString()}] 🚀 Iniciando auto-etiquetado transparente con Beets en ${targetPath}...`];

  const cleanLine = (str: string) => str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').trim();

  try {
    const sanitizedPath = targetPath.replace(/[^a-zA-Z0-9_\-\/\.]/g, '') || '/music';
    const proc = spawn('docker', ['exec', 'hostify-beets', 'sh', '-c', `rm -f /config/state.pickle && beet import -q "${sanitizedPath}"`]);

    proc.stdout.on('data', (chunk) => {
      const lines = chunk.toString().split('\n').map(cleanLine).filter(Boolean);
      for (const line of lines) {
        beetsStatus.lastLogs.push(`[${new Date().toLocaleTimeString()}] ${line}`);
        if (beetsStatus.lastLogs.length > 50) beetsStatus.lastLogs.shift();
      }
    });

    proc.stderr.on('data', (chunk) => {
      const lines = chunk.toString().split('\n').map(cleanLine).filter(Boolean);
      for (const line of lines) {
        beetsStatus.lastLogs.push(`[${new Date().toLocaleTimeString()}] [WARN] ${line}`);
        if (beetsStatus.lastLogs.length > 50) beetsStatus.lastLogs.shift();
      }
    });

    proc.on('close', async (code) => {
      beetsStatus.isScanning = false;
      beetsStatus.lastScanAt = new Date().toISOString();

      if (code === 0) {
        beetsStatus.lastLogs.push(`[${new Date().toLocaleTimeString()}] ✔ Etiquetado e incrustación completados con éxito.`);
        // Query current library track count from Beets
        try {
          const countProc = spawn('docker', ['exec', 'hostify-beets', 'beet', 'ls', '-c']);
          countProc.stdout.on('data', (data) => {
            const count = parseInt(data.toString().trim(), 10);
            if (!isNaN(count)) beetsStatus.totalTagged = count;
          });
        } catch {}

        // Notify Navidrome so it detects updated ID3 tags & artwork
        triggerNavidromeScan().catch(() => {});
      } else {
        beetsStatus.lastError = `Proceso de Beets finalizó con código ${code}`;
        beetsStatus.lastLogs.push(`[${new Date().toLocaleTimeString()}] ❌ Error en escaneo (código ${code}).`);
      }
    });

    proc.on('error', (err) => {
      beetsStatus.isScanning = false;
      beetsStatus.lastError = err.message;
      beetsStatus.lastLogs.push(`[${new Date().toLocaleTimeString()}] ❌ Error al ejecutar proceso: ${err.message}`);
    });

    return { success: true, message: 'Escaneo de Beets iniciado correctamente' };
  } catch (err: any) {
    beetsStatus.isScanning = false;
    beetsStatus.lastError = err.message;
    return { success: false, message: `Error al iniciar Beets: ${err.message}` };
  }
}

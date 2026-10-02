import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { parseEnv, ENV_FILE_PATH } from '../utils/env.js';
import { triggerNavidromeScan } from './subsonic.service.js';

let lastKnownTrackCount = -1;

const AUDIO_EXTENSIONS = new Set(['.flac', '.mp3', '.m4a', '.ogg', '.wav', '.opus']);

/**
 * Conteo no recursivo manual, usando el soporte recursivo nativo de Node.js 20+
 */
export function countFilesRecursively(dirPath: string): number {
  let count = 0;
  try {
    const entries = fs.readdirSync(dirPath, { recursive: true, withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        count++;
      }
    }
  } catch {}
  return count;
}

/**
 * Inspección del almacenamiento de música
 */
export async function getStorageStatus() {
  const env = parseEnv(ENV_FILE_PATH);
  const musicRoot = env.MUSIC_ROOT || '/volume1/music';

  const subdirs = ['personal', 'explo', 'slskd', 'torrents'];
  const folderStatus: Record<string, { exists: boolean; path: string; fileCount: number }> = {};

  let totalFiles = 0;
  for (const sub of subdirs) {
    const fullPath = path.join(musicRoot, sub);
    const exists = fs.existsSync(fullPath);
    let count = 0;
    if (exists) {
      try {
        count = countFilesRecursively(fullPath);
        totalFiles += count;
      } catch {
        count = 0;
      }
    }
    folderStatus[sub] = { exists, path: fullPath, fileCount: count };
  }

  // Si se detectan archivos nuevos o modificados, auto-disparar escaneo en Navidrome
  if (lastKnownTrackCount !== -1 && lastKnownTrackCount !== totalFiles) {
    console.log(`[Hostify Storage] Conteo de pistas cambió de ${lastKnownTrackCount} a ${totalFiles}. Auto-escaneando Navidrome...`);
    triggerNavidromeScan().catch(() => {});
  }
  lastKnownTrackCount = totalFiles;

  return {
    musicRoot,
    exists: fs.existsSync(musicRoot),
    folders: folderStatus,
    totalTrackCount: totalFiles,
  };
}

/**
 * Inicializar y crear subcarpetas de ingesta
 */
export function initStorageFolders(musicRoot?: string) {
  const targetRoot = musicRoot || parseEnv(ENV_FILE_PATH).MUSIC_ROOT || '/volume1/music';

  if (!fs.existsSync(targetRoot)) {
    fs.mkdirSync(targetRoot, { recursive: true });
  }
  const subdirs = ['personal', 'explo', 'slskd', 'torrents'];
  for (const sub of subdirs) {
    const p = path.join(targetRoot, sub);
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p, { recursive: true });
    }
  }
  return { success: true, message: 'Estructura de carpetas creada correctamente' };
}

/**
 * Explorador de archivos del Host Multiplataforma (macOS, Windows, Linux, NAS)
 */
export function browseDirectory(queryPath?: string) {
  const isWindows = process.platform === 'win32';
  const isMac = process.platform === 'darwin';

  let targetPath = '';

  if (queryPath) {
    targetPath = path.resolve(queryPath);
  } else {
    // Rutas iniciales inteligentes según el Sistema Operativo
    if (isWindows) {
      targetPath = process.env.USERPROFILE || 'C:\\';
    } else if (isMac) {
      targetPath = os.homedir();
    } else {
      targetPath = fs.existsSync('/volume1') ? '/volume1' : os.homedir();
    }
  }

  if (!fs.existsSync(targetPath)) {
    targetPath = os.homedir() || (isWindows ? 'C:\\' : '/');
  }

  const stat = fs.statSync(targetPath);
  if (!stat.isDirectory()) {
    targetPath = path.dirname(targetPath);
  }

  // Leer entradas del directorio
  let directories: Array<{ name: string; path: string }> = [];
  try {
    const entries = fs.readdirSync(targetPath, { withFileTypes: true });
    directories = entries
      .filter(e => {
        try {
          return e.isDirectory() && !e.name.startsWith('$') && !e.name.startsWith('.');
        } catch {
          return false;
        }
      })
      .map(e => ({
        name: e.name,
        path: path.join(targetPath, e.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  } catch (readErr: any) {
    console.warn(`No se pudo leer el contenido de ${targetPath}:`, readErr.message);
  }

  // Generar breadcrumbs compatibles con Windows y POSIX
  const breadcrumbs: Array<{ name: string; path: string }> = [];
  if (isWindows) {
    const parsed = path.parse(targetPath);
    const rootDrive = parsed.root; // ej. 'C:\\'
    breadcrumbs.push({ name: rootDrive, path: rootDrive });

    const relativeParts = targetPath.slice(rootDrive.length).split(path.sep).filter(Boolean);
    let currentAcc = rootDrive;
    for (const part of relativeParts) {
      currentAcc = path.join(currentAcc, part);
      breadcrumbs.push({ name: part, path: currentAcc });
    }
  } else {
    breadcrumbs.push({ name: '/', path: '/' });
    const parts = targetPath.split(path.sep).filter(Boolean);
    let accPath = '';
    for (const part of parts) {
      accPath += path.sep + part;
      breadcrumbs.push({ name: part, path: accPath });
    }
  }

  // Calcular directorio padre
  const parent = path.dirname(targetPath);
  const parentPath = (parent === targetPath) ? null : parent;

  // Atajos comunes dinámicos según el Sistema Operativo
  const commonShortcuts: string[] = [];
  if (isWindows) {
    for (const letter of 'CDEFGHIJKLMNOPQRSTUVWXYZ') {
      const drive = `${letter}:\\`;
      try {
        if (fs.existsSync(drive)) commonShortcuts.push(drive);
      } catch {}
    }
    const userHome = os.homedir();
    if (userHome && !commonShortcuts.includes(userHome)) commonShortcuts.push(userHome);
    const musicFolder = path.join(userHome, 'Music');
    if (fs.existsSync(musicFolder)) commonShortcuts.push(musicFolder);
  } else if (isMac) {
    const macCandidates = [os.homedir(), path.join(os.homedir(), 'Music'), '/Volumes', '/'];
    for (const cand of macCandidates) {
      if (fs.existsSync(cand) && !commonShortcuts.includes(cand)) commonShortcuts.push(cand);
    }
  } else {
    const linuxCandidates = ['/volume1', '/volume2', '/media', '/mnt', '/home', os.homedir(), '/'];
    for (const cand of linuxCandidates) {
      if (fs.existsSync(cand) && !commonShortcuts.includes(cand)) commonShortcuts.push(cand);
    }
  }

  // Comprobación de permisos de escritura
  let canWrite = true;
  try {
    fs.accessSync(targetPath, fs.constants.W_OK);
  } catch {
    canWrite = false;
  }

  return {
    platform: process.platform,
    currentPath: targetPath,
    parentPath,
    breadcrumbs,
    directories,
    commonShortcuts,
    canWrite,
  };
}

/**
 * Crear una nueva carpeta en la ruta indicada
 */
export function createDirectory(parentPath: string, folderName: string) {
  const sanitized = folderName.trim().replace(/[/\\]/g, '');
  if (!sanitized) {
    throw new Error('Nombre de carpeta inválido');
  }

  const newPath = path.join(parentPath, sanitized);
  if (fs.existsSync(newPath)) {
    throw new Error('La carpeta ya existe');
  }
  fs.mkdirSync(newPath, { recursive: true });
  return { success: true, createdPath: newPath };
}

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { parseEnv, ENV_FILE_PATH } from '../utils/env.js';
import { triggerNavidromeScan, getNavidromeLibraryCount } from './subsonic.service.js';

let lastKnownTrackCount = -1;

const AUDIO_EXTENSIONS = new Set([
  '.flac', '.mp3', '.m4a', '.ogg', '.wav', '.opus',
  '.aac', '.wma', '.alac', '.aiff', '.aif', '.ape',
  '.mpc', '.dsf', '.dff'
]);

const IGNORED_FOLDERS = new Set([
  '@eadir', '.recycle', '#recycle', '.trash', '.ds_store', 'thumbs.db', '.git'
]);

/**
 * Resilient recursive audio file count, skipping NAS/system folders and gracefully ignoring unreadable dirs
 */
export function countFilesRecursively(dirPath: string): number {
  let count = 0;
  function walk(currentDir: string, depth = 0) {
    if (depth > 25) return;
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const nameLower = entry.name.toLowerCase();
        if (IGNORED_FOLDERS.has(nameLower) || nameLower.startsWith('.@')) {
          continue;
        }
        const full = path.join(currentDir, entry.name);
        try {
          if (entry.isDirectory()) {
            walk(full, depth + 1);
          } else if (entry.isFile() && AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
            count++;
          }
        } catch {
          // Gracefully continue on unreadable individual files or subfolders
        }
      }
    } catch {
      // Gracefully continue on unreadable directory
    }
  }

  walk(dirPath);
  return count;
}

/**
 * Inspección del almacenamiento de música
 */
export async function getStorageStatus() {
  const env = parseEnv(ENV_FILE_PATH);
  const musicRoot = env.MUSIC_ROOT || '/volume1/music';
  const effectiveMusicDir = fs.existsSync(musicRoot)
    ? musicRoot
    : (fs.existsSync('/music') ? '/music' : musicRoot);

  const subdirs = ['personal', 'explo', 'slskd', 'torrents'];
  // Keep legacy inbox reporting only if folder physically exists on disk
  if (fs.existsSync(path.join(effectiveMusicDir, 'inbox'))) {
    subdirs.push('inbox');
  }
  const folderStatus: Record<string, { exists: boolean; path: string; fileCount: number }> = {};

  let subdirsTotal = 0;
  for (const sub of subdirs) {
    const fullPath = path.join(effectiveMusicDir, sub);
    const exists = fs.existsSync(fullPath);
    let count = 0;
    if (exists) {
      try {
        count = countFilesRecursively(fullPath);
        subdirsTotal += count;
      } catch {
        count = 0;
      }
    }
    folderStatus[sub] = { exists, path: path.join(musicRoot, sub), fileCount: count };
  }

  // Count all audio files across the entire music directory recursively (including nested custom folders)
  let totalFiles = 0;
  if (fs.existsSync(effectiveMusicDir)) {
    try {
      totalFiles = countFilesRecursively(effectiveMusicDir);
    } catch {
      totalFiles = subdirsTotal;
    }
  } else {
    totalFiles = subdirsTotal;
  }

  // Query Navidrome as authoritative index for scanned tracks
  try {
    const naviCount = await getNavidromeLibraryCount();
    if (typeof naviCount === 'number' && naviCount > totalFiles) {
      totalFiles = naviCount;
    }
  } catch {}

  // Any music file in musicRoot outside explo, slskd, and torrents belongs to the user's personal collection
  const exploCount = folderStatus.explo?.fileCount || 0;
  const slskdCount = folderStatus.slskd?.fileCount || 0;
  const torrentsCount = folderStatus.torrents?.fileCount || 0;
  const personalCount = Math.max(
    folderStatus.personal?.fileCount || 0,
    totalFiles - (exploCount + slskdCount + torrentsCount)
  );

  folderStatus.personal = {
    exists: folderStatus.personal?.exists || fs.existsSync(effectiveMusicDir) || totalFiles > 0,
    path: path.join(musicRoot, 'personal'),
    fileCount: personalCount
  };

  // If new or modified tracks are detected, trigger auto-scan in Navidrome
  if (lastKnownTrackCount !== -1 && lastKnownTrackCount !== totalFiles) {
    console.log(`[Hostify Storage] Track count changed from ${lastKnownTrackCount} to ${totalFiles}. Triggering Navidrome library scan...`);
    triggerNavidromeScan().catch(() => {});
  }
  lastKnownTrackCount = totalFiles;

  return {
    musicRoot,
    exists: fs.existsSync(effectiveMusicDir) || totalFiles > 0,
    folders: folderStatus,
    totalTrackCount: totalFiles,
  };
}

/**
 * Initialize and provision ingestion subfolders
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
    // When running in Docker, HOST_HOME is the real host home dir (mounted read-only).
    // Use it as the default starting point so the picker shows the host filesystem.
    const hostHome = process.env.HOST_HOME;
    if (hostHome && fs.existsSync(hostHome)) {
      targetPath = hostHome;
    } else if (isWindows) {
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

  // Read directory entries
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
    console.warn(`Failed to read directory content for ${targetPath}:`, readErr.message);
  }

  // Generate breadcrumbs compatible with Windows and POSIX
  const breadcrumbs: Array<{ name: string; path: string }> = [];
  if (isWindows) {
    const parsed = path.parse(targetPath);
    const rootDrive = parsed.root; // e.g. 'C:\\'
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

  // Calculate parent directory
  const parent = path.dirname(targetPath);
  const parentPath = (parent === targetPath) ? null : parent;

  // OS-specific dynamic shortcuts
  const commonShortcuts: string[] = [];
  const hostHome = process.env.HOST_HOME;

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
  } else if (hostHome && fs.existsSync(hostHome)) {
    // Docker environment with user home volume mounted:
    // Only display real user host paths to avoid confusing with internal Linux/NAS container paths
    const candidates = [
      path.join(hostHome, 'Music'),
      path.join(hostHome, 'music'),
      hostHome,
    ];
    for (const cand of candidates) {
      if (fs.existsSync(cand) && !commonShortcuts.includes(cand)) commonShortcuts.push(cand);
    }
  } else if (isMac) {
    const macCandidates = [path.join(os.homedir(), 'Music'), os.homedir()];
    for (const cand of macCandidates) {
      if (fs.existsSync(cand) && !commonShortcuts.includes(cand)) commonShortcuts.push(cand);
    }
  } else {
    const userHome = os.homedir();
    const linuxCandidates = [
      path.join(userHome, 'Music'),
      path.join(userHome, 'music'),
      userHome,
      '/volume1/music',
      '/media',
      '/mnt',
    ];
    for (const cand of linuxCandidates) {
      if (fs.existsSync(cand) && !commonShortcuts.includes(cand)) commonShortcuts.push(cand);
    }
  }

  // Write permissions check
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

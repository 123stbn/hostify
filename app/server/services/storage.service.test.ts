import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  countFilesRecursively,
  browseDirectory,
  createDirectory,
  initStorageFolders,
} from './storage.service.js';

describe('Storage Service (storage.service.ts)', () => {
  const tmpDir = path.join(os.tmpdir(), `hostify-storage-test-${Date.now()}`);

  beforeEach(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  test('countFilesRecursively counts only audio files in nested directories', () => {
    const subA = path.join(tmpDir, 'artist1', 'album1');
    fs.mkdirSync(subA, { recursive: true });

    fs.writeFileSync(path.join(subA, 'track1.flac'), 'dummy');
    fs.writeFileSync(path.join(subA, 'track2.mp3'), 'dummy');
    fs.writeFileSync(path.join(subA, 'cover.jpg'), 'dummy image');
    fs.writeFileSync(path.join(subA, 'lyrics.txt'), 'dummy text');

    const count = countFilesRecursively(tmpDir);
    assert.equal(count, 2);
  });

  test('initStorageFolders creates personal, explo, slskd, and torrents folders', () => {
    initStorageFolders(tmpDir);
    assert.ok(fs.existsSync(path.join(tmpDir, 'personal')));
    assert.ok(fs.existsSync(path.join(tmpDir, 'explo')));
    assert.ok(fs.existsSync(path.join(tmpDir, 'slskd')));
    assert.ok(fs.existsSync(path.join(tmpDir, 'torrents')));
  });

  test('browseDirectory returns breadcrumbs, directories, and write permissions', () => {
    fs.mkdirSync(path.join(tmpDir, 'FolderA'));
    fs.mkdirSync(path.join(tmpDir, 'FolderB'));

    const result = browseDirectory(tmpDir);
    assert.equal(result.currentPath, tmpDir);
    assert.ok(Array.isArray(result.breadcrumbs));
    assert.ok(result.breadcrumbs.length > 0);
    assert.ok(result.directories.some(d => d.name === 'FolderA'));
    assert.ok(result.directories.some(d => d.name === 'FolderB'));
    assert.equal(result.canWrite, true);
  });

  test('createDirectory creates a new directory and rejects invalid names or duplicates', () => {
    const res = createDirectory(tmpDir, 'MyNewFolder');
    assert.equal(res.success, true);
    assert.ok(fs.existsSync(res.createdPath));

    assert.throws(() => {
      createDirectory(tmpDir, 'MyNewFolder');
    }, /La carpeta ya existe/);

    assert.throws(() => {
      createDirectory(tmpDir, '   ');
    }, /Nombre de carpeta inválido/);
  });
});

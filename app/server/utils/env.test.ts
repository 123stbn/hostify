import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { parseEnv, writeEnv } from './env.js';

describe('Environment Utilities (env.ts)', () => {
  const tmpDir = path.join(os.tmpdir(), `hostify-env-test-${Date.now()}`);
  const envFile = path.join(tmpDir, '.env.test');

  beforeEach(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  test('parseEnv returns empty object when file does not exist', () => {
    const result = parseEnv(path.join(tmpDir, 'non-existent.env'));
    assert.deepEqual(result, {});
  });

  test('parseEnv correctly parses key-value pairs and trims quotes', () => {
    const content = `
# Comment
PORT=3000
NAVIDROME_USER="my_user"
NAVIDROME_PASS='secret_123'
EMPTY_VAL=
    SPACED_KEY = spaced_value
`;
    fs.writeFileSync(envFile, content, 'utf-8');
    const result = parseEnv(envFile);

    assert.equal(result.PORT, '3000');
    assert.equal(result.NAVIDROME_USER, 'my_user');
    assert.equal(result.NAVIDROME_PASS, 'secret_123');
    assert.equal(result.EMPTY_VAL, '');
    assert.equal(result.SPACED_KEY, 'spaced_value');
  });

  test('writeEnv writes and updates key-value pairs', () => {
    writeEnv(envFile, {
      PORT: '4000',
      TZ: 'America/Lima',
    });

    const parsed = parseEnv(envFile);
    assert.equal(parsed.PORT, '4000');
    assert.equal(parsed.TZ, 'America/Lima');

    // Update existing and add new with merged state
    const current = parseEnv(envFile);
    writeEnv(envFile, {
      ...current,
      PORT: '5000',
      NEW_KEY: 'hello',
    });

    const updated = parseEnv(envFile);
    assert.equal(updated.PORT, '5000');
    assert.equal(updated.TZ, 'America/Lima');
    assert.equal(updated.NEW_KEY, 'hello');
  });
});

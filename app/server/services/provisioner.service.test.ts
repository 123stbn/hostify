import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { configureBeetsYaml, autoConfigureIngestionServices, ensureDroppedNeedleSetup } from './provisioner.service.js';

describe('Provisioner Service (provisioner.service.ts)', () => {
  const tmpDir = path.join(os.tmpdir(), `hostify-provisioner-test-${Date.now()}`);

  beforeEach(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  test('autoConfigureIngestionServices provisions DroppedNeedle, Slskd, Beets, Feishin and Multi-Scrobbler directories', () => {
    const dockerData = path.join(tmpDir, 'docker');
    const musicRoot = path.join(tmpDir, 'music');

    autoConfigureIngestionServices(dockerData, musicRoot);

    assert.ok(fs.existsSync(path.join(dockerData, 'droppedneedle', 'config')));
    assert.ok(fs.existsSync(path.join(dockerData, 'droppedneedle', 'plugins')));
    assert.ok(fs.existsSync(path.join(dockerData, 'feishin', 'settings.js.template')));
    assert.ok(fs.existsSync(path.join(dockerData, 'beets', 'config', 'config.yaml')));
    assert.ok(fs.existsSync(path.join(dockerData, 'multi-scrobbler', 'config')));
    assert.ok(fs.existsSync(path.join(musicRoot, 'personal')));
    assert.ok(fs.existsSync(path.join(musicRoot, 'discover')));
    assert.ok(fs.existsSync(path.join(musicRoot, 'slskd')));
    assert.equal(fs.existsSync(path.join(musicRoot, 'slskd', '.ndignore')), false);
    assert.ok(fs.existsSync(path.join(musicRoot, '.ndignore')));
    const rootIgnore = fs.readFileSync(path.join(musicRoot, '.ndignore'), 'utf-8');
    assert.ok(rootIgnore.includes('\\#recycle/'));
    assert.equal(rootIgnore.includes('slskd/'), false);
  });

  test('configureBeetsYaml creates default config.yaml with plugins and web on port 8337', () => {
    const beetsConfigPath = path.join(tmpDir, 'beets_config.yaml');
    configureBeetsYaml(beetsConfigPath);

    assert.ok(fs.existsSync(beetsConfigPath));
    const content = fs.readFileSync(beetsConfigPath, 'utf-8');
    assert.ok(content.includes('directory: /music'));
    assert.ok(content.includes('plugins: chroma embedart fetchart fromfilename info lyrics musicbrainz scrub web'));
    assert.ok(content.includes('quiet_fallback: asis'));
    assert.ok(content.includes('fetch_for_asis: yes'));
    assert.ok(content.includes('incremental_skip_later: yes'));
    assert.ok(content.includes('strong_rec_thresh: 0.25'));
    assert.ok(content.includes('port: 8337'));
    assert.ok(content.includes('reverse_proxy: yes'));
  });

  test('configureBeetsYaml overwrites existing config.yaml with canonical configuration', () => {
    const beetsConfigPath = path.join(tmpDir, 'existing_beets.yaml');
    fs.writeFileSync(beetsConfigPath, 'corrupted: yaml\n  syntax error\n', 'utf-8');

    configureBeetsYaml(beetsConfigPath);

    const content = fs.readFileSync(beetsConfigPath, 'utf-8');
    assert.ok(content.includes('directory: /music'));
    assert.ok(content.includes('web:'));
    assert.ok(content.includes('port: 8337'));
    assert.ok(content.includes('fetch_for_asis: yes'));
  });

  test('ensureDroppedNeedleSetup skips safely when password is missing or unreachable without throwing', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({ setup_required: true, code_required: true }), { status: 200 });
    try {
      const res = await ensureDroppedNeedleSetup(99);
      assert.equal(res.success, false);
      assert.equal(res.reason, 'code_required');
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});


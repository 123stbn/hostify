import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { configureServarrXml, configureBeetsYaml } from './provisioner.service.js';

describe('Provisioner Service (provisioner.service.ts)', () => {
  const tmpDir = path.join(os.tmpdir(), `hostify-provisioner-test-${Date.now()}`);
  const xmlPath = path.join(tmpDir, 'config.xml');

  beforeEach(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  test('configureServarrXml generates a valid XML with port, apiKey, and AllowedHosts', () => {
    const envData: Record<string, string> = { PROWLARR_API_KEY: 'test_api_key_123' };
    configureServarrXml(
      xmlPath,
      9696,
      'Prowlarr',
      'localhost,127.0.0.1',
      '127.0.0.1/32',
      'PROWLARR_API_KEY',
      envData
    );

    assert.ok(fs.existsSync(xmlPath));
    const content = fs.readFileSync(xmlPath, 'utf-8');

    assert.ok(content.includes('<Port>9696</Port>'));
    assert.ok(content.includes('<ApiKey>test_api_key_123</ApiKey>'));
    assert.ok(content.includes('<AuthenticationMethod>Forms</AuthenticationMethod>'));
    assert.ok(content.includes('<AuthenticationRequired>DisabledForLocalAddresses</AuthenticationRequired>'));
    assert.ok(content.includes('<AllowedHosts>localhost,127.0.0.1</AllowedHosts>'));
  });

  test('configureServarrXml preserves existing apiKey if none is provided in envData', () => {
    const initialXml = `<Config>\n  <Port>9696</Port>\n  <ApiKey>existing_secret_key</ApiKey>\n</Config>`;
    fs.writeFileSync(xmlPath, initialXml, 'utf-8');

    const envData: Record<string, string> = {};
    configureServarrXml(
      xmlPath,
      9696,
      'Prowlarr',
      'localhost,127.0.0.1',
      '127.0.0.1/32',
      'PROWLARR_API_KEY',
      envData
    );

    const updated = fs.readFileSync(xmlPath, 'utf-8');
    assert.ok(updated.includes('<ApiKey>existing_secret_key</ApiKey>'));
    assert.equal(envData.PROWLARR_API_KEY, 'existing_secret_key');
  });

  test('configureServarrXml writes and updates UrlBase correctly', () => {
    configureServarrXml(
      xmlPath,
      9696,
      'Prowlarr',
      'localhost',
      '127.0.0.1/32',
      'PROWLARR_API_KEY',
      undefined,
      '/tools/prowlarr'
    );

    let content = fs.readFileSync(xmlPath, 'utf-8');
    assert.ok(content.includes('<UrlBase>/tools/prowlarr</UrlBase>'));

    // Update existing config
    configureServarrXml(
      xmlPath,
      9696,
      'Prowlarr',
      'localhost',
      '127.0.0.1/32',
      'PROWLARR_API_KEY',
      undefined,
      '/tools/custom_prowlarr'
    );

    content = fs.readFileSync(xmlPath, 'utf-8');
    assert.ok(content.includes('<UrlBase>/tools/custom_prowlarr</UrlBase>'));
    assert.ok(!content.includes('<UrlBase>/tools/prowlarr</UrlBase>'));
  });

  test('configureBeetsYaml creates default config.yaml with plugins and web on port 8337', () => {
    const beetsConfigPath = path.join(tmpDir, 'beets_config.yaml');
    configureBeetsYaml(beetsConfigPath);

    assert.ok(fs.existsSync(beetsConfigPath));
    const content = fs.readFileSync(beetsConfigPath, 'utf-8');
    assert.ok(content.includes('directory: /music'));
    assert.ok(content.includes('plugins: web fetchart embedart scrub info lyrics chroma'));
    assert.ok(content.includes('port: 8337'));
    assert.ok(content.includes('reverse_proxy: yes'));
  });

  test('configureBeetsYaml patches web plugin configuration if missing in existing file', () => {
    const beetsConfigPath = path.join(tmpDir, 'existing_beets.yaml');
    fs.writeFileSync(beetsConfigPath, 'directory: /custom/dir\nplugins: fetchart\n', 'utf-8');

    configureBeetsYaml(beetsConfigPath);

    const content = fs.readFileSync(beetsConfigPath, 'utf-8');
    assert.ok(content.includes('directory: /custom/dir'));
    assert.ok(content.includes('web:'));
    assert.ok(content.includes('port: 8337'));
  });
});


import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { configureServarrXml } from './provisioner.service.js';

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
});

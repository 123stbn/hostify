import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  verifyLicenseKey,
  getLicenseStatus,
  activateLicenseKey,
  HOSTIFY_PUBLIC_KEY
} from './license.service.js';

describe('License Service (license.service.ts)', () => {
  // Read private key generated in scripts/keys/ for testing valid signatures
  const privKeyPath = path.resolve(process.cwd(), '../scripts/keys/hostify_ed25519_private.pem');

  test('rejects empty or malformed license keys', () => {
    assert.equal(verifyLicenseKey('').valid, false);
    assert.equal(verifyLicenseKey('invalid_string').valid, false);
    assert.equal(verifyLicenseKey('part1.part2.part3').valid, false);
  });

  test('verifies a genuine Ed25519 signed license key', () => {
    if (!fs.existsSync(privKeyPath)) return; // Skip if run in environment without private key
    const privateKey = fs.readFileSync(privKeyPath, 'utf-8');

    const payload = {
      licenseId: 'HSTF-TEST-001',
      licensee: 'tester@hostify.audio',
      tier: 'lifetime' as const,
      issuedAt: new Date().toISOString()
    };

    const payloadBuf = Buffer.from(JSON.stringify(payload));
    const signatureBuf = crypto.sign(null, payloadBuf, privateKey);
    const key = `HSTF_${payloadBuf.toString('base64url')}.${signatureBuf.toString('base64url')}`;

    const res = verifyLicenseKey(key);
    assert.equal(res.valid, true);
    assert.equal(res.payload?.licensee, 'tester@hostify.audio');
    assert.equal(res.payload?.tier, 'lifetime');
  });

  test('rejects tampered license payloads', () => {
    if (!fs.existsSync(privKeyPath)) return;
    const privateKey = fs.readFileSync(privKeyPath, 'utf-8');

    const payload = { licenseId: 'HSTF-TEST-002', licensee: 'user@test.com', tier: 'pro' as const, issuedAt: new Date().toISOString() };
    const payloadBuf = Buffer.from(JSON.stringify(payload));
    const signatureBuf = crypto.sign(null, payloadBuf, privateKey);

    // Tamper with payload (e.g. change tier to lifetime without changing signature)
    const tamperedPayload = { ...payload, tier: 'lifetime' };
    const tamperedBuf = Buffer.from(JSON.stringify(tamperedPayload));
    const tamperedKey = `HSTF_${tamperedBuf.toString('base64url')}.${signatureBuf.toString('base64url')}`;

    const res = verifyLicenseKey(tamperedKey);
    assert.equal(res.valid, false);
    assert.match(res.error || '', /signature verification failed/i);
  });

  test('returns trial or licensed status in getLicenseStatus', () => {
    const status = getLicenseStatus();
    assert.ok(status);
    assert.ok(['licensed', 'trial', 'expired'].includes(status.status));
    if (status.status === 'trial') {
      assert.equal(status.isTrial, true);
      assert.ok(typeof status.daysRemaining === 'number');
    }
  });
});

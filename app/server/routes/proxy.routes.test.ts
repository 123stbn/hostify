import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { getNavidromeTarget, subsonicLicenseGuard } from './proxy.routes.js';
import { STATE_FILE_PATH, LICENSE_FILE_PATH } from '../services/license.service.js';

describe('Proxy Gateway & Subsonic License Guard (proxy.routes.ts)', () => {
  let backupState: string | null = null;
  let backupLicense: string | null = null;

  before(() => {
    if (fs.existsSync(STATE_FILE_PATH)) {
      backupState = fs.readFileSync(STATE_FILE_PATH, 'utf-8');
    }
    if (fs.existsSync(LICENSE_FILE_PATH)) {
      backupLicense = fs.readFileSync(LICENSE_FILE_PATH, 'utf-8');
      fs.unlinkSync(LICENSE_FILE_PATH);
    }
  });

  after(() => {
    if (backupState !== null) {
      fs.writeFileSync(STATE_FILE_PATH, backupState, 'utf-8');
    }
    if (backupLicense !== null) {
      fs.writeFileSync(LICENSE_FILE_PATH, backupLicense, 'utf-8');
    }
  });

  it('getNavidromeTarget returns a valid HTTP target URL', () => {
    const target = getNavidromeTarget();
    assert.ok(typeof target === 'string');
    assert.ok(target.startsWith('http://'));
  });

  it('subsonicLicenseGuard allows requests when trial or license is active', () => {
    // Fresh trial state
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify({
      trialStartedAt: new Date().toISOString(),
      instanceId: 'test-active'
    }));

    let nextCalled = false;
    const req = { path: '/rest/ping.view', query: {}, headers: {} } as any;
    const res = {} as any;

    subsonicLicenseGuard(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true);
  });

  it('subsonicLicenseGuard returns 402 JSON error when trial is expired and f=json', () => {
    // Expired trial state (20 days ago)
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify({
      trialStartedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      instanceId: 'test-expired'
    }));

    let statusCode = 0;
    let jsonPayload: any = null;
    let nextCalled = false;

    const req = {
      path: '/rest/ping.view',
      query: { f: 'json' },
      headers: {}
    } as any;

    const res = {
      status: (code: number) => {
        statusCode = code;
        return {
          json: (data: any) => {
            jsonPayload = data;
            return res;
          }
        };
      }
    } as any;

    subsonicLicenseGuard(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(statusCode, 402);
    assert.ok(jsonPayload?.['subsonic-response']);
    assert.strictEqual(jsonPayload['subsonic-response'].status, 'failed');
    assert.strictEqual(jsonPayload['subsonic-response'].error.code, 50);
  });

  it('subsonicLicenseGuard returns 402 XML error when trial is expired and format is XML', () => {
    // Expired trial state (20 days ago)
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify({
      trialStartedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      instanceId: 'test-expired'
    }));

    let statusCode = 0;
    let contentType = '';
    let xmlBody = '';

    const req = {
      path: '/rest/ping.view',
      query: {},
      headers: {}
    } as any;

    const res = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      type: (t: string) => {
        contentType = t;
        return res;
      },
      send: (body: string) => {
        xmlBody = body;
        return res;
      }
    } as any;

    subsonicLicenseGuard(req, res, () => {});

    assert.strictEqual(statusCode, 402);
    assert.strictEqual(contentType, 'application/xml');
    assert.ok(xmlBody.includes('subsonic-response'));
    assert.ok(xmlBody.includes('code="50"'));
  });
});

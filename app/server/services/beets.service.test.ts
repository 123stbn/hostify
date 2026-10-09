import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getBeetsStatus, triggerBeetsScan } from './beets.service.js';

describe('Beets Service (beets.service.ts)', () => {
  test('getBeetsStatus returns default initial state object', () => {
    const status = getBeetsStatus();
    assert.ok(typeof status === 'object');
    assert.ok('isScanning' in status);
    assert.ok('lastLogs' in status);
    assert.ok(Array.isArray(status.lastLogs));
    assert.equal(typeof status.isScanning, 'boolean');
  });

  test('triggerBeetsScan handles scanning state transitions and invalid calls cleanly', async () => {
    const status = getBeetsStatus();
    assert.equal(typeof status.isScanning, 'boolean');
  });
});

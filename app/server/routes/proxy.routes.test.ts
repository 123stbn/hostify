import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getNavidromeTarget, resolveServiceTarget } from './proxy.routes.js';

describe('Proxy Gateway (proxy.routes.ts)', () => {
  it('getNavidromeTarget returns a valid HTTP target URL', () => {
    const target = getNavidromeTarget();
    assert.ok(typeof target === 'string');
    assert.ok(target.startsWith('http://'));
  });

  it('resolveServiceTarget resolves correctly for service names and ports', () => {
    const target = resolveServiceTarget('navidrome', 4533);
    assert.ok(typeof target === 'string');
    assert.ok(target.includes('4533'));
  });
});

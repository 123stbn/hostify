import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getHostAllowedAddresses,
  getHostIp,
  getMemoryStats,
  generateProxySnippets,
} from './network.service.js';

describe('Network Service (network.service.ts)', () => {
  test('getHostAllowedAddresses returns standard local addresses and host IP', () => {
    const addresses = getHostAllowedAddresses();
    assert.ok(Array.isArray(addresses));
    assert.ok(addresses.includes('localhost'));
    assert.ok(addresses.includes('127.0.0.1'));
    assert.ok(addresses.includes('hostify-prowlarr'));
    assert.ok(addresses.includes('hostify-lidarr'));
  });

  test('getHostIp returns a valid IPv4 string', () => {
    const ip = getHostIp();
    assert.ok(typeof ip === 'string');
    assert.match(ip, /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
  });

  test('getMemoryStats returns numeric memory metrics', () => {
    const stats = getMemoryStats();
    assert.ok(typeof stats.totalMb === 'number' && stats.totalMb > 0);
    assert.ok(typeof stats.usedMb === 'number' && stats.usedMb >= 0);
    assert.ok(typeof stats.freeMb === 'number' && stats.freeMb >= 0);
    assert.ok(typeof stats.percent === 'number' && stats.percent >= 0 && stats.percent <= 100);
  });

  test('generateProxySnippets generates Caddy and Nginx configs with correct parameters', () => {
    const snippets = generateProxySnippets('music.example.com', '4533');
    assert.equal(snippets.domain, 'music.example.com');
    assert.ok(snippets.caddy.includes('music.example.com {'));
    assert.ok(snippets.caddy.includes('reverse_proxy hostify-navidrome:4533'));
    assert.ok(snippets.nginx.includes('server_name music.example.com;'));
    assert.ok(snippets.nginx.includes('proxy_pass http://hostify-navidrome:4533;'));
  });
});

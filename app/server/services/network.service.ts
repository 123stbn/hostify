import os from 'node:os';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { TailscaleStatus } from '../types/index.js';
import { parseEnv, ENV_FILE_PATH } from '../utils/env.js';

/**
 * Automatic and rigorous detection of Tailscale on the system
 */
export function detectTailscale(): TailscaleStatus {
  // 1. Try querying native Tailscale CLI if installed (Linux / macOS)
  try {
    const tailscaleBin = fs.existsSync('/Applications/Tailscale.app/Contents/MacOS/Tailscale')
      ? '/Applications/Tailscale.app/Contents/MacOS/Tailscale'
      : 'tailscale';
    const statusOut = execSync(`${tailscaleBin} status --json`, { stdio: ['pipe', 'pipe', 'ignore'], timeout: 1500 }).toString();
    const parsed = JSON.parse(statusOut);
    if (parsed.BackendState === 'Running' && parsed.TailscaleIPs?.length > 0) {
      const v4 = parsed.TailscaleIPs.find((ip: string) => !ip.includes(':'));
      if (v4) {
        return { detected: true, ip: v4 };
      }
    }
  } catch {}

  // 2. Inspect network interfaces (discarding 100.64.0.1 which is macOS inactive NetworkExtension virtual loopback)
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        if (net.address.startsWith('100.') && net.address !== '100.64.0.1') {
          return { detected: true, ip: net.address };
        }
        if (name.toLowerCase().includes('tailscale') && net.address !== '100.64.0.1') {
          return { detected: true, ip: net.address };
        }
      }
    }
  }
  return { detected: false, ip: null };
}

/**
 * Get complete list of hostnames and host IPs for AllowedHosts in Servarr (Prowlarr/Lidarr)
 */
export function getHostAllowedAddresses(): string[] {
  const hosts = new Set<string>([
    '*',
    'localhost',
    '127.0.0.1',
    'hostify.local',
    '*.local',
    'hostify-prowlarr',
    'hostify-lidarr',
    'host.docker.internal',
    'host.colima.internal'
  ]);

  if (process.env.HOST_IP) {
    hosts.add(process.env.HOST_IP);
  }
  try {
    const env = parseEnv(ENV_FILE_PATH);
    if (env.HOST_IP) {
      hosts.add(env.HOST_IP);
    }
  } catch {}

  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal && net.address !== '100.64.0.1') {
        hosts.add(net.address);
      }
    }
  }

  const ts = detectTailscale();
  if (ts.detected && ts.ip) {
    hosts.add(ts.ip);
  }

  return Array.from(hosts);
}

/**
 * Get local mDNS network hostname (.local) for Zero-Config access
 */
export function getLocalHostname(): string {
  try {
    const env = parseEnv(ENV_FILE_PATH);
    if (env.HOST_HOSTNAME && env.HOST_HOSTNAME !== 'hostify') {
      return `${env.HOST_HOSTNAME}.local`;
    }
  } catch {}

  if (process.env.HOST_HOSTNAME && process.env.HOST_HOSTNAME !== 'hostify') {
    return `${process.env.HOST_HOSTNAME}.local`;
  }

  return 'hostify.local';
}

/**
 * Get primary accessible host IP
 */
export function getHostIp(reqHost?: string): string {
  // 1. If web request comes from a LAN IP (e.g. user opened http://192.168.0.x:3000 from mobile/PC)
  if (reqHost) {
    const cleanHost = reqHost.split(':')[0].trim();
    if (/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(cleanHost) && !cleanHost.startsWith('172.26.')) {
      return cleanHost;
    }
  }

  // 2. Explicit environment variable or .env file
  if (process.env.HOST_IP && !process.env.HOST_IP.startsWith('172.26.')) return process.env.HOST_IP;
  try {
    const env = parseEnv(ENV_FILE_PATH);
    if (env.HOST_IP && !env.HOST_IP.startsWith('172.26.')) return env.HOST_IP;
  } catch {}

  const nets = os.networkInterfaces();
  // Prefer LAN IPs (192.168.x.x or 10.x.x.x outside docker bridge)
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('172.') && !net.address.startsWith('10.')) {
        return net.address;
      }
    }
  }

  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('172.26.')) {
        return net.address;
      }
    }
  }

  return '127.0.0.1';
}

/**
 * System RAM memory statistics
 */
export function getMemoryStats(): { totalMb: number; usedMb: number; freeMb: number; percent: number } {
  const total = os.totalmem();
  let available = os.freemem();

  if (process.platform === 'linux') {
    try {
      const meminfo = fs.readFileSync('/proc/meminfo', 'utf-8');
      const match = meminfo.match(/MemAvailable:\s+(\d+)\s+kB/);
      if (match) {
        available = parseInt(match[1], 10) * 1024;
      }
    } catch {}
  }

  const used = Math.max(0, total - available);
  return {
    totalMb: Math.round(total / (1024 * 1024)),
    usedMb: Math.round(used / (1024 * 1024)),
    freeMb: Math.round(available / (1024 * 1024)),
    percent: Math.min(100, Math.max(1, Math.round((used / total) * 100))),
  };
}

/**
 * Reverse Proxy Snippet Generator
 */
export function generateProxySnippets(domain: string = 'musica.tu-dominio.com', naviPort: string = '4533') {
  const caddy = `${domain} {\n    reverse_proxy hostify-navidrome:${naviPort}\n}`;
  const nginx = `server {\n    listen 80;\n    server_name ${domain};\n    return 301 https://$host$request_uri;\n}\n\nserver {\n    listen 443 ssl http2;\n    server_name ${domain};\n\n    # Certificados SSL...\n\n    location / {\n        proxy_pass http://hostify-navidrome:${naviPort};\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n        proxy_set_header Upgrade $http_upgrade;\n        proxy_set_header Connection "upgrade";\n    }\n}`;
  return { caddy, nginx, domain };
}

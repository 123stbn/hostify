import os from 'node:os';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { TailscaleStatus } from '../types/index.js';
import { parseEnv, ENV_FILE_PATH } from '../utils/env.js';

/**
 * Detección automática y rigurosa de Tailscale en el sistema
 */
export function detectTailscale(): TailscaleStatus {
  // 1. Intentar consultar el CLI nativo de Tailscale si está instalado (Linux / macOS)
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

  // 2. Inspeccionar interfaces de red (descartando 100.64.0.1 que es la puerta de enlace/bucle virtual de macOS NetworkExtension inactiva)
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
 * Obtener lista completa de hostnames e IPs del host para AllowedHosts en Servarr (Prowlarr/Lidarr)
 */
export function getHostAllowedAddresses(): string[] {
  const hosts = new Set<string>([
    'localhost',
    '127.0.0.1',
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
 * Obtener el nombre de red mDNS local (.local) para acceso Zero-Config estilo homeassistant.local
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
 * Obtener la IP principal accesible del host
 */
export function getHostIp(reqHost?: string): string {
  // 1. Si la petición web viene de una IP de red local (ej: el usuario abrió http://192.168.0.x:3000 desde el móvil/PC)
  if (reqHost) {
    const cleanHost = reqHost.split(':')[0].trim();
    if (/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(cleanHost) && !cleanHost.startsWith('172.26.')) {
      return cleanHost;
    }
  }

  // 2. Variable explícita de entorno o archivo .env
  if (process.env.HOST_IP && !process.env.HOST_IP.startsWith('172.26.')) return process.env.HOST_IP;
  try {
    const env = parseEnv(ENV_FILE_PATH);
    if (env.HOST_IP && !env.HOST_IP.startsWith('172.26.')) return env.HOST_IP;
  } catch {}

  const nets = os.networkInterfaces();
  // Preferir IPs de LAN (192.168.x.x o 10.x.x.x fuera de docker)
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
 * Estadísticas de memoria RAM del sistema
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
 * Generador de Snippets para Proxy Reverso
 */
export function generateProxySnippets(domain: string = 'musica.tu-dominio.com', naviPort: string = '4533') {
  const caddy = `${domain} {\n    reverse_proxy hostify-navidrome:${naviPort}\n}`;
  const nginx = `server {\n    listen 80;\n    server_name ${domain};\n    return 301 https://$host$request_uri;\n}\n\nserver {\n    listen 443 ssl http2;\n    server_name ${domain};\n\n    # Certificados SSL...\n\n    location / {\n        proxy_pass http://hostify-navidrome:${naviPort};\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n        proxy_set_header Upgrade $http_upgrade;\n        proxy_set_header Connection "upgrade";\n    }\n}`;
  return { caddy, nginx, domain };
}

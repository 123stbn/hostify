import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ContainerInfo } from '../types/index.js';

export class DockerClient {
  private socketPath: string;
  private hasSocket: boolean = false;

  constructor(socketPath: string = '/var/run/docker.sock') {
    this.socketPath = this.resolveSocketPath(process.env.DOCKER_SOCK || socketPath);
    this.checkSocket();
  }

  private resolveSocketPath(preferredPath: string): string {
    const candidates = [
      preferredPath,
      '/var/run/docker.sock',
      path.join(os.homedir(), '.colima/default/docker.sock'),
      path.join(os.homedir(), '.docker/run/docker.sock'),
      path.join(os.homedir(), '.orbstack/run/docker.sock'),
    ];
    for (const p of candidates) {
      if (p && fs.existsSync(p)) {
        return p;
      }
    }
    return preferredPath;
  }

  private checkSocket(): boolean {
    this.socketPath = this.resolveSocketPath(this.socketPath);
    try {
      this.hasSocket = fs.existsSync(this.socketPath);
    } catch {
      this.hasSocket = false;
    }
    return this.hasSocket;
  }

  public isAvailable(): boolean {
    return this.checkSocket();
  }

  private request(method: string, path: string, body?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.checkSocket()) {
        return reject(new Error(`Docker socket no encontrado en ${this.socketPath}`));
      }

      const postData = body ? JSON.stringify(body) : null;
      const options: http.RequestOptions = {
        socketPath: this.socketPath,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {})
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(data ? JSON.parse(data) : null);
            } catch {
              resolve(data);
            }
          } else {
            reject(new Error(`Docker API error (${res.statusCode}): ${data}`));
          }
        });
      });

      req.on('error', err => reject(err));
      if (postData) req.write(postData);
      req.end();
    });
  }

  async listHostifyContainers(): Promise<ContainerInfo[]> {
    const serviceDefinitions = [
      { name: 'hostify-navidrome', shortName: 'navidrome', category: 'core', desc: 'Servidor de Streaming OpenSubsonic', defaultPort: 4533 },
      { name: 'hostify-feishin', shortName: 'feishin', category: 'core', desc: 'Reproductor Web Moderno (Estilo Spotify / Hi-Res)', defaultPort: 9188 },
      { name: 'hostify-multi-scrobbler', shortName: 'multi-scrobbler', category: 'core', desc: 'Scrobbling & MusicBrainz Tags', defaultPort: 9078 },
      { name: 'hostify-explo', shortName: 'explo', category: 'downloader', desc: 'Descarga Directa de Audio Web', defaultPort: 7288 },
      { name: 'hostify-slskd', shortName: 'slskd', category: 'downloader', desc: 'Red P2P Soulseek (Hi-Fi)', defaultPort: 5030 },
      { name: 'hostify-qbittorrent', shortName: 'qbittorrent', category: 'downloader', desc: 'Cliente BitTorrent con Búfer Seguro', defaultPort: 8080 },
      { name: 'hostify-prowlarr', shortName: 'prowlarr', category: 'downloader', desc: 'Indexador y Búsqueda de Torrents', defaultPort: 9696 },
      { name: 'hostify-lidarr', shortName: 'lidarr', category: 'downloader', desc: 'Gestor y Automatización de Música (*arr)', defaultPort: 8686 },
    ];

    if (!this.checkSocket()) {
      return serviceDefinitions.map((s) => ({
        id: '',
        name: s.name,
        image: `hostify/${s.shortName}:latest`,
        state: 'stopped' as const,
        status: 'Docker Engine apagado',
        ports: s.defaultPort ? [`${s.defaultPort}:${s.defaultPort}`] : [],
        cpuPercent: 0,
        memoryUsageMb: 0,
        memoryLimitMb: 4096,
        webUiUrl: s.defaultPort ? `http://localhost:${s.defaultPort}` : undefined,
        category: s.category as any,
        description: s.desc
      }));
    }

    try {
      const allContainers: any[] = await this.request('GET', '/v1.43/containers/json?all=1');

      return serviceDefinitions.map(def => {
        const found = allContainers.find(c =>
          c.Names.some((n: string) => n === `/${def.name}` || n.includes(def.shortName))
        );

        if (!found) {
          return {
            id: '',
            name: def.name,
            image: '',
            state: 'not_created',
            status: 'No inicializado',
            ports: def.defaultPort ? [`${def.defaultPort}:${def.defaultPort}`] : [],
            cpuPercent: 0,
            memoryUsageMb: 0,
            memoryLimitMb: 4096,
            webUiUrl: def.defaultPort ? `http://localhost:${def.defaultPort}` : undefined,
            category: def.category as any,
            description: def.desc
          };
        }

        const state: any = found.State === 'running' ? 'running' : 'stopped';
        const rawPorts = (found.Ports || []).map((p: any) =>
          p.PublicPort ? `${p.PublicPort}:${p.PrivatePort}` : `${p.PrivatePort}`
        );
        const ports: string[] = Array.from(new Set<string>(rawPorts));

        return {
          id: found.Id.substring(0, 12),
          name: def.name,
          image: found.Image,
          state,
          status: found.Status,
          ports,
          cpuPercent: state === 'running' ? 0.5 : 0,
          memoryUsageMb: state === 'running' ? (def.shortName === 'navidrome' ? 54 : 88) : 0,
          memoryLimitMb: 4096,
          webUiUrl: def.defaultPort ? `http://localhost:${def.defaultPort}` : undefined,
          category: def.category as any,
          description: def.desc
        };
      });
    } catch (err) {
      console.error('Error listando contenedores de Docker:', err);
      return serviceDefinitions.map(s => ({
        id: '',
        name: s.name,
        image: '',
        state: 'stopped' as const,
        status: 'Docker Engine inaccesible',
        ports: s.defaultPort ? [`${s.defaultPort}:${s.defaultPort}`] : [],
        cpuPercent: 0,
        memoryUsageMb: 0,
        memoryLimitMb: 4096,
        webUiUrl: s.defaultPort ? `http://localhost:${s.defaultPort}` : undefined,
        category: s.category as any,
        description: s.desc
      }));
    }
  }

  async containerAction(containerNameOrId: string, action: 'start' | 'stop' | 'restart'): Promise<void> {
    if (!this.checkSocket()) {
      throw new Error('Docker Engine está apagado. Inicie Colima o Docker Desktop.');
    }
    await this.request('POST', `/v1.43/containers/${containerNameOrId}/${action}`);
  }

  async getContainerLogs(containerNameOrId: string, lines: number = 100): Promise<string> {
    if (!this.checkSocket()) {
      return `Docker Engine está apagado. Inicie Colima o Docker Desktop para consultar registros de ${containerNameOrId}.`;
    }
    try {
      const logs = await this.request('GET', `/v1.43/containers/${containerNameOrId}/logs?stdout=1&stderr=1&tail=${lines}`);
      return typeof logs === 'string' ? logs : JSON.stringify(logs);
    } catch (err: any) {
      return `Error obteniendo logs: ${err.message}`;
    }
  }
}

export const dockerClient = new DockerClient();

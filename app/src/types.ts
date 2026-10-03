export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  state: 'running' | 'stopped' | 'restarting' | 'paused' | 'exited' | 'not_created';
  status: string;
  ports: string[];
  cpuPercent?: number;
  memoryUsageMb?: number;
  memoryLimitMb?: number;
  webUiUrl?: string;
  category: 'core' | 'downloader' | 'connectivity';
  description: string;
}

export interface AppStatus {
  app: string;
  version: string;
  isConfigured: boolean;
  dockerAvailable: boolean;
  musicRoot: string;
  dockerData: string;
  navidromePort: string;
  feishinPort?: string;
  navidromeAdminUser?: string;
  navidromeAdminPassword?: string;
  listenBrainzUser?: string;
  listenBrainzToken?: string;
  enableListenBrainz?: boolean;
  modules?: {
    explo: boolean;
    slskd: boolean;
    qbittorrent: boolean;
    prowlarr: boolean;
    lidarr: boolean;
  } | null;
  remoteAccess?: 'tailscale' | 'proxy' | 'local';
  domain?: string;
  hostIp: string;
  localHostname?: string;
  detectedPuid?: string;
  detectedPgid?: string;
  detectedTz?: string;
  tailscaleDetected?: boolean;
  tailscaleIp?: string | null;
}

export interface SystemStats {
  platform: string;
  uptimeSeconds: number;
  cpus: number;
  cpuModel: string;
  memoryTotalMb: number;
  memoryUsedMb: number;
  memoryFreeMb: number;
  memoryUsagePercent: number;
  hostIp: string;
}

export interface StorageStatus {
  musicRoot: string;
  exists: boolean;
  folders: Record<string, { exists: boolean; path: string; fileCount: number }>;
  totalTrackCount: number;
}

export interface NowPlayingTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverArtUrl?: string;
  streamUrl?: string;
  duration?: number;
  positionMs?: number;
  playerName?: string;
  state?: 'playing' | 'paused' | 'stopped';
}

export interface NowPlayingResponse {
  active: boolean;
  track: NowPlayingTrack | null;
}


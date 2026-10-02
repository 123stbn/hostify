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

export interface DeploymentState {
  isDeploying: boolean;
  logs: string[];
  lastError: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface TailscaleStatus {
  detected: boolean;
  ip: string | null;
}

export interface StorageFolder {
  path: string;
  exists: boolean;
  fileCount: number;
  sizeBytes: number;
  sizeHuman: string;
}

export interface StorageStatus {
  totalTrackCount: number;
  totalSizeBytes: number;
  totalSizeHuman: string;
  folders: {
    personal: StorageFolder;
    explo: StorageFolder;
    slskd: StorageFolder;
    torrents: StorageFolder;
    music: StorageFolder;
  };
}

export interface NowPlayingTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverArtId?: string | null;
  coverArtUrl?: string;
  streamUrl?: string;
  duration?: number;
  positionMs?: number;
  playerName?: string;
  playedAt?: string;
  state?: string;
}

export interface DirectoryItem {
  name: string;
  path: string;
  isDirectory: boolean;
  isWritable: boolean;
  hasAccess: boolean;
}

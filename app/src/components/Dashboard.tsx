import React, { useState, useEffect, useRef } from 'react';
import {
  Play, Square, RotateCw, ExternalLink, FileText,
  Globe, Radio, Music, DownloadCloud,
  Server, Layers, AlertTriangle, X, Copy, RefreshCw, Folder, Disc3,
  Laptop, Smartphone, Sparkles, Headphones, Eye, EyeOff,
  ChevronDown, ChevronUp, Maximize2, Pause, SkipForward, SkipBack,
  Volume2, VolumeX, Shuffle, Check, Compass
} from 'lucide-react';
import { AppStatus, ContainerInfo, SystemStats, StorageStatus, NowPlayingTrack } from '../types.js';
import { useI18n } from '../i18n.js';

interface DashboardProps {
  status: AppStatus | null;
  onRefreshStatus?: () => void;
}

interface PlayerRecommendation {
  id: string;
  name: string;
  category: 'desktop' | 'android' | 'ios' | 'web';
  tag: { es: string; en: string };
  platformBadges: string[];
  description: { es: string; en: string };
  url: string;
  downloadLabel: { es: string; en: string };
}

const AndroidIcon: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({ size = 18, className, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M18.4395 5.5586c-.675 1.1664-1.352 2.3318-2.0274 3.498-.0366-.0155-.0742-.0286-.1113-.043-1.8249-.6957-3.484-.8-4.42-.787-1.8551.0185-3.3544.4643-4.2597.8203-.084-.1494-1.7526-3.021-2.0215-3.4864a1.1451 1.1451 0 0 0-.1406-.1914c-.3312-.364-.9054-.4859-1.379-.203-.475.282-.7136.9361-.3886 1.5019 1.9466 3.3696-.0966-.2158 1.9473 3.3593.0172.031-.4946.2642-1.3926 1.0177C2.8987 12.176.452 14.772 0 18.9902h24c-.119-1.1108-.3686-2.099-.7461-3.0683-.7438-1.9118-1.8435-3.2928-2.7402-4.1836a12.1048 12.1048 0 0 0-2.1309-1.6875c.6594-1.122 1.312-2.2559 1.9649-3.3848.2077-.3615.1886-.7956-.0079-1.1191a1.1001 1.1001 0 0 0-.8515-.5332c-.5225-.0536-.9392.3128-1.0488.5449zm-.0391 8.461c.3944.5926.324 1.3306-.1563 1.6503-.4799.3197-1.188.0985-1.582-.4941-.3944-.5927-.324-1.3307.1563-1.6504.4727-.315 1.1812-.1086 1.582.4941zM7.207 13.5273c.4803.3197.5506 1.0577.1563 1.6504-.394.5926-1.1038.8138-1.584.4941-.48-.3197-.5503-1.0577-.1563-1.6504.4008-.6021 1.1087-.8106 1.584-.4941z" />
  </svg>
);

const AppleIcon: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({ size = 18, className, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.74 1.04-1.79.92-2.87-.93.04-2.03.62-2.69 1.39-.58.66-1.09 1.73-.95 2.76 1.04.08 2.11-.54 2.72-1.28" />
  </svg>
);

const RECOMMENDED_PLAYERS: PlayerRecommendation[] = [
  {
    id: 'feishin-web',
    name: 'Feishin Web',
    category: 'web',
    tag: { es: 'Web sin descargas', en: 'Browser Player' },
    platformBadges: ['Web', 'Mobile PWA'],
    description: {
      es: 'Reproductor web diario en tu propio servidor. Experiencia fluida estilo Spotify con letras en vivo y audio sin compresión.',
      en: 'Everyday web player running on your server. Sleek Spotify-like interface with live synced lyrics and lossless audio.'
    },
    url: '#',
    downloadLabel: { es: 'Abrir Feishin Web', en: 'Open Feishin Web' },
  },
  {
    id: 'feishin',
    name: 'Feishin Desktop',
    category: 'desktop',
    tag: { es: 'Recomendado PC & Mac', en: 'Recommended PC & Mac' },
    platformBadges: ['macOS', 'Windows', 'Linux'],
    description: {
      es: 'Cliente de escritorio con motor de audio bit-perfect para FLAC y audio Hi-Res sin pausas, letras sincronizadas y atajos globales.',
      en: 'Desktop player with bit-perfect gapless audio engine for Hi-Res FLAC, synchronized lyrics, and global hotkeys.'
    },
    url: 'https://github.com/jeffvli/feishin/releases',
    downloadLabel: { es: 'Descargar en GitHub', en: 'Download on GitHub' },
  },
  {
    id: 'symfonium',
    name: 'Symfonium',
    category: 'android',
    tag: { es: 'Recomendado Android', en: 'Recommended Android' },
    platformBadges: ['Android', 'Android Auto'],
    description: {
      es: 'Guarda álbumes completos para escuchar en el avión o metro sin conexión, con ecualizador paramétrico de 10 bandas.',
      en: 'Cache full albums for offline listening while traveling, featuring a powerful 10-band parametric equalizer.'
    },
    url: 'https://play.google.com/store/apps/details?id=app.symfonik.music.player',
    downloadLabel: { es: 'Ver en Google Play', en: 'Get on Google Play' },
  },
  {
    id: 'amperfy',
    name: 'Amperfy',
    category: 'ios',
    tag: { es: 'Recomendado Apple', en: 'Recommended Apple' },
    platformBadges: ['iOS', 'Apple CarPlay'],
    description: {
      es: 'Nativo para iPhone con integración total para CarPlay, descargas automáticas en segundo plano y widgets.',
      en: 'Native iPhone client with complete CarPlay support, background caching, and lockscreen widgets.'
    },
    url: 'https://apps.apple.com/app/amperfy/id1569472935',
    downloadLabel: { es: 'Instalar en App Store', en: 'Get on App Store' },
  },
  {
    id: 'tempo',
    name: 'Tempo',
    category: 'android',
    tag: { es: 'Código Abierto', en: 'Open Source' },
    platformBadges: ['Android'],
    description: {
      es: 'Reproductor ligero, sin publicidad ni rastreadores, con diseño limpio Material You.',
      en: 'Lightweight, ad-free, open-source player following clean Material You guidelines.'
    },
    url: 'https://github.com/CappielloAntonio/tempo',
    downloadLabel: { es: 'Ver en GitHub', en: 'View on GitHub' },
  },
  {
    id: 'strawberry',
    name: 'Strawberry Music',
    category: 'desktop',
    tag: { es: 'Audiófilo', en: 'Audiophile' },
    platformBadges: ['Linux', 'Windows', 'macOS'],
    description: {
      es: 'Salida de audio pura directa a DACs externos USB sin remuestreo del sistema operativo.',
      en: 'Direct bit-perfect streaming to external USB DACs bypassing host OS audio resamplers.'
    },
    url: 'https://www.strawberrymusicplayer.org/',
    downloadLabel: { es: 'Sitio Web', en: 'Official Website' },
  },
  {
    id: 'subsonify',
    name: 'SubSonify',
    category: 'ios',
    tag: { es: 'iOS & CarPlay', en: 'iOS & CarPlay' },
    platformBadges: ['iOS', 'CarPlay', 'Apple Watch'],
    description: {
      es: 'Cliente moderno para iPhone con soporte de descargas offline, integración con CarPlay y comandos de Siri.',
      en: 'Modern iPhone player with offline caching, seamless CarPlay integration, and Siri shortcuts.'
    },
    url: 'https://apps.apple.com/us/app/navidrome-player-subsonify/id6483939229',
    downloadLabel: { es: 'Ver en App Store', en: 'View in App Store' },
  },
];

function getFriendlyComponentInfo(name: string, fallbackDesc: string, isEn: boolean) {
  const lower = name.toLowerCase();
  if (lower.includes('feishin')) {
    return {
      title: 'Feishin Web',
      role: isEn
        ? 'Daily browser listening room with live synchronized lyrics and lossless audio.'
        : 'Sala de escucha web diaria con letras en vivo y alta fidelidad.',
    };
  }
  if (lower.includes('navidrome')) {
    return {
      title: 'Navidrome',
      role: isEn
        ? 'Core music server: catalogs your albums, reads tags, and streams to your players.'
        : 'Fonoteca central: cataloga tus discos, lee etiquetas y transmite a tus reproductores.',
    };
  }
  if (lower.includes('explo')) {
    return {
      title: isEn ? 'Explo (Curator)' : 'Explo (Curador)',
      role: isEn
        ? 'Learns your music tastes, builds weekly playlists, and commands smart song discovery.'
        : 'Aprende de tus gustos, arma listas semanales y comanda la búsqueda de música afín.',
    };
  }
  if (lower.includes('slskd')) {
    return {
      title: 'Slskd (Soulseek)',
      role: isEn
        ? 'Community P2P discovery for rare collector vinyl rips, demos, and FLAC albums.'
        : 'Búsqueda comunitaria para conseguir vinilos ripeados, maquetas y rarezas melómanas.',
    };
  }
  if (lower.includes('lidarr')) {
    return {
      title: 'Lidarr',
      role: isEn
        ? 'Discography organizer: tracks artists and downloads complete albums with official artwork.'
        : 'Organizador de discografías: supervisa artistas y descarga álbumes con carátulas oficiales.',
    };
  }
  if (lower.includes('prowlarr')) {
    return {
      title: 'Prowlarr',
      role: isEn
        ? 'Indexer and provider proxy managing catalog feeds for the discography organizer.'
        : 'Rastreador de fuentes y coordinación de catálogos para el organizador.',
    };
  }
  if (lower.includes('qbittorrent')) {
    return {
      title: 'qBittorrent',
      role: isEn
        ? 'Isolated download buffer: keeps scratch and temporary files outside your active library.'
        : 'Búfer de descarga aislada: mantiene archivos temporales fuera de tu fonoteca hasta completarse.',
    };
  }
  if (lower.includes('scrobbler')) {
    return {
      title: 'Multi-Scrobbler',
      role: isEn
        ? 'Playback memory: quietly logs your listening diary to ListenBrainz.'
        : 'Memoria de escucha: registra discretamente en ListenBrainz todo lo que reproduces.',
    };
  }
  if (lower.includes('tailscale')) {
    return {
      title: 'Tailscale',
      role: isEn
        ? 'Private mesh link to stream music outside your home without port forwarding.'
        : 'Enlace privado para escuchar tu música desde la calle sin abrir puertos en el router.',
    };
  }
  return {
    title: name.replace('hostify-', ''),
    role: fallbackDesc || (isEn ? 'Auxiliary music component.' : 'Herramienta auxiliar de tu música.'),
  };
}

export const Dashboard: React.FC<DashboardProps> = ({ status, onRefreshStatus }) => {
  const { lang, t } = useI18n();
  const isEn = lang === 'en';
  const [activeTab, setActiveTab] = useState<'listen' | 'tools' | 'storage' | 'apps' | 'remote'>('listen');
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [sysStats, setSysStats] = useState<SystemStats | null>(null);
  const [storage, setStorage] = useState<StorageStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<{ text: string; success: boolean } | null>(null);
  const [platformFilter, setPlatformFilter] = useState<'all' | 'desktop' | 'android' | 'ios' | 'web'>('all');
  const [showPassword, setShowPassword] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<NowPlayingTrack | null>(null);

  // Modales
  const [logsModal, setLogsModal] = useState<{ open: boolean; containerName: string; logs: string }>({
    open: false,
    containerName: '',
    logs: '',
  });

  const [deployModal, setDeployModal] = useState<{
    open: boolean;
    isDeploying: boolean;
    logs: string[];
    lastError: string | null;
  }>({
    open: false,
    isDeploying: false,
    logs: [],
    lastError: null,
  });

  const defaultPlaceholderDomain = t('domainPlaceholder');
  const [proxyDomain, setProxyDomain] = useState(status?.domain || '');
  const [proxySnippets, setProxySnippets] = useState<{ caddy: string; nginx: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cRes, sRes, dRes] = await Promise.all([
        fetch('/api/containers'),
        fetch('/api/system'),
        fetch('/api/storage'),
      ]);
      if (cRes.ok) setContainers(await cRes.json());
      if (sRes.ok) setSysStats(await sRes.json());
      if (dRes.ok) setStorage(await dRes.json());
    } catch (err) {
      console.error('Error al actualizar:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  // Sincronización en vivo del reproductor (Feishin / OpenSubsonic)
  useEffect(() => {
    const fetchNowPlaying = async () => {
      try {
        const res = await fetch('/api/now-playing');
        if (res.ok) {
          const data = await res.json();
          if (data && data.active && data.track) {
            setNowPlaying(data.track);
          } else {
            setNowPlaying(null);
          }
        }
      } catch {
        // Ignorar errores transitorios de red
      }
    };

    fetchNowPlaying();
    const npInterval = setInterval(fetchNowPlaying, 2500);
    return () => clearInterval(npInterval);
  }, []);

  useEffect(() => {
    let deployInterval: NodeJS.Timeout | null = null;
    const checkDeployStatus = async () => {
      try {
        const res = await fetch('/api/compose/status');
        if (res.ok) {
          const data = await res.json();
          setDeployModal(prev => {
            if (prev.isDeploying && !data.isDeploying) {
              fetchData();
              if (onRefreshStatus) onRefreshStatus();
            }
            return {
              ...prev,
              isDeploying: data.isDeploying,
              logs: data.logs || [],
              lastError: data.lastError,
            };
          });
        }
      } catch {
        // Red desconectada temporalmente
      }
    };

    checkDeployStatus();
    deployInterval = setInterval(checkDeployStatus, 2500);
    return () => {
      if (deployInterval) clearInterval(deployInterval);
    };
  }, [onRefreshStatus]);

  useEffect(() => {
    const domainToRequest = proxyDomain.trim() || defaultPlaceholderDomain;
    fetch(`/api/proxy-snippets?domain=${encodeURIComponent(domainToRequest)}&port=3500`)
      .then(res => res.json())
      .then(data => setProxySnippets(data))
      .catch(console.error);
  }, [proxyDomain, defaultPlaceholderDomain, status]);

  const handleStartDeploy = async () => {
    setDeployModal(prev => ({
      ...prev,
      open: true,
      isDeploying: true,
      logs: [t('preparing')],
      lastError: null,
    }));
    try {
      const res = await fetch('/api/compose/deploy', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setDeployModal(prev => ({
          ...prev,
          isDeploying: false,
          lastError: data.error || (isEn ? 'Failed to start' : 'Error al iniciar'),
        }));
      }
    } catch (err: any) {
      setDeployModal(prev => ({
        ...prev,
        isDeploying: false,
        lastError: err.message,
      }));
    }
  };

  const handleOpenDeployLogs = async () => {
    try {
      const res = await fetch('/api/compose/status');
      if (res.ok) {
        const data = await res.json();
        setDeployModal({
          open: true,
          isDeploying: data.isDeploying,
          logs: data.logs || [],
          lastError: data.lastError,
        });
      }
    } catch {
      setDeployModal(prev => ({ ...prev, open: true }));
    }
  };

  const handleAction = async (containerName: string, action: 'start' | 'stop' | 'restart') => {
    setLoading(true);
    try {
      await fetch(`/api/containers/${containerName}/${action}`, { method: 'POST' });
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLogs = async (containerName: string) => {
    try {
      const res = await fetch(`/api/containers/${containerName}/logs?lines=150`);
      const data = await res.json();
      setLogsModal({
        open: true,
        containerName,
        logs: data.logs || (isEn ? 'No recent logs.' : 'Sin registros recientes.'),
      });
    } catch (err: any) {
      setLogsModal({
        open: true,
        containerName,
        logs: `Error: ${err.message}`,
      });
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTriggerScan = async () => {
    setIsScanning(true);
    setScanMsg(null);
    const startTime = Date.now();
    try {
      const res = await fetch('/api/navidrome/scan', { method: 'POST' });
      const data = await res.json();
      await fetchData();
      if (onRefreshStatus) onRefreshStatus();

      const elapsed = Date.now() - startTime;
      if (elapsed < 900) {
        await new Promise(r => setTimeout(r, 900 - elapsed));
      }

      if (data.success) {
        setScanMsg({ text: t('libraryUpdated'), success: true });
      } else {
        setScanMsg({ text: `Error: ${data.error || 'Failed to sync'}`, success: false });
      }
    } catch (err: any) {
      setScanMsg({ text: `Error: ${err.message}`, success: false });
    } finally {
      setIsScanning(false);
      setTimeout(() => setScanMsg(null), 4000);
    }
  };

  const currentBrowserHost = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : '';
  const detectedHost = sysStats?.hostIp || status?.hostIp || '127.0.0.1';

  // IP accesible en la red local (para clientes externos en celulares, tablets, etc.)
  const networkHostIp = (detectedHost && detectedHost !== '127.0.0.1' && detectedHost !== 'localhost')
    ? detectedHost
    : (currentBrowserHost && currentBrowserHost !== 'localhost' && currentBrowserHost !== '127.0.0.1' ? currentBrowserHost : '127.0.0.1');

  // Local browser hostname for user on this machine
  const localHost = currentBrowserHost || networkHostIp || 'localhost';

  const hostifyGatewayPort = status?.hostifyPort || window.location.port || '3500';
  const subsonicUrl = status?.domain
    ? (status.domain.startsWith('http') ? status.domain : `https://${status.domain}`)
    : `http://${networkHostIp}:${hostifyGatewayPort}`;

  // Tools accessed through Hostify Reverse Proxy Gateway
  const feishinUrl = '/feishin/';
  const navidromeLocalUrl = '/app/';
  const runningContainers = containers.filter(c => c.state === 'running').length;
  const hasPendingServices = containers.some(c => c.category !== 'connectivity' && c.state !== 'running');
  const isFeishinRunning = containers.find(c => c.name.includes('feishin'))?.state === 'running';
  const isNavidromeRunning = containers.find(c => c.name.includes('navidrome'))?.state === 'running';

  const exploContainer = containers.find(c => c.name.includes('explo'));
  const isExploInstalled = !!exploContainer && exploContainer.state !== 'not_created';
  const isExploRunning = exploContainer?.state === 'running';

  const slskdContainer = containers.find(c => c.name.includes('slskd'));
  const isSlskdInstalled = !!slskdContainer && slskdContainer.state !== 'not_created';
  const isSlskdRunning = slskdContainer?.state === 'running';

  const getContainerUrl = (c?: ContainerInfo): string => {
    if (!c) return '/';
    if (c.name.includes('feishin')) return '/feishin/';
    if (c.name.includes('slskd')) return '/tools/slskd/';
    if (c.name.includes('explo')) return '/tools/explo/';
    if (c.name.includes('qbittorrent')) return '/tools/qbittorrent/';
    if (c.name.includes('prowlarr')) return '/tools/prowlarr/';
    if (c.name.includes('lidarr')) return '/tools/lidarr/';
    if (c.name.includes('scrobbler')) return '/tools/scrobbler/';
    if (c.name.includes('navidrome')) return '/app/';
    return '/';
  };

  const slskdUrl = '/tools/slskd/';
  const exploUrl = '/tools/explo/';

  const openFeishinWindow = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!isFeishinRunning) return;
    const w = window.open(feishinUrl, 'hostify_feishin_player');
    if (w) w.focus();
  };

  const openExploWindow = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!isExploRunning) return;
    const w = window.open(exploUrl, 'hostify_explo');
    if (w) w.focus();
  };

  const openSlskdWindow = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!isSlskdRunning) return;
    const w = window.open(slskdUrl, 'hostify_slskd');
    if (w) w.focus();
  };

  return (
    <div className="container" style={{ paddingBottom: '60px' }}>
      {/* Alerta si el motor del servidor está apagado */}
      {status && !status.dockerAvailable && (
        <div style={{
          background: 'var(--status-err-bg)',
          border: '1px solid var(--status-err-border)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 16px',
          margin: '20px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: 'var(--status-err-text)',
          fontSize: '0.84rem'
        }}>
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <div>
            <strong>{t('engineDownTitle')}</strong> {t('engineDownDesc')}
          </div>
        </div>
      )}

      {/* Cabecera Limpia (Sin cajas anidadas) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '16px', margin: '32px 0 20px' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: '700', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            {t('libraryTitle')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginTop: '2px' }}>
            {storage?.totalTrackCount !== undefined ? `${storage.totalTrackCount} ${t('tracksIndexed')}` : t('loadingCatalog')} • {runningContainers} {t('toolsOnline')} {sysStats ? `• RAM ${sysStats.memoryUsagePercent}%` : ''}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {hasPendingServices && (
            <button
              id="btn-deploy-stack"
              className={`btn btn-sm ${deployModal.isDeploying ? 'btn-secondary' : 'btn-primary'}`}
              onClick={deployModal.isDeploying ? handleOpenDeployLogs : handleStartDeploy}
              disabled={!status?.dockerAvailable}
            >
              {deployModal.isDeploying ? (
                <>
                  <RefreshCw size={12} className="spin" />
                  <span>{t('preparing')}</span>
                </>
              ) : (
                <>
                  <Play size={12} fill="currentColor" />
                  <span>{t('startComponents')}</span>
                </>
              )}
            </button>
          )}

        </div>
      </div>

      {/* Navegación por Pestañas (Subrayado limpio, sin cajas) */}
      <nav className="tabs-nav">
        <button
          id="tab-btn-listen"
          className={`tab-btn ${activeTab === 'listen' ? 'active' : ''}`}
          onClick={() => setActiveTab('listen')}
        >
          <Headphones size={15} />
          <span>{t('tabListen')}</span>
        </button>
        <button
          id="tab-btn-tools"
          className={`tab-btn ${activeTab === 'tools' ? 'active' : ''}`}
          onClick={() => setActiveTab('tools')}
        >
          <Layers size={15} />
          <span>{t('tabTools')}</span>
        </button>
        <button
          id="tab-btn-storage"
          className={`tab-btn ${activeTab === 'storage' ? 'active' : ''}`}
          onClick={() => setActiveTab('storage')}
        >
          <Folder size={15} />
          <span>{t('tabStorage')}</span>
        </button>
        <button
          id="tab-btn-apps"
          className={`tab-btn ${activeTab === 'apps' ? 'active' : ''}`}
          onClick={() => setActiveTab('apps')}
        >
          <Smartphone size={15} />
          <span>{t('tabApps')}</span>
        </button>
        <button
          id="tab-btn-remote"
          className={`tab-btn ${activeTab === 'remote' ? 'active' : ''}`}
          onClick={() => setActiveTab('remote')}
        >
          <Globe size={15} />
          <span>{t('tabRemote')}</span>
        </button>
      </nav>

      {/* PESTAÑA 1: ESCUCHAR (Directo, amplio, sin sobrecarga) */}
      {activeTab === 'listen' && (
        <div style={{ maxWidth: '820px' }}>
          {/* Barra de Controles Rápidos de Reproducción (Stitch Hi-Fi Audio Player) */}
          {isFeishinRunning && (() => {
            const isTrackPlaying = Boolean(
              nowPlaying &&
              nowPlaying.state === 'playing' &&
              (nowPlaying.minutesAgo === undefined || nowPlaying.minutesAgo === 0)
            );
            const isTrackPaused = Boolean(
              nowPlaying &&
              (nowPlaying.state === 'paused' || (nowPlaying.minutesAgo !== undefined && nowPlaying.minutesAgo > 0))
            );

            return (
              <div className="compact-player-bar">
                <div className="compact-player-track">
                  <div
                    className="compact-player-thumb"
                    onClick={openFeishinWindow}
                    title={t('compactPlayerLaunch')}
                    style={{ cursor: 'pointer' }}
                  >
                    {nowPlaying?.coverArtUrl ? (
                      <img src={nowPlaying.coverArtUrl} alt={nowPlaying.album || 'Cover'} />
                    ) : (
                      <Disc3 size={34} className={isTrackPlaying ? 'spin' : ''} style={{ opacity: 0.65 }} />
                    )}
                  </div>

                  <div className="compact-player-meta">
                    {/* Badges Row */}
                    <div className="hifi-badges-row">
                      <span className={`hifi-badge ${isTrackPlaying ? 'hifi-badge-emerald' : isTrackPaused ? 'hifi-badge-paused' : 'hifi-badge-standby'}`}>
                        {isTrackPlaying ? t('playerStatePlaying') : isTrackPaused ? t('playerStatePaused') : t('playerStateStandby')}
                      </span>
                    </div>

                    {/* Title */}
                    <div className="compact-player-title" title={nowPlaying ? nowPlaying.title : t('compactPlayerReady')}>
                      {nowPlaying ? nowPlaying.title : t('compactPlayerReady')}
                    </div>

                    {/* Artist & Album */}
                    <div className="compact-player-artist">
                      {nowPlaying ? (
                        <>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{nowPlaying.artist}</span>
                          {nowPlaying.album && <span> • {nowPlaying.album}</span>}
                          {nowPlaying.playerName && (
                            <span style={{ color: 'var(--accent-primary)', marginLeft: '6px', fontSize: '0.74rem' }}>
                              ({t('compactPlayerFrom')} {nowPlaying.playerName})
                            </span>
                          )}
                        </>
                      ) : (
                        t('compactPlayerHint')
                      )}
                    </div>

                    {/* Sub-row: Animated Equalizer & Direct Buffer Status */}
                    <div className="hifi-audio-status">
                      <div className="hifi-equalizer" title={isTrackPlaying ? 'ALSA Direct Pipeline (Playing)' : isTrackPaused ? 'Audio Buffer (Paused)' : 'Audio Pipeline (Standby)'}>
                        <div className="hifi-eq-group">
                          <span className={`hifi-eq-bar ${isTrackPlaying ? 'animating' : 'idle'}`} style={{ height: isTrackPlaying ? '7px' : '4px' }} />
                          <span className={`hifi-eq-bar ${isTrackPlaying ? 'animating' : 'idle'}`} style={{ height: isTrackPlaying ? '14px' : '6px' }} />
                          <span className={`hifi-eq-bar ${isTrackPlaying ? 'animating' : 'idle'}`} style={{ height: isTrackPlaying ? '9px' : '4px' }} />
                        </div>
                        <div className="hifi-eq-group">
                          <span className={`hifi-eq-bar ${isTrackPlaying ? 'animating' : 'idle'}`} style={{ height: isTrackPlaying ? '11px' : '5px', background: isTrackPlaying ? '#10B981' : '#64748B' }} />
                          <span className={`hifi-eq-bar ${isTrackPlaying ? 'animating' : 'idle'}`} style={{ height: isTrackPlaying ? '13px' : '5px', background: isTrackPlaying ? '#10B981' : '#64748B' }} />
                        </div>
                      </div>
                      <span className="hifi-status-text">
                        {isTrackPlaying
                          ? t('playerBufferPlaying')
                          : isTrackPaused
                            ? t('playerBufferPaused')
                            : t('playerBufferStandby')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Section: Launch Feishin Button */}
                <div className="compact-player-actions">
                  <a
                    href={feishinUrl}
                    target="hostify_feishin_player"
                    rel="noreferrer"
                    onClick={openFeishinWindow}
                    className="btn-stitch-feishin"
                    title={t('compactPlayerLaunch')}
                  >
                    <ExternalLink size={15} />
                    <span>{t('compactPlayerLaunch')}</span>
                  </a>
                </div>
              </div>
            );
          })()}

          {/* Widget de Métricas de Fonoteca & Curador Explo */}
          <div className="library-curator-widget">
            {/* Tarjeta 1: Canciones en Biblioteca */}
            <div className="library-stat-card">
              <div>
                <div className="library-stat-header">
                  <span className="library-stat-title">
                    <Music size={14} style={{ color: 'var(--accent-brass)' }} />
                    <span>{t('totalTracksLabel')}</span>
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {scanMsg && (
                      <span style={{
                        fontSize: '0.74rem',
                        color: scanMsg.success ? 'var(--status-online-text)' : 'var(--status-err-text)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}>
                        {scanMsg.success && <Check size={11} />}
                        <span>{scanMsg.text}</span>
                      </span>
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                      onClick={handleTriggerScan}
                      disabled={isScanning}
                      title={t('syncLibraryShort')}
                    >
                      <RefreshCw size={11} className={isScanning ? 'spin' : ''} />
                      <span>{isScanning ? t('syncing') : t('syncLibraryShort')}</span>
                    </button>
                  </div>
                </div>

                <div className="library-stat-main">
                  <span className="library-stat-number">
                    {storage?.totalTrackCount !== undefined ? storage.totalTrackCount.toLocaleString() : '0'}
                  </span>
                  <span className="library-stat-unit">{t('tracksCount')}</span>
                </div>

                <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: '0 0 10px' }}>
                  {t('totalTracksHint')} {storage?.folders?.music?.sizeHuman ? `• ${storage.folders.music.sizeHuman}` : ''}
                </p>
              </div>

              <div className="library-breakdown-pills">
                <span className="breakdown-pill" title="/music/personal">
                  <strong>{storage?.folders?.personal?.fileCount ?? 0}</strong> {t('sourcePersonal')}
                </span>
                <span className="breakdown-pill" title="/music/slskd">
                  <strong>{storage?.folders?.slskd?.fileCount ?? 0}</strong> {t('sourceSlskd')}
                </span>
                <span className="breakdown-pill" title="/music/explo">
                  <strong>{storage?.folders?.explo?.fileCount ?? 0}</strong> {t('sourceExplo')}
                </span>
                <span className="breakdown-pill" title="/music/torrents">
                  <strong>{storage?.folders?.torrents?.fileCount ?? 0}</strong> {t('sourceTorrents')}
                </span>
              </div>
            </div>

            {/* Tarjeta 2: Slskd (Soulseek P2P) o Explo si Slskd no está instalado */}
            {isSlskdInstalled ? (
              <div className="curator-card">
                <div className="curator-card-bg-glow" />
                <div>
                  <div className="library-stat-header">
                    <span className="library-stat-title" style={{ color: 'var(--text-primary)' }}>
                      <DownloadCloud size={14} style={{ color: 'var(--accent-brass)' }} />
                      <span>{t('slskdWidgetTitle')}</span>
                    </span>
                    <span className={`status-pill ${isSlskdRunning ? 'online' : 'offline'}`}>
                      <span className="status-dot"></span>
                      <span>{isSlskdRunning ? t('online') : t('offline')}</span>
                    </span>
                  </div>

                  <p className="curator-desc">
                    {t('slskdWidgetDesc')}
                  </p>
                </div>

                <div className="curator-actions">
                  {isSlskdRunning ? (
                    <a
                      href={slskdUrl}
                      target="hostify_slskd"
                      rel="noreferrer"
                      onClick={openSlskdWindow}
                      className="btn btn-primary btn-sm"
                      id="btn-open-slskd"
                    >
                      <DownloadCloud size={13} />
                      <span>{t('openSlskdBtn')}</span>
                      <ExternalLink size={11} style={{ opacity: 0.7 }} />
                    </a>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleAction(slskdContainer?.name || 'hostify-slskd', 'start')}
                      disabled={!status?.dockerAvailable}
                      id="btn-start-slskd"
                    >
                      <Play size={12} />
                      <span>{t('startSlskdBtn')}</span>
                    </button>
                  )}
                </div>
              </div>
            ) : isExploInstalled ? (
              <div className="curator-card">
                <div className="curator-card-bg-glow" />
                <div>
                  <div className="library-stat-header">
                    <span className="library-stat-title" style={{ color: 'var(--text-primary)' }}>
                      <Sparkles size={14} style={{ color: 'var(--accent-brass)' }} />
                      <span>{t('exploWidgetTitle')}</span>
                    </span>
                    <span className={`status-pill ${isExploRunning ? 'online' : 'offline'}`}>
                      <span className="status-dot"></span>
                      <span>{isExploRunning ? t('online') : t('offline')}</span>
                    </span>
                  </div>

                  <p className="curator-desc">
                    {t('exploWidgetDesc')}
                  </p>
                </div>

                <div className="curator-actions">
                  {isExploRunning ? (
                    <a
                      href={exploUrl}
                      target="hostify_explo"
                      rel="noreferrer"
                      onClick={openExploWindow}
                      className="btn btn-primary btn-sm"
                      id="btn-open-explo"
                    >
                      <Compass size={13} />
                      <span>{t('openExploBtn')}</span>
                      <ExternalLink size={11} style={{ opacity: 0.7 }} />
                    </a>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleAction(exploContainer?.name || 'hostify-explo', 'start')}
                      disabled={!status?.dockerAvailable}
                      id="btn-start-explo"
                    >
                      <Play size={12} />
                      <span>{t('startExploBtn')}</span>
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '600', color: 'var(--text-primary)' }}>
              {t('webRoomsTitle')}
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {t('webRoomsDesc')}
            </p>
          </div>

          <div className="flat-list" style={{ marginBottom: '36px' }}>
            {/* Feishin Web */}
            <div className="flat-row">
              <div className="flat-row-info">
                <Music size={20} className="flat-icon" />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="flat-row-title">{t('feishinWebTitle')}</span>
                    <span className={`status-pill ${isFeishinRunning ? 'online' : 'offline'}`}>
                      <span className="status-dot"></span>
                      <span>{isFeishinRunning ? t('online') : t('offline')}</span>
                    </span>
                  </div>
                  <p className="flat-row-desc">
                    {t('feishinWebDesc')}
                  </p>
                </div>
              </div>
              <div>
                <a
                  href={isFeishinRunning ? feishinUrl : '#'}
                  target={isFeishinRunning ? "hostify_feishin_player" : undefined}
                  rel="noreferrer"
                  onClick={isFeishinRunning ? openFeishinWindow : (e) => e.preventDefault()}
                  className="btn btn-primary btn-sm"
                  style={!isFeishinRunning ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                >
                  <ExternalLink size={12} />
                  <span>{t('openFeishinWeb')}</span>
                </a>
              </div>
            </div>

            {/* Navidrome Web */}
            <div className="flat-row">
              <div className="flat-row-info">
                <Radio size={20} className="flat-icon" />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="flat-row-title">{t('navidromeTitle')}</span>
                    <span className={`status-pill ${isNavidromeRunning ? 'online' : 'offline'}`}>
                      <span className="status-dot"></span>
                      <span>{isNavidromeRunning ? t('online') : t('offline')}</span>
                    </span>
                  </div>
                  <p className="flat-row-desc">
                    {t('navidromeDesc')}
                  </p>
                </div>
              </div>
              <div>
                <a
                  href={isNavidromeRunning ? navidromeLocalUrl : '#'}
                  target={isNavidromeRunning ? "_blank" : undefined}
                  rel="noreferrer"
                  onClick={!isNavidromeRunning ? (e) => e.preventDefault() : undefined}
                  className="btn btn-secondary btn-sm"
                  style={!isNavidromeRunning ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                >
                  <ExternalLink size={12} />
                  <span>{t('openNavidrome')}</span>
                </a>
              </div>
            </div>
          </div>

          {/* Credenciales de Conexión en Formato Plano */}
          <div style={{ paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: '0.98rem', fontWeight: '600', marginBottom: '4px' }}>
              {t('externalClientsTitle')}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              {t('externalClientsDesc')}
            </p>

            <div className="flat-list">
              <div className="flat-row" style={{ padding: '12px 0' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', width: '160px' }}>
                  {t('serverAddress')}
                </span>
                <code style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', flex: 1 }}>
                  {subsonicUrl}
                </code>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => copyToClipboard(subsonicUrl, 'conn-url')}
                >
                  <Copy size={11} />
                  <span>{copiedKey === 'conn-url' ? t('copied') : t('copy')}</span>
                </button>
              </div>

              <div className="flat-row" style={{ padding: '12px 0' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', width: '160px' }}>
                  {t('libraryUser')}
                </span>
                <code style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', flex: 1 }}>
                  {status?.navidromeAdminUser || 'admin'}
                </code>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => copyToClipboard(status?.navidromeAdminUser || 'admin', 'conn-user')}
                >
                  <Copy size={11} />
                  <span>{copiedKey === 'conn-user' ? t('copied') : t('copy')}</span>
                </button>
              </div>

              <div className="flat-row" style={{ padding: '12px 0' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', width: '160px' }}>
                  {t('password')}
                </span>
                <code style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', flex: 1 }}>
                  {showPassword ? (status?.navidromeAdminPassword || 'Configured') : '••••••••••••'}
                </code>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Hide' : 'Show'}
                  >
                    {showPassword ? <EyeOff size={11} /> : <Eye size={11} />}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => copyToClipboard(status?.navidromeAdminPassword || '', 'conn-pass')}
                    disabled={!status?.navidromeAdminPassword}
                  >
                    <Copy size={11} />
                    <span>{copiedKey === 'conn-pass' ? t('copied') : t('copy')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: HERRAMIENTAS & FUENTES (Lista plana limpia, sin cajas) */}
      {activeTab === 'tools' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '600', color: 'var(--text-primary)' }}>
              {t('systemComponentsTitle')}
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {t('systemComponentsDesc')}
            </p>
          </div>

          <div className="flat-list">
            {containers
              .filter(c => !c.name.includes('tailscale'))
              .map(c => {
                const isRunning = c.state === 'running';
                const info = getFriendlyComponentInfo(c.name, c.description, isEn);

                return (
                  <div key={c.name} className="flat-row">
                    <div className="flat-row-info">
                      <div className="flat-icon">
                        {c.name.includes('feishin') && <Music size={18} />}
                        {c.name.includes('navidrome') && <Radio size={18} />}
                        {c.name.includes('scrobbler') && <Disc3 size={18} />}
                        {c.name.includes('slskd') && <DownloadCloud size={18} />}
                        {c.name.includes('explo') && <Sparkles size={18} />}
                        {c.name.includes('qbittorrent') && <Server size={18} />}
                        {c.name.includes('prowlarr') && <Layers size={18} />}
                        {c.name.includes('lidarr') && <Disc3 size={18} />}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span className="flat-row-title">{info.title}</span>
                          <span className={`status-pill ${isRunning ? 'online' : (c.state === 'not_created' ? 'offline' : 'error')}`}>
                            <span className="status-dot"></span>
                            <span>{isRunning ? t('active') : (c.state === 'not_created' ? t('notInstalled') : t('paused'))}</span>
                          </span>
                        </div>
                        <p className="flat-row-desc">{info.role}</p>
                      </div>
                    </div>

                    <div className="flat-row-meta">
                      <span>{isRunning ? `${c.memoryUsageMb || 35} MB` : '0 MB'}</span>
                      <span style={{ fontSize: '0.74rem', opacity: 0.6, fontFamily: 'monospace' }}>
                        {getContainerUrl(c)}
                      </span>

                      <div style={{ display: 'flex', gap: '4px' }}>
                        {isRunning && (
                          <a
                            href={getContainerUrl(c)}
                            target={c.name.includes('feishin') ? 'hostify_feishin_player' : c.name.includes('slskd') ? 'hostify_slskd' : c.name.includes('explo') ? 'hostify_explo' : `hostify_${c.name}`}
                            rel="noreferrer"
                            className="btn btn-secondary btn-sm"
                            title={t('openWebUI')}
                          >
                            <ExternalLink size={11} />
                          </a>
                        )}
                        {isRunning ? (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleAction(c.name, 'stop')}
                            title={t('pauseBtn')}
                            disabled={!status?.dockerAvailable}
                          >
                            <Square size={11} />
                            <span>{t('pauseBtn')}</span>
                          </button>
                        ) : (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={c.state === 'not_created' ? handleStartDeploy : () => handleAction(c.name, 'start')}
                            title={t('startBtn')}
                            disabled={!status?.dockerAvailable}
                          >
                            <Play size={11} />
                            <span>{t('startBtn')}</span>
                          </button>
                        )}

                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleAction(c.name, 'restart')}
                          title={t('restartBtn')}
                          disabled={!status?.dockerAvailable || c.state === 'not_created'}
                        >
                          <RotateCw size={11} />
                        </button>

                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={c.state === 'not_created' ? handleOpenDeployLogs : () => handleOpenLogs(c.name)}
                          title={t('viewLogsBtn')}
                        >
                          <FileText size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* PESTAÑA 3: ALMACENAMIENTO (Limpio y directo) */}
      {activeTab === 'storage' && (
        <div style={{ maxWidth: '820px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '600', color: 'var(--text-primary)' }}>
              {t('storageOrgTitle')}
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.5 }}>
              {t('storageOrgDesc')}
            </p>
          </div>

          <div className="flat-list" style={{ marginBottom: '28px' }}>
            <div className="flat-row">
              <div className="flat-row-info">
                <Folder size={18} className="flat-icon" />
                <div>
                  <div className="flat-row-title">{t('folderPersonalTitle')}</div>
                  <p className="flat-row-desc">{t('folderPersonalDesc')}</p>
                </div>
              </div>
              <span style={{ fontSize: '0.84rem', fontWeight: '600' }}>
                {storage?.folders?.personal?.fileCount ?? 0} {t('tracksCount')}
              </span>
            </div>

            <div className="flat-row">
              <div className="flat-row-info">
                <Sparkles size={18} className="flat-icon" />
                <div>
                  <div className="flat-row-title">{t('folderExploTitle')}</div>
                  <p className="flat-row-desc">{t('folderExploDesc')}</p>
                </div>
              </div>
              <span style={{ fontSize: '0.84rem', fontWeight: '600' }}>
                {storage?.folders?.explo?.fileCount ?? 0} {t('tracksCount')}
              </span>
            </div>

            <div className="flat-row">
              <div className="flat-row-info">
                <Music size={18} className="flat-icon" />
                <div>
                  <div className="flat-row-title">{t('folderSlskdTitle')}</div>
                  <p className="flat-row-desc">{t('folderSlskdDesc')}</p>
                </div>
              </div>
              <span style={{ fontSize: '0.84rem', fontWeight: '600' }}>
                {storage?.folders?.slskd?.fileCount ?? 0} {t('tracksCount')}
              </span>
            </div>

            <div className="flat-row">
              <div className="flat-row-info">
                <Disc3 size={18} className="flat-icon" />
                <div>
                  <div className="flat-row-title">{t('folderTorrentsTitle')}</div>
                  <p className="flat-row-desc">{t('folderTorrentsDesc')}</p>
                </div>
              </div>
              <span style={{ fontSize: '0.84rem', fontWeight: '600' }}>
                {storage?.folders?.torrents?.fileCount ?? 0} {t('tracksCount')}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {t('mountedPath')} <code>{status?.musicRoot || '/volume1/music'}</code>
              </p>
              {scanMsg && (
                <p style={{ fontSize: '0.78rem', color: scanMsg.success ? 'var(--status-online-text)' : 'var(--status-err-text)', marginTop: '4px' }}>
                  {scanMsg.text}
                </p>
              )}
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleTriggerScan}
              disabled={isScanning}
            >
              <RefreshCw size={12} className={isScanning ? 'spin' : ''} />
              <span>{isScanning ? t('syncing') : t('syncNow')}</span>
            </button>
          </div>
        </div>
      )}

      {/* PESTAÑA 4: APLICACIONES (Lista filtrable limpia) */}
      {activeTab === 'apps' && (
        <div>
          <div style={{ marginBottom: '22px' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '600', color: 'var(--text-primary)' }}>
              {t('playersTitle')}
            </h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.55 }}>
              {t('playersDesc')}
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {t('connUrlLabel')} <code>{subsonicUrl}</code>
            </span>

            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { id: 'all', label: t('filterAll') },
                { id: 'desktop', label: t('filterDesktop') },
                { id: 'android', label: t('filterAndroid') },
                { id: 'ios', label: t('filterIos') },
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setPlatformFilter(f.id as any)}
                  className={`btn btn-sm ${platformFilter === f.id ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flat-list">
            {RECOMMENDED_PLAYERS
              .filter(p => {
                if (platformFilter === 'all') return true;
                if (platformFilter === 'desktop') return p.category === 'desktop';
                if (platformFilter === 'android') return p.category === 'android';
                if (platformFilter === 'ios') return p.category === 'ios';
                return true;
              })
              .map(player => {
                const isWebFeishin = player.id === 'feishin-web';
                const targetUrl = isWebFeishin ? feishinUrl : player.url;

                return (
                  <div key={player.id} className="flat-row">
                    <div className="flat-row-info">
                      <div className="flat-icon">
                        {player.category === 'android' && <AndroidIcon size={18} />}
                        {player.category === 'ios' && <AppleIcon size={18} />}
                        {player.category === 'desktop' && <Laptop size={18} />}
                        {player.category === 'web' && <Music size={18} />}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="flat-row-title">{player.name}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {player.platformBadges.join(' • ')}
                          </span>
                        </div>
                        <p className="flat-row-desc">{isEn ? player.description.en : player.description.es}</p>
                      </div>
                    </div>

                    <div>
                      <a
                        href={targetUrl}
                        target={isWebFeishin ? "hostify_feishin_player" : "_blank"}
                        rel="noreferrer"
                        onClick={isWebFeishin ? openFeishinWindow : undefined}
                        className="btn btn-secondary btn-sm"
                      >
                        <ExternalLink size={12} />
                        <span>{isEn ? player.downloadLabel.en : player.downloadLabel.es}</span>
                      </a>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* PESTAÑA 5: ACCESO REMOTO */}
      {activeTab === 'remote' && (
        <div style={{ maxWidth: '820px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '600', color: 'var(--text-primary)' }}>
              {t('remoteListenTitle')}
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.5 }}>
              {t('remoteListenDesc')}
            </p>
          </div>

          <div style={{ padding: '16px 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className={`status-pill ${status?.tailscaleDetected ? 'online' : 'offline'}`}>
                <span className="status-dot"></span>
                <span>{status?.tailscaleDetected ? t('tailscaleActive') : t('tailscaleInactive')}</span>
              </span>
              {status?.tailscaleDetected && (
                <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}>
                  IP: {status.tailscaleIp}
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {status?.tailscaleDetected
                ? t('tailscaleReadyDesc')
                : t('tailscaleMissingDesc')}
            </p>
          </div>

          {/* Configuración Proxy Opcional */}
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '0.94rem', fontWeight: '600', marginBottom: '4px' }}>
              {t('customDomainTitle')}
            </h3>
            <div className="form-group" style={{ maxWidth: '400px', marginTop: '12px' }}>
              <label className="form-label">{t('yourDomain')}</label>
              <input
                type="text"
                className="form-input"
                value={proxyDomain}
                onChange={e => setProxyDomain(e.target.value)}
                placeholder={defaultPlaceholderDomain}
              />
            </div>

            <div style={{ marginTop: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t('caddyConfigTitle')}</span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => proxySnippets && copyToClipboard(proxySnippets.caddy, 'caddy')}
                  style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                >
                  <Copy size={11} />
                  <span>{copiedKey === 'caddy' ? t('copied') : t('copy')}</span>
                </button>
              </div>
              <div className="code-box">{proxySnippets?.caddy || (isEn ? 'Loading...' : 'Cargando...')}</div>
            </div>
          </div>
        </div>
      )}

      {/* Logs Modal */}
      {logsModal.open && (
        <div className="modal-overlay" onClick={() => setLogsModal({ open: false, containerName: '', logs: '' })}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '0.95rem', fontWeight: '600' }}>
                {t('activityTitle')} {logsModal.containerName}
              </h3>
              <button
                className="btn btn-secondary btn-icon btn-sm"
                onClick={() => setLogsModal({ open: false, containerName: '', logs: '' })}
              >
                <X size={14} />
              </button>
            </div>
            <div className="code-box" style={{ maxHeight: '380px', overflowY: 'auto' }}>
              {logsModal.logs}
            </div>
          </div>
        </div>
      )}

      {/* Deploy Modal */}
      {deployModal.open && (
        <div className="modal-overlay" onClick={() => setDeployModal(prev => ({ ...prev, open: false }))}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: '600' }}>
                  {deployModal.isDeploying ? t('preparing') : t('deployStateTitle')}
                </h3>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  {deployModal.isDeploying ? t('deployStateInProgress') : t('deployStateDone')}
                </p>
              </div>
              <button
                className="btn btn-secondary btn-icon btn-sm"
                onClick={() => setDeployModal(prev => ({ ...prev, open: false }))}
              >
                <X size={14} />
              </button>
            </div>

            <div className="code-box" style={{ maxHeight: '320px', overflowY: 'auto' }}>
              {deployModal.logs.length > 0 ? (
                deployModal.logs.map((line, idx) => (
                  <div key={idx}>{line}</div>
                ))
              ) : (
                <div style={{ color: 'var(--text-muted)' }}>{t('preparing')}</div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              {!deployModal.isDeploying && deployModal.lastError && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleStartDeploy}
                >
                  <RotateCw size={12} />
                  <span>{t('retry')}</span>
                </button>
              )}
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setDeployModal(prev => ({ ...prev, open: false }))}
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

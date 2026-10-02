import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'es' | 'en';

export const translations = {
  es: {
    // Brand & Common
    appName: 'Hostify',
    tagline: 'Fonoteca en alta fidelidad',
    footerText: 'Hostify • Tu fonoteca personal en alta fidelidad | Compatible con Navidrome y el ecosistema OpenSubsonic',
    online: 'En línea',
    offline: 'Desconectado',
    engineStopped: 'Motor detenido',
    loadingCollection: 'Cargando tu fonoteca musical...',
    copy: 'Copiar',
    copied: 'Copiado',
    close: 'Cerrar',
    cancel: 'Cancelar',
    continue: 'Continuar',
    back: 'Anterior',
    create: 'Crear',
    retry: 'Reintentar',
    updating: 'Actualizando...',
    preparing: 'Preparando...',
    save: 'Guardar',
    browse: 'Examinar...',
    active: 'Activo',
    paused: 'En pausa',
    notInstalled: 'No instalado',

    // Navbar
    runWizard: 'Ejecutar asistente de configuración',
    runWizardTooltip: 'Ejecutar nuevamente el asistente de configuración paso a paso',
    settings: 'Configuración',
    backToDashboard: 'Volver al panel',
    cancelWizard: 'Salir del asistente',

    // Engine alert
    engineDownTitle: 'El motor del servidor está detenido.',
    engineDownDesc: 'Inicia Docker Desktop o Colima para escuchar música o modificar tu colección.',
    engineDownWizard: 'Inicia Colima o Docker Desktop para poder desplegar tu fonoteca.',

    // Tabs
    tabListen: 'Escuchar',
    tabTools: 'Herramientas & Fuentes',
    tabStorage: 'Almacenamiento',
    tabApps: 'Aplicaciones',
    tabRemote: 'Acceso Remoto',

    // Dashboard Header
    libraryTitle: 'Fonoteca Personal',
    tracksIndexed: 'pistas indexadas',
    loadingCatalog: 'Cargando catálogo',
    toolsOnline: 'herramientas en línea',
    startComponents: 'Iniciar componentes',
    refresh: 'Actualizar',
    updateLibrary: 'Actualizar biblioteca',
    updatingLibrary: 'Actualizando biblioteca...',
    libraryUpdated: 'Biblioteca actualizada',

    // Tab Listen - Widget de Colección y Curador
    libraryWidgetTitle: 'Colección & Descubrimiento',
    totalTracksLabel: 'Canciones en biblioteca',
    totalTracksHint: 'Pistas indexadas en Navidrome',
    sourcePersonal: 'Personal',
    sourceExplo: 'Curador Explo',
    sourceSlskd: 'Soulseek P2P',
    sourceTorrents: 'Torrents',
    exploWidgetTitle: 'Explo • Curador Inteligente',
    exploWidgetDesc: 'Aprende de lo que escuchas, genera playlists automáticas de descubrimiento y descarga nuevas canciones.',
    openExploBtn: 'Buscar canciones en Explo',
    startExploBtn: 'Iniciar Explo',
    slskdWidgetTitle: 'Slskd • Red Soulseek P2P',
    slskdWidgetDesc: 'Busca y descarga canciones sueltas o álbumes completos directamente desde la comunidad P2P de melómanos y coleccionistas.',
    openSlskdBtn: 'Buscar canciones en Slskd',
    startSlskdBtn: 'Iniciar Slskd',
    syncLibraryShort: 'Sincronizar',
    openWebUI: 'Abrir interfaz',

    // Tab Listen
    webRoomsTitle: 'Salas de Escucha en el Navegador',
    webRoomsDesc: 'Reproduce directamente sin instalar nada en tu equipo.',
    feishinWebTitle: 'Sala Feishin Web',
    feishinWebDesc: 'Experiencia fluida inspirada en Spotify con letras en vivo sincronizadas y audio de alta fidelidad.',
    openFeishinWeb: 'Entrar a Feishin Web',
    feishinWidgetTitle: 'Reproductor Web Feishin',
    feishinWidgetDesc: 'Reproductor integrado en el panel para escuchar tu música al instante.',
    feishinWidgetOpenNewTab: 'Abrir Feishin completo',
    feishinWidgetToggleHide: 'Ocultar reproductor',
    feishinWidgetToggleShow: 'Mostrar reproductor integrado',
    feishinWidgetOffline: 'El servicio Feishin se encuentra pausado o apagado.',
    compactPlayerReady: 'Fonoteca en línea • Listo para reproducir',
    compactPlayerHint: 'Abre Feishin o tu cliente OpenSubsonic para reproducir',
    compactPlayerPlaying: 'Reproduciendo ahora',
    compactPlayerFrom: 'vía',
    compactPlayerPlay: 'Reproducir',
    compactPlayerPause: 'Pausar',
    compactPlayerLaunch: 'Abrir Feishin',
    compactPlayerModalTitle: 'Reproductor Feishin Integrado',
    navidromeTitle: 'Consola Navidrome',
    navidromeDesc: 'Consola central para explorar tu catálogo, gestionar usuarios y organizar la biblioteca.',
    openNavidrome: 'Abrir Navidrome',
    externalClientsTitle: 'Conexión para Clientes Externos (OpenSubsonic)',
    externalClientsDesc: 'Introduce estos datos en cualquier app (Symfonium, Feishin Desktop, Amperfy, etc.) para sincronizar tu música:',
    serverAddress: 'Dirección del Servidor:',
    libraryUser: 'Usuario de Fonoteca:',
    password: 'Contraseña:',

    // Tab Tools
    systemComponentsTitle: 'Componentes del Sistema',
    systemComponentsDesc: 'Cada herramienta cumple un propósito específico para alimentar y reproducir tu colección.',
    portLabel: 'Puerto',
    pauseBtn: 'Pausar',
    startBtn: 'Iniciar',
    restartBtn: 'Reiniciar',
    viewLogsBtn: 'Ver registros',

    // Tab Storage
    storageOrgTitle: 'Organización de la Colección (/music)',
    storageOrgDesc: 'Para evitar que descargas incompletas generen canciones cortadas o etiquetas erróneas, tu música se clasifica en cuatro compartimentos independientes:',
    folderPersonalTitle: '/music/personal (Colección Propia / Manual)',
    folderPersonalDesc: 'Archivos de audio que subes o copias manualmente desde tu ordenador, vinilos ripeados o tu colección existente.',
    folderExploTitle: '/music/explo (Descubrimientos del Curador)',
    folderExploDesc: 'Canciones y listas añadidas automáticamente según tus gustos musicales.',
    folderSlskdTitle: '/music/slskd (Red Soulseek)',
    folderSlskdDesc: 'Pistas sueltas y álbumes directos de la comunidad de melómanos y coleccionistas.',
    folderTorrentsTitle: '/music/torrents (Discografías Completas)',
    folderTorrentsDesc: 'Álbumes enteros descargados y verificados. Los archivos temporales se mantienen aislados hasta el final.',
    tracksCount: 'pistas',
    mountedPath: 'Ruta montada:',
    syncNow: 'Sincronizar Fonoteca Ahora',
    syncing: 'Sincronizando...',
    syncSuccess: 'Sincronización completada con éxito',

    // Tab Apps
    playersTitle: 'Reproductores para Tus Dispositivos',
    playersDesc: 'Hostify funciona como tu servidor central compatible con el protocolo OpenSubsonic. Todas estas aplicaciones son clientes independientes diseñados para conectarse a tu misma fonoteca desde distintos dispositivos (móvil, coche, ordenador o equipo de audio) sin tener que duplicar tus archivos y manteniendo tus listas y carátulas unificadas.',
    connUrlLabel: 'URL de conexión para apps:',
    filterAll: 'Todos',
    filterDesktop: 'Ordenador',
    filterAndroid: 'Android',
    filterIos: 'iPhone / CarPlay',

    // Tab Remote
    remoteListenTitle: 'Escuchar Fuera de Casa',
    remoteListenDesc: 'Para reproducir en el coche o en la calle sin abrir puertos en tu router, te recomendamos conectar este equipo a tu red privada Tailscale.',
    tailscaleActive: 'Tailscale Activo',
    tailscaleInactive: 'Tailscale No Detectado',
    tailscaleReadyDesc: 'Tus aplicaciones pueden conectarse de forma segura utilizando tu IP de Tailscale.',
    tailscaleMissingDesc: 'Si deseas acceso móvil, instala la app de Tailscale en tu servidor y en tu teléfono. Se enlazarán de forma directa y cifrada.',
    customDomainTitle: 'Opción Avanzada: Dominio Web Propio',
    yourDomain: 'Tu Dominio (ej. musica.tu-dominio.com):',
    domainPlaceholder: 'musica.tu-dominio.com',
    caddyConfigTitle: 'Configuración Caddy (SSL Automático):',

    // Modals
    activityTitle: 'Actividad:',
    deployStateTitle: 'Estado de Inicialización',
    deployStateInProgress: 'Configurando servicios en segundo plano...',
    deployStateDone: 'Proceso finalizado',

    // Wizard
    wizardTitle: 'Configurar Fonoteca',
    wizardProgress: 'Paso {current} de 5 • Guarda automáticamente tu progreso.',
    stepLocation: 'Ubicación',
    stepAccount: 'Tu Cuenta',
    stepSources: 'Fuentes',
    stepMobility: 'Movilidad',
    stepConfirm: 'Confirmar',
    launchLibrary: 'Poner en marcha fonoteca',
    launchingLibrary: 'Inicializando fonoteca...',

    // Wizard Steps
    step1Title: '1. ¿Dónde se guardará tu música?',
    step1Desc: 'Hostify creará automáticamente cuatro compartimentos limpios (/personal, /explo, /slskd y /torrents) para que las descargas y tus subidas manuales no interfieran entre sí.',
    step1MusicLabel: 'Carpeta principal de música en tu equipo o NAS',
    step1MusicHint: 'Al continuar, Hostify preparará la estructura de subcarpetas en esta ruta.',
    step1DockerLabel: 'Carpeta de datos del sistema (Base de datos y configuraciones)',
    step1TimezoneLabel: 'Zona horaria de tu fonoteca',
    step1PermsToggle: 'Permisos del sistema (PUID: {puid}, PGID: {pgid}) — Automático',
    step1Hide: 'Ocultar',
    step1Adjust: 'Ajustar',

    step2Title: '2. Tu Cuenta de Música y Memoria de Escucha',
    step2Desc: 'Crea las credenciales maestras para escuchar música y vincular tus reproductores.',
    step2AdminUser: 'Usuario Administrador',
    step2Password: 'Contraseña',
    step2Show: 'Mostrar',
    step2Hide: 'Ocultar',
    step2StreamingPort: 'Puerto de Transmisión:',
    step2CustomPort: 'Puerto Personalizado',
    step2Change: 'Cambiar',
    step2LzTitle: 'Registrar historial en ListenBrainz (Opcional)',
    step2LzDesc: 'Guarda un diario de lo que escuchas para sugerirte recomendaciones afines.',
    step2LzToken: 'Token de Usuario',
    step2LzLink: 'Obtener token gratuito →',

    step3Title: '3. Fuentes para Alimentar tu Catálogo',
    step3Desc: 'Selecciona qué herramientas deseas activar para descubrir y añadir música:',
    step3ExploTitle: 'Curador Inteligente (Explo)',
    step3ExploDesc: 'Aprende de lo que escuchas, genera listas semanales personalizadas y solicita temas automáticamente.',
    step3SlskdTitle: 'Comunidad Soulseek (Slskd)',
    step3SlskdDesc: 'Descargas rápidas en alta fidelidad de coleccionistas y melómanos (FLAC, maquetas y vinilos).',
    step3LidarrTitle: 'Discografías Completas (Lidarr + Prowlarr + qBittorrent)',
    step3LidarrDesc: 'Supervisa álbumes enteros con carátulas oficiales, manteniendo las descargas temporales fuera de tu fonoteca.',

    step4Title: '4. Escuchar Fuera de Casa',
    step4Desc: 'Lleva tu fonoteca contigo en el coche, en el trabajo o de viaje.',
    step4TailscaleReady: 'Tu servidor ya está conectado a Tailscale. Podrás reproducir música de forma directa y cifrada sin abrir puertos en tu router.',
    step4LocalReadyTitle: 'Acceso en Red Local Listo (WiFi de Casa)',
    step4LocalReadyDesc: 'Disponible de inmediato en tu red doméstica:',
    step4TailscaleHint: '💡 Para escuchar en la calle sin abrir puertos, te recomendamos instalar Tailscale en este equipo cuando lo desees.',
    step4DomainToggleHide: 'Ocultar opción de dominio propio',
    step4DomainToggleShow: '¿Cuentas con un dominio web propio y certificado HTTPS?',

    step5Title: '5. Resumen de Tu Fonoteca',
    step5Desc: 'Revisa los parámetros antes de inicializar los componentes:',
    step5SummaryMusic: 'Ubicación de Música:',
    step5SummaryPort: 'Puerto de Transmisión:',
    step5SummaryUser: 'Usuario Administrador:',
    step5SummarySources: 'Fuentes Activas:',
    step5OnlyManual: 'Solo manual',

    // Directory Picker
    dirPickerTitle: 'Navega y selecciona la ubicación en el disco de tu servidor',
    dirPickerShortcuts: 'Atajos:',
    dirPickerWriteReady: 'Escritura lista',
    dirPickerReadOnly: 'Solo Lectura',
    dirPickerParent: '.. (Carpeta anterior)',
    dirPickerEmpty: 'Esta carpeta no contiene subdirectorios visibles.',
    dirPickerNewFolder: '+ Crear nueva carpeta aquí',
    dirPickerNewFolderPlaceholder: 'Nombre de la nueva carpeta (ej: music o datos)',
    dirPickerCreating: 'Creando...',
    dirPickerSelectedPath: 'Ruta seleccionada:',
    dirPickerSelectBtn: 'Seleccionar esta carpeta',
  },
  en: {
    // Brand & Common
    appName: 'Hostify',
    tagline: 'High-Fidelity Personal Music Cloud',
    footerText: 'Hostify • Your high-fidelity personal music cloud | Powered by Navidrome & OpenSubsonic ecosystem',
    online: 'Online',
    offline: 'Offline',
    engineStopped: 'Engine stopped',
    loadingCollection: 'Loading your music collection...',
    copy: 'Copy',
    copied: 'Copied',
    close: 'Close',
    cancel: 'Cancel',
    continue: 'Continue',
    back: 'Back',
    create: 'Create',
    retry: 'Retry',
    updating: 'Updating...',
    preparing: 'Preparing...',
    save: 'Save',
    browse: 'Browse...',
    active: 'Active',
    paused: 'Paused',
    notInstalled: 'Not installed',

    // Navbar
    runWizard: 'Run Setup Wizard',
    runWizardTooltip: 'Run the step-by-step setup wizard again',
    settings: 'Settings',
    backToDashboard: 'Back to Dashboard',
    cancelWizard: 'Exit wizard',

    // Engine alert
    engineDownTitle: 'The server engine is stopped.',
    engineDownDesc: 'Start Docker Desktop or Colima to play music or manage your collection.',
    engineDownWizard: 'Start Colima or Docker Desktop to deploy your music library.',

    // Tabs
    tabListen: 'Listen',
    tabTools: 'Tools & Sources',
    tabStorage: 'Storage',
    tabApps: 'Applications',
    tabRemote: 'Remote Access',

    // Dashboard Header
    libraryTitle: 'Personal Music Library',
    tracksIndexed: 'tracks indexed',
    loadingCatalog: 'Loading catalog',
    toolsOnline: 'tools online',
    startComponents: 'Start components',
    refresh: 'Refresh',
    updateLibrary: 'Update Library',
    updatingLibrary: 'Updating library...',
    libraryUpdated: 'Library updated',

    // Tab Listen - Widget de Colección y Curador
    libraryWidgetTitle: 'Collection & Discovery',
    totalTracksLabel: 'Songs in library',
    totalTracksHint: 'Indexed tracks in Navidrome',
    sourcePersonal: 'Personal',
    sourceExplo: 'Explo Curator',
    sourceSlskd: 'Soulseek P2P',
    sourceTorrents: 'Torrents',
    exploWidgetTitle: 'Explo • Smart Curator',
    exploWidgetDesc: 'Learns from your listening habits, generates automated discovery playlists, and downloads new music.',
    openExploBtn: 'Search tracks in Explo',
    startExploBtn: 'Start Explo',
    slskdWidgetTitle: 'Slskd • Soulseek P2P Network',
    slskdWidgetDesc: 'Search and download individual tracks or complete albums directly from the music collector P2P network.',
    openSlskdBtn: 'Search tracks in Slskd',
    startSlskdBtn: 'Start Slskd',
    syncLibraryShort: 'Sync now',
    openWebUI: 'Open Web UI',

    // Tab Listen
    webRoomsTitle: 'Browser Listening Rooms',
    webRoomsDesc: 'Stream instantly without installing anything on your device.',
    feishinWebTitle: 'Feishin Web Room',
    feishinWebDesc: 'Smooth Spotify-like experience with synced live lyrics and lossless audio playback.',
    openFeishinWeb: 'Open Feishin Web',
    feishinWidgetTitle: 'Feishin Web Player',
    feishinWidgetDesc: 'Embedded dashboard player to listen to your music right away.',
    feishinWidgetOpenNewTab: 'Open full Feishin',
    feishinWidgetToggleHide: 'Hide player',
    feishinWidgetToggleShow: 'Show embedded player',
    feishinWidgetOffline: 'Feishin player service is paused or stopped.',
    compactPlayerReady: 'Library online • Ready to play',
    compactPlayerHint: 'Open Feishin or your OpenSubsonic client to start playing',
    compactPlayerPlaying: 'Now Playing',
    compactPlayerFrom: 'via',
    compactPlayerPlay: 'Play',
    compactPlayerPause: 'Pause',
    compactPlayerLaunch: 'Open Feishin',
    compactPlayerModalTitle: 'Embedded Feishin Player',
    navidromeTitle: 'Navidrome Console',
    navidromeDesc: 'Central hub to explore your catalog, manage user accounts, and organize tags.',
    openNavidrome: 'Open Navidrome',
    externalClientsTitle: 'External Players Connection (OpenSubsonic)',
    externalClientsDesc: 'Enter these details into any third-party player (Symfonium, Feishin Desktop, SubSonify, Amperfy) to sync your music:',
    serverAddress: 'Server URL:',
    libraryUser: 'Library Username:',
    password: 'Password:',

    // Tab Tools
    systemComponentsTitle: 'System Components',
    systemComponentsDesc: 'Each tool serves a dedicated purpose to feed and broadcast your music collection.',
    portLabel: 'Port',
    pauseBtn: 'Pause',
    startBtn: 'Start',
    restartBtn: 'Restart',
    viewLogsBtn: 'View logs',

    // Tab Storage
    storageOrgTitle: 'Collection Layout (/music)',
    storageOrgDesc: 'To ensure tag scanner stability and prevent partial downloads from polluting your library, files are organized into four segregated directories:',
    folderPersonalTitle: '/music/personal (Personal / Manual Uploads)',
    folderPersonalDesc: 'Audio files you upload or copy manually from your computer, CD/vinyl rips, or existing library.',
    folderExploTitle: '/music/explo (Curator Discoveries)',
    folderExploDesc: 'Tracks and discovery playlists fetched automatically matching your taste.',
    folderSlskdTitle: '/music/slskd (Soulseek Network)',
    folderSlskdDesc: 'Lossless tracks and rare community vinyl rips directly from collectors.',
    folderTorrentsTitle: '/music/torrents (Full Discographies)',
    folderTorrentsDesc: 'Complete verified albums. Active download scratch buffers stay completely isolated until done.',
    tracksCount: 'tracks',
    mountedPath: 'Mounted path:',
    syncNow: 'Sync Library Now',
    syncing: 'Syncing...',
    syncSuccess: 'Library synced successfully',

    // Tab Apps
    playersTitle: 'Players for All Your Devices',
    playersDesc: 'Hostify acts as your central music server compatible with the OpenSubsonic protocol. All these players are independent client apps designed to connect to your single unified library from your phone, car, desktop, or Hi-Fi setup without duplicating audio files.',
    connUrlLabel: 'Connection URL for apps:',
    filterAll: 'All',
    filterDesktop: 'Desktop',
    filterAndroid: 'Android',
    filterIos: 'iPhone / CarPlay',

    // Tab Remote
    remoteListenTitle: 'Listen On The Go',
    remoteListenDesc: 'To stream in your car or while traveling without opening router ports, connect your host to your private Tailscale network.',
    tailscaleActive: 'Tailscale Active',
    tailscaleInactive: 'Tailscale Not Detected',
    tailscaleReadyDesc: 'Your player apps can securely connect on mobile using your Tailscale IP.',
    tailscaleMissingDesc: 'For mobile access on the go, install Tailscale on this host and on your phone for an encrypted peer-to-peer connection.',
    customDomainTitle: 'Advanced Option: Custom Web Domain',
    yourDomain: 'Your Domain (e.g. music.your-domain.com):',
    domainPlaceholder: 'music.your-domain.com',
    caddyConfigTitle: 'Caddy Configuration (Automatic SSL):',

    // Modals
    activityTitle: 'Activity:',
    deployStateTitle: 'Initialization Status',
    deployStateInProgress: 'Configuring services in the background...',
    deployStateDone: 'Process finished',

    // Wizard
    wizardTitle: 'Setup Music Library',
    wizardProgress: 'Step {current} of 5 • Automatically saves your progress.',
    stepLocation: 'Location',
    stepAccount: 'Your Account',
    stepSources: 'Sources',
    stepMobility: 'Mobility',
    stepConfirm: 'Review',
    launchLibrary: 'Deploy Music Library',
    launchingLibrary: 'Starting components...',

    // Wizard Steps
    step1Title: '1. Where will your music be stored?',
    step1Desc: 'Hostify will automatically create four clean compartments (/personal, /explo, /slskd, and /torrents) so background downloads and manual uploads never interfere with each other.',
    step1MusicLabel: 'Primary music folder on your host or NAS',
    step1MusicHint: 'Hostify will prepare the folder layout inside this directory.',
    step1DockerLabel: 'App data folder (Databases and configuration files)',
    step1TimezoneLabel: 'Library timezone',
    step1PermsToggle: 'System permissions (PUID: {puid}, PGID: {pgid}) — Automatic',
    step1Hide: 'Hide',
    step1Adjust: 'Adjust',

    step2Title: '2. Your Music Account & Playback Memory',
    step2Desc: 'Set up your master credentials to stream music and link your client applications.',
    step2AdminUser: 'Admin Username',
    step2Password: 'Password',
    step2Show: 'Show',
    step2Hide: 'Hide',
    step2StreamingPort: 'Streaming Port:',
    step2CustomPort: 'Custom Port',
    step2Change: 'Change',
    step2LzTitle: 'Log listening history to ListenBrainz (Optional)',
    step2LzDesc: 'Keeps a diary of everything you listen to and powers smart music recommendations.',
    step2LzToken: 'User Token',
    step2LzLink: 'Get free token →',

    step3Title: '3. Music Sources & Providers',
    step3Desc: 'Choose which automated tools you want enabled to discover and acquire tracks:',
    step3ExploTitle: 'Smart Curator (Explo)',
    step3ExploDesc: 'Learns from your listening habits, generates personalized weekly playlists, and automatically queues relevant tracks.',
    step3SlskdTitle: 'Soulseek Community (Slskd)',
    step3SlskdDesc: 'Direct high-fidelity downloads from music collectors and audiophiles (FLAC, vinyl rips, and rare demos).',
    step3LidarrTitle: 'Complete Discographies (Lidarr + Prowlarr + qBittorrent)',
    step3LidarrDesc: 'Monitors artist catalogs with official artwork, keeping active torrent buffers completely separated.',

    step4Title: '4. Remote Access & Mobility',
    step4Desc: 'Take your library with you in your car, at work, or while traveling.',
    step4TailscaleReady: 'Your server is already linked to Tailscale. You can stream directly and securely without opening any router ports.',
    step4LocalReadyTitle: 'Local Network Access Ready (Home WiFi)',
    step4LocalReadyDesc: 'Instantly accessible on your home network:',
    step4TailscaleHint: '💡 To listen anywhere outside your home without port forwarding, we recommend installing Tailscale on this host.',
    step4DomainToggleHide: 'Hide custom domain option',
    step4DomainToggleShow: 'Do you have a custom web domain with an HTTPS certificate?',

    step5Title: '5. Library Summary',
    step5Desc: 'Review parameters before starting the services:',
    step5SummaryMusic: 'Music Location:',
    step5SummaryPort: 'Streaming Port:',
    step5SummaryUser: 'Admin User:',
    step5SummarySources: 'Active Sources:',
    step5OnlyManual: 'Manual only',

    // Directory Picker
    dirPickerTitle: 'Browse and select the directory on your server disk',
    dirPickerShortcuts: 'Shortcuts:',
    dirPickerWriteReady: 'Write ready',
    dirPickerReadOnly: 'Read only',
    dirPickerParent: '.. (Parent directory)',
    dirPickerEmpty: 'This directory has no visible subfolders.',
    dirPickerNewFolder: '+ Create new folder here',
    dirPickerNewFolderPlaceholder: 'New folder name (e.g. music or data)',
    dirPickerCreating: 'Creating...',
    dirPickerSelectedPath: 'Selected path:',
    dirPickerSelectBtn: 'Select this directory',
  }
};

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: keyof typeof translations.es, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

const STORAGE_LANG_KEY = 'hostify_lang_v1';

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LANG_KEY);
      if (saved === 'es' || saved === 'en') return saved;
      const navLang = navigator.language.toLowerCase();
      if (navLang.startsWith('es')) return 'es';
    } catch {
      // Ignore localStorage errors
    }
    return 'en';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem(STORAGE_LANG_KEY, newLang);
    } catch {
      // Ignore
    }
  };

  const t = (key: keyof typeof translations.es, params?: Record<string, string | number>): string => {
    const dict = translations[lang] || translations.en;
    let str = (dict as any)[key] || (translations.es as any)[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return str;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
};

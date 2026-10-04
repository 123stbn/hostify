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
    compactPlayerLaunch: 'Abrir Feishin Web Player',
    bitPerfectDirect: 'BIT-PERFECT DIRECT',
    alsaDirectBuffer: 'ALSA Direct: Zero Buffer Jitter (0.01ms)',
    playerStatePlaying: 'BIT-PERFECT DIRECT',
    playerStatePaused: 'PAUSADO',
    playerStateStandby: 'EN ESPERA',
    playerBufferPlaying: 'ALSA Direct: Zero Buffer Jitter (0.01ms)',
    playerBufferPaused: 'En pausa • Buffer de audio en reposo',
    playerBufferStandby: 'En espera • Abre Feishin para reproducir',
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
    wizardProgress: 'Paso {current} de 6 • Guarda automáticamente tu progreso.',
    stepLicense: 'Bienvenida',
    stepLocation: 'Ubicación',
    stepAccount: 'Tu Cuenta',
    stepSources: 'Fuentes',
    stepMobility: 'Movilidad',
    stepConfirm: 'Confirmar',
    launchLibrary: 'Poner en marcha fonoteca',
    launchingLibrary: 'Inicializando fonoteca...',

    // Wizard Steps
    step1Title: '1. Bienvenido a Hostify',
    step1Desc: 'Hostify es una plataforma de streaming y gestión musical 100% de código abierto (Open Source). Tu música, tu servidor, tus reglas.',
    step1OpenSourceBadge: '100% Código Abierto & Sin Restricciones',
    step1OpenSourceDesc: 'Todas las capacidades, streaming en alta fidelidad (FLAC/Opus/MP3), transcodificación, scrobbling y módulos de ingesta están completamente desbloqueados y bajo tu control.',
    step1DiagnosticTitle: 'Diagnóstico del Entorno',
    step1DiagnosticDesc: 'El motor de contenedores y los permisos del host están listos para inicializar tu fonoteca privada.',

    step2Title: '2. ¿Dónde se guardará tu música?',
    step2Desc: 'Hostify creará automáticamente cuatro compartimentos limpios (/personal, /explo, /slskd y /torrents) para que las descargas y tus subidas manuales no interfieran entre sí.',
    step2MusicLabel: 'Carpeta principal de música en tu equipo o NAS',
    step2MusicHint: 'Al continuar, Hostify preparará la estructura de subcarpetas en esta ruta.',
    step2DockerLabel: 'Carpeta de datos del sistema (Base de datos y configuraciones)',
    step2TimezoneLabel: 'Zona horaria de tu fonoteca',
    step2PermsToggle: 'Permisos del sistema (PUID: {puid}, PGID: {pgid}) — Automático',
    step2Hide: 'Ocultar',
    step2Adjust: 'Ajustar',

    step3Title: '3. Tu Cuenta de Música y Memoria de Escucha',
    step3Desc: 'Crea las credenciales maestras para escuchar música y vincular tus reproductores.',
    step3AdminUser: 'Usuario Administrador',
    step3Password: 'Contraseña',
    step3Show: 'Mostrar',
    step3Hide: 'Ocultar',
    step3StreamingPort: 'Puerto Gateway Hostify:',
    step3CustomPort: 'Puerto Personalizado',
    step3Change: 'Cambiar',
    step3LzTitle: 'Registrar historial en ListenBrainz (Opcional)',
    step3LzDesc: 'Guarda un diario de lo que escuchas para sugerirte recomendaciones afines.',
    step3LzToken: 'Token de Usuario',
    step3LzLink: 'Obtener token gratuito →',

    step4Title: '4. Fuentes para Alimentar tu Catálogo',
    step4Desc: 'Selecciona qué herramientas deseas activar para descubrir y añadir música:',
    step4ExploTitle: 'Curador Inteligente (Explo)',
    step4ExploDesc: 'Aprende de lo que escuchas, genera listas semanales personalizadas y solicita temas automáticamente.',
    step4SlskdTitle: 'Comunidad Soulseek (Slskd)',
    step4SlskdDesc: 'Descargas rápidas en alta fidelidad de coleccionistas y melómanos (FLAC, maquetas y vinilos).',
    step4LidarrTitle: 'Discografías Completas (Lidarr + Prowlarr + qBittorrent)',
    step4LidarrDesc: 'Supervisa álbumes enteros con carátulas oficiales. Incluye indexadores públicos de música auto-configurados (The Pirate Bay, Nyaa.si y LimeTorrents) y mantiene las descargas temporales fuera de tu fonoteca.',

    step5Title: '5. Escuchar Fuera de Casa',
    step5Desc: 'Lleva tu fonoteca contigo en el coche, en el trabajo o de viaje.',
    step5TailscaleReady: 'Tu servidor ya está conectado a Tailscale. Podrás reproducir música de forma directa y cifrada sin abrir puertos en tu router.',
    step5LocalReadyTitle: 'Acceso en Red Local Listo (WiFi de Casa)',
    step5LocalReadyDesc: 'Disponible de inmediato en tu red doméstica:',
    step5TailscaleHint: '💡 Para escuchar en la calle sin abrir puertos, te recomendamos instalar Tailscale en este equipo cuando lo desees.',
    step5DomainToggleHide: 'Ocultar opción de dominio propio',
    step5DomainToggleShow: '¿Cuentas con un dominio web propio y certificado HTTPS?',

    step6Title: '6. Resumen de Tu Fonoteca',
    step6Desc: 'Revisa los parámetros antes de inicializar los componentes:',
    step6SummaryMusic: 'Ubicación de Música:',
    step6SummaryPort: 'Puerto Gateway Hostify:',
    step6SummaryUser: 'Usuario Administrador:',
    step6SummarySources: 'Fuentes Activas:',
    step6OnlyManual: 'Solo manual',

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

    // Licensing
    licenseTitle: 'Licencia Hostify',
    licensePro: 'Licencia Pro',
    licenseLifetime: 'Licencia Vitalicia',
    licenseTrial: 'Prueba gratuita',
    licenseExpired: 'Prueba expirada',
    trialRemaining: '{days}d de prueba',
    activateLicense: 'Activar licencia',
    enterLicenseKey: 'Ingresa tu clave de licencia',
    licenseKeyPlaceholder: 'HSTF_...',
    activating: 'Validando...',
    activationSuccess: 'Licencia activada con éxito',
    activationError: 'Error al activar la licencia',
    licensedTo: 'Licenciado a',
    dockerReady: 'Docker listo',
    unlicensed: 'Sin activar',
    licenseModalDesc: 'Desbloquea todas las funciones de Hostify de forma permanente con tu clave de licencia criptográfica.',
    deployModalTitle: 'Desplegando tu Fonoteca',
    deployModalSubtitle: 'Construyendo imágenes y levantando servicios en Docker...',
    deploySuccessTitle: '¡Todo listo! Fonoteca Desplegada',
    deploySuccessSubtitle: 'Todos los servicios se encuentran en ejecución y listos para usar.',
    deployErrorTitle: 'Error en el Despliegue',
    deployErrorSubtitle: 'Ocurrió un error al desplegar algunos servicios. Puedes reintentar o continuar.',
    goToDashboard: 'Comenzar a usar Hostify',
    continueAnyway: 'Continuar al panel de todos modos',
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
    compactPlayerLaunch: 'Open Feishin Web Player',
    bitPerfectDirect: 'BIT-PERFECT DIRECT',
    alsaDirectBuffer: 'ALSA Direct: Zero Buffer Jitter (0.01ms)',
    playerStatePlaying: 'BIT-PERFECT DIRECT',
    playerStatePaused: 'PAUSED',
    playerStateStandby: 'STANDBY',
    playerBufferPlaying: 'ALSA Direct: Zero Buffer Jitter (0.01ms)',
    playerBufferPaused: 'Paused • Audio buffer idle',
    playerBufferStandby: 'Standby • Open Feishin to play',
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
    wizardProgress: 'Step {current} of 6 • Automatically saves your progress.',
    stepLicense: 'Welcome',
    stepLocation: 'Location',
    stepAccount: 'Your Account',
    stepSources: 'Sources',
    stepMobility: 'Mobility',
    stepConfirm: 'Review',
    launchLibrary: 'Deploy Music Library',
    launchingLibrary: 'Starting components...',

    // Wizard Steps
    step1Title: '1. Welcome to Hostify',
    step1Desc: 'Hostify is a 100% open-source personal music streaming cloud and manager. Your music, your server, your rules.',
    step1OpenSourceBadge: '100% Open Source & Unrestricted',
    step1OpenSourceDesc: 'All capabilities, high-fidelity streaming (FLAC/Opus/MP3), transcoding, scrobbling, and ingestion modules are fully unlocked and under your control.',
    step1DiagnosticTitle: 'Environment Readiness',
    step1DiagnosticDesc: 'The container engine and host permissions are ready to initialize your private music cloud.',

    step2Title: '2. Where will your music be stored?',
    step2Desc: 'Hostify will automatically create four clean compartments (/personal, /explo, /slskd, and /torrents) so background downloads and manual uploads never interfere with each other.',
    step2MusicLabel: 'Primary music folder on your host or NAS',
    step2MusicHint: 'Hostify will prepare the folder layout inside this directory.',
    step2DockerLabel: 'App data folder (Databases and configuration files)',
    step2TimezoneLabel: 'Library timezone',
    step2PermsToggle: 'System permissions (PUID: {puid}, PGID: {pgid}) — Automatic',
    step2Hide: 'Hide',
    step2Adjust: 'Adjust',

    step3Title: '3. Your Music Account & Playback Memory',
    step3Desc: 'Set up your master credentials to stream music and link your client applications.',
    step3AdminUser: 'Admin Username',
    step3Password: 'Password',
    step3Show: 'Show',
    step3Hide: 'Hide',
    step3StreamingPort: 'Hostify Gateway Port:',
    step3CustomPort: 'Custom Port',
    step3Change: 'Change',
    step3LzTitle: 'Log listening history to ListenBrainz (Optional)',
    step3LzDesc: 'Keeps a diary of everything you listen to and powers smart music recommendations.',
    step3LzToken: 'User Token',
    step3LzLink: 'Get free token →',

    step4Title: '4. Music Sources & Providers',
    step4Desc: 'Choose which automated tools you want enabled to discover and acquire tracks:',
    step4ExploTitle: 'Smart Curator (Explo)',
    step4ExploDesc: 'Learns from your listening habits, generates personalized weekly playlists, and automatically queues relevant tracks.',
    step4SlskdTitle: 'Soulseek Community (Slskd)',
    step4SlskdDesc: 'Direct high-fidelity downloads from music collectors and audiophiles (FLAC, vinyl rips, and rare demos).',
    step4LidarrTitle: 'Complete Discographies (Lidarr + Prowlarr + qBittorrent)',
    step4LidarrDesc: 'Monitors artist catalogs with official artwork. Comes with pre-configured public music indexers (The Pirate Bay, Nyaa.si, and LimeTorrents) and keeps active torrent buffers completely separated.',

    step5Title: '5. Remote Access & Mobility',
    step5Desc: 'Take your library with you in your car, at work, or while traveling.',
    step5TailscaleReady: 'Your server is already linked to Tailscale. You can stream directly and securely without opening any router ports.',
    step5LocalReadyTitle: 'Local Network Access Ready (Home WiFi)',
    step5LocalReadyDesc: 'Instantly accessible on your home network:',
    step5TailscaleHint: '💡 To listen anywhere outside your home without port forwarding, we recommend installing Tailscale on this host.',
    step5DomainToggleHide: 'Hide custom domain option',
    step5DomainToggleShow: 'Do you have a custom web domain with an HTTPS certificate?',

    step6Title: '6. Library Summary',
    step6Desc: 'Review parameters before starting the services:',
    step6SummaryMusic: 'Music Location:',
    step6SummaryPort: 'Hostify Gateway Port:',
    step6SummaryUser: 'Admin User:',
    step6SummarySources: 'Active Sources:',
    step6OnlyManual: 'Manual only',

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

    // Licensing
    licenseTitle: 'Hostify License',
    licensePro: 'Pro License',
    licenseLifetime: 'Lifetime License',
    licenseTrial: 'Free Trial',
    licenseExpired: 'Trial Expired',
    trialRemaining: '{days}d trial left',
    activateLicense: 'Activate License',
    enterLicenseKey: 'Enter your license key',
    licenseKeyPlaceholder: 'HSTF_...',
    activating: 'Validating...',
    activationSuccess: 'License activated successfully',
    activationError: 'Failed to activate license',
    licensedTo: 'Licensed to',
    dockerReady: 'Docker Ready',
    unlicensed: 'Unlicensed',
    licenseModalDesc: 'Unlock all Hostify features permanently with your cryptographic license key.',
    deployModalTitle: 'Deploying your Music Cloud',
    deployModalSubtitle: 'Building images and starting services in Docker...',
    deploySuccessTitle: 'All Ready! Music Cloud Deployed',
    deploySuccessSubtitle: 'All services are running and ready for use.',
    deployErrorTitle: 'Deployment Error',
    deployErrorSubtitle: 'An issue occurred while deploying services. You can retry or continue.',
    goToDashboard: 'Start using Hostify',
    continueAnyway: 'Continue to Dashboard anyway',
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

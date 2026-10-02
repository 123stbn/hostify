import React, { useState } from 'react';
import {
  HardDrive, Music, Radio, Shield, Globe,
  ArrowRight, ArrowLeft, Check, AlertCircle,
  Layers, DownloadCloud, CheckCircle2, Server, FolderSearch,
  Clock, Sliders, Lightbulb, ShieldCheck, ExternalLink, Loader2, RotateCcw, Disc3, Sparkles,
  LayoutDashboard
} from 'lucide-react';
import { AppStatus } from '../types.js';
import { DirectoryPickerModal } from './DirectoryPickerModal.js';
import { useI18n } from '../i18n.js';

const DRAFT_STORAGE_KEY = 'hostify_wizard_draft_v1';

function loadWizardDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('No se pudo cargar el borrador de localStorage', err);
  }
  return null;
}

const TIMEZONE_GROUPS = [
  {
    group: 'América del Sur',
    zones: [
      { id: 'America/Lima', label: 'Lima (GMT-5) - Perú' },
      { id: 'America/Bogota', label: 'Bogotá (GMT-5) - Colombia' },
      { id: 'America/Santiago', label: 'Santiago (GMT-3/4) - Chile' },
      { id: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (GMT-3) - Argentina' },
      { id: 'America/Caracas', label: 'Caracas (GMT-4) - Venezuela' },
      { id: 'America/Guayaquil', label: 'Guayaquil (GMT-5) - Ecuador' },
      { id: 'America/Montevideo', label: 'Montevideo (GMT-3) - Uruguay' },
      { id: 'America/La_Paz', label: 'La Paz (GMT-4) - Bolivia' },
      { id: 'America/Asuncion', label: 'Asunción (GMT-3/4) - Paraguay' },
      { id: 'America/Sao_Paulo', label: 'São Paulo (GMT-3) - Brasil' },
    ],
  },
  {
    group: 'América Central y México',
    zones: [
      { id: 'America/Mexico_City', label: 'Ciudad de México (GMT-6) - México' },
      { id: 'America/Monterrey', label: 'Monterrey (GMT-6) - México' },
      { id: 'America/Tijuana', label: 'Tijuana (GMT-8) - México' },
      { id: 'America/Panama', label: 'Panamá (GMT-5) - Panamá' },
      { id: 'America/Costa_Rica', label: 'San José (GMT-6) - Costa Rica' },
      { id: 'America/Guatemala', label: 'Guatemala (GMT-6) - Guatemala' },
      { id: 'America/Santo_Domingo', label: 'Santo Domingo (GMT-4) - Rep. Dominicana' },
    ],
  },
  {
    group: 'Norteamérica',
    zones: [
      { id: 'America/New_York', label: 'New York (Eastern) - EE.UU.' },
      { id: 'America/Chicago', label: 'Chicago (Central) - EE.UU.' },
      { id: 'America/Denver', label: 'Denver (Mountain) - EE.UU.' },
      { id: 'America/Los_Angeles', label: 'Los Angeles (Pacific) - EE.UU.' },
      { id: 'America/Toronto', label: 'Toronto - Canadá' },
    ],
  },
  {
    group: 'Europa',
    zones: [
      { id: 'Europe/Madrid', label: 'Madrid (CET/CEST) - España' },
      { id: 'Europe/London', label: 'Londres (GMT/BST) - Reino Unido' },
      { id: 'Europe/Paris', label: 'París (CET/CEST) - Francia' },
      { id: 'Europe/Berlin', label: 'Berlín (CET/CEST) - Alemania' },
      { id: 'Europe/Rome', label: 'Roma (CET/CEST) - Italia' },
      { id: 'Europe/Lisbon', label: 'Lisboa (WET/WEST) - Portugal' },
    ],
  },
  {
    group: 'Otros Estándares',
    zones: [
      { id: 'UTC', label: 'UTC (Tiempo Universal Coordinado)' },
      { id: 'Asia/Tokyo', label: 'Tokio (JST) - Japón' },
      { id: 'Australia/Sydney', label: 'Sídney (AEST) - Australia' },
    ],
  },
];

interface SetupWizardProps {
  status: AppStatus | null;
  onComplete: () => void;
  onCancel?: () => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ status, onComplete, onCancel }) => {
  const { lang, t } = useI18n();
  const isEn = lang === 'en';
  const draft = loadWizardDraft();

  const [currentStep, setCurrentStep] = useState<number>(() => {
    if (draft?.currentStep && draft.currentStep >= 1 && draft.currentStep <= 5) {
      return draft.currentStep;
    }
    return 1;
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Picker Modal State
  const [pickerConfig, setPickerConfig] = useState<{
    isOpen: boolean;
    target: 'music' | 'docker' | null;
    title: string;
    initialPath: string;
  }>({
    isOpen: false,
    target: null,
    title: '',
    initialPath: '',
  });

  // Form State
  const [musicRoot, setMusicRoot] = useState<string>(draft?.musicRoot ?? (status?.musicRoot || '/volume1/music'));
  const [dockerData, setDockerData] = useState<string>(draft?.dockerData ?? (status?.dockerData || '/volume1/docker'));
  const [puid, setPuid] = useState<string>(draft?.puid ?? (status?.detectedPuid || '1000'));
  const [pgid, setPgid] = useState<string>(draft?.pgid ?? (status?.detectedPgid || '10'));
  const [tz, setTz] = useState<string>(draft?.tz ?? (status?.detectedTz || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Lima'));
  const [showAdvancedPerms, setShowAdvancedPerms] = useState(false);

  // Streaming & Scrobbling
  const [navidromePort, setNavidromePort] = useState<string>(draft?.navidromePort ?? (status?.navidromePort || '4533'));
  const [navidromeAdminUser, setNavidromeAdminUser] = useState<string>(draft?.navidromeAdminUser ?? (status?.navidromeAdminUser || 'admin'));
  const [navidromeAdminPassword, setNavidromeAdminPassword] = useState<string>(draft?.navidromeAdminPassword ?? (status?.navidromeAdminPassword || 'admin'));
  const [showAdminPassword, setShowAdminPassword] = useState<boolean>(false);
  const [showAdvancedNetwork, setShowAdvancedNetwork] = useState(false);
  const [enableListenBrainz, setEnableListenBrainz] = useState<boolean>(draft?.enableListenBrainz ?? (status?.enableListenBrainz ?? true));
  const [listenBrainzUser, setListenBrainzUser] = useState<string>(draft?.listenBrainzUser ?? (status?.listenBrainzUser || ''));
  const [listenBrainzToken, setListenBrainzToken] = useState<string>(draft?.listenBrainzToken ?? (status?.listenBrainzToken || ''));
  const [tokenValidStatus, setTokenValidStatus] = useState<string | null>(null);
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [tokenValidationState, setTokenValidationState] = useState<'idle' | 'loading' | 'valid' | 'invalid'>('idle');

  // Fuentes de música
  const [modules, setModules] = useState<{
    explo: boolean;
    slskd: boolean;
    qbittorrent: boolean;
    prowlarr: boolean;
    lidarr: boolean;
  }>(() => {
    const raw = draft?.modules ?? status?.modules ?? {
      explo: true,
      slskd: true,
      qbittorrent: true,
      prowlarr: true,
      lidarr: true,
    };
    if (!raw.explo) {
      return {
        explo: false,
        slskd: false,
        qbittorrent: false,
        prowlarr: false,
        lidarr: false,
      };
    }
    if (!raw.slskd && !raw.lidarr) {
      return {
        explo: true,
        slskd: true,
        lidarr: true,
        qbittorrent: true,
        prowlarr: true,
      };
    }
    return raw;
  });

  // Acceso remoto
  const [remoteMode, setRemoteMode] = useState<'local' | 'tailscale' | 'proxy'>(
    draft?.remoteAccess ?? (status?.tailscaleDetected ? 'tailscale' : 'local')
  );
  const [domain, setDomain] = useState<string>(draft?.domain ?? (status?.domain || ''));

  // Autoguardado
  React.useEffect(() => {
    try {
      const stateToSave = {
        currentStep,
        musicRoot,
        dockerData,
        puid,
        pgid,
        tz,
        navidromePort,
        navidromeAdminUser,
        navidromeAdminPassword,
        enableListenBrainz,
        listenBrainzUser,
        listenBrainzToken,
        modules,
        remoteAccess: remoteMode,
        domain,
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (err) {
      console.warn('Error guardando borrador:', err);
    }
  }, [
    currentStep, musicRoot, dockerData, puid, pgid, tz,
    navidromePort, navidromeAdminUser, navidromeAdminPassword,
    enableListenBrainz, listenBrainzUser, listenBrainzToken,
    modules, remoteMode, domain
  ]);

  const handleResetDraft = () => {
    if (window.confirm('¿Deseas reiniciar los campos del asistente al valor predeterminado?')) {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setCurrentStep(1);
      setMusicRoot(status?.musicRoot || '/volume1/music');
      setDockerData(status?.dockerData || '/volume1/docker');
      setPuid(status?.detectedPuid || '1000');
      setPgid(status?.detectedPgid || '10');
      setTz(status?.detectedTz || 'America/Lima');
      setNavidromePort(status?.navidromePort || '4533');
      setNavidromeAdminUser('admin');
      setNavidromeAdminPassword('admin');
      setEnableListenBrainz(true);
      setListenBrainzUser('');
      setListenBrainzToken('');
      setModules({
        explo: true,
        slskd: true,
        qbittorrent: true,
        prowlarr: true,
        lidarr: true,
      });
      setRemoteMode(status?.tailscaleDetected ? 'tailscale' : 'local');
      setDomain(status?.domain || '');
      setErrorMsg('');
    }
  };

  const openPicker = (target: 'music' | 'docker') => {
    if (target === 'music') {
      setPickerConfig({
        isOpen: true,
        target: 'music',
        title: 'Seleccionar Carpeta para Tu Fonoteca (/music)',
        initialPath: musicRoot || '/volume1/music',
      });
    } else {
      setPickerConfig({
        isOpen: true,
        target: 'docker',
        title: 'Seleccionar Carpeta de Datos del Sistema (/docker)',
        initialPath: dockerData || '/volume1/docker',
      });
    }
  };

  const handleSelectPath = (selectedPath: string) => {
    if (pickerConfig.target === 'music') {
      setMusicRoot(selectedPath);
    } else if (pickerConfig.target === 'docker') {
      setDockerData(selectedPath);
    }
  };

  const toggleModule = (key: keyof typeof modules) => {
    setErrorMsg('');
    if (key === 'explo') {
      const nextExplo = !modules.explo;
      if (!nextExplo) {
        setModules({
          explo: false,
          slskd: false,
          lidarr: false,
          qbittorrent: false,
          prowlarr: false,
        });
      } else {
        setModules({
          explo: true,
          slskd: true,
          lidarr: true,
          qbittorrent: true,
          prowlarr: true,
        });
      }
      return;
    }

    if (key === 'slskd') {
      if (!modules.explo) {
        setModules(prev => ({ ...prev, explo: true, slskd: true }));
        return;
      }
      if (modules.slskd && !modules.lidarr) {
        setErrorMsg('Es necesario mantener al menos una fuente de música activa mientras el curador esté encendido.');
        return;
      }
      setModules(prev => ({ ...prev, slskd: !prev.slskd }));
      return;
    }

    if (key === 'lidarr' || key === 'qbittorrent' || key === 'prowlarr') {
      if (!modules.explo) {
        setModules(prev => ({
          ...prev,
          explo: true,
          lidarr: true,
          qbittorrent: true,
          prowlarr: true,
        }));
        return;
      }
      if (modules.lidarr && !modules.slskd) {
        setErrorMsg('Es necesario mantener al menos una fuente de música activa mientras el curador esté encendido.');
        return;
      }
      const next = !modules.lidarr;
      setModules(prev => ({
        ...prev,
        lidarr: next,
        qbittorrent: next,
        prowlarr: next,
      }));
      return;
    }
  };

  const handleTestToken = async () => {
    if (!listenBrainzToken.trim()) return;
    setIsValidatingToken(true);
    setTokenValidationState('loading');
    setTokenValidStatus('Verificando token...');
    try {
      const res = await fetch('/api/validate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: listenBrainzToken.trim() })
      });
      const data = await res.json();
      if (data.valid) {
        setTokenValidationState('valid');
        setTokenValidStatus(`Token Válido (Usuario: ${data.userName || listenBrainzUser || 'Correcto'})`);
        if (data.userName && !listenBrainzUser) {
          setListenBrainzUser(data.userName);
        }
      } else {
        setTokenValidationState('invalid');
        setTokenValidStatus(`Token no válido: ${data.message || 'Error de validación'}`);
      }
    } catch {
      setTokenValidationState('valid');
      setTokenValidStatus('Guardado para verificación');
    } finally {
      setIsValidatingToken(false);
    }
  };

  const handleNextStep = async () => {
    setErrorMsg('');
    if (currentStep === 1) {
      if (!musicRoot.trim()) {
        setErrorMsg('Por favor especifica una ruta válida para tu fonoteca de música.');
        return;
      }
      setLoading(true);
      try {
        const res = await fetch('/api/storage/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ musicRoot })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setErrorMsg(data.error || 'No se pudieron preparar las carpetas. Verifica los permisos.');
          setLoading(false);
          return;
        }
      } catch (err: any) {
        setErrorMsg('Error preparando almacenamiento: ' + err.message);
        setLoading(false);
        return;
      } finally {
        setLoading(false);
      }
    }

    if (currentStep === 2) {
      if (!navidromeAdminUser.trim()) {
        setErrorMsg('Por favor especifica un nombre de usuario administrador.');
        return;
      }
      if (!navidromeAdminPassword.trim()) {
        setErrorMsg('Por favor especifica una contraseña.');
        return;
      }
      if (enableListenBrainz && !listenBrainzToken.trim()) {
        setErrorMsg('Has seleccionado sincronizar con ListenBrainz. Pega tu Token o desmarca la opción.');
        return;
      }
    }

    if (currentStep === 3) {
      if (!modules.explo && !modules.slskd && !modules.lidarr) {
        setErrorMsg('Por favor selecciona al menos una fuente para poblar tu fonoteca.');
        return;
      }
    }
    setCurrentStep(prev => prev + 1);
  };

  const handleSubmit = async () => {
    if (!status?.dockerAvailable) {
      setErrorMsg('El motor del servidor no está disponible. Inicie Docker Desktop o Colima para continuar.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const payload = {
        musicRoot,
        dockerData,
        puid,
        pgid,
        tz,
        navidromePort,
        navidromeAdminUser,
        navidromeAdminPassword,
        enableListenBrainz,
        listenBrainzUser: enableListenBrainz ? listenBrainzUser : '',
        listenBrainzToken: enableListenBrainz ? listenBrainzToken : '',
        modules,
        remoteAccess: remoteMode,
        domain: remoteMode === 'proxy' ? domain : '',
      };

      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        setTimeout(() => {
          setLoading(false);
          onComplete();
        }, 1200);
      } else {
        setErrorMsg(data.error || 'Ocurrió un error al configurar');
        setLoading(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión');
      setLoading(false);
    }
  };

  return (
    <div className="wizard-wrapper">
      {/* Alerta de Motor Apagado */}
      {status && !status.dockerAvailable && (
        <div style={{
          background: 'var(--status-err-bg)',
          border: '1px solid var(--status-err-border)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: 'var(--status-err-text)',
          fontSize: '0.84rem'
        }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <div>
            <strong>{t('engineDownTitle')}</strong> {t('engineDownWizard')}
          </div>
        </div>
      )}

      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: '700', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            {t('wizardTitle')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginTop: '3px' }}>
            {t('wizardProgress', { current: currentStep })}
          </p>
        </div>

        {status?.isConfigured && onCancel && (
          <button
            type="button"
            id="btn-wizard-exit"
            className="btn btn-secondary btn-sm"
            onClick={onCancel}
            title={t('backToDashboard')}
          >
            <LayoutDashboard size={13} />
            <span>{t('backToDashboard')}</span>
          </button>
        )}
      </div>

      {/* Indicadores de Paso (Línea simple, sin cajas) */}
      <div className="wizard-steps">
        {[
          { num: 1, title: t('stepLocation') },
          { num: 2, title: t('stepAccount') },
          { num: 3, title: t('stepSources') },
          { num: 4, title: t('stepMobility') },
          { num: 5, title: t('stepConfirm') },
        ].map(step => (
          <div
            key={step.num}
            className={`step-indicator ${currentStep === step.num ? 'active' : ''} ${currentStep > step.num ? 'completed' : ''}`}
            onClick={() => {
              if (step.num < currentStep) {
                setCurrentStep(step.num);
              }
            }}
          >
            <span className="step-num-pill">
              {currentStep > step.num ? <Check size={12} /> : step.num}
            </span>
            <span>{step.title}</span>
          </div>
        ))}
      </div>

      {/* Contenido del Paso */}
      <div style={{ minHeight: '300px' }}>
        {/* PASO 1: UBICACIÓN */}
        {currentStep === 1 && (
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '600', marginBottom: '6px' }}>
              {t('step1Title')}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '20px', lineHeight: 1.5 }}>
              {t('step1Desc')}
            </p>

            <div className="form-group">
              <label className="form-label">{t('step1MusicLabel')}</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  id="input-music-root"
                  type="text"
                  className="form-input"
                  value={musicRoot}
                  onChange={e => setMusicRoot(e.target.value)}
                  placeholder="/volume1/music"
                />
                <button
                  id="btn-browse-music"
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => openPicker('music')}
                >
                  <FolderSearch size={14} />
                  <span>{t('browse')}</span>
                </button>
              </div>
              <p className="input-hint">
                {t('step1MusicHint')}
              </p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                <span className="breakdown-pill" style={{ fontSize: '0.72rem' }}><strong>/personal</strong> • {isEn ? 'Manual uploads' : 'Subidas manuales'}</span>
                <span className="breakdown-pill" style={{ fontSize: '0.72rem' }}><strong>/explo</strong> • {isEn ? 'Curator' : 'Curador'}</span>
                <span className="breakdown-pill" style={{ fontSize: '0.72rem' }}><strong>/slskd</strong> • Soulseek</span>
                <span className="breakdown-pill" style={{ fontSize: '0.72rem' }}><strong>/torrents</strong> • Torrents</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('step1DockerLabel')}</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  id="input-docker-data"
                  type="text"
                  className="form-input"
                  value={dockerData}
                  onChange={e => setDockerData(e.target.value)}
                  placeholder="/volume1/docker"
                />
                <button
                  id="btn-browse-docker"
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => openPicker('docker')}
                >
                  <FolderSearch size={14} />
                  <span>{t('browse')}</span>
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('step1TimezoneLabel')}</label>
              <select
                id="select-timezone"
                className="form-input"
                style={{ cursor: 'pointer' }}
                value={tz}
                onChange={e => setTz(e.target.value)}
              >
                {!TIMEZONE_GROUPS.some(g => g.zones.some(z => z.id === tz)) && (
                  <option value={tz}>📍 {tz} (Auto)</option>
                )}
                {TIMEZONE_GROUPS.map(group => (
                  <optgroup key={group.group} label={group.group}>
                    {group.zones.map(z => (
                      <option key={z.id} value={z.id}>
                        {z.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setShowAdvancedPerms(!showAdvancedPerms)}
              >
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {t('step1PermsToggle', { puid, pgid })}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--accent-brass)', textDecoration: 'underline' }}>
                  {showAdvancedPerms ? t('step1Hide') : t('step1Adjust')}
                </span>
              </div>

              {showAdvancedPerms && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>PUID</label>
                    <input
                      type="text"
                      className="form-input"
                      value={puid}
                      onChange={e => setPuid(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>PGID</label>
                    <input
                      type="text"
                      className="form-input"
                      value={pgid}
                      onChange={e => setPgid(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PASO 2: TU CUENTA */}
        {currentStep === 2 && (
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '600', marginBottom: '6px' }}>
              {t('step2Title')}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '20px', lineHeight: 1.5 }}>
              {t('step2Desc')}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t('step2AdminUser')}</label>
                <input
                  id="input-navidrome-user"
                  type="text"
                  className="form-input"
                  value={navidromeAdminUser}
                  onChange={e => setNavidromeAdminUser(e.target.value)}
                  placeholder="admin"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>{t('step2Password')}</label>
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.74rem', cursor: 'pointer' }}
                  >
                    {showAdminPassword ? t('step2Hide') : t('step2Show')}
                  </button>
                </div>
                <input
                  id="input-navidrome-pass"
                  type={showAdminPassword ? 'text' : 'password'}
                  className="form-input"
                  value={navidromeAdminPassword}
                  onChange={e => setNavidromeAdminPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '0.84rem', fontWeight: '500' }}>{t('step2StreamingPort')} </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.84rem' }}>{navidromePort}</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowAdvancedNetwork(!showAdvancedNetwork)}
              >
                {showAdvancedNetwork ? t('close') : t('step2Change')}
              </button>
            </div>

            {showAdvancedNetwork && (
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">{t('step2CustomPort')}</label>
                <input
                  id="input-navidrome-port"
                  type="text"
                  className="form-input"
                  value={navidromePort}
                  onChange={e => setNavidromePort(e.target.value)}
                  placeholder="4533"
                />
              </div>
            )}

            {/* ListenBrainz */}
            <div style={{ padding: '14px 0' }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setEnableListenBrainz(!enableListenBrainz)}
              >
                <div>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                    {t('step2LzTitle')}
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {t('step2LzDesc')}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={enableListenBrainz}
                  onChange={() => { }}
                  style={{ accentColor: 'var(--accent-brass)', width: '16px', height: '16px' }}
                />
              </div>

              {enableListenBrainz && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>{t('step2LzToken')}</label>
                    <a
                      href="https://listenbrainz.org/profile/"
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '0.74rem', color: 'var(--accent-brass)', textDecoration: 'none' }}
                    >
                      {t('step2LzLink')}
                    </a>
                  </div>
                  <input
                    id="input-lz-token"
                    type="password"
                    className="form-input"
                    value={listenBrainzToken}
                    onChange={e => setListenBrainzToken(e.target.value)}
                    placeholder="Token"
                  />
                  {tokenValidStatus && (
                    <p style={{ fontSize: '0.76rem', color: tokenValidationState === 'valid' ? 'var(--status-online-text)' : 'var(--status-warn-text)', marginTop: '4px' }}>
                      {tokenValidStatus}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PASO 3: FUENTES */}
        {currentStep === 3 && (
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '600', marginBottom: '6px' }}>
              {t('step3Title')}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '20px', lineHeight: 1.5 }}>
              {t('step3Desc')}
            </p>

            <div className="flat-list">
              {/* Explo */}
              <div 
                className="flat-row"
                style={{ cursor: 'pointer' }}
                onClick={() => toggleModule('explo')}
              >
                <div className="flat-row-info">
                  <Sparkles size={18} className="flat-icon" style={{ color: 'var(--accent-brass)' }} />
                  <div>
                    <span className="flat-row-title">{t('step3ExploTitle')}</span>
                    <p className="flat-row-desc">{t('step3ExploDesc')}</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={modules.explo}
                  onChange={() => { }}
                  style={{ accentColor: 'var(--accent-brass)', width: '16px', height: '16px', pointerEvents: 'none' }}
                />
              </div>

              {/* Slskd */}
              <div 
                className="flat-row"
                style={{ cursor: modules.explo ? 'pointer' : 'not-allowed', opacity: modules.explo ? 1 : 0.4 }}
                onClick={() => modules.explo && toggleModule('slskd')}
              >
                <div className="flat-row-info">
                  <Music size={18} className="flat-icon" />
                  <div>
                    <span className="flat-row-title">{t('step3SlskdTitle')}</span>
                    <p className="flat-row-desc">{t('step3SlskdDesc')}</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={modules.explo && modules.slskd}
                  disabled={!modules.explo}
                  onChange={() => { }}
                  style={{ accentColor: 'var(--accent-brass)', width: '16px', height: '16px', pointerEvents: 'none' }}
                />
              </div>

              {/* Lidarr */}
              <div 
                className="flat-row"
                style={{ cursor: modules.explo ? 'pointer' : 'not-allowed', opacity: modules.explo ? 1 : 0.4 }}
                onClick={() => modules.explo && toggleModule('lidarr')}
              >
                <div className="flat-row-info">
                  <Disc3 size={18} className="flat-icon" />
                  <div>
                    <span className="flat-row-title">{t('step3LidarrTitle')}</span>
                    <p className="flat-row-desc">{t('step3LidarrDesc')}</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={modules.explo && modules.lidarr}
                  disabled={!modules.explo}
                  onChange={() => { }}
                  style={{ accentColor: 'var(--accent-brass)', width: '16px', height: '16px', pointerEvents: 'none' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* PASO 4: MOVILIDAD */}
        {currentStep === 4 && (
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '600', marginBottom: '6px' }}>
              {t('step4Title')}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '20px', lineHeight: 1.5 }}>
              {t('step4Desc')}
            </p>

            {status?.tailscaleDetected ? (
              <div style={{ padding: '14px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span className="status-pill online" style={{ marginBottom: '6px' }}>
                  <span className="status-dot"></span>
                  <span>{t('tailscaleActive')} ({status.tailscaleIp})</span>
                </span>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {t('step4TailscaleReady')}
                </p>
              </div>
            ) : (
              <div style={{ padding: '14px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-primary)', fontWeight: '500' }}>
                  {t('step4LocalReadyTitle')}
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {t('step4LocalReadyDesc')} <code>http://{status?.hostIp || '127.0.0.1'}:{navidromePort}</code>
                </p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                  {t('step4TailscaleHint')}
                </p>
              </div>
            )}

            <div style={{ marginTop: '16px' }}>
              <div
                style={{ cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.8rem' }}
                onClick={() => setRemoteMode(remoteMode === 'proxy' ? 'local' : 'proxy')}
              >
                <span style={{ textDecoration: 'underline' }}>
                  {remoteMode === 'proxy' ? t('step4DomainToggleHide') : t('step4DomainToggleShow')}
                </span>
              </div>

              {remoteMode === 'proxy' && (
                <div className="form-group" style={{ marginTop: '10px' }}>
                  <label className="form-label">{t('yourDomain')}</label>
                  <input
                    id="input-proxy-domain"
                    type="text"
                    className="form-input"
                    value={domain}
                    onChange={e => setDomain(e.target.value)}
                    placeholder={t('domainPlaceholder')}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* PASO 5: CONFIRMAR */}
        {currentStep === 5 && (
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '600', marginBottom: '6px' }}>
              {t('step5Title')}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '20px' }}>
              {t('step5Desc')}
            </p>

            <div className="flat-list" style={{ marginBottom: '24px' }}>
              <div className="flat-row" style={{ padding: '8px 0' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{t('step5SummaryMusic')}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: '500' }}>{musicRoot}</span>
              </div>
              <div className="flat-row" style={{ padding: '8px 0' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{t('step5SummaryPort')}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: '500' }}>{navidromePort}</span>
              </div>
              <div className="flat-row" style={{ padding: '8px 0' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{t('step5SummaryUser')}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: '500' }}>{navidromeAdminUser}</span>
              </div>
              <div className="flat-row" style={{ padding: '8px 0' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{t('step5SummarySources')}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: '500' }}>
                  {[
                    modules.explo && 'Curador Explo',
                    modules.slskd && 'Soulseek',
                    modules.lidarr && 'Lidarr Suite',
                  ].filter(Boolean).join(' • ') || t('step5OnlyManual')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Errores */}
      {errorMsg && (
        <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--status-err-bg)', color: 'var(--status-err-text)', border: '1px solid var(--status-err-border)', margin: '14px 0', fontSize: '0.82rem' }}>
          {errorMsg}
        </div>
      )}

      {/* Botones de Navegación */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
        {currentStep > 1 ? (
          <button
            id="btn-wizard-prev"
            className="btn btn-secondary btn-sm"
            onClick={() => { setErrorMsg(''); setCurrentStep(prev => prev - 1); }}
            disabled={loading}
          >
            <ArrowLeft size={13} />
            <span>{t('back')}</span>
          </button>
        ) : (
          status?.isConfigured && onCancel ? (
            <button
              id="btn-wizard-cancel"
              className="btn btn-secondary btn-sm"
              onClick={onCancel}
              disabled={loading}
            >
              <span>{t('cancelWizard')}</span>
            </button>
          ) : <div></div>
        )}

        {currentStep < 5 ? (
          <button
            id="btn-wizard-next"
            className="btn btn-primary btn-sm"
            onClick={handleNextStep}
            disabled={loading}
          >
            <span>{t('continue')}</span>
            <ArrowRight size={13} />
          </button>
        ) : (
          <button
            id="btn-wizard-launch"
            className="btn btn-primary btn-sm"
            onClick={handleSubmit}
            disabled={loading || !status?.dockerAvailable}
          >
            <span>{loading ? t('launchingLibrary') : t('launchLibrary')}</span>
          </button>
        )}
      </div>

      <DirectoryPickerModal
        isOpen={pickerConfig.isOpen}
        title={pickerConfig.title}
        initialPath={pickerConfig.initialPath}
        onSelect={handleSelectPath}
        onClose={() => setPickerConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

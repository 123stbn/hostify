import React, { useState, useRef } from 'react';
import {
  HardDrive, Music, Radio, Shield, Globe,
  ArrowRight, ArrowLeft, Check, AlertCircle,
  Layers, DownloadCloud, CheckCircle2, Server, FolderSearch,
  Clock, Sliders, Lightbulb, ShieldCheck, ExternalLink, Loader2, RotateCcw, Disc3, Sparkles, Key
} from 'lucide-react';
import { AppStatus } from '../types.js';
import { DirectoryPickerModal } from './DirectoryPickerModal.js';
import { useI18n } from '../i18n.js';

const DRAFT_STORAGE_KEY = 'hostify_wizard_draft_v2';

function loadWizardDraft() {
  try {
    localStorage.removeItem('hostify_wizard_draft_v1'); // Remove legacy 5-step draft
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
    if (draft?.currentStep && draft.currentStep >= 1 && draft.currentStep <= 6) {
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

  const [navidromePort, setNavidromePort] = useState<string>(draft?.navidromePort ?? (status?.navidromePort || '4533'));
  const hostifyPort = status?.hostifyPort || '3500';
  const [navidromeAdminUser, setNavidromeAdminUser] = useState<string>(draft?.navidromeAdminUser ?? (status?.navidromeAdminUser || ''));
  const [navidromeAdminPassword, setNavidromeAdminPassword] = useState<string>(draft?.navidromeAdminPassword ?? (status?.navidromeAdminPassword || ''));
  const [showAdminPassword, setShowAdminPassword] = useState<boolean>(false);
  const [showAdvancedNetwork, setShowAdvancedNetwork] = useState(false);
  const [enableListenBrainz, setEnableListenBrainz] = useState<boolean>(() => {
    if (draft?.enableListenBrainz !== undefined) return draft.enableListenBrainz;
    if (status?.isConfigured && status?.enableListenBrainz !== undefined) return status.enableListenBrainz;
    return true; // Default to checked for onboarding to encourage users to register
  });
  const cleanToken = (token?: string) => (!token || token.includes('tu_listenbrainz_token') ? '' : token);
  const cleanUser = (user?: string) => (!user || user === '123stbn' ? '' : user);

  const [listenBrainzUser, setListenBrainzUser] = useState<string>(
    cleanUser(draft?.listenBrainzUser ?? status?.listenBrainzUser)
  );
  const [listenBrainzToken, setListenBrainzToken] = useState<string>(
    cleanToken(draft?.listenBrainzToken ?? status?.listenBrainzToken)
  );
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

  // Deployment Modal State & Live Log Streaming
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployLogs, setDeployLogs] = useState<string[]>([]);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [deployFinished, setDeployFinished] = useState(false);
  const logBoxRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!deployModalOpen) return;

    let consecutiveDone = 0;
    const pollStatus = async () => {
      try {
        const res = await fetch('/api/compose/status');
        if (res.ok) {
          const state = await res.json();
          if (state.logs && state.logs.length > 0) {
            setDeployLogs(state.logs);
          }
          if (state.lastError) {
            setDeployError(state.lastError);
          }
          if (!state.isDeploying && (state.finishedAt || state.lastError)) {
            consecutiveDone++;
            if (consecutiveDone >= 2) {
              setIsDeploying(false);
              setDeployFinished(true);
            }
          } else {
            consecutiveDone = 0;
            setIsDeploying(true);
          }
        }
      } catch {
        // Handled silently during service reload
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 1200);
    return () => clearInterval(interval);
  }, [deployModalOpen]);

  React.useEffect(() => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }
  }, [deployLogs]);

  const handleRetryDeploy = async () => {
    setIsDeploying(true);
    setDeployFinished(false);
    setDeployError(null);
    setDeployLogs(prev => [...prev, isEn ? 'Retrying service deployment...' : 'Reintentando despliegue de servicios...']);
    try {
      await fetch('/api/compose/deploy', { method: 'POST' });
    } catch (err: any) {
      setDeployError(err.message);
    }
  };

  // Sincronizar con el estado detectado del servidor si no había un borrador previo guardado
  React.useEffect(() => {
    if (!draft && status) {
      if (status.musicRoot && status.musicRoot !== '/volume1/music') {
        setMusicRoot(status.musicRoot);
      }
      if (status.dockerData && status.dockerData !== '/volume1/docker') {
        setDockerData(status.dockerData);
      }
    }
  }, [status, draft]);

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
      setNavidromeAdminUser(status?.navidromeAdminUser || '');
      setNavidromeAdminPassword(status?.navidromeAdminPassword || '');
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
      const current = musicRoot && !musicRoot.startsWith('/volume1') ? musicRoot : (status?.musicRoot && !status.musicRoot.startsWith('/volume1') ? status.musicRoot : '');
      setPickerConfig({
        isOpen: true,
        target: 'music',
        title: 'Seleccionar Carpeta para Tu Fonoteca (/music)',
        initialPath: current,
      });
    } else {
      const current = dockerData && !dockerData.startsWith('/volume1') ? dockerData : (status?.dockerData && !status.dockerData.startsWith('/volume1') ? status.dockerData : '');
      setPickerConfig({
        isOpen: true,
        target: 'docker',
        title: 'Seleccionar Carpeta de Datos del Sistema (/docker)',
        initialPath: current,
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
      // Welcome step: proceed directly to Step 2
    }

    if (currentStep === 2) {
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

    if (currentStep === 3) {
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

    if (currentStep === 4) {
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
        hostIp: status?.hostIp || '',
        localHostname: (status?.localHostname || 'hostify.local').replace(/\.local$/, ''),
      };

      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        setLoading(false);
        setDeployModalOpen(true);
        setIsDeploying(true);
        setDeployFinished(false);
        setDeployError(null);
        setDeployLogs([isEn ? 'Initiating Docker service deployment...' : 'Iniciando despliegue de servicios Docker...']);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: '700', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            {t('wizardTitle')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginTop: '3px' }}>
            {t('wizardProgress', { current: currentStep })}
          </p>
        </div>

        {onCancel && (
          <button
            type="button"
            id="btn-wizard-cancel"
            className="btn btn-secondary"
            onClick={onCancel}
            title={t('cancelWizard')}
            style={{ height: '36px', minHeight: '36px', padding: '0 16px', boxSizing: 'border-box' }}
          >
            <span>{t('cancelWizard')}</span>
          </button>
        )}
      </div>

      {/* Indicadores de Paso (Línea simple, sin cajas) */}
      <div className="wizard-steps">
        {[
          { num: 1, title: t('stepLicense') },
          { num: 2, title: t('stepLocation') },
          { num: 3, title: t('stepAccount') },
          { num: 4, title: t('stepSources') },
          { num: 5, title: t('stepMobility') },
          { num: 6, title: t('stepConfirm') },
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
        {/* PASO 1: LICENCIA Y ACTIVACIÓN */}
        {currentStep === 1 && (
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '600', marginBottom: '6px' }}>
              {t('step1Title')}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '20px', lineHeight: 1.5 }}>
              {t('step1Desc')}
            </p>

            {/* Tarjetas de Bienvenida Open Source y Diagnóstico del Sistema */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              {/* Card 1: 100% Open Source */}
              <div
                style={{
                  padding: '18px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(74, 222, 128, 0.3)',
                  background: 'rgba(74, 222, 128, 0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(74, 222, 128, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#4ade80'
                  }}>
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 600, color: '#4ade80' }}>
                      {t('step1OpenSourceBadge')}
                    </h3>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {t('step1OpenSourceDesc')}
                </p>
                <div style={{
                  marginTop: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.76rem',
                  color: 'var(--text-muted)'
                }}>
                  <CheckCircle2 size={13} color="#4ade80" />
                  <span>Sin telemetría • Sin DRM • Modo 100% Local</span>
                </div>
              </div>

              {/* Card 2: Diagnóstico del Entorno */}
              <div
                style={{
                  padding: '18px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(99, 102, 241, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#818cf8'
                  }}>
                    <Server size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 600 }}>
                      {t('step1DiagnosticTitle')}
                    </h3>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {t('step1DiagnosticDesc')}
                </p>
                <div style={{
                  marginTop: '14px',
                  padding: '8px 10px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '0.76rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <div>
                    Motor Docker: <strong style={{ color: status?.dockerAvailable ? '#4ade80' : '#ef4444' }}>
                      {status?.dockerAvailable ? 'En línea' : 'Detenido'}
                    </strong>
                  </div>
                  <div>
                    Permisos de Ingesta: <strong style={{ color: 'var(--text-secondary)' }}>PUID {puid} / PGID {pgid}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PASO 2: UBICACIÓN */}
        {currentStep === 2 && (
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '600', marginBottom: '6px' }}>
              {t('step2Title')}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '20px', lineHeight: 1.5 }}>
              {t('step2Desc')}
            </p>

            <div className="form-group">
              <label className="form-label">{t('step2MusicLabel')}</label>
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
                {t('step2MusicHint')}
              </p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                <span className="breakdown-pill" style={{ fontSize: '0.72rem' }}><strong>/personal</strong> • {isEn ? 'Manual uploads' : 'Subidas manuales'}</span>
                <span className="breakdown-pill" style={{ fontSize: '0.72rem' }}><strong>/explo</strong> • {isEn ? 'Curator' : 'Curador'}</span>
                <span className="breakdown-pill" style={{ fontSize: '0.72rem' }}><strong>/slskd</strong> • Soulseek</span>
                <span className="breakdown-pill" style={{ fontSize: '0.72rem' }}><strong>/torrents</strong> • Torrents</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('step2DockerLabel')}</label>
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
              <label className="form-label">{t('step2TimezoneLabel')}</label>
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
                  {t('step2PermsToggle', { puid, pgid })}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--accent-brass)', textDecoration: 'underline' }}>
                  {showAdvancedPerms ? t('step2Hide') : t('step2Adjust')}
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

        {/* PASO 3: TU CUENTA */}
        {currentStep === 3 && (
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '600', marginBottom: '6px' }}>
              {t('step3Title')}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '20px', lineHeight: 1.5 }}>
              {t('step3Desc')}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t('step3AdminUser')}</label>
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
                  <label className="form-label" style={{ marginBottom: 0 }}>{t('step3Password')}</label>
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.74rem', cursor: 'pointer' }}
                  >
                    {showAdminPassword ? t('step3Hide') : t('step3Show')}
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
                <span style={{ fontSize: '0.84rem', fontWeight: '500' }}>{t('step3StreamingPort')} </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.84rem' }}>{hostifyPort}</span>
              </div>
            </div>

            {/* ListenBrainz */}
            <div style={{ padding: '14px 0' }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setEnableListenBrainz(!enableListenBrainz)}
              >
                <div>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                    {t('step3LzTitle')}
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {t('step3LzDesc')}
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
                    <label className="form-label" style={{ marginBottom: 0 }}>{t('step3LzToken')}</label>
                    <a
                      href="https://listenbrainz.org/profile/"
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '0.74rem', color: 'var(--accent-brass)', textDecoration: 'none' }}
                    >
                      {t('step3LzLink')}
                    </a>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="input-lz-token"
                      type="password"
                      className="form-input"
                      value={listenBrainzToken}
                      onChange={e => {
                        const val = e.target.value;
                        setListenBrainzToken(val);
                        if (!val.trim()) {
                          setTokenValidStatus(null);
                          setTokenValidationState('idle');
                          setListenBrainzUser('');
                        }
                      }}
                      onBlur={() => {
                        if (listenBrainzToken.trim()) {
                          handleTestToken();
                        }
                      }}
                      placeholder="Token"
                    />
                    {isValidatingToken && (
                      <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Validando...
                      </span>
                    )}
                  </div>
                  {tokenValidStatus && (
                    <p style={{ 
                      fontSize: '0.78rem', 
                      color: tokenValidationState === 'valid' ? 'var(--status-online-text)' : 'var(--status-warn-text)', 
                      marginTop: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      {tokenValidationState === 'valid' ? '✔' : '⚠'} {tokenValidStatus}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PASO 4: FUENTES */}
        {currentStep === 4 && (
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '600', marginBottom: '6px' }}>
              {t('step4Title')}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '20px', lineHeight: 1.5 }}>
              {t('step4Desc')}
            </p>

            <div className="flat-list">
              {/* Explo */}
              <div 
                className="flat-row"
                style={{ cursor: 'pointer' }}
                onClick={() => toggleModule('explo')}
              >
                <div className="flat-row-info">
                  <Sparkles size={18} className="flat-icon" />
                  <div>
                    <span className="flat-row-title">{t('step4ExploTitle')}</span>
                    <p className="flat-row-desc">{t('step4ExploDesc')}</p>
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
                    <span className="flat-row-title">{t('step4SlskdTitle')}</span>
                    <p className="flat-row-desc">{t('step4SlskdDesc')}</p>
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
                    <span className="flat-row-title">{t('step4LidarrTitle')}</span>
                    <p className="flat-row-desc">{t('step4LidarrDesc')}</p>
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

        {/* PASO 5: MOVILIDAD */}
        {currentStep === 5 && (
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '600', marginBottom: '6px' }}>
              {t('step5Title')}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '20px', lineHeight: 1.5 }}>
              {t('step5Desc')}
            </p>

            {status?.tailscaleDetected ? (
              <div style={{ padding: '14px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span className="status-pill online" style={{ marginBottom: '6px' }}>
                  <span className="status-dot"></span>
                  <span>{t('tailscaleActive')} ({status.tailscaleIp})</span>
                </span>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {t('step5TailscaleReady')}
                </p>
              </div>
            ) : (
              <div style={{ padding: '14px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-primary)', fontWeight: '500' }}>
                  {t('step5LocalReadyTitle')}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Nombre fijo (mDNS): <code style={{ color: 'var(--accent-brass)' }}>http://{status?.localHostname || 'hostify.local'}:{hostifyPort}</code>
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    IP directa: <code>http://{status?.hostIp || '127.0.0.1'}:{hostifyPort}</code>
                  </p>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                  {t('step5TailscaleHint')}
                </p>
              </div>
            )}

            <div style={{ marginTop: '16px' }}>
              <div
                style={{ cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.8rem' }}
                onClick={() => setRemoteMode(remoteMode === 'proxy' ? 'local' : 'proxy')}
              >
                <span style={{ textDecoration: 'underline' }}>
                  {remoteMode === 'proxy' ? t('step5DomainToggleHide') : t('step5DomainToggleShow')}
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

        {/* PASO 6: CONFIRMAR */}
        {currentStep === 6 && (
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '600', marginBottom: '6px' }}>
              {t('step6Title')}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '20px' }}>
              {t('step6Desc')}
            </p>

            <div className="flat-list" style={{ marginBottom: '24px' }}>
              <div className="flat-row" style={{ padding: '8px 0' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{t('step6SummaryMusic')}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: '500' }}>{musicRoot}</span>
              </div>
              <div className="flat-row" style={{ padding: '8px 0' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{t('step6SummaryPort')}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: '500' }}>{hostifyPort}</span>
              </div>
              <div className="flat-row" style={{ padding: '8px 0' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{t('step6SummaryUser')}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: '500' }}>{navidromeAdminUser}</span>
              </div>
              <div className="flat-row" style={{ padding: '8px 0' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{t('step6SummarySources')}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: '500' }}>
                  {[
                    modules.explo && 'Curador Explo',
                    modules.slskd && 'Soulseek',
                    modules.lidarr && 'Lidarr Suite',
                  ].filter(Boolean).join(' • ') || t('step6OnlyManual')}
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
            type="button"
            id="btn-wizard-prev"
            className="btn btn-secondary"
            onClick={() => { setErrorMsg(''); setCurrentStep(prev => prev - 1); }}
            disabled={loading}
            style={{ height: '38px', minHeight: '38px', padding: '0 16px', boxSizing: 'border-box' }}
          >
            <ArrowLeft size={14} />
            <span>{t('back')}</span>
          </button>
        ) : (
          <div></div>
        )}

        {currentStep < 6 ? (
          <button
            type="button"
            id="btn-wizard-next"
            className="btn btn-primary"
            onClick={handleNextStep}
            disabled={loading}
            style={{ height: '38px', minHeight: '38px', padding: '0 18px', boxSizing: 'border-box' }}
          >
            <span>{t('continue')}</span>
            <ArrowRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            id="btn-wizard-launch"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading || !status?.dockerAvailable}
            style={{ height: '38px', minHeight: '38px', padding: '0 20px', boxSizing: 'border-box' }}
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

      {/* Modal de Despliegue con Logs en Vivo */}
      {deployModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px', width: '92%', background: 'var(--bg-surface)' }}>
            <div className="modal-header" style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {isDeploying ? (
                  <Loader2 className="spin" size={24} style={{ color: 'var(--accent-brass)' }} />
                ) : deployError ? (
                  <AlertCircle size={24} style={{ color: '#ef4444' }} />
                ) : (
                  <CheckCircle2 size={24} style={{ color: '#4ade80' }} />
                )}
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '600', margin: 0, color: 'var(--text-primary)' }}>
                    {isDeploying
                      ? t('deployModalTitle')
                      : deployError
                        ? t('deployErrorTitle')
                        : t('deploySuccessTitle')}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px', margin: 0 }}>
                    {isDeploying
                      ? t('deployModalSubtitle')
                      : deployError
                        ? t('deployErrorSubtitle')
                        : t('deploySuccessSubtitle')}
                  </p>
                </div>
              </div>
            </div>

            <div
              ref={logBoxRef}
              className="code-box"
              style={{
                maxHeight: '340px',
                minHeight: '220px',
                overflowY: 'auto',
                fontSize: '0.78rem',
                lineHeight: 1.5,
                background: '#0d1117',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px',
                margin: '16px 0',
                color: '#e6edf3',
                fontFamily: 'var(--font-mono)'
              }}
            >
              {deployLogs.length > 0 ? (
                deployLogs.map((line, idx) => (
                  <div key={idx} style={{ wordBreak: 'break-all', marginBottom: '3px' }}>
                    {line}
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--text-muted)' }}>{t('preparing')}</div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px' }}>
              {isDeploying ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                  <Loader2 className="spin" size={14} />
                  <span>{t('deployStateInProgress')}</span>
                </div>
              ) : deployError ? (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={onComplete}
                    style={{ height: '36px', padding: '0 16px' }}
                  >
                    <span>{t('continueAnyway')}</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleRetryDeploy}
                    style={{ height: '36px', padding: '0 16px' }}
                  >
                    <RotateCcw size={13} />
                    <span>{t('retry')}</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  id="btn-deploy-finish"
                  className="btn btn-primary"
                  onClick={onComplete}
                  style={{ height: '38px', padding: '0 20px', fontWeight: '600' }}
                >
                  <span>{t('goToDashboard')}</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

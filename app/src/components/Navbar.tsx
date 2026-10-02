import React from 'react';
import { Sliders, RefreshCw, Languages } from 'lucide-react';
import { AppStatus } from '../types.js';
import { useI18n } from '../i18n.js';

interface NavbarProps {
  status: AppStatus | null;
  onOpenSettings: () => void;
  onResetWizard: () => void;
  activeView: 'dashboard' | 'wizard';
}

export const Navbar: React.FC<NavbarProps> = ({ status, onOpenSettings, onResetWizard, activeView }) => {
  const isDockerAvailable = Boolean(status?.dockerAvailable);
  const { lang, setLang, t } = useI18n();

  const toggleLanguage = () => {
    setLang(lang === 'es' ? 'en' : 'es');
  };

  return (
    <header className="navbar">
      <div className="container nav-wrapper">
        <div className="nav-brand">
          <div>
            <span className="brand-text">{t('appName')}</span>
            <span className="brand-subtitle" style={{ marginLeft: '10px' }}>
              {t('tagline')}
            </span>
          </div>
        </div>

        <div className="nav-actions">
          {status && (
            <div className={`status-pill ${isDockerAvailable ? 'online' : 'error'}`}>
              <span className="status-dot"></span>
              <span>{isDockerAvailable ? t('online') : t('engineStopped')}</span>
            </div>
          )}

          {/* Selector de Idioma Minimalista */}
          <button
            id="btn-toggle-lang"
            className="btn btn-secondary btn-sm"
            onClick={toggleLanguage}
            title={lang === 'es' ? 'Switch to English' : 'Cambiar a Español'}
            style={{ fontSize: '0.74rem', padding: '4px 8px', letterSpacing: '0.04em', fontWeight: 600 }}
          >
            <Languages size={13} />
            <span>{lang.toUpperCase()}</span>
          </button>

          {activeView === 'dashboard' ? (
            <button 
              id="btn-reconfig-wizard"
              className="btn btn-secondary btn-sm"
              onClick={isDockerAvailable ? onResetWizard : undefined}
              disabled={!isDockerAvailable}
              title={isDockerAvailable 
                ? t('runWizardTooltip') 
                : t('engineStopped')}
              style={!isDockerAvailable ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
            >
              <RefreshCw size={12} />
              <span>{t('runWizard')}</span>
            </button>
          ) : (
            status?.isConfigured && (
              <button
                id="btn-nav-dashboard"
                className="btn btn-secondary btn-sm"
                onClick={onOpenSettings}
                title={t('backToDashboard')}
              >
                <span>{t('backToDashboard')}</span>
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
};

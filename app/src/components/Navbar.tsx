import React from 'react';
import { Sliders, RefreshCw, Languages, ShieldCheck, Key, AlertTriangle } from 'lucide-react';
import { AppStatus } from '../types.js';
import { useI18n } from '../i18n.js';
import { HostifyLogo } from './HostifyLogo.js';

interface NavbarProps {
  status: AppStatus | null;
  onOpenSettings: () => void;
  onResetWizard: () => void;
  activeView: 'dashboard' | 'wizard';
}

export const Navbar: React.FC<NavbarProps> = ({ 
  status, 
  onOpenSettings, 
  onResetWizard, 
  activeView 
}) => {
  const isDockerAvailable = Boolean(status?.dockerAvailable);
  const { lang, setLang, t } = useI18n();

  const toggleLanguage = () => {
    setLang(lang === 'es' ? 'en' : 'es');
  };

  return (
    <header className="navbar">
      <div className="container nav-wrapper">
        <div className="nav-brand">
          <HostifyLogo size={32} />
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
              <span>
                {isDockerAvailable
                  ? (status.isConfigured ? t('online') : t('dockerReady'))
                  : t('engineStopped')}
              </span>
            </div>
          )}

          {/* Buy me a pizza link */}
          <a
            href="https://www.buymeacoffee.com/123stbn"
            target="_blank"
            rel="noopener noreferrer"
            title="Buy me a pizza"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-xs)',
              background: '#FFDD00',
              color: '#000000',
              fontWeight: 700,
              fontSize: '0.74rem',
              textDecoration: 'none',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)',
              transition: 'transform 0.15s ease, opacity 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>🍕</span>
            <span>Buy me a pizza</span>
          </a>

          {/* Minimalist Language Switcher */}
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

          {activeView === 'dashboard' && (
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
          )}
        </div>
      </div>
    </header>
  );
};

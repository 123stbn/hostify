import React from 'react';
import { Sliders, RefreshCw, Languages, ShieldCheck, Key, AlertTriangle } from 'lucide-react';
import { AppStatus } from '../types.js';
import { useI18n } from '../i18n.js';

interface NavbarProps {
  status: AppStatus | null;
  onOpenSettings: () => void;
  onResetWizard: () => void;
  onOpenLicense: () => void;
  activeView: 'dashboard' | 'wizard';
}

export const Navbar: React.FC<NavbarProps> = ({ 
  status, 
  onOpenSettings, 
  onResetWizard, 
  onOpenLicense, 
  activeView 
}) => {
  const isDockerAvailable = Boolean(status?.dockerAvailable);
  const { lang, setLang, t } = useI18n();

  const toggleLanguage = () => {
    setLang(lang === 'es' ? 'en' : 'es');
  };

  const license = status?.license;
  const isLicensed = license?.status === 'licensed';
  const isExpired = license?.status === 'expired';

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

          {/* License Status Badge Button */}
          {license && (
            <button
              id="btn-nav-license"
              className="btn btn-secondary btn-sm"
              onClick={onOpenLicense}
              title={isLicensed 
                ? `${t('licensedTo')}: ${license.licensee || 'Pro User'}` 
                : isExpired 
                  ? t('licenseExpired') 
                  : t('trialRemaining', { days: license.daysRemaining ?? 14 })}
              style={{
                fontSize: '0.74rem',
                padding: '4px 10px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                color: isLicensed ? '#4ade80' : isExpired ? '#ef4444' : '#eab308',
                borderColor: isLicensed ? 'rgba(74, 222, 128, 0.3)' : isExpired ? 'rgba(239, 68, 68, 0.3)' : 'rgba(234, 179, 8, 0.3)',
                backgroundColor: isLicensed ? 'rgba(74, 222, 128, 0.08)' : isExpired ? 'rgba(239, 68, 68, 0.08)' : 'rgba(234, 179, 8, 0.08)'
              }}
            >
              {isLicensed ? <ShieldCheck size={13} /> : isExpired ? <AlertTriangle size={13} /> : <Key size={13} />}
              <span>
                {isLicensed 
                  ? (license.tier === 'lifetime' ? 'LIFETIME' : 'PRO') 
                  : isExpired 
                    ? t('licenseExpired') 
                    : t('trialRemaining', { days: license.daysRemaining ?? 14 })}
              </span>
            </button>
          )}

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

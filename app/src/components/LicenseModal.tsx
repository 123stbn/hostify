import React, { useState } from 'react';
import { Key, ShieldCheck, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { LicenseStatus } from '../types.js';
import { useI18n } from '../i18n.js';

interface LicenseModalProps {
  license?: LicenseStatus;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  forceOpen?: boolean;
}

export const LicenseModal: React.FC<LicenseModalProps> = ({
  license,
  isOpen,
  onClose,
  onRefresh,
  forceOpen
}) => {
  const { t } = useI18n();
  const [keyInput, setKeyInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const isLicensed = license?.status === 'licensed';
  const isExpired = license?.status === 'expired';
  const isPaywallLocked = isExpired || (forceOpen && !isLicensed);

  if (!isOpen && !isPaywallLocked) return null;

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: keyInput.trim() })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ text: data.message || t('activationSuccess'), type: 'success' });
        setKeyInput('');
        onRefresh();
      } else {
        setMessage({ text: data.error || data.message || t('activationError'), type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || t('activationError'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '16px'
    }}>
      <div className="card" style={{
        maxWidth: '520px',
        width: '100%',
        padding: '28px',
        borderRadius: '12px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)',
        position: 'relative',
        border: isPaywallLocked ? '1px solid rgba(239, 68, 68, 0.3)' : undefined
      }}>
        {/* Close Button only if not locked in expired state */}
        {!isPaywallLocked && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px'
            }}
            title={t('close')}
          >
            <X size={18} />
          </button>
        )}

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            backgroundColor: isLicensed ? 'rgba(74, 222, 128, 0.15)' : 'rgba(234, 179, 8, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isLicensed ? '#4ade80' : '#eab308'
          }}>
            {isLicensed ? <ShieldCheck size={24} /> : <Key size={24} />}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>{t('licenseTitle')}</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {t('licenseModalDesc')}
            </p>
          </div>
        </div>

        {/* Current License Status Box */}
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-card-subtle, rgba(255, 255, 255, 0.03))',
          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Estado actual:</span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.82rem',
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: '999px',
              backgroundColor: isLicensed 
                ? 'rgba(74, 222, 128, 0.15)' 
                : isExpired 
                  ? 'rgba(239, 68, 68, 0.15)' 
                  : 'rgba(234, 179, 8, 0.15)',
              color: isLicensed ? '#4ade80' : isExpired ? '#ef4444' : '#eab308'
            }}>
              {isLicensed && <CheckCircle size={13} />}
              {isExpired && <AlertTriangle size={13} />}
              {isLicensed 
                ? (license?.tier === 'lifetime' ? t('licenseLifetime') : t('licensePro')) 
                : isExpired 
                  ? t('licenseExpired') 
                  : `${t('licenseTrial')} (${license?.daysRemaining ?? 14}d)`}
            </span>
          </div>

          {isLicensed && license?.licensee && (
            <div style={{ fontSize: '0.85rem', marginTop: '6px', color: 'var(--text-primary)' }}>
              <span style={{ color: 'var(--text-muted)' }}>{t('licensedTo')}: </span>
              <strong>{license.licensee}</strong>
              {license.licenseId && (
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'monospace' }}>
                  ID: {license.licenseId}
                </span>
              )}
            </div>
          )}

          {!isLicensed && (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              {isExpired 
                ? 'El período de prueba ha terminado. Activa una licencia para continuar administrando tus servicios.' 
                : `Tienes ${license?.daysRemaining ?? 14} días para probar todas las funciones de Hostify sin restricciones.`}
            </div>
          )}
        </div>

        {/* Activation Form */}
        <form onSubmit={handleActivate}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px' }}>
            {t('enterLicenseKey')}
          </label>
          <div style={{ marginBottom: '14px' }}>
            <textarea
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="HSTF_eyJsaWNlbnNlSWQiOi..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '0.82rem',
                fontFamily: 'monospace',
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                resize: 'none',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>

          {message && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '6px',
              marginBottom: '14px',
              fontSize: '0.82rem',
              backgroundColor: message.type === 'success' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${message.type === 'success' ? 'rgba(74, 222, 128, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              color: message.type === 'success' ? '#4ade80' : '#ef4444'
            }}>
              {message.text}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            {!isPaywallLocked && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                {t('close')}
              </button>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !keyInput.trim()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Key size={14} />
              <span>{loading ? t('activating') : t('activateLicense')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

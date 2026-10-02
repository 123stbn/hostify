import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar.js';
import { SetupWizard } from './components/SetupWizard.js';
import { Dashboard } from './components/Dashboard.js';
import { AppStatus } from './types.js';
import { useI18n } from './i18n.js';

export const App: React.FC = () => {
  const { t } = useI18n();
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'wizard'>('dashboard');
  const isFirstLoad = useRef(true);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (isFirstLoad.current) {
          isFirstLoad.current = false;
          if (!data.isConfigured) {
            setView('wizard');
          } else {
            setView('dashboard');
          }
        }
      }
    } catch (err) {
      console.error('Error obteniendo estado de Hostify:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleResetWizard = async () => {
    if (!status?.dockerAvailable) return;
    try {
      localStorage.removeItem('hostify_wizard_draft_v1');
      await fetch('/api/reset-wizard', { method: 'POST' });
      await fetchStatus();
      setView('wizard');
    } catch (err) {
      console.error(err);
    }
  };

  const handleWizardComplete = () => {
    fetchStatus();
    setView('dashboard');

    // Abre Feishin en una nueva pestaña para que el usuario conozca de inmediato su reproductor
    try {
      const port = status?.feishinPort || '9188';
      const host = window.location.hostname || status?.hostIp || '127.0.0.1';
      const feishinUrl = `http://${host}:${port}`;
      const w = window.open(feishinUrl, 'hostify_feishin_player');
      if (w) w.focus();
    } catch (e) {
      console.warn('Could not auto-open Feishin tab:', e);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '14px', background: 'var(--bg-base)' }}>
        <div className="status-dot pulsing" style={{ width: '12px', height: '12px', color: 'var(--accent-brass)' }}></div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
          {t('loadingCollection')}
        </p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
      <Navbar 
        status={status} 
        onOpenSettings={() => setView(view === 'wizard' ? 'dashboard' : 'wizard')}
        onResetWizard={handleResetWizard}
        activeView={view}
      />

      <main style={{ flex: 1 }}>
        {view === 'wizard' ? (
          <SetupWizard 
            status={status} 
            onComplete={handleWizardComplete} 
            onCancel={() => setView('dashboard')}
          />
        ) : (
          <Dashboard status={status} onRefreshStatus={fetchStatus} />
        )}
      </main>

      <footer style={{ borderTop: '1px solid var(--border-subtle)', padding: '22px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
        <p>{t('footerText')}</p>
      </footer>
    </div>
  );
};

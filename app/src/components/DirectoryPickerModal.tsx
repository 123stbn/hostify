import React, { useState, useEffect } from 'react';
import { 
  Folder, FolderPlus, ArrowUp, Check, X, HardDrive, 
  ChevronRight, RefreshCw, AlertCircle, ShieldAlert, ShieldCheck
} from 'lucide-react';
import { useI18n } from '../i18n.js';

interface DirectoryPickerModalProps {
  isOpen: boolean;
  initialPath: string;
  title: string;
  onSelect: (selectedPath: string) => void;
  onClose: () => void;
}

interface BrowseResponse {
  currentPath: string;
  parentPath: string | null;
  breadcrumbs: Array<{ name: string; path: string }>;
  directories: Array<{ name: string; path: string }>;
  commonShortcuts: string[];
  canWrite: boolean;
}

export const DirectoryPickerModal: React.FC<DirectoryPickerModalProps> = ({
  isOpen,
  initialPath,
  title,
  onSelect,
  onClose,
}) => {
  const { t } = useI18n();
  const [currentPath, setCurrentPath] = useState(initialPath || '/');
  const [data, setData] = useState<BrowseResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Nueva carpeta state
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  const fetchDirectory = async (targetPath: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/browse?path=${encodeURIComponent(targetPath)}`);
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('El backend respondió con un formato inesperado. Reinicia el servidor para cargar los endpoints actualizados.');
      }
      const json = await res.json();
      if (res.ok) {
        setData(json);
        setCurrentPath(json.currentPath);
      } else {
        setErrorMsg(json.error || 'Error explorando la carpeta');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDirectory(initialPath || '/');
      setShowNewFolderInput(false);
      setNewFolderName('');
    }
  }, [isOpen, initialPath]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !data) return;

    setCreatingFolder(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/mkdir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentPath: data.currentPath, folderName: newFolderName }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('El servidor requiere reinicio para procesar la creación de carpetas.');
      }
      const json = await res.json();
      if (res.ok) {
        setNewFolderName('');
        setShowNewFolderInput(false);
        await fetchDirectory(json.createdPath);
      } else {
        setErrorMsg(json.error || 'No se pudo crear la carpeta');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setCreatingFolder(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: '760px', width: '95%' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: 'var(--radius-sm)', background: 'var(--accent-brass-subtle)', color: 'var(--accent-brass)', border: '1px solid var(--accent-brass-border)' }}>
              <HardDrive size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>{title}</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {t('dirPickerTitle')}
              </p>
            </div>
          </div>
          <button 
            id="btn-close-dirpicker"
            className="btn btn-secondary btn-icon btn-sm" 
            onClick={onClose}
          >
            <X size={14} />
          </button>
        </div>

        {/* Shortcuts Bar */}
        {data && data.commonShortcuts && data.commonShortcuts.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
              {t('dirPickerShortcuts')}
            </span>
            {data.commonShortcuts.map(sc => (
              <button
                key={sc}
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                onClick={() => fetchDirectory(sc)}
              >
                <Folder size={11} color="var(--accent-brass)" />
                <span>{sc}</span>
              </button>
            ))}
          </div>
        )}

        {/* Breadcrumb Path Bar */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '4px', 
          background: 'var(--bg-input)', 
          border: '1px solid var(--border-subtle)', 
          borderRadius: 'var(--radius-sm)', 
          padding: '6px 10px',
          marginBottom: '14px',
          overflowX: 'auto',
          whiteSpace: 'nowrap'
        }}>
          {data?.breadcrumbs.map((b, idx) => (
            <React.Fragment key={b.path + idx}>
              <button
                type="button"
                onClick={() => fetchDirectory(b.path)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: idx === data.breadcrumbs.length - 1 ? 'var(--accent-brass)' : 'var(--text-secondary)',
                  fontWeight: idx === data.breadcrumbs.length - 1 ? '700' : '500',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: 'var(--radius-xs)',
                }}
              >
                {b.name}
              </button>
              {idx < data.breadcrumbs.length - 1 && (
                <ChevronRight size={13} color="var(--text-muted)" />
              )}
            </React.Fragment>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {data?.canWrite ? (
              <span className="status-pill online" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                <span className="status-dot"></span>
                <span>{t('dirPickerWriteReady')}</span>
              </span>
            ) : (
              <span className="status-pill warning" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                <span className="status-dot"></span>
                <span>{t('dirPickerReadOnly')}</span>
              </span>
            )}
            <button 
              type="button" 
              className="btn btn-secondary btn-icon btn-sm"
              onClick={() => fetchDirectory(currentPath)}
              title="Recargar carpeta"
              style={{ width: '26px', height: '26px' }}
            >
              <RefreshCw size={11} className={loading ? 'pulsing' : ''} />
            </button>
          </div>
        </div>

        {errorMsg && (
          <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--status-err-bg)', color: 'var(--status-err-text)', border: '1px solid var(--status-err-border)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
            <AlertCircle size={14} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Directory Listing Area */}
        <div style={{ 
          background: 'var(--bg-input)', 
          border: '1px solid var(--border-subtle)', 
          borderRadius: 'var(--radius-sm)', 
          minHeight: '240px', 
          maxHeight: '320px', 
          overflowY: 'auto',
          padding: '6px' 
        }}>
          {/* Subir un nivel */}
          {data?.parentPath && (
            <div 
              onClick={() => data.parentPath && fetchDirectory(data.parentPath)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-xs)',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                transition: 'background var(--transition-fast)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <ArrowUp size={14} color="var(--accent-brass)" />
              <span style={{ fontSize: '0.84rem', fontWeight: '600' }}>{t('dirPickerParent')}</span>
            </div>
          )}

          {/* Subcarpetas */}
          {data?.directories && data.directories.length > 0 ? (
            data.directories.map(dir => (
              <div 
                key={dir.path}
                onClick={() => fetchDirectory(dir.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-xs)',
                  cursor: 'pointer',
                  transition: 'background var(--transition-fast)',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Folder size={16} color="var(--accent-brass)" />
                  <span style={{ fontSize: '0.86rem', fontWeight: '500' }}>{dir.name}</span>
                </div>
                <ChevronRight size={13} color="var(--text-muted)" />
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              {t('dirPickerEmpty')}
            </div>
          )}
        </div>

        {/* Nueva Carpeta Form / Botón */}
        <div style={{ marginTop: '12px' }}>
          {showNewFolderInput ? (
            <form onSubmit={handleCreateFolder} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input 
                type="text" 
                className="form-input" 
                style={{ padding: '7px 10px', fontSize: '0.84rem' }}
                placeholder={t('dirPickerNewFolderPlaceholder')}
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                autoFocus
              />
              <button 
                type="submit" 
                className="btn btn-primary btn-sm"
                disabled={creatingFolder || !newFolderName.trim()}
              >
                <Check size={13} />
                <span>{creatingFolder ? t('dirPickerCreating') : t('create')}</span>
              </button>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={() => { setShowNewFolderInput(false); setNewFolderName(''); }}
              >
                <X size={13} />
                <span>{t('cancel')}</span>
              </button>
            </form>
          ) : (
            <button 
              id="btn-open-create-folder"
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={() => setShowNewFolderInput(true)}
            >
              <FolderPlus size={13} color="var(--accent-brass)" />
              <span>{t('dirPickerNewFolder')}</span>
            </button>
          )}
        </div>

        {/* Footer Selección */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginTop: '16px', 
          paddingTop: '14px', 
          borderTop: '1px solid var(--border-subtle)' 
        }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '420px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {t('dirPickerSelectedPath')} <strong style={{ color: 'var(--text-primary)' }}>{currentPath}</strong>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm" 
              onClick={onClose}
            >
              {t('cancel')}
            </button>

            <button 
              id="btn-confirm-select-dir"
              type="button" 
              className="btn btn-primary btn-sm"
              onClick={() => {
                onSelect(currentPath);
                onClose();
              }}
            >
              <Check size={14} />
              <span>{t('dirPickerSelectBtn')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

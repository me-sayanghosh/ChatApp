import { useToast } from '../../context/ToastContext.jsx';

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (!toasts || toasts.length === 0) return null;

  function renderIcon(type, category) {
    const key = (category || type || '').toLowerCase();
    if (key.includes('dm') || key.includes('direct')) {
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C084FC" strokeWidth="2.2" strokeLinecap="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    }
    if (key.includes('channel')) {
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A7C2F" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
    }
    if (key.includes('mention')) {
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" />
        </svg>
      );
    }
    if (key.includes('success')) {
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    }
    if (key.includes('error')) {
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      );
    }
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2.2" strokeLinecap="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    );
  }

  function getBadgeLabel(toast) {
    const key = (toast.category || toast.type || '').toLowerCase();
    if (key.includes('dm') || key.includes('direct')) return { label: '💬 Direct Message', cls: 'dm' };
    if (key.includes('channel')) return { label: '🌐 Channel Message', cls: 'channel' };
    if (key.includes('mention')) return { label: '🏷️ Mention', cls: 'mention' };
    if (key.includes('success')) return { label: '✓ Success', cls: 'info' };
    if (key.includes('error')) return { label: '⚠ Error', cls: 'info' };
    return { label: '🔔 Notification', cls: 'info' };
  }

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        const badge = getBadgeLabel(toast);
        return (
          <div key={toast.id} className={`toast toast-${toast.type || 'info'}`}>
            <div className="toast-icon">{renderIcon(toast.type, toast.category)}</div>

            {toast.title ? (
              <div className="toast-body">
                <div className="toast-badge-row">
                  <span className={`toast-badge ${badge.cls}`}>{badge.label}</span>
                </div>
                <div className="toast-title">{toast.title}</div>
                {toast.snippet && <div className="toast-snippet">{toast.snippet}</div>}
              </div>
            ) : (
              <div className="toast-message">{toast.message}</div>
            )}

            <button className="toast-close-btn" onClick={() => removeToast(toast.id)} title="Dismiss">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}

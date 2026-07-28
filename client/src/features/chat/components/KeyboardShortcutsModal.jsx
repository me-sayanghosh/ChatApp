export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl + K / Cmd + K', description: 'Quick Switcher (Search & jump to any channel/DM)' },
    { key: 'Ctrl + / / Cmd + /', description: 'Open Keyboard Shortcuts cheat sheet' },
    { key: 'Escape', description: 'Close active modal, drawer, or search panel' },
    { key: 'Enter', description: 'Send message' },
    { key: 'Shift + Enter', description: 'Add new line in message composer' },
    { key: 'Up Arrow (in empty composer)', description: 'Edit last sent message' },
    { key: '@ (in composer)', description: 'Trigger user mention autocomplete' },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <line x1="6" y1="8" x2="6.01" y2="8" />
              <line x1="10" y1="8" x2="10.01" y2="8" />
              <line x1="14" y1="8" x2="14.01" y2="8" />
              <line x1="18" y1="8" x2="18.01" y2="8" />
              <line x1="6" y1="12" x2="6.01" y2="12" />
              <line x1="10" y1="12" x2="10.01" y2="12" />
              <line x1="14" y1="12" x2="14.01" y2="12" />
              <line x1="18" y1="12" x2="18.01" y2="12" />
              <line x1="7" y1="16" x2="17" y2="16" />
            </svg>
            Keyboard Shortcuts
          </h3>
          <button className="modal-close" onClick={onClose} title="Close">&times;</button>
        </div>

        <div className="shortcuts-list">
          {shortcuts.map((s, idx) => (
            <div key={idx} className="shortcut-row">
              <span className="shortcut-desc">{s.description}</span>
              <kbd className="shortcut-key">{s.key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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
          <h3>⌨️ Keyboard Shortcuts</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
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

import { useState, useEffect } from 'react';

export default function QuickSwitcherModal({ isOpen, onClose, rooms = [], conversations = [], onSelectChannel, onSelectDM }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!isOpen) return null;

  const filteredChannels = rooms.filter((r) => !r.isDM && r.name.toLowerCase().includes(query.toLowerCase()));
  const filteredDMs = conversations.filter((c) => c.partner?.username?.toLowerCase().includes(query.toLowerCase()));

  const allItems = [
    ...filteredChannels.map((c) => ({ type: 'channel', item: c, id: `c-${c.id}`, name: `#${c.name}` })),
    ...filteredDMs.map((d) => ({ type: 'dm', item: d, id: `d-${d.id}`, name: `@${d.partner?.username}` })),
  ];

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % (allItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + allItems.length) % (allItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        const target = allItems[selectedIndex];
        if (target.type === 'channel') {
          onSelectChannel(target.item);
        } else {
          onSelectDM(target.item);
        }
        onClose();
      }
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card quick-switcher-modal" onClick={(e) => e.stopPropagation()}>
        <div className="quick-switcher-input-box">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Type a channel or user name to jump... (Ctrl + K)"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <span className="shortcut-kbd">ESC to close</span>
        </div>

        <div className="quick-switcher-results">
          {allItems.length === 0 ? (
            <div className="quick-switcher-empty">No matching channels or conversations found</div>
          ) : (
            allItems.map((item, idx) => (
              <div
                key={item.id}
                className={`quick-switcher-item ${idx === selectedIndex ? 'selected' : ''}`}
                onClick={() => {
                  if (item.type === 'channel') onSelectChannel(item.item);
                  else onSelectDM(item.item);
                  onClose();
                }}
              >
                <span className="switcher-icon">{item.type === 'channel' ? '#' : '@'}</span>
                <span className="switcher-name">{item.name}</span>
                <span className="switcher-type">{item.type === 'channel' ? 'Channel' : 'Direct Message'}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

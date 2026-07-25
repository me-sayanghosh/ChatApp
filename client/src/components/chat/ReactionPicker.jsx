import { useState, useRef, useEffect } from 'react';

const EMOJI_LIST = [
  '\u{1F44D}', '\u{1F44E}', '\u{2764}\u{FE0F}', '\u{1F602}', '\u{1F622}',
  '\u{1F44F}', '\u{1F525}', '\u{1F389}', '\u{1F4AF}', '\u{1F60E}',
  '\u{1F914}', '\u{1F923}', '\u{1F60D}', '\u{1F621}', '\u{1F44C}',
  '\u{1F4AA}', '\u{1F48E}', '\u{2B50}', '\u{1F680}', '\u{1F3AF}',
];

export default function ReactionPicker({ onReact, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose?.();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div className="reaction-picker" ref={ref}>
      {EMOJI_LIST.map((emoji) => (
        <button
          key={emoji}
          className="reaction-emoji"
          onClick={() => { onReact(emoji); onClose?.(); }}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

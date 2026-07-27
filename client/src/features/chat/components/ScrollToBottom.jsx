import { useState, useEffect, useCallback, forwardRef } from 'react';

const ScrollToBottom = forwardRef(function ScrollToBottom({ containerRef }, ref) {
  const [visible, setVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const checkScroll = useCallback(() => {
    const el = containerRef?.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setVisible(distanceFromBottom > 120);
  }, [containerRef]);

  useEffect(() => {
    const el = containerRef?.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    checkScroll();
    return () => el.removeEventListener('scroll', checkScroll);
  }, [containerRef, checkScroll]);

  function scrollToBottom() {
    const el = containerRef?.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    setUnreadCount(0);
  }

  if (!visible) return null;

  return (
    <button className="scroll-to-bottom" onClick={scrollToBottom} ref={ref} title="Scroll to latest">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M19 12l-7 7-7-7" />
      </svg>
      {unreadCount > 0 && <span className="scroll-badge">{unreadCount}</span>}
    </button>
  );
});

export default ScrollToBottom;

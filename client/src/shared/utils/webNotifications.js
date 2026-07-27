// Web Audio API Synthesizer for instant crisp notification chime (no external audio asset needed)
export function playNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    // Pleasant 2-tone soft synth ping
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';

    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc1.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5

    osc2.frequency.setValueAtTime(880, ctx.currentTime);
    osc2.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.08); // D6

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.35);
    osc2.stop(ctx.currentTime + 0.35);
  } catch {
    // Audio context play error ignored
  }
}

// Request Browser Web Push Notification Permission
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }
  return Notification.permission;
}

// Show Native Browser Desktop Notification
export function showDesktopNotification(title, options = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  
  // Only show native desktop notification if user is tab-switched or window blurred
  if (document.hidden || !document.hasFocus()) {
    try {
      const n = new Notification(title, {
        body: options.body || '',
        icon: options.icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: options.tag || 'droptalk-notification',
      });

      n.onclick = () => {
        window.focus();
        if (options.onClick) options.onClick();
        n.close();
      };
    } catch (err) {
      console.warn('Desktop notification error:', err);
    }
  }
}

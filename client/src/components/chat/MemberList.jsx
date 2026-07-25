import { useState } from 'react';
import { api } from '../../utils/api.js';

const ROLE_COLORS = {
  owner: '#E8720C',
  moderator: '#A855F7',
  member: '#8A7A5C',
};

export default function MemberList({ members, online, roomId, currentUserId, onMemberUpdate }) {
  const [actionBusy, setActionBusy] = useState(null);

  const onlineIds = new Set(online.map((u) => u.id));

  async function kick(userId, ban = false) {
    const msg = ban ? 'Ban this member? They will not be able to rejoin.' : 'Kick this member?';
    if (!confirm(msg)) return;
    setActionBusy(userId);
    try {
      await api.post(`/rooms/${roomId}/members/${userId}/kick`, { ban });
      onMemberUpdate?.();
    } catch (err) {
      console.error(err);
    } finally {
      setActionBusy(null);
    }
  }

  async function toggleMute(userId) {
    setActionBusy(userId);
    try {
      await api.post(`/rooms/${roomId}/members/${userId}/mute`);
      onMemberUpdate?.();
    } catch (err) {
      console.error(err);
    } finally {
      setActionBusy(null);
    }
  }

  async function setRole(userId, role) {
    setActionBusy(userId);
    try {
      await api.post(`/rooms/${roomId}/members/${userId}/role`, { role });
      onMemberUpdate?.();
    } catch (err) {
      console.error(err);
    } finally {
      setActionBusy(null);
    }
  }

  const selfMember = members.find((m) => m.user === currentUserId);
  const canModerate = selfMember && (selfMember.role === 'owner' || selfMember.role === 'moderator');

  return (
    <div className="member-list">
      <h3>Members ({members.length})</h3>
      <ul>
        {members.map((m) => {
          const isOnline = onlineIds.has(m.user);
          const isSelf = m.user === currentUserId;
          const canActOn = canModerate && !isSelf && m.role !== 'owner' &&
            !(selfMember?.role === 'moderator' && m.role === 'moderator');

          return (
            <li key={m.user} className="member-item">
              <span className="member-status-dot" style={{ background: isOnline ? '#22c55e' : '#64748b' }} />
              <span className="member-name">
                {m.username || m.user.slice(0, 8)}
                {isSelf && <small> (you)</small>}
              </span>
              <span className="member-role" style={{ color: ROLE_COLORS[m.role] }}>
                <span className="role-badge">{m.role === 'owner' ? 'Owner' : m.role === 'moderator' ? 'Mod' : m.role}</span>
              </span>
              {m.muted && <span className="member-muted">muted</span>}
              {canActOn && (
                <div className="member-actions">
                  {m.role === 'member' && selfMember?.role === 'owner' && (
                    <button onClick={() => setRole(m.user, 'moderator')} disabled={actionBusy === m.user} title="Promote to moderator">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                    </button>
                  )}
                  {m.role === 'moderator' && selfMember?.role === 'owner' && (
                    <button onClick={() => setRole(m.user, 'member')} disabled={actionBusy === m.user} title="Demote to member">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
                    </button>
                  )}
                  <button onClick={() => toggleMute(m.user)} disabled={actionBusy === m.user} title={m.muted ? 'Unmute' : 'Mute'}>
                    {m.muted ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                    )}
                  </button>
                  <button onClick={() => kick(m.user, false)} disabled={actionBusy === m.user} title="Kick" className="kick-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                  <button onClick={() => kick(m.user, true)} disabled={actionBusy === m.user} title="Ban & Kick" className="kick-btn ban-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

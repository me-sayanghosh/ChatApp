import { useState } from 'react';
import { api } from '../api.js';

const ROLE_COLORS = {
  owner: '#f59e0b',
  moderator: '#8b5cf6',
  member: '#64748b',
};

const ROLE_ICONS = {
  owner: '\u265B',
  moderator: '\u2694',
  member: '',
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
                {ROLE_ICONS[m.role]} {m.role}
              </span>
              {m.muted && <span className="member-muted">muted</span>}
              {canActOn && (
                <div className="member-actions">
                  {m.role === 'member' && selfMember?.role === 'owner' && (
                    <button onClick={() => setRole(m.user, 'moderator')} disabled={actionBusy === m.user} title="Promote to moderator">
                      {'\u2B06'}
                    </button>
                  )}
                  {m.role === 'moderator' && selfMember?.role === 'owner' && (
                    <button onClick={() => setRole(m.user, 'member')} disabled={actionBusy === m.user} title="Demote to member">
                      {'\u2B07'}
                    </button>
                  )}
                  <button onClick={() => toggleMute(m.user)} disabled={actionBusy === m.user} title={m.muted ? 'Unmute' : 'Mute'}>
                    {m.muted ? '\u{1F50A}' : '\u{1F507}'}
                  </button>
                  <button onClick={() => kick(m.user, false)} disabled={actionBusy === m.user} title="Kick" className="kick-btn">
                    {'\u2716'}
                  </button>
                  <button onClick={() => kick(m.user, true)} disabled={actionBusy === m.user} title="Ban & Kick" className="kick-btn ban-btn">
                    {'\u{1F6AB}'}
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

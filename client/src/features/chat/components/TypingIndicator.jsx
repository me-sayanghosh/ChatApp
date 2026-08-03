export default function TypingIndicator({ typingUsers = [] }) {
  if (!typingUsers || typingUsers.length === 0) return null;

  const names = typingUsers.map((u) => {
    const raw = u.name || u.username || 'Someone';
    // Format username gracefully if it's an auto-generated ID string
    if (raw.startsWith('user_') && raw.length > 12) {
      return `@${raw.substring(0, 10)}...`;
    }
    return raw.startsWith('@') ? raw : `@${raw}`;
  });

  let text = '';
  if (names.length === 1) {
    text = `${names[0]} is typing`;
  } else if (names.length === 2) {
    text = `${names[0]} and ${names[1]} are typing`;
  } else {
    text = `${names[0]} and ${names.length - 1} others are typing`;
  }

  const firstUser = typingUsers[0];
  const initial = (firstUser?.username || firstUser?.name || 'U')[0].toUpperCase();
  const avatar = firstUser?.profileImage;

  return (
    <div className="typing-indicator-bar">
      <div className="typing-avatar">
        {avatar ? <img src={avatar} alt="Typing" /> : <span>{initial}</span>}
      </div>
      <div className="typing-dots-wave">
        <span className="dot dot-1"></span>
        <span className="dot dot-2"></span>
        <span className="dot dot-3"></span>
      </div>
      <span className="typing-text">{text}</span>
    </div>
  );
}

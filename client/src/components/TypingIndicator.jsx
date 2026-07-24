export default function TypingIndicator({ typingUsers }) {
  if (!typingUsers || typingUsers.length === 0) return null;

  const names = typingUsers.map((u) => u.username);
  let text = '';
  if (names.length === 1) {
    text = `${names[0]} is typing`;
  } else if (names.length === 2) {
    text = `${names[0]} and ${names[1]} are typing`;
  } else {
    text = `${names[0]} and ${names.length - 1} others are typing`;
  }

  return (
    <div className="typing-indicator">
      <span className="typing-dots">
        <span></span><span></span><span></span>
      </span>
      <span className="typing-text">{text}</span>
    </div>
  );
}

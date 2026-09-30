import React from 'react';
import { Bot, User, Copy, Check } from 'lucide-react';
import FormattedMessage from './FormattedMessage';

export default function ChatMessageItem({ message, index }) {
  const [copied, setCopied] = React.useState(false);
  const isUser = message.role === 'user';

  const copyFullMessage = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`chat-bubble-row ${isUser ? 'user-row' : 'assistant-row'}`}>
      <div className={`avatar-badge ${isUser ? 'avatar-user' : 'avatar-ai'}`}>
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      <div className={`chat-bubble-card ${isUser ? 'bubble-user' : 'bubble-assistant'}`}>
        <div className="bubble-header">
          <div className="sender-meta">
            <span className="sender-name">{isUser ? 'You (Developer)' : 'AI Hub Engine'}</span>
            {!isUser && message.model && (
              <span className="model-chip">{message.model}</span>
            )}
            {message.timestamp && (
              <span className="timestamp-text">{message.timestamp}</span>
            )}
          </div>
          <button
            onClick={copyFullMessage}
            className="copy-bubble-btn"
            title="Copy message"
            type="button"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          </button>
        </div>

        <div className="bubble-body">
          {isUser ? (
            <p className="user-raw-text">{message.content}</p>
          ) : (
            <FormattedMessage text={message.content} />
          )}
        </div>
      </div>
    </div>
  );
}

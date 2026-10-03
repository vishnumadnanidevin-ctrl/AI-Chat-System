import React, { useState } from 'react';
import { Bot, User, Copy, Check, Edit2, RotateCw, X } from 'lucide-react';
import FormattedMessage from './FormattedMessage';

export default function ChatMessageItem({ message, index, onEditMessage, disabled }) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(message.content);
  const isUser = message.role === 'user';

  const copyFullMessage = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(message.content);
      } else {
        // Fallback for non-secure contexts (e.g. IP or HTTP)
        const textArea = document.createElement('textarea');
        textArea.value = message.content;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  const handleStartEdit = () => {
    setEditDraft(message.content);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditDraft(message.content);
    setIsEditing(false);
  };

  const handleSaveAndResubmit = () => {
    if (!editDraft.trim() || disabled) return;
    setIsEditing(false);
    if (onEditMessage) {
      onEditMessage(index, editDraft, isUser);
    }
  };

  const handleSaveOnly = () => {
    if (!editDraft.trim()) return;
    setIsEditing(false);
    if (onEditMessage) {
      onEditMessage(index, editDraft, false);
    }
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
          <div className="bubble-actions">
            {!isEditing && (
              <button
                onClick={handleStartEdit}
                className="action-bubble-btn"
                title="Edit message"
                type="button"
                disabled={disabled}
              >
                <Edit2 size={13} />
              </button>
            )}
            <button
              onClick={copyFullMessage}
              className="action-bubble-btn"
              title="Copy message"
              type="button"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>
          </div>
        </div>

        <div className="bubble-body">
          {message.attachments && message.attachments.length > 0 && (
            <div className="message-attachments-preview">
              {message.attachments.map((att, i) => (
                <div key={i} className="msg-attachment-item">
                  {att.type === 'image' || (att.data && att.data.startsWith('data:image')) ? (
                    <img src={att.data} alt={att.name} className="msg-attachment-img" />
                  ) : (
                    <div className="msg-attachment-file">
                      <span className="file-icon">📄</span>
                      <span className="file-name">{att.name}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {isEditing ? (
            <div className="edit-message-container">
              <textarea
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                className="edit-message-textarea"
                rows={Math.max(3, editDraft.split('\n').length)}
                autoFocus
              />
              <div className="edit-message-actions">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="edit-btn-cancel"
                >
                  <X size={12} />
                  <span>Cancel</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveOnly}
                  className="edit-btn-save"
                >
                  <span>Save</span>
                </button>
                {isUser && (
                  <button
                    type="button"
                    onClick={handleSaveAndResubmit}
                    disabled={disabled}
                    className="edit-btn-resubmit"
                  >
                    <RotateCw size={12} />
                    <span>Save & Send</span>
                  </button>
                )}
              </div>
            </div>
          ) : isUser ? (
            <p className="user-raw-text">{message.content}</p>
          ) : (
            <FormattedMessage text={message.content} />
          )}
        </div>
      </div>
    </div>
  );
}

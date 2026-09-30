import React, { useMemo } from 'react';
import CodeBlock from './CodeBlock';

/**
 * Parses markdown-like text to format code blocks, bold text, inline code, and lists
 */
export default function FormattedMessage({ text }) {
  const parts = useMemo(() => {
    if (!text) return [];

    const segments = [];
    const codeBlockRegex = /```([a-zA-Z0-9_\-\+]*)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push({
          type: 'text',
          content: text.slice(lastIndex, match.index),
        });
      }

      segments.push({
        type: 'code',
        language: match[1] || 'plaintext',
        code: match[2].trimEnd(),
      });

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex),
      });
    }

    return segments;
  }, [text]);

  const renderInline = (str) => {
    // Process inline code `foo` and bold **bar**
    const parts = [];
    const inlineRegex = /(`[^`]+`|\*\*[^*]+\*\*)/g;
    let lastIdx = 0;
    let inlineMatch;

    while ((inlineMatch = inlineRegex.exec(str)) !== null) {
      if (inlineMatch.index > lastIdx) {
        parts.push(str.slice(lastIdx, inlineMatch.index));
      }

      const matchText = inlineMatch[0];
      if (matchText.startsWith('`') && matchText.endsWith('`')) {
        parts.push(
          <code key={inlineMatch.index} className="inline-code">
            {matchText.slice(1, -1)}
          </code>
        );
      } else if (matchText.startsWith('**') && matchText.endsWith('**')) {
        parts.push(
          <strong key={inlineMatch.index}>
            {matchText.slice(2, -2)}
          </strong>
        );
      }

      lastIdx = inlineMatch.index + matchText.length;
    }

    if (lastIdx < str.length) {
      parts.push(str.slice(lastIdx));
    }

    return parts.length > 0 ? parts : str;
  };

  return (
    <div className="message-content">
      {parts.map((part, index) => {
        if (part.type === 'code') {
          return (
            <CodeBlock
              key={index}
              language={part.language}
              code={part.code}
            />
          );
        }

        return (
          <div key={index} className="text-paragraph">
            {part.content.split('\n\n').map((paragraph, pIdx) => {
              if (paragraph.startsWith('### ')) {
                return (
                  <h3 key={pIdx} className="markdown-h3">
                    {paragraph.replace('### ', '')}
                  </h3>
                );
              }
              if (paragraph.startsWith('## ')) {
                return (
                  <h2 key={pIdx} className="markdown-h2">
                    {paragraph.replace('## ', '')}
                  </h2>
                );
              }
              if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
                const listItems = paragraph.split('\n').filter(Boolean);
                return (
                  <ul key={pIdx} className="markdown-list">
                    {listItems.map((li, lIdx) => (
                      <li key={lIdx}>
                        {renderInline(li.replace(/^[-*]\s+/, ''))}
                      </li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={pIdx} className="markdown-p">
                  {renderInline(paragraph)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

import React from 'react'

export default function FormattedMessage({ content }) {
  const safeContent = content || ""
  // Split by code blocks first
  const parts = safeContent.split(/(```[\s\S]*?```)/g);

  return (
    <div>
      {parts.map((part, i) => {
        // Code block
        if (part.startsWith('```')) {
          const code = part.slice(3).replace(/^.*\n/, '').replace(/```$/, '');
          const langMatch = part.slice(3).match(/^([a-zA-Z0-9_-]+)\n/);
          const lang = langMatch ? langMatch[1] : '';
          return (
            <div key={i} className="my-3">
              {lang && (
                <div className="flex items-center justify-between
                  bg-gray-800 text-gray-400 text-xs px-3 py-1.5
                  rounded-t-lg border-b border-gray-700">
                  <span>{lang}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(code)}
                    className="hover:text-white transition-colors"
                  >
                    Copy
                  </button>
                </div>
              )}
              <pre className={`bg-gray-900 text-gray-100 text-xs p-4
                ${lang ? 'rounded-b-lg rounded-tl-none' : 'rounded-lg'} overflow-x-auto scrollbar-hide
                font-mono leading-relaxed`}>
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        // Regular text — handle inline formatting
        const lines = part.split('\n');
        return (
          <div key={i}>
            {lines.map((line, j) => {
              // Bullet points
              if (line.match(/^[-*]\s/)) {
                return (
                  <div key={j} className="flex gap-2 my-0.5">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span>{formatInline(line.slice(2))}</span>
                  </div>
                );
              }
              // Headers
              if (line.startsWith('### ')) {
                return <p key={j} className="font-semibold mt-3 mb-1 text-gray-900">{line.slice(4)}</p>;
              }
              if (line.startsWith('## ')) {
                return <p key={j} className="font-bold mt-4 mb-1 text-gray-900">{line.slice(3)}</p>;
              }
              // Normal line
              return line ? (
                <p key={j} className="my-0.5">{formatInline(line)}</p>
              ) : (
                <br key={j} />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function formatInline(text) {
  // Bold: **text**
  // Code: `text`
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="bg-gray-100 text-gray-800 px-1.5 py-0.5
          rounded text-xs font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

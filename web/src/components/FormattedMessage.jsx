import React from 'react'

export default function FormattedMessage({ content }) {
  const safeContent = content || ''
  const parts = safeContent.split(/(```[\s\S]*?```)/g)

  return (
    <div className="w-full max-w-full space-y-3">
      {parts.map((part, index) => {
        if (part.startsWith('```')) {
          const code = part.slice(3).replace(/^.*\n/, '').replace(/```$/, '')
          const langMatch = part.slice(3).match(/^([a-zA-Z0-9_-]+)\n/)
          const lang = langMatch ? langMatch[1] : ''

          return (
            <div key={index} className="overflow-hidden rounded-3xl border border-white/8 bg-[#151210]">
              <div className="flex items-center justify-between border-b border-white/6 px-4 py-2 text-xs text-app-muted">
                <span>{lang || 'code'}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(code)}
                  className="transition hover:text-app-text"
                >
                  Copy
                </button>
              </div>
              <pre className="overflow-x-auto px-4 py-4 text-sm leading-6 text-[#f8f3eb]">
                <code>{code}</code>
              </pre>
            </div>
          )
        }

        return (
          <div key={index} className="space-y-3">
            {part.split('\n').map((line, lineIndex) => {
              if (line.match(/^[-*]\s/)) {
                return (
                  <div key={lineIndex} className="flex gap-3">
                    <span className="mt-2 text-app-muted">•</span>
                    <span className="flex-1">{formatInline(line.slice(2))}</span>
                  </div>
                )
              }

              if (line.startsWith('### ')) {
                return (
                  <p key={lineIndex} className="text-base font-semibold text-app-text">
                    {line.slice(4)}
                  </p>
                )
              }

              if (line.startsWith('## ')) {
                return (
                  <p key={lineIndex} className="text-lg font-semibold text-app-text">
                    {line.slice(3)}
                  </p>
                )
              }

              return line ? (
                <p key={lineIndex} className="w-full whitespace-pre-wrap break-words text-app-text/95">
                  {formatInline(line)}
                </p>
              ) : (
                <div key={lineIndex} className="h-3" />
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

function formatInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-app-text">
          {part.slice(2, -2)}
        </strong>
      )
    }

    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          className="max-w-full break-all rounded-md border border-white/8 bg-white/5 px-1.5 py-0.5 text-[13px] text-app-accent-soft"
        >
          {part.slice(1, -1)}
        </code>
      )
    }

    return <React.Fragment key={index}>{part}</React.Fragment>
  })
}

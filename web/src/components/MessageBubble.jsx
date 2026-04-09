import React from 'react'
import { motion } from 'framer-motion'
import FormattedMessage from './FormattedMessage'

function formatModelLabel(model) {
  if (!model) return ''

  const known = {
    'claude-haiku-4.5': 'Claude Haiku 4.5',
    'claude-sonnet-4.5': 'Claude Sonnet 4.5',
    'claude-opus-4.5': 'Claude Opus 4.5',
    'gpt-5.3-codex': 'GPT-5.3 Codex',
    'gpt-5-mini': 'GPT-5 Mini',
  }

  return known[model] || model
}

export default function MessageBubble({ message, sessionModel = null }) {
  const isUser = message.role === 'user'
  const responseModel = message.model || sessionModel

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end py-3"
      >
        <div className="max-w-[85%] rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] px-5 py-4 shadow-[0_18px_44px_rgba(0,0,0,0.18)] md:max-w-[72%]">
          <p className="whitespace-pre-wrap break-words text-[15px] leading-7 text-[var(--color-app-text)]">
            {message.content}
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-4 py-5"
    >
      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] border border-amber-400/18 bg-amber-500/10 text-amber-200">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-[15px] leading-7 text-[var(--color-app-text)]">
          <FormattedMessage content={message.content} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[var(--color-app-muted)]">
          {responseModel && (
            <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1">
              {formatModelLabel(responseModel)}
            </span>
          )}

          {message.toolsUsed && message.toolsUsed.length > 0 && (
            message.toolsUsed.map((tool, index) => (
              <span
                key={`${tool}-${index}`}
                className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1"
              >
                {tool}
              </span>
            ))
          )}

          {message.timestamp && (
            <span>
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

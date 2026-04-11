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
        className="flex justify-end py-2.5"
      >
        <div className="max-w-[92%] rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] px-4 py-3 shadow-[0_18px_44px_rgba(0,0,0,0.18)] sm:max-w-[85%] md:max-w-[72%]">
          <p className="whitespace-pre-wrap break-words text-[14px] leading-6 text-app-text sm:text-[15px] sm:leading-7">
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
      className="flex w-full max-w-full gap-3 py-4 sm:gap-4 sm:py-5"
    >
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-[14px] border border-amber-400/18 bg-amber-500/10 text-amber-200 sm:h-10 sm:w-10 sm:rounded-[18px]">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      </div>

      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="w-full max-w-full text-[14px] leading-6 text-app-text sm:text-[15px] sm:leading-7">
          <FormattedMessage content={message.content} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-app-muted sm:mt-4">
          {responseModel && (
            <span className="max-w-full truncate rounded-full border border-white/8 bg-white/4 px-2.5 py-1">
              {formatModelLabel(responseModel)}
            </span>
          )}

          {message.toolsUsed && message.toolsUsed.length > 0 && (
            message.toolsUsed.map((tool, index) => (
              <span
                key={`${tool}-${index}`}
                className="max-w-full truncate rounded-full border border-white/8 bg-white/3 px-2.5 py-1"
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

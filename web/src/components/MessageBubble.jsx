import React from 'react'
import FormattedMessage from './FormattedMessage'
import { motion } from 'framer-motion'

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
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        <div className="flex gap-4">
          <div className="flex-1 min-w-0" />
          <div className="flex-1 max-w-[85%] sm:max-w-[75%] min-w-0 text-right">
             <div className="inline-block bg-zinc-800 text-zinc-100 rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed shadow-sm">
                <p className="whitespace-pre-wrap text-left break-words">{message.content}</p>
             </div>
          </div>
        </div>
      </motion.div>
    )
  }

  // Assistant message
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full flex gap-4 md:gap-6 py-2"
    >
      {/* Avatar */}
      <div className="w-8 h-8 rounded-lg bg-transparent border border-zinc-700/50 flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-amber-500" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
           <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </div>

      <div className="flex-1 min-w-0 pt-1">
        {/* Content */}
        <div className="text-[15px] text-zinc-300 leading-relaxed prose-sm">
          <FormattedMessage content={message.content} />
        </div>

        {/* Metadata */}
        <div className="mt-3 flex items-center gap-3">
          {responseModel && (
            <span className="inline-flex items-center px-2.5 py-1 bg-zinc-800/70 text-zinc-300 text-xs rounded-md border border-zinc-700/50">
              {formatModelLabel(responseModel)}
            </span>
          )}

          {message.toolsUsed && message.toolsUsed.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {message.toolsUsed.map((tool, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800/80 text-zinc-400 text-xs rounded-md border border-zinc-700/50 hover:bg-zinc-700/50 transition-colors cursor-default">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-70"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
                  {tool}
                </span>
              ))}
            </div>
          )}
          
          {(message.tokensUsed || message.timestamp) && (
            <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
              {message.tokensUsed && <span>{message.tokensUsed} t</span>}
              {message.tokensUsed && message.timestamp && <span>·</span>}
              {message.timestamp && (
                <span>
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

import React from 'react'
import { motion } from 'framer-motion'

export default function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className="flex w-full max-w-full gap-4 py-5"
    >
      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] border border-amber-400/18 bg-amber-500/10 text-amber-200">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      </div>

      <div className="min-w-0 max-w-full rounded-3xl border border-white/8 bg-white/3 px-4 py-3 text-sm text-app-muted">
        <div className="flex items-center gap-3">
          <span className="truncate">OpenTop is thinking</span>
          <div className="flex items-center gap-1.5">
            <span className="typing-dot h-2 w-2 rounded-full bg-amber-300" />
            <span className="typing-dot h-2 w-2 rounded-full bg-amber-300" />
            <span className="typing-dot h-2 w-2 rounded-full bg-amber-300" />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

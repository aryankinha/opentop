import { motion } from 'framer-motion'
import { ThinkingSteps } from './Chat/ThinkingSteps'

export default function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="w-full flex gap-4 md:gap-6 py-2"
    >
      <div className="w-8 h-8 rounded-lg border border-[hsl(var(--border))] flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-5 h-5 text-[hsl(var(--muted-foreground))]"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      </div>

      <div className="flex-1 min-w-0 pt-1">
        <ThinkingSteps className="w-full" />
      </div>
    </motion.div>
  )
}

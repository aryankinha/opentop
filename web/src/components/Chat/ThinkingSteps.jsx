import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// Step phrases pool (randomized each time)
const STEP_POOLS = {
  start: [
    'Thinking...',
    'Processing request...',
    'Understanding context...',
  ],
  middle: [
    'Analyzing your request...',
    'Gathering information...',
    'Consulting knowledge base...',
    'Reviewing context...',
  ],
  generate: [
    'Generating response...',
    'Crafting answer...',
    'Composing reply...',
    'Building response...',
  ],
  finalize: [
    'Optimizing output...',
    'Finalizing...',
    'Almost done...',
    'Polishing response...',
  ],
}

/**
 * Get a randomized set of steps
 */
function getRandomSteps() {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
  
  return [
    pick(STEP_POOLS.start),
    pick(STEP_POOLS.middle),
    pick(STEP_POOLS.generate),
    pick(STEP_POOLS.finalize),
  ]
}

/**
 * Progressive loading animation with step-by-step indicators
 * Shows AI thinking process in a subtle, Claude-style manner
 */
export function ThinkingSteps({ className }) {
  const [steps, setSteps] = useState(() => getRandomSteps())
  const [currentStep, setCurrentStep] = useState(0)
  const [cycle, setCycle] = useState(0)

  useEffect(() => {
    const isCycleComplete = currentStep >= steps.length
    const delay = isCycleComplete ? 450 : 600 + Math.random() * 600

    const timer = setTimeout(() => {
      if (isCycleComplete) {
        setSteps(getRandomSteps())
        setCurrentStep(0)
        setCycle((prev) => prev + 1)
        return
      }

      setCurrentStep((prev) => prev + 1)
    }, delay)

    return () => clearTimeout(timer)
  }, [currentStep, steps])

  return (
    <div className={cn("space-y-3", className)}>
      <AnimatePresence mode="popLayout">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep
          const isActive = index === currentStep
          const isPending = index > currentStep

          // Don't show pending steps
          if (isPending) return null

          return (
            <StepItem
              key={`${cycle}-${index}-${step}`}
              text={step}
              isCompleted={isCompleted}
              isActive={isActive}
              delay={index * 0.1}
            />
          )
        })}
      </AnimatePresence>
    </div>
  )
}

/**
 * Individual step item with icon and text
 */
function StepItem({ text, isCompleted, isActive, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        duration: 0.3,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className="flex items-center gap-3"
    >
      {/* Icon */}
      <div className="flex-shrink-0">
        {isCompleted ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center"
          >
            <Check className="w-2.5 h-2.5 text-emerald-400" strokeWidth={3} />
          </motion.div>
        ) : isActive ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="w-4 h-4 flex items-center justify-center"
          >
            <Loader2 className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          </motion.div>
        ) : (
          <div className="w-4 h-4 rounded-full border-2 border-[hsl(var(--border))] opacity-30" />
        )}
      </div>

      {/* Text */}
      <motion.span
        className={cn(
          "text-sm transition-colors duration-300",
          isCompleted && "text-[hsl(var(--muted-foreground))] opacity-60",
          isActive && "text-[hsl(var(--foreground))]",
          !isCompleted && !isActive && "text-[hsl(var(--muted-foreground))] opacity-30"
        )}
        animate={isActive ? {
          opacity: [0.7, 1, 0.7],
        } : {}}
        transition={isActive ? {
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        } : {}}
      >
        {text}
      </motion.span>
    </motion.div>
  )
}

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

export function TypingIndicator({ className }) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span 
        className="w-2 h-2 rounded-full bg-[hsl(var(--muted-foreground))]"
        style={{ animation: 'pulse-dot 1.4s infinite', animationDelay: '0ms' }}
      />
      <span 
        className="w-2 h-2 rounded-full bg-[hsl(var(--muted-foreground))]"
        style={{ animation: 'pulse-dot 1.4s infinite', animationDelay: '200ms' }}
      />
      <span 
        className="w-2 h-2 rounded-full bg-[hsl(var(--muted-foreground))]"
        style={{ animation: 'pulse-dot 1.4s infinite', animationDelay: '400ms' }}
      />
    </div>
  )
}

export function TypingEffect({ text, speed = 20, onComplete }) {
  const [displayedText, setDisplayedText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex])
        setCurrentIndex(prev => prev + 1)
      }, speed)
      return () => clearTimeout(timer)
    } else if (onComplete) {
      onComplete()
    }
  }, [currentIndex, text, speed, onComplete])

  return (
    <span>
      {displayedText}
      {currentIndex < text.length && (
        <span 
          className="inline-block w-0.5 h-4 bg-[hsl(var(--primary))] ml-0.5"
          style={{ animation: 'typing-cursor 0.7s infinite' }}
        />
      )}
    </span>
  )
}

export function ThinkingMessage() {
  return (
    <div className="py-8 px-4 md:px-6 animate-fade-in">
      <div className="max-w-3xl mx-auto flex gap-4">
        {/* Avatar */}
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-purple-500/30">
          <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold">OpenTop</span>
            <span className="text-xs text-[hsl(var(--muted-foreground))] animate-pulse">is thinking...</span>
          </div>
          <TypingIndicator />
        </div>
      </div>
    </div>
  )
}

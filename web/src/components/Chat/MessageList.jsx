import { useEffect, useRef, useState, useCallback } from 'react'
import { Message } from './Message'
import { ThinkingSteps } from './ThinkingSteps'
import { ChevronDown, Loader2 } from 'lucide-react'

export function MessageList({ messages, isLoading, isSending, onSuggestionClick }) {
  const containerRef = useRef(null)
  const bottomRef = useRef(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isAtBottom, setIsAtBottom] = useState(true)

  const checkScrollPosition = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    
    const threshold = 100
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold
    setIsAtBottom(isNearBottom)
    setShowScrollButton(!isNearBottom && messages.length > 0)
  }, [messages.length])

  useEffect(() => {
    if (isAtBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isSending, isAtBottom])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.addEventListener('scroll', checkScrollPosition)
    return () => container.removeEventListener('scroll', checkScrollPosition)
  }, [checkScrollPosition])

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--muted-foreground))]" />
      </div>
    )
  }

  // Empty state
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-semibold mb-3">OpenTop</h2>
          <p className="text-base text-[hsl(var(--muted-foreground))] leading-relaxed">
            AI agent powered by GitHub Copilot. Start a conversation below.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto relative">
      <div className="py-6">
        {messages.map((message, index) => (
          <Message key={index} message={message} />
        ))}

        {/* Thinking animation */}
        {isSending && (
          <div className="py-6 px-6">
            <div className="max-w-3xl mx-auto">
              <div className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-4">OpenTop</div>
              <ThinkingSteps />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 p-2.5 rounded-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors shadow-lg"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}

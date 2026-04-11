import React, { useEffect, useRef, useState } from 'react'
import { ArrowUp, Plus, Square } from 'lucide-react'
import ModelSelector from './ModelSelector'

export default function ChatInput({
  input,
  setInput,
  onSend,
  onCancel,
  isLoading,
  isInitial = false,
  initialModel = null,
}) {
  const inputRef = useRef(null)
  const [selectedModel, setSelectedModel] = useState(
    () => localStorage.getItem('selectedModel') || 'claude-sonnet-4.5',
  )
  const previousInitialModelRef = useRef(initialModel)

  useEffect(() => {
    // Only sync when the incoming initial model changes (e.g. switching chats).
    // Do not override user selection inside the same chat.
    if (initialModel && initialModel !== previousInitialModelRef.current) {
      setSelectedModel(initialModel)
      localStorage.setItem('selectedModel', initialModel)
    }
    previousInitialModelRef.current = initialModel
  }, [initialModel])

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 220)}px`
    }
  }, [input])

  const handleSend = () => {
    onSend(input, selectedModel)
  }

  return (
    <div className={`mx-auto w-full ${isInitial ? 'max-w-2xl' : 'max-w-3xl'}`}>
      <div className="rounded-[24px] border border-[var(--color-app-border)] bg-[var(--color-app-soft)] px-2 py-2 sm:px-3 md:px-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
          <button
            className="mb-0 hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-[var(--color-app-muted)] transition hover:bg-white/[0.08] hover:text-[var(--color-app-text)] sm:flex"
            type="button"
          >
            <Plus className="h-4 w-4" />
          </button>

          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                handleSend()
              }
            }}
            placeholder={isInitial ? 'Message OpenTop' : 'Reply to OpenTop'}
            disabled={isLoading}
            rows={1}
            className="max-h-[220px] min-h-[48px] flex-1 resize-none bg-transparent px-3 py-3 text-[14px] sm:text-[15px] leading-6 sm:leading-7 text-[var(--color-app-text)] outline-none placeholder:text-[var(--color-app-muted)]"
            autoFocus={isInitial}
          />

          <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto sm:mb-1">
            <ModelSelector currentModel={selectedModel} onSelect={(modelId) => {
              setSelectedModel(modelId)
              localStorage.setItem('selectedModel', modelId)
            }} />

            <button
              onClick={isLoading ? onCancel : handleSend}
              disabled={isLoading ? !onCancel : !input.trim()}
              className={[
                'flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl transition',
                isLoading
                  ? 'bg-[#da7756] text-white hover:bg-[#ca6a4b]'
                  : input.trim()
                  ? 'bg-[var(--color-app-text)] text-[#181513] hover:bg-white'
                  : 'bg-white/[0.05] text-[var(--color-app-muted)]',
              ].join(' ')}
              aria-label={isLoading ? 'Cancel message' : 'Send message'}
            >
              {isLoading ? (
                <Square className="h-4 w-4" fill="currentColor" />
              ) : (
                <ArrowUp className="h-4 w-4 sm:h-4.5 sm:w-4.5" strokeWidth={2.2} />
              )}
            </button>
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-[var(--color-app-muted)]">
        OpenTop can act on your machine. Review important output before you trust it.
      </p>
    </div>
  )
}

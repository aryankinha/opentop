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
    if (!input.trim() || isLoading) return
    onSend(input, selectedModel)
  }

  return (
    <div className={`mx-auto w-full ${isInitial ? 'max-w-3xl' : 'max-w-3xl'}`}>
      <div className="rounded-[22px] border border-[var(--color-app-border)] bg-[var(--color-app-soft)] px-2 py-2 sm:px-3">
        <div className="flex flex-col gap-2">
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
            className="max-h-[220px] min-h-[44px] w-full resize-none bg-transparent px-3 py-2.5 text-[14px] leading-6 text-[var(--color-app-text)] outline-none placeholder:text-[var(--color-app-muted)] sm:text-[15px] sm:leading-7"
            autoFocus={isInitial}
          />

          <div className="flex items-center justify-between gap-2 px-1 pb-1">
            <button
              className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04] text-[var(--color-app-muted)] transition hover:bg-white/[0.08] hover:text-[var(--color-app-text)] sm:flex"
              type="button"
            >
              <Plus className="h-4 w-4" />
            </button>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <ModelSelector currentModel={selectedModel} onSelect={(modelId) => {
                setSelectedModel(modelId)
                localStorage.setItem('selectedModel', modelId)
              }} />

              <button
                onClick={isLoading ? onCancel : handleSend}
                disabled={isLoading ? !onCancel : !input.trim()}
                className={[
                  'flex h-10 w-10 items-center justify-center rounded-xl transition sm:h-11 sm:w-11',
                  isLoading
                    ? 'bg-[#da7756] text-white hover:bg-[#ca6a4b]'
                    : input.trim()
                    ? 'bg-[var(--color-app-text)] text-[#181513] hover:bg-white'
                    : 'bg-white/[0.05] text-[var(--color-app-muted)]',
                ].join(' ')}
                aria-label={isLoading ? 'Cancel message' : 'Send message'}
                type="button"
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
      </div>

      <p className="mt-2 text-center text-xs text-[var(--color-app-muted)]">
        OpenTop can act on your machine. Review important output before you trust it.
      </p>
    </div>
  )
}

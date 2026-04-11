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

  useEffect(() => {
    if (initialModel && initialModel !== selectedModel) {
      setSelectedModel(initialModel)
      localStorage.setItem('selectedModel', initialModel)
    }
  }, [initialModel, selectedModel])

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
      <div className="rounded-[24px] border border-[var(--color-app-border)] bg-[var(--color-app-soft)] px-3 py-2 md:px-4">
        <div className="flex items-end gap-3">
          <button
            className="mb-1 hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-[var(--color-app-muted)] transition hover:bg-white/[0.08] hover:text-[var(--color-app-text)] sm:flex"
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
            className="max-h-[220px] min-h-[72px] flex-1 resize-none bg-transparent px-2 py-3 text-[15px] leading-7 text-[var(--color-app-text)] outline-none placeholder:text-[var(--color-app-muted)]"
            autoFocus={isInitial}
          />

          <div className="mb-1 flex shrink-0 items-center gap-2">
            <ModelSelector currentModel={selectedModel} onSelect={(modelId) => {
              setSelectedModel(modelId)
              localStorage.setItem('selectedModel', modelId)
            }} />

            <button
              onClick={isLoading ? onCancel : handleSend}
              disabled={isLoading ? !onCancel : !input.trim()}
              className={[
                'flex h-11 w-11 items-center justify-center rounded-2xl transition',
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
                <ArrowUp className="h-4.5 w-4.5" strokeWidth={2.2} />
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

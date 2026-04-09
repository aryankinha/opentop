import React, { useEffect, useRef, useState } from 'react'
import { ArrowUp, Plus } from 'lucide-react'
import ModelSelector from './ModelSelector'

export default function ChatInput({
  input,
  setInput,
  onSend,
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
    <div className={`mx-auto w-full ${isInitial ? 'max-w-3xl' : 'max-w-4xl'}`}>
      <div className="app-panel rounded-[30px] bg-[rgba(29,25,23,0.96)] px-3 py-3 md:px-4">
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
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className={[
                'flex h-11 w-11 items-center justify-center rounded-2xl transition',
                input.trim() && !isLoading
                  ? 'bg-[var(--color-app-text)] text-[#181513] hover:bg-[#fff8ef]'
                  : 'bg-white/[0.05] text-[var(--color-app-muted)]',
              ].join(' ')}
              aria-label="Send message"
            >
              <ArrowUp className="h-4.5 w-4.5" strokeWidth={2.2} />
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

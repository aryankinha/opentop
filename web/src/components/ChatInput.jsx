import React, { useRef, useEffect, useState } from 'react'
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
    () => localStorage.getItem('selectedModel') || 'claude-sonnet-4.5'
  )

  useEffect(() => {
    if (initialModel && initialModel !== selectedModel) {
      setSelectedModel(initialModel)
      localStorage.setItem('selectedModel', initialModel)
    }
  }, [initialModel, selectedModel])

  const handleSelectModel = (modelId) => {
    setSelectedModel(modelId)
    localStorage.setItem('selectedModel', modelId)
  }

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + 'px'
    }
  }, [input])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend(input, selectedModel)
    }
  }

  return (
    <div className={`w-full ${isInitial ? 'max-w-2xl' : 'max-w-3xl'} mx-auto transition-all duration-300`}>
      <div className="relative flex flex-col bg-zinc-800/80 rounded-2xl md:rounded-[24px] border border-zinc-700/50 focus-within:border-zinc-500/50 focus-within:ring-4 focus-within:ring-zinc-700/20 shadow-sm focus-within:shadow-md transition-all duration-200">
        
        {/* Top input area */}
        <div className="flex pt-3 px-4">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isInitial ? "How can I help you today?" : "Reply to OpenTop..."}
            disabled={isLoading}
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-[15px] text-zinc-100 placeholder-zinc-500 max-h-[200px] overflow-y-auto scrollbar-hide py-1 leading-relaxed"
            autoFocus={isInitial}
          />
        </div>

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-3 pb-3 pt-2">
          {/* Left tools (+) */}
          <button className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-full hover:bg-zinc-700/50 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>

          {/* Right tools (Model + Send) */}
          <div className="flex items-center gap-2">
            <ModelSelector currentModel={selectedModel} onSelect={handleSelectModel} />
            
            <button
              onClick={() => onSend(input, selectedModel)}
              disabled={isLoading || !input.trim()}
              className={`
                w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 ml-1
                ${input.trim() && !isLoading
                  ? 'bg-zinc-200 text-zinc-900 hover:bg-white'
                  : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                }
              `}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"></line>
                <polyline points="5 12 12 5 19 12"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {!isInitial && (
        <p className="text-center text-xs text-zinc-500 mt-2">
          OpenTop can make mistakes. Please verify important information.
        </p>
      )}
    </div>
  )
}

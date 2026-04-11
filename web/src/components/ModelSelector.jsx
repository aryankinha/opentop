import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

const MODEL_GROUPS = {
  Claude: [
    { id: 'claude-sonnet-4.5', label: 'Sonnet 4.5', multiplier: '1x' },
    { id: 'claude-haiku-4.5', label: 'Haiku 4.5', multiplier: '0.33x' },
    { id: 'claude-opus-4.5', label: 'Opus 4.5', multiplier: '3x' },
  ],
  GPT: [
    { id: 'gpt-5.3-codex', label: 'GPT-5.3 Codex', multiplier: '1x' },
    { id: 'gpt-5-mini', label: 'GPT-5 Mini', multiplier: '0x' },
  ],
}

export default function ModelSelector({ currentModel, onSelect }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selected = useMemo(() => {
    for (const groupModels of Object.values(MODEL_GROUPS)) {
      const found = groupModels.find((model) => model.id === currentModel)
      if (found) return found
    }
    return MODEL_GROUPS.Claude[0]
  }, [currentModel])

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1.5 sm:gap-2 rounded-2xl border border-white/8 bg-white/[0.04] px-2 py-2 sm:px-3 text-xs sm:text-sm text-[var(--color-app-text)] transition hover:bg-white/[0.08] whitespace-nowrap"
      >
        <span className="truncate max-w-[80px] sm:max-w-none">{selected.label}</span>
        <ChevronDown className={`h-3.5 w-3.5 sm:h-4 sm:w-4 text-[var(--color-app-muted)] transition flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute bottom-full right-0 z-50 mb-3 w-56 overflow-hidden rounded-[24px] border border-[var(--color-app-border)] bg-[var(--color-app-panel-strong)] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          {Object.entries(MODEL_GROUPS).map(([groupName, models]) => (
            <div key={groupName} className="mb-1 last:mb-0">
              <div className="px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--color-app-muted)]">
                {groupName}
              </div>
              {models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    onSelect(model.id)
                    setOpen(false)
                  }}
                  className={[
                    'flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-sm transition',
                    currentModel === model.id
                      ? 'bg-white/[0.08] text-[var(--color-app-text)]'
                      : 'text-[var(--color-app-muted)] hover:bg-white/[0.04] hover:text-[var(--color-app-text)]',
                  ].join(' ')}
                >
                  <span>{model.label}</span>
                  <span className="text-[10px] font-mono">{model.multiplier}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

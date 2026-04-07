import React, { useState, useRef, useEffect } from 'react'

export default function ModelSelector({ currentModel, onSelect }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const models = {
    'Claude': [
      { id: 'claude-sonnet-4.5', label: 'Sonnet 4.5', multiplier: '1x' },
      { id: 'claude-haiku-4.5', label: 'Haiku 4.5', multiplier: '0.33x' },
      { id: 'claude-opus-4.5', label: 'Opus 4.5', multiplier: '3x' },
    ],
    'GPT': [
      { id: 'gpt-5.3-codex', label: 'GPT-5.3 Codex', multiplier: '1x' },
      { id: 'gpt-5-mini', label: 'GPT-5 Mini', multiplier: '0x' },
    ]
  }
  
  // Find currently selected label
  let selectedLabel = 'Sonnet 4.5' // default
  for (const group of Object.values(models)) {
    const found = group.find(m => m.id === currentModel)
    if (found) selectedLabel = found.label
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[13px] text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded transition-colors"
      >
        {selectedLabel}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${open ? 'rotate-180': ''}`}>
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-48 bg-zinc-800 border border-zinc-700/50 rounded-2xl shadow-lg overflow-hidden py-2 z-50 flex flex-col gap-1">
          {Object.entries(models).map(([groupName, groupModels]) => (
            <div key={groupName} className="flex flex-col">
              <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                {groupName}
              </div>
              {groupModels.map(m => (
                <button
                  key={m.id}
                  onClick={() => { onSelect(m.id); setOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 text-[13px] transition-colors flex items-center justify-between
                    ${currentModel === m.id ? 'bg-zinc-700/50 text-zinc-100' : 'text-zinc-300 hover:bg-zinc-700/40'}`}
                >
                  <span>{m.label}</span>
                  {m.multiplier && <span className="text-[10px] text-zinc-500 font-mono">{m.multiplier}</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

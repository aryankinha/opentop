import React, { useState, useRef, useEffect } from 'react'
import SettingsModal from './SettingsModal'

export default function ProfileMenu({ isExpanded = true, onCollapsedClick }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleClick = () => {
    if (!isExpanded && typeof onCollapsedClick === 'function') {
      onCollapsedClick()
      return
    }
    setMenuOpen(!menuOpen)
  }

  return (
    <>
      <div className={`relative ${isExpanded ? 'w-full' : ''}`} ref={menuRef}>
        <button
          onClick={handleClick}
          className={`flex items-center gap-3 transition-colors rounded hover:bg-zinc-800/50 p-1 w-full ${!isExpanded && 'justify-center border border-zinc-700/50 hover:bg-zinc-700 rounded-full w-8 h-8 p-0'}`}
        >
          <div className="w-8 h-8 rounded-full bg-zinc-700 text-zinc-300 flex items-center justify-center text-xs font-medium border border-zinc-600 flex-shrink-0">
            A
          </div>
          {isExpanded && (
            <span className="text-sm text-zinc-300 font-medium">Aryan</span>
          )}
        </button>

        {isExpanded && menuOpen && (
          <div className="absolute bottom-full left-0 mb-2 w-52 bg-zinc-800 border border-zinc-700 rounded-xl shadow-lg overflow-hidden py-1 z-50">
            <button
              onClick={() => { setSettingsOpen(true); setMenuOpen(false); }}
              className="w-full flex items-center gap-2 text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              Settings
            </button>
            
            <div className="h-px bg-zinc-700/50 my-1 mx-2" />
            
            <button
              onClick={() => setMenuOpen(false)}
              className="w-full text-left px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
            >
              Log out
            </button>
          </div>
        )}
      </div>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}



import React, { useState, useRef, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import SettingsModal from './SettingsModal'

export default function ProfileMenu() {
  const { user } = useApp()
  const [menuOpen, setMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const menuRef = useRef(null)

  // Get display name and first letter for avatar
  const displayName = user?.displayName || 'User'
  const avatarLetter = displayName.charAt(0).toUpperCase()

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <>
      <div className="relative w-full" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex w-full items-center gap-3 rounded-2xl border border-transparent p-2 transition hover:border-white/8 hover:bg-white/[0.04]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.06] text-sm font-semibold text-[var(--color-app-text)]">
            {avatarLetter}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-medium text-[var(--color-app-text)]">{displayName}</p>
            <p className="truncate text-xs text-[var(--color-app-muted)]">
              {user?.username ? `@${user.username}` : 'Open settings and memory'}
            </p>
          </div>
        </button>

        {menuOpen && (
          <div className="absolute bottom-full left-0 z-50 mb-2 w-full overflow-hidden rounded-[22px] border border-[var(--color-app-border)] bg-[var(--color-app-panel-strong)] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <button
              onClick={() => { setSettingsOpen(true); setMenuOpen(false); }}
              className="flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-left text-sm text-[var(--color-app-text)] transition hover:bg-white/[0.06]"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-app-muted)]">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              Settings
            </button>
            
            <div className="mx-2 my-2 h-px bg-white/6" />
            
            <button
              onClick={() => setMenuOpen(false)}
              className="w-full rounded-2xl px-4 py-3 text-left text-sm text-[var(--color-app-muted)] transition hover:bg-white/[0.06] hover:text-[var(--color-app-text)]"
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


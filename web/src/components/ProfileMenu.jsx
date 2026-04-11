import React, { useState, useRef, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import SettingsModal from './SettingsModal'
import { Download, ChevronsUpDown } from 'lucide-react'

export default function ProfileMenu() {
  const { user } = useApp()
  const [menuOpen, setMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const menuRef = useRef(null)

  const displayName = user?.displayName || 'User'
  const avatarLetter = displayName.charAt(0).toUpperCase()

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [])

  return (
    <>
      <div className="relative w-full" ref={menuRef}>
        
        {/* Trigger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex w-full items-center gap-2.5 px-2 py-2 hover:bg-white/5 rounded-lg transition-colors"
          type="button"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#cccdc8] text-xs font-semibold text-black/80">
            {avatarLetter}
          </div>

          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-[13px] font-medium text-gray-200">
              {displayName}
            </p>
            <p className="truncate text-[11px] text-gray-400">
              Free plan
            </p>
          </div>
          
          <div className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300">
             <Download className="h-3.5 w-3.5" />
             <ChevronsUpDown className="h-3 w-3" />
          </div>
        </button>

        {/* Dropdown */}
        {menuOpen && (
          <div className="absolute bottom-full left-0 mb-2 w-full overflow-hidden rounded-md border border-white/10 bg-[#111] py-1">

            <button
              onClick={() => {
                setSettingsOpen(true)
                setMenuOpen(false)
              }}
              className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/5"
              type="button"
            >
              Settings
            </button>

            <div className="my-1 h-px bg-white/10" />

            <button
              onClick={() => setMenuOpen(false)}
              className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-white/5 hover:text-gray-300"
              type="button"
            >
              Log out
            </button>

          </div>
        )}
      </div>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  )
}

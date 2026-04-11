import React, { useState, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import { generateDisplayName } from '@/utils/nameGenerator'

export default function GeneralSettings() {
  const { user, updateDisplayName } = useApp()
  const [displayName, setDisplayName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState(null)

  // Initialize with current display name
  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName)
    }
  }, [user?.displayName])

  const handleSave = async () => {
    if (!displayName.trim()) {
      setSaveMessage({ type: 'error', text: 'Display name cannot be empty' })
      return
    }

    setIsSaving(true)
    setSaveMessage(null)

    try {
      await updateDisplayName(displayName.trim())
      setSaveMessage({ type: 'success', text: 'Display name saved!' })
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Failed to save. Please try again.' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleGenerateRandom = () => {
    const newName = generateDisplayName()
    setDisplayName(newName)
  }

  const hasChanges = displayName !== (user?.displayName || '')

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex flex-col gap-1">
        <h4 className="text-zinc-100 font-medium">General Settings</h4>
        <p className="text-xs text-zinc-400">
          Configure your profile and preferences.
        </p>
      </div>

      {/* Display Name Section */}
      <div className="flex flex-col gap-4 p-4 bg-[#1a1a1a]/50 rounded-xl border border-zinc-800">
        <div className="flex flex-col gap-1">
          <label htmlFor="displayName" className="text-sm font-medium text-zinc-200">
            Display Name
          </label>
          <p className="text-xs text-zinc-500">
            This is how you'll appear in the app.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your display name"
            maxLength={50}
            className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
          />
          <button
            onClick={handleGenerateRandom}
            className="px-3 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition-colors sm:whitespace-nowrap"
            title="Generate random name"
          >
            🎲 Random
          </button>
        </div>

        {/* Save button and message */}
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              hasChanges && !isSaving
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>

          {saveMessage && (
            <span className={`text-sm ${
              saveMessage.type === 'success' ? 'text-green-400' : 'text-red-400'
            }`}>
              {saveMessage.text}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

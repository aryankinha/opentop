import React from 'react'

export default function GeneralSettings() {
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex flex-col gap-1">
        <h4 className="text-zinc-100 font-medium">General Settings</h4>
        <p className="text-xs text-zinc-400">
          Future configuration for appearance, behavior, and preferences.
        </p>
      </div>

      <div className="flex items-center justify-center h-40 border border-dashed border-zinc-800 rounded-xl bg-[#1a1a1a]/50">
         <span className="text-sm text-zinc-600 font-medium tracking-wider uppercase">Coming Soon</span>
      </div>
    </div>
  )
}

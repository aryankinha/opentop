import React, { useState, useEffect } from 'react'
import { useApp } from '@/context/AppContext'

export default function ConnectionSettings() {
  const { serverUrl, setServerUrl, isConnected } = useApp()
  const [inputUrl, setInputUrl] = useState(serverUrl || '')

  useEffect(() => {
    setInputUrl(serverUrl || '')
  }, [serverUrl])

  const handleConnect = () => {
    if (inputUrl.trim() && inputUrl !== serverUrl) {
      setServerUrl(inputUrl.trim())
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex flex-col gap-1">
        <h4 className="text-zinc-100 font-medium">Remote Server Connection</h4>
        <p className="text-xs text-zinc-400">
          Configure where OpenTop frontend talks to your secure local or remote node backend.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Status Box */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[#1a1a1a] border border-zinc-800/80">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isConnected ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.3)]' : 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.3)]'}`} />
          <div className="flex flex-col min-w-0">
             <span className="text-sm font-medium text-zinc-200">
               {isConnected ? 'Actively Connected' : 'Disconnected'}
             </span>
             <span className="text-xs text-zinc-500 font-mono mt-0.5 truncate" title={serverUrl}>
               {serverUrl || 'No node endpoint specified'}
             </span>
          </div>
        </div>

        {/* Form area */}
        <div className="flex flex-col gap-2 mt-2">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Server EndPoint</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
              placeholder="http://localhost:3000"
              className="flex-1 bg-[#1a1a1a] border border-zinc-800 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/50 transition-all font-mono"
            />
            <button
              onClick={handleConnect}
              disabled={inputUrl.trim() === serverUrl || !inputUrl.trim()}
              className="px-4 py-2 bg-zinc-200 text-zinc-900 rounded-lg text-xs font-bold hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed sm:whitespace-nowrap"
            >
              Update
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

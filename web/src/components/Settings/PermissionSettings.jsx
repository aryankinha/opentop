import React, { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'

const TOOL_METADATA = {
  read: {
    title: 'Read Files',
    description: 'Allow reading files without prompting each time.',
    tone: 'text-emerald-300',
  },
  shell: {
    title: 'Run Shell Commands',
    description: 'Allow command execution without prompt (dangerous commands are still blocked).',
    tone: 'text-amber-300',
  },
  write: {
    title: 'Write Files',
    description: 'Allow file creation and edits without prompt.',
    tone: 'text-rose-300',
  },
  url: {
    title: 'Open URLs',
    description: 'Allow web fetch and URL actions without prompt.',
    tone: 'text-blue-300',
  },
  mcp: {
    title: 'Use MCP Tools',
    description: 'Allow external tool execution without prompt.',
    tone: 'text-violet-300',
  },
}

function uniqueKinds(list = []) {
  return [...new Set(
    list
      .filter((item) => typeof item === 'string')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  )]
}

function sameKinds(a = [], b = []) {
  const aSet = new Set(uniqueKinds(a))
  const bSet = new Set(uniqueKinds(b))
  if (aSet.size !== bSet.size) return false
  for (const kind of aSet) {
    if (!bSet.has(kind)) return false
  }
  return true
}

export default function PermissionSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [policy, setPolicy] = useState({
    availableTools: [],
    autoApproveTools: [],
    requireApprovalTools: [],
  })
  const [autoApproveTools, setAutoApproveTools] = useState([])

  const availableTools = useMemo(() => {
    return policy.availableTools?.length
      ? uniqueKinds(policy.availableTools)
      : Object.keys(TOOL_METADATA)
  }, [policy.availableTools])

  const hasChanges = useMemo(() => {
    return !sameKinds(autoApproveTools, policy.autoApproveTools)
  }, [autoApproveTools, policy.autoApproveTools])

  const loadPolicy = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const data = await api.getPermissionSettings()
      const normalizedAutoApproveTools = uniqueKinds(data?.autoApproveTools || [])
      setPolicy({
        availableTools: uniqueKinds(data?.availableTools || []),
        autoApproveTools: normalizedAutoApproveTools,
        requireApprovalTools: uniqueKinds(data?.requireApprovalTools || []),
      })
      setAutoApproveTools(normalizedAutoApproveTools)
    } catch (error) {
      setMessage({
        type: 'error',
        text: error?.message || 'Failed to load permission settings.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPolicy()
  }, [])

  const toggleKind = (kind) => {
    setMessage(null)
    setAutoApproveTools((prev) => {
      if (prev.includes(kind)) {
        return prev.filter((item) => item !== kind)
      }
      return uniqueKinds([...prev, kind])
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const updated = await api.updatePermissionSettings(autoApproveTools)
      const normalizedAutoApproveTools = uniqueKinds(updated?.autoApproveTools || [])
      setPolicy({
        availableTools: uniqueKinds(updated?.availableTools || []),
        autoApproveTools: normalizedAutoApproveTools,
        requireApprovalTools: uniqueKinds(updated?.requireApprovalTools || []),
      })
      setAutoApproveTools(normalizedAutoApproveTools)
      setMessage({ type: 'success', text: 'Permission settings saved.' })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error?.message || 'Failed to save permission settings.',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSaferDefaults = () => {
    setMessage(null)
    setAutoApproveTools(['read'])
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex flex-col gap-1">
        <h4 className="text-zinc-100 font-medium">Permission Controls</h4>
        <p className="text-xs text-zinc-400">
          Choose which tool types are always allowed without confirmation.
        </p>
      </div>

      <div className="rounded-xl border border-amber-600/30 bg-amber-900/10 p-3">
        <p className="text-xs text-amber-200 leading-relaxed">
          Safety rules still apply. Dangerous shell commands and protected system paths are blocked even when a type is always allowed.
        </p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-zinc-800 bg-[#1a1a1a]/60 p-4 text-sm text-zinc-400">
          Loading permission settings...
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {availableTools.map((kind) => {
            const meta = TOOL_METADATA[kind] || {
              title: kind,
              description: 'Allow this tool type without prompt.',
              tone: 'text-zinc-300',
            }
            const enabled = autoApproveTools.includes(kind)

            return (
              <label
                key={kind}
                className="flex items-start justify-between gap-4 rounded-xl border border-zinc-800 bg-[#1a1a1a]/60 p-4 cursor-pointer"
              >
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${meta.tone}`}>{meta.title}</p>
                  <p className="mt-1 text-xs text-zinc-400 leading-relaxed">{meta.description}</p>
                </div>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => toggleKind(kind)}
                  className="mt-1 h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-blue-500 focus:ring-blue-500/60"
                />
              </label>
            )
          })}
        </div>
      )}

      <div className="rounded-xl border border-zinc-800 bg-[#1a1a1a]/60 p-3 text-xs text-zinc-400">
        Always allow: <span className="text-zinc-200 font-medium">{autoApproveTools.length}</span> / {availableTools.length} types
      </div>

      {message && (
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            message.type === 'success'
              ? 'bg-green-900/20 border border-green-700/40 text-green-300'
              : 'bg-red-900/20 border border-red-700/40 text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800/50">
        <button
          onClick={handleSaferDefaults}
          disabled={saving || loading}
          className="px-3 py-2 text-xs font-semibold text-zinc-300 border border-zinc-700 rounded-lg hover:bg-zinc-800/60 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Use safer defaults
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={loadPolicy}
            disabled={saving || loading}
            className="px-3 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reload
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading || !hasChanges}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              !hasChanges || saving || loading
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

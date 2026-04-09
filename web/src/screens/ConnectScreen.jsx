import { useEffect, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Keyboard,
  Loader2,
  QrCode,
  RefreshCw,
  Smartphone,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '@/context/AppContext'
import QRScanner from '@/components/QRScanner'

const STORAGE_KEY = 'opentop_connection'

function saveConnection(url, pin) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ url, pin, savedAt: Date.now() }))
}

function loadConnection() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function clearConnection() {
  localStorage.removeItem(STORAGE_KEY)
}

function parseQRData(qrText) {
  try {
    const url = new URL(qrText)
    const tunnelUrl = url.searchParams.get('url')
    const pin = url.searchParams.get('pin')
    if (tunnelUrl && pin) return { url: tunnelUrl, pin }
  } catch {
    try {
      const data = JSON.parse(qrText)
      if (data.url && data.pin) return data
    } catch {
      return null
    }
  }

  return null
}

function getServerUrl() {
  if (window.location.origin === 'http://localhost:5173') {
    return 'http://localhost:18790'
  }

  return window.location.origin
}

export default function ConnectScreen({ onConnect }) {
  const { setServerUrl, setPairingToken } = useApp()
  const [mode, setMode] = useState('home')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [connectUrl, setConnectUrl] = useState(getServerUrl())
  const [isReconnecting, setIsReconnecting] = useState(false)

  useEffect(() => {
    const saved = loadConnection()
    if (saved?.url && saved?.pin) {
      setPin(saved.pin)
      setConnectUrl(saved.url)
      setIsReconnecting(true)
      void handleConnectWithCredentials(saved.url, saved.pin)
    }
  }, [])

  const handleConnectWithCredentials = async (nextUrl, nextPin) => {
    setError('')
    setMode('connecting')

    setServerUrl(nextUrl)
    setPairingToken(nextPin)
    const result = await onConnect()

    if (result?.ok) {
      saveConnection(nextUrl, nextPin)
      return
    }

    const nextError = result?.error || 'Failed to connect'
    setError(nextError)
    setMode('error')
    setIsReconnecting(false)

    if (nextError.includes('401') || nextError.includes('Unauthorized') || nextError.includes('pairing')) {
      clearConnection()
    }
  }

  const handleManualConnect = async () => {
    const nextPin = pin.trim()

    if (nextPin.length !== 6) {
      setError('PIN must be exactly 6 digits')
      return
    }

    await handleConnectWithCredentials(connectUrl, nextPin)
  }

  const handleQRScan = async (qrText) => {
    const parsed = parseQRData(qrText)
    if (!parsed) {
      setError('Invalid QR code. Please scan the QR from your terminal.')
      setMode('error')
      return
    }

    setPin(parsed.pin)
    setConnectUrl(parsed.url)
    await handleConnectWithCredentials(parsed.url, parsed.pin)
  }

  const handleRetry = () => {
    clearConnection()
    setError('')
    setIsReconnecting(false)
    setConnectUrl(getServerUrl())
    setPin('')
    setMode('home')
  }

  if (mode === 'scan') {
    return (
      <QRScanner
        onScan={handleQRScan}
        onClose={() => setMode('home')}
      />
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--color-app-bg)] px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.14),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(120,113,108,0.12),transparent_24%)]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center justify-center">
        <AnimatePresence mode="wait">
          {mode === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="app-panel w-full rounded-[32px] px-6 py-8"
            >
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] border border-amber-400/20 bg-amber-500/10 text-amber-200">
                  <Smartphone className="h-7 w-7" />
                </div>
                <h1 className="mt-5 text-3xl font-semibold tracking-tight text-[var(--color-app-text)]">
                  Connect OpenTop
                </h1>
                <p className="mt-3 text-sm leading-7 text-[var(--color-app-muted)]">
                  Pair this phone with your Mac using the PIN or the QR code printed by `opentop start`.
                </p>
              </div>

              <div className="mt-8 space-y-3">
                <button
                  onClick={() => setMode('scan')}
                  className="flex w-full items-center gap-4 rounded-[24px] border border-[var(--color-app-border)] bg-white/[0.04] px-4 py-4 text-left transition hover:border-[var(--color-app-border-strong)] hover:bg-white/[0.07]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/8 bg-black/20 text-amber-200">
                    <QrCode className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--color-app-text)]">Scan the terminal QR</p>
                    <p className="mt-1 text-xs text-[var(--color-app-muted)]">Fastest way to connect over tunnel or local network</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[var(--color-app-muted)]" />
                </button>

                <button
                  onClick={() => setMode('manual')}
                  className="flex w-full items-center gap-4 rounded-[24px] border border-[var(--color-app-border)] bg-white/[0.03] px-4 py-4 text-left transition hover:border-[var(--color-app-border-strong)] hover:bg-white/[0.06]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/8 bg-black/20 text-[var(--color-app-muted)]">
                    <Keyboard className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--color-app-text)]">Enter a pairing PIN</p>
                    <p className="mt-1 text-xs text-[var(--color-app-muted)]">Useful when you already opened the tunnel URL</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[var(--color-app-muted)]" />
                </button>
              </div>

              <div className="mt-8 rounded-[24px] border border-white/6 bg-white/[0.03] px-4 py-4 text-sm text-[var(--color-app-muted)]">
                Run <code className="rounded-md bg-black/20 px-2 py-1 text-[var(--color-app-text)]">opentop start</code> on your computer, then pair this device.
              </div>
            </motion.div>
          )}

          {mode === 'manual' && (
            <motion.div
              key="manual"
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              className="app-panel w-full rounded-[32px] px-6 py-8"
            >
              <button
                onClick={() => setMode('home')}
                className="inline-flex items-center gap-2 text-sm text-[var(--color-app-muted)] transition hover:text-[var(--color-app-text)]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <h2 className="mt-5 text-2xl font-semibold text-[var(--color-app-text)]">
                Pair with PIN
              </h2>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-[var(--color-app-muted)]">
                    Server URL
                  </label>
                  <input
                    type="text"
                    value={connectUrl}
                    onChange={(event) => setConnectUrl(event.target.value)}
                    className="w-full rounded-[22px] border border-[var(--color-app-border)] bg-black/20 px-4 py-3 text-sm text-[var(--color-app-text)] outline-none transition focus:border-[var(--color-app-border-strong)]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-[var(--color-app-muted)]">
                    Pairing PIN
                  </label>
                  <input
                    type="text"
                    value={pin}
                    onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    className="w-full rounded-[22px] border border-[var(--color-app-border)] bg-black/20 px-4 py-4 text-center font-mono text-2xl tracking-[0.42em] text-[var(--color-app-text)] outline-none transition placeholder:text-[var(--color-app-muted)] focus:border-[var(--color-app-border-strong)]"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-[22px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  onClick={handleManualConnect}
                  disabled={!connectUrl.trim() || pin.length !== 6}
                  className="w-full rounded-[22px] bg-[var(--color-app-text)] px-4 py-3 text-sm font-semibold text-[#181513] transition hover:bg-[#fff8ef] disabled:opacity-50"
                >
                  Connect
                </button>
              </div>
            </motion.div>
          )}

          {mode === 'connecting' && (
            <motion.div
              key="connecting"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="app-panel w-full rounded-[32px] px-6 py-10 text-center"
            >
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] border border-amber-400/20 bg-amber-500/10 text-amber-200">
                <Wifi className="h-8 w-8" />
              </div>
              <Loader2 className="mx-auto mt-6 h-6 w-6 animate-spin text-amber-300" />
              <h2 className="mt-4 text-2xl font-semibold text-[var(--color-app-text)]">
                {isReconnecting ? 'Reconnecting…' : 'Connecting…'}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--color-app-muted)]">
                Reaching <span className="text-[var(--color-app-text)]">{connectUrl}</span> with your pairing PIN.
              </p>
            </motion.div>
          )}

          {mode === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="app-panel w-full rounded-[32px] px-6 py-8 text-center"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] border border-rose-400/20 bg-rose-500/10 text-rose-100">
                <WifiOff className="h-7 w-7" />
              </div>
              <h2 className="mt-5 text-2xl font-semibold text-[var(--color-app-text)]">
                Connection failed
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--color-app-muted)]">
                {error || 'OpenTop could not reach your server. Check the pairing PIN and make sure the backend is running.'}
              </p>

              <button
                onClick={handleRetry}
                className="mt-6 inline-flex items-center gap-2 rounded-[22px] border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-[var(--color-app-text)] transition hover:bg-white/[0.08]"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

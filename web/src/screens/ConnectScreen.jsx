import { useState, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import QRScanner from '@/components/QRScanner'
import { 
  QrCode, 
  Keyboard, 
  Wifi, 
  WifiOff, 
  Loader2, 
  AlertCircle,
  RefreshCw,
  Smartphone,
  Monitor,
  ArrowRight
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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

// Parse QR data: https://pwa-url/connect?url=<tunnel>&pin=<PIN>
function parseQRData(qrText) {
  try {
    const url = new URL(qrText)
    const tunnelUrl = url.searchParams.get('url')
    const pin = url.searchParams.get('pin')
    if (tunnelUrl && pin) {
      return { url: tunnelUrl, pin }
    }
  } catch {
    // Not a URL, might be direct JSON
    try {
      const data = JSON.parse(qrText)
      if (data.url && data.pin) return data
    } catch {
      // Ignore
    }
  }
  return null
}

export default function ConnectScreen({ onConnect }) {
  const { setServerUrl, setPairingToken, connectionError, isConnecting } = useApp()
  
  // Get dynamic server URL (same as App.jsx auto-fill logic)
  const getServerUrl = () => {
    if (window.location.origin === 'http://localhost:5173') {
      return 'http://localhost:18790'
    }
    return window.location.origin
  }
  
  // Connection state
  const [mode, setMode] = useState('home') // home | scan | manual | connecting | error
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [isReconnecting, setIsReconnecting] = useState(false)

  // Check for saved connection on mount
  useEffect(() => {
    const saved = loadConnection()
    if (saved?.url && saved?.pin) {
      // Try auto-reconnect
      setPin(saved.pin)
      setIsReconnecting(true)
      handleConnectWithCredentials(saved.url, saved.pin)
    }
  }, [])

  const handleConnectWithCredentials = async (connectUrl, connectPin) => {
    setError('')
    setMode('connecting')
    
    try {
      setServerUrl(connectUrl)
      setPairingToken(connectPin)
      await onConnect()
      saveConnection(connectUrl, connectPin)
    } catch (e) {
      const errorMsg = e.message || 'Failed to connect'
      setError(errorMsg)
      setMode('error')
      setIsReconnecting(false)
      
      // Clear saved connection on auth failure
      if (errorMsg.includes('401') || errorMsg.includes('Unauthorized') || errorMsg.includes('pairing')) {
        clearConnection()
      }
    }
  }

  const handleManualConnect = () => {
    if (!pin.trim()) {
      setError('Please enter your 6-digit PIN')
      return
    }
    if (pin.trim().length !== 6) {
      setError('PIN must be exactly 6 digits')
      return
    }
    // Use current origin as server URL
    const serverUrl = getServerUrl()
    handleConnectWithCredentials(serverUrl, pin.trim())
  }

  const handleQRScan = (qrText) => {
    const parsed = parseQRData(qrText)
    if (parsed) {
      setPin(parsed.pin)
      handleConnectWithCredentials(parsed.url, parsed.pin)
    } else {
      setError('Invalid QR code. Please scan the QR from your terminal.')
      setMode('error')
    }
  }

  const handleRetry = () => {
    clearConnection()
    setError('')
    setMode('home')
    setPin('')
  }

  // Render QR Scanner
  if (mode === 'scan') {
    return (
      <QRScanner 
        onScan={handleQRScan}
        onClose={() => setMode('home')}
      />
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        
        {/* Logo */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <span className="text-white text-2xl font-bold">OT</span>
          </div>
          <h1 className="text-2xl font-bold text-white">OpenTop</h1>
          <p className="text-zinc-500 mt-1">Connect to your AI agent</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* Home - Choose connection method */}
          {mode === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <div className="space-y-3">
                {/* Scan QR Button */}
                <button
                  onClick={() => setMode('scan')}
                  className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center gap-4 hover:bg-zinc-800 hover:border-zinc-700 transition-all group"
                >
                  <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                    <QrCode className="w-6 h-6 text-amber-500" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white font-medium">Scan QR Code</p>
                    <p className="text-zinc-500 text-sm">Quick and easy</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                </button>

                {/* Manual Entry Button */}
                <button
                  onClick={() => setMode('manual')}
                  className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center gap-4 hover:bg-zinc-800 hover:border-zinc-700 transition-all group"
                >
                  <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                    <Keyboard className="w-6 h-6 text-zinc-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white font-medium">Enter PIN</p>
                    <p className="text-zinc-500 text-sm">6-digit pairing code</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                </button>
              </div>

              {/* Instructions */}
              <div className="mt-8 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                <p className="text-sm text-zinc-400 text-center">
                  Run <code className="bg-zinc-800 px-2 py-0.5 rounded text-amber-500">opentop start</code> on your computer to get started
                </p>
              </div>
            </motion.div>
          )}

          {/* Manual Entry Form - PIN Only */}
          {mode === 'manual' && (
            <motion.div
              key="manual"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6"
            >
              <button
                onClick={() => setMode('home')}
                className="text-zinc-500 text-sm mb-4 hover:text-white transition-colors"
              >
                ← Back
              </button>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2 text-center">
                    Enter Your 6-Digit PIN
                  </label>
                  <input
                    type="text"
                    value={pin}
                    onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 text-sm text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  onClick={handleManualConnect}
                  disabled={!url.trim() || pin.length !== 6}
                  className="w-full py-3 bg-amber-500 text-black rounded-xl font-medium hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Connect
                </button>
              </div>
            </motion.div>
          )}

          {/* Connecting State */}
          {mode === 'connecting' && (
            <motion.div
              key="connecting"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="text-center py-12"
            >
              <div className="relative inline-block mb-6">
                <div className="w-20 h-20 bg-zinc-900 rounded-2xl flex items-center justify-center">
                  <Smartphone className="w-10 h-10 text-amber-500" />
                </div>
                <div className="absolute -right-2 top-1/2 -translate-y-1/2">
                  <motion.div
                    animate={{ x: [0, 8, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <Wifi className="w-5 h-5 text-amber-500" />
                  </motion.div>
                </div>
                <div className="absolute -right-16 top-1/2 -translate-y-1/2">
                  <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center">
                    <Monitor className="w-6 h-6 text-zinc-400" />
                  </div>
                </div>
              </div>

              <Loader2 className="w-6 h-6 text-amber-500 mx-auto mb-3 animate-spin" />
              <p className="text-white font-medium">
                {isReconnecting ? 'Reconnecting...' : 'Connecting to your device...'}
              </p>
              <p className="text-zinc-500 text-sm mt-1">
                {url ? new URL(url).hostname : 'Please wait'}
              </p>
            </motion.div>
          )}

          {/* Error State */}
          {mode === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <WifiOff className="w-8 h-8 text-red-400" />
              </div>
              
              <h2 className="text-white font-semibold text-lg mb-2">Connection Failed</h2>
              <p className="text-zinc-400 text-sm mb-6 max-w-xs mx-auto">
                {error.includes('401') || error.includes('Unauthorized')
                  ? 'Invalid pairing PIN. Please check the code shown in your terminal.'
                  : error.includes('fetch') || error.includes('network')
                  ? 'Could not reach the server. Make sure OpenTop is running on your Mac.'
                  : error}
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleRetry}
                  className="w-full py-3 bg-zinc-800 text-white rounded-xl font-medium hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
              </div>

              <p className="text-zinc-600 text-xs mt-6">
                Need help? Run <code className="text-zinc-500">opentop doctor</code> to diagnose issues.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

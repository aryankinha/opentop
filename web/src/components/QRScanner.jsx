import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { X, Camera, AlertCircle } from 'lucide-react'

export default function QRScanner({ onScan, onClose }) {
  const [error, setError] = useState(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const scannerRef = useRef(null)
  const html5QrCodeRef = useRef(null)

  useEffect(() => {
    const scannerId = 'qr-reader-' + Date.now()
    
    // Create scanner element if needed
    if (scannerRef.current && !scannerRef.current.querySelector(`#${scannerId}`)) {
      const div = document.createElement('div')
      div.id = scannerId
      scannerRef.current.appendChild(div)
    }

    const startScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode(scannerId)
        html5QrCodeRef.current = html5QrCode

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          (decodedText) => {
            // Successfully scanned
            html5QrCode.stop().catch(() => {})
            onScan(decodedText)
          },
          () => {
            // QR not found - ignore
          }
        )
        setIsInitializing(false)
      } catch (err) {
        console.error('QR Scanner error:', err)
        setError(err.message || 'Camera access denied')
        setIsInitializing(false)
      }
    }

    startScanner()

    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {})
      }
    }
  }, [onScan])

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/80">
        <h2 className="text-white font-medium">Scan QR Code</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Scanner Area */}
      <div className="flex-1 flex items-center justify-center p-4">
        {isInitializing && !error && (
          <div className="text-center text-white">
            <Camera className="w-12 h-12 mx-auto mb-3 animate-pulse" />
            <p>Starting camera...</p>
          </div>
        )}

        {error && (
          <div className="text-center text-white p-6 max-w-sm">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-400" />
            <p className="text-red-400 mb-4">{error}</p>
            <p className="text-sm text-gray-400 mb-6">
              Make sure you've allowed camera access in your browser settings.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
            >
              Go Back
            </button>
          </div>
        )}

        <div 
          ref={scannerRef}
          className={`w-full max-w-sm ${error ? 'hidden' : ''}`}
          style={{ minHeight: '300px' }}
        />
      </div>

      {/* Instructions */}
      {!error && (
        <div className="p-6 text-center text-white/70 text-sm">
          <p>Point your camera at the QR code shown in your terminal</p>
        </div>
      )}
    </div>
  )
}

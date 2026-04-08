import { X, Download, CheckCircle } from 'lucide-react'

/**
 * PWA Install Notification Component
 * Shows a top notification bar prompting users to install the app
 * - Appears at top of screen
 * - Download button + X close button
 * - Auto-dismisses after 25 seconds
 * - Matches dark theme
 * - Shows success message after installation
 */
export function PWAInstallPrompt({ showPrompt, canInstall, installSuccess, onInstall, onDismiss }) {
  // Show success notification
  if (installSuccess) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 p-3 animate-in slide-in-from-top duration-300">
        <div className="max-w-xl mx-auto bg-emerald-900/90 border border-emerald-700 rounded-xl shadow-lg px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-4 h-4 text-white" />
          </div>
          <p className="text-sm text-emerald-100 font-medium flex-1">
            OpenTop installed successfully! 🎉
          </p>
        </div>
      </div>
    )
  }
  
  if (!showPrompt) {
    return null
  }
  
  const handleInstall = async () => {
    if (canInstall && onInstall) {
      await onInstall()
    } else if (onDismiss) {
      onDismiss()
    }
  }
  
  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-3 animate-in slide-in-from-top duration-300">
      <div className="max-w-xl mx-auto bg-zinc-800 border border-zinc-700 rounded-xl shadow-lg px-4 py-3 flex items-center gap-3">
        {/* Icon */}
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Download className="w-4 h-4 text-white" />
        </div>
        
        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-zinc-200 font-medium truncate">
            Install OpenTop for a better experience
          </p>
        </div>
        
        {/* Download Button */}
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0"
        >
          Install
        </button>
        
        {/* Close Button */}
        <button
          onClick={onDismiss}
          className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded-lg transition-colors flex-shrink-0"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

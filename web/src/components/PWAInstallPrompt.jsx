import { usePWAInstall } from '@/hooks/usePWAInstall'
import { X, Download, Share } from 'lucide-react'

/**
 * PWA Install Prompt Component
 * Shows a bottom sheet with install instructions for mobile devices
 * - Android: Native install button using beforeinstallprompt
 * - iOS: Manual instructions for "Add to Home Screen"
 */
export function PWAInstallPrompt() {
  const { showPrompt, isIOSDevice, canInstall, install, dismiss } = usePWAInstall()
  
  if (!showPrompt) {
    return null
  }
  
  const handleInstall = async () => {
    const success = await install()
    if (success) {
      // Prompt will auto-hide on success
    }
  }
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
        onClick={dismiss}
      />
      
      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>
        
        {/* Content */}
        <div className="px-6 pb-8 pt-2">
          {/* Close button */}
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Download className="w-8 h-8 text-white" />
            </div>
          </div>
          
          {/* Title */}
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
            Install OpenTop
          </h2>
          
          {/* Subtitle */}
          <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
            Get a faster, app-like experience
          </p>
          
          {/* Platform-specific content */}
          {isIOSDevice ? (
            // iOS Instructions
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <Share className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <p className="font-semibold mb-1">To install on iOS:</p>
                  <ol className="list-decimal list-inside space-y-1 text-gray-600 dark:text-gray-400">
                    <li>Tap the Share button <Share className="w-4 h-4 inline" /> in Safari</li>
                    <li>Scroll down and tap "Add to Home Screen"</li>
                    <li>Tap "Add" to install</li>
                  </ol>
                </div>
              </div>
            </div>
          ) : (
            // Android Install Button
            canInstall && (
              <button
                onClick={handleInstall}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 mb-3"
              >
                Install Now
              </button>
            )
          )}
          
          {/* Dismiss button */}
          <button
            onClick={dismiss}
            className="w-full text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium py-3 px-6 rounded-xl transition-colors"
          >
            Not now
          </button>
          
          {/* Benefits */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              ✓ Works offline • ✓ Faster loading • ✓ No browser UI
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

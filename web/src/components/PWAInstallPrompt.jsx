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
function getInstallHelpMessage(platform) {
  if (platform === 'iOS') {
    return [
      'Install on iPhone/iPad:',
      '1. Open this site in Safari',
      '2. Tap Share',
      '3. Tap "Add to Home Screen"',
      '4. Tap Add',
    ].join('\n')
  }

  if (platform === 'Android') {
    return [
      'Install on Android:',
      '1. Open browser menu (three dots)',
      '2. Tap "Install app" or "Add to Home screen"',
      '3. Confirm install',
    ].join('\n')
  }

  return [
    'Install this app from your browser menu:',
    'Choose "Install app" or "Add to Home screen".',
  ].join('\n')
}

export function PWAInstallPrompt({ showPrompt, canInstall, platform, installSuccess, onInstall, onDismiss }) {
  // Show success notification
  if (installSuccess) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 p-3 animate-in slide-in-from-top duration-300">
        <div className="app-panel mx-auto flex max-w-xl items-center gap-3 rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-400/20 text-emerald-100">
            <CheckCircle className="w-4 h-4 text-white" />
          </div>
          <p className="flex-1 text-sm font-medium text-emerald-100">
            OpenTop installed successfully.
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
      return
    }

    window.alert(getInstallHelpMessage(platform))
  }
  
  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-3 animate-in slide-in-from-top duration-300">
      <div className="app-panel mx-auto flex max-w-xl items-center gap-3 rounded-[24px] px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.05] text-[var(--color-app-text)]">
          <Download className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-[var(--color-app-text)]">
            {canInstall ? 'Install OpenTop for a better experience' : 'Add OpenTop to your home screen'}
          </p>
        </div>

        <button
          onClick={handleInstall}
          className="flex-shrink-0 rounded-full bg-[var(--color-app-text)] px-3 py-1.5 text-sm font-medium text-[#181513] transition hover:bg-[#fff8ef]"
        >
          {canInstall ? 'Install' : 'How to Install'}
        </button>

        <button
          onClick={onDismiss}
          className="flex-shrink-0 rounded-xl p-1.5 text-[var(--color-app-muted)] transition hover:bg-white/[0.08] hover:text-[var(--color-app-text)]"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

import { useState, useEffect, useCallback, useRef } from 'react'
import { isStandalone } from '@/utils/deviceDetection'

const PWA_INSTALLED_KEY = 'pwa-installed'
const AUTO_DISMISS_MS = 25000 // 25 seconds

/**
 * Custom hook for managing PWA install notification
 * - Shows on demand (triggerShow)
 * - Auto-dismisses after 25 seconds
 * - Only works in web mode (not standalone PWA)
 * - Tracks successful installations with appinstalled event
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [installSuccess, setInstallSuccess] = useState(false)
  const dismissTimerRef = useRef(null)
  
  // Check if already installed
  const isInstalled = localStorage.getItem(PWA_INSTALLED_KEY) === 'true' || isStandalone()
  
  useEffect(() => {
    // Don't set up if already installed
    if (isInstalled) return
    
    // Check and log service worker status
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        console.log('[PWA] Service worker ready:', registration.scope)
      }).catch((err) => {
        console.error('[PWA] Service worker not ready:', err)
      })
    } else {
      console.warn('[PWA] Service workers not supported')
    }
    
    // Listen for beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstall = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      console.log('[PWA] beforeinstallprompt event captured')
    }
    
    // Listen for successful installation
    const handleAppInstalled = () => {
      console.log('[PWA] App installed successfully!')
      localStorage.setItem(PWA_INSTALLED_KEY, 'true')
      setDeferredPrompt(null)
      setShowPrompt(false)
      setInstallSuccess(true)
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => setInstallSuccess(false), 5000)
    }
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleAppInstalled)
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current)
      }
    }
  }, [isInstalled])
  
  // Auto-dismiss timer when prompt is shown
  useEffect(() => {
    if (showPrompt) {
      dismissTimerRef.current = setTimeout(() => {
        setShowPrompt(false)
      }, AUTO_DISMISS_MS)
    }
    
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current)
      }
    }
  }, [showPrompt])
  
  /**
   * Triggers the native install prompt (Android/Chrome only)
   */
  const install = useCallback(async () => {
    if (!deferredPrompt) {
      // If no deferred prompt, open instructions or do nothing
      console.warn('No deferred prompt available - browser may not support PWA install')
      return false
    }
    
    try {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      console.log(`User response to install prompt: ${outcome}`)
      
      if (outcome === 'accepted') {
        localStorage.setItem(PWA_INSTALLED_KEY, 'true')
        setShowPrompt(false)
        setDeferredPrompt(null)
        return true
      }
      
      return false
    } catch (error) {
      console.error('Error during install prompt:', error)
      return false
    }
  }, [deferredPrompt])
  
  /**
   * Dismisses the notification
   */
  const dismiss = useCallback(() => {
    setShowPrompt(false)
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current)
    }
  }, [])
  
  /**
   * Shows the notification (call this when new chat is created)
   */
  const triggerShow = useCallback(() => {
    // Only show if not installed and not already showing
    if (!isInstalled && !showPrompt) {
      setShowPrompt(true)
    }
  }, [isInstalled, showPrompt])
  
  return {
    showPrompt,
    canInstall: !!deferredPrompt,
    isInstalled,
    installSuccess,
    install,
    dismiss,
    triggerShow,
  }
}

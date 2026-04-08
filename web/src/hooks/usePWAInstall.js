import { useState, useEffect } from 'react'
import { canShowInstallPrompt, isIOS as checkIsIOS } from '@/utils/deviceDetection'

const PWA_DISMISSED_KEY = 'pwa-dismissed'
const PWA_INSTALLED_KEY = 'pwa-installed'
const DISMISSAL_COOLDOWN_DAYS = 7
const PROMPT_DELAY_MS = 3000 // 3 seconds

/**
 * Custom hook for managing PWA install prompt
 * Handles beforeinstallprompt event, localStorage persistence, and platform detection
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOSDevice, setIsIOSDevice] = useState(false)
  
  useEffect(() => {
    // Check if we should show the prompt
    if (!canShowInstallPrompt()) {
      return
    }
    
    // Check if user already installed
    const installed = localStorage.getItem(PWA_INSTALLED_KEY)
    if (installed === 'true') {
      return
    }
    
    // Check if user dismissed recently
    const dismissedAt = localStorage.getItem(PWA_DISMISSED_KEY)
    if (dismissedAt) {
      const dismissTime = parseInt(dismissedAt, 10)
      const daysSinceDismiss = (Date.now() - dismissTime) / (1000 * 60 * 60 * 24)
      if (daysSinceDismiss < DISMISSAL_COOLDOWN_DAYS) {
        return // Still in cooldown period
      }
    }
    
    // Detect iOS
    const iOS = checkIsIOS()
    setIsIOSDevice(iOS)
    
    // Listen for beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstall = (e) => {
      // Prevent the default browser install prompt
      e.preventDefault()
      // Store the event for later use
      setDeferredPrompt(e)
      console.log('beforeinstallprompt event captured')
    }
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    
    // Show prompt after delay
    const timer = setTimeout(() => {
      setShowPrompt(true)
    }, PROMPT_DELAY_MS)
    
    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      clearTimeout(timer)
    }
  }, [])
  
  /**
   * Triggers the native install prompt (Android/Chrome only)
   */
  const install = async () => {
    if (!deferredPrompt) {
      console.warn('No deferred prompt available')
      return false
    }
    
    try {
      // Show the native install prompt
      deferredPrompt.prompt()
      
      // Wait for the user's response
      const { outcome } = await deferredPrompt.userChoice
      console.log(`User response to install prompt: ${outcome}`)
      
      if (outcome === 'accepted') {
        // User accepted the install
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
  }
  
  /**
   * Dismisses the prompt and stores the dismissal timestamp
   */
  const dismiss = () => {
    localStorage.setItem(PWA_DISMISSED_KEY, Date.now().toString())
    setShowPrompt(false)
  }
  
  /**
   * Manually triggers showing the prompt (useful for testing or "show later" UX)
   */
  const show = () => {
    if (canShowInstallPrompt()) {
      setShowPrompt(true)
    }
  }
  
  return {
    // State
    showPrompt,
    isIOSDevice,
    canInstall: !!deferredPrompt, // True if Android supports install
    
    // Actions
    install,
    dismiss,
    show,
  }
}

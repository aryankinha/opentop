// Device and platform detection utilities for PWA install prompts

/**
 * Checks if the user is on a mobile device
 * @returns {boolean}
 */
export function isMobile() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

/**
 * Checks if the user is on an iOS device (iPhone/iPad/iPod)
 * @returns {boolean}
 */
export function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

/**
 * Checks if the user is on an Android device
 * @returns {boolean}
 */
export function isAndroid() {
  return /Android/i.test(navigator.userAgent)
}

/**
 * Checks if the app is running in standalone mode (already installed as PWA)
 * @returns {boolean}
 */
export function isStandalone() {
  // Check display-mode media query (works on most browsers)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true
  }
  
  // iOS Safari specific check
  if (window.navigator.standalone === true) {
    return true
  }
  
  return false
}

/**
 * Checks if we should show the PWA install prompt
 * @returns {boolean}
 */
export function canShowInstallPrompt() {
  return isMobile() && !isStandalone()
}

/**
 * Checks if device is in portrait orientation
 * @returns {boolean}
 */
export function isPortrait() {
  return window.matchMedia('(orientation: portrait)').matches
}

/**
 * Gets a human-readable platform name
 * @returns {string}
 */
export function getPlatformName() {
  if (isIOS()) return 'iOS'
  if (isAndroid()) return 'Android'
  return 'Desktop'
}

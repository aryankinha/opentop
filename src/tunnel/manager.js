// src/tunnel/manager.js
// Tunnel lifecycle management.
// Handles starting, restarting on crash, and cleanup.

import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { startQuickTunnel, stopQuickTunnel, isCloudflaredInstalled } from './quick.js';
import { startNamedTunnel, stopNamedTunnel, isCloudflareLoggedIn } from './named.js';

const CONFIG_DIR = join(homedir(), '.opentop');
const TUNNEL_STATE_PATH = join(CONFIG_DIR, 'tunnel-state.json');

/** @type {ChildProcess | null} */
let currentProcess = null;

/** @type {string | null} */
let currentUrl = null;

/** @type {string} */
let currentMode = 'disabled';

/** @type {boolean} */
let isRestarting = false;

/** @type {number} */
let restartAttempts = 0;

/** @type {number} */
const MAX_RESTART_ATTEMPTS = 5;

/** @type {number[]} */
const RESTART_DELAYS = [1000, 2000, 5000, 10000, 30000];

/** @type {function | null} */
let onUrlChange = null;

/** @type {function | null} */
let onStatusChange = null;

/**
 * Gets the current tunnel state.
 * @returns {{ mode: string, url: string | null, running: boolean }}
 */
export function getState() {
  return {
    mode: currentMode,
    url: currentUrl,
    running: currentProcess !== null && !currentProcess.killed,
  };
}

/**
 * Saves tunnel state to disk.
 */
function saveState() {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }

  writeFileSync(TUNNEL_STATE_PATH, JSON.stringify({
    mode: currentMode,
    url: currentUrl,
    startedAt: new Date().toISOString(),
  }, null, 2));
}

/**
 * Loads tunnel state from disk.
 * @returns {{ mode: string, url: string } | null}
 */
export function loadSavedState() {
  if (!existsSync(TUNNEL_STATE_PATH)) return null;
  try {
    return JSON.parse(readFileSync(TUNNEL_STATE_PATH, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Clears saved tunnel state.
 */
export function clearState() {
  if (existsSync(TUNNEL_STATE_PATH)) {
    unlinkSync(TUNNEL_STATE_PATH);
  }
  currentUrl = null;
  currentMode = 'disabled';
}

/**
 * Sets callback for URL changes (useful for quick tunnels).
 * @param {function} callback
 */
export function onUrlChanged(callback) {
  onUrlChange = callback;
}

/**
 * Sets callback for status changes.
 * @param {function} callback
 */
export function onStatusChanged(callback) {
  onStatusChange = callback;
}

/**
 * Emits a status change event.
 * @param {string} status
 * @param {object} [data]
 */
function emitStatus(status, data = {}) {
  if (onStatusChange) {
    onStatusChange({ status, ...data });
  }
}

/**
 * Handles tunnel crash and restarts with backoff.
 * @param {object} config - Original start config
 */
async function handleCrash(config) {
  if (isRestarting) return;

  restartAttempts++;
  if (restartAttempts > MAX_RESTART_ATTEMPTS) {
    emitStatus('failed', { reason: 'Max restart attempts exceeded' });
    return;
  }

  isRestarting = true;
  const delay = RESTART_DELAYS[Math.min(restartAttempts - 1, RESTART_DELAYS.length - 1)];

  emitStatus('restarting', { attempt: restartAttempts, delay });

  await new Promise((resolve) => setTimeout(resolve, delay));

  try {
    await startTunnel(config);
    restartAttempts = 0; // Reset on successful restart
    emitStatus('recovered');
  } catch (err) {
    isRestarting = false;
    emitStatus('restart_failed', { error: err.message });
    // Try again
    handleCrash(config);
  }

  isRestarting = false;
}

/**
 * Starts a tunnel based on mode.
 * @param {object} config
 * @param {string} config.mode - "quick" or "persistent"
 * @param {number} config.port - Local port
 * @param {string} [config.domain] - Domain for persistent mode
 * @param {string} [config.tunnelName="opentop"] - Tunnel name for persistent
 * @param {boolean} [config.autoRestart=true] - Auto-restart on crash
 * @returns {Promise<{ url: string, process: ChildProcess }>}
 */
export async function startTunnel(config) {
  const {
    mode,
    port,
    domain,
    tunnelName = 'opentop',
    autoRestart = true,
  } = config;

  if (!isCloudflaredInstalled()) {
    throw new Error('cloudflared is not installed');
  }

  // Stop existing tunnel if running
  if (currentProcess && !currentProcess.killed) {
    stopTunnel();
  }

  currentMode = mode;
  let result;

  if (mode === 'quick') {
    result = await startQuickTunnel(port, {
      onStderr: (text) => {
        // Could log or emit events here
      },
    });
  } else if (mode === 'persistent') {
    if (!domain) {
      throw new Error('Domain required for persistent tunnel');
    }
    if (!isCloudflareLoggedIn()) {
      throw new Error('Not logged into Cloudflare. Run: cloudflared tunnel login');
    }

    result = await startNamedTunnel({
      tunnelName,
      domain,
      localPort: port,
    });
  } else {
    throw new Error(`Unknown tunnel mode: ${mode}`);
  }

  currentProcess = result.process;
  currentUrl = result.url;
  saveState();

  // Set up crash handler
  if (autoRestart) {
    currentProcess.on('exit', (code) => {
      if (code !== null && code !== 0 && !isRestarting) {
        emitStatus('crashed', { code });
        handleCrash(config);
      }
    });
  }

  emitStatus('started', { url: currentUrl, mode });

  return result;
}

/**
 * Stops the current tunnel.
 */
export function stopTunnel() {
  if (!currentProcess) return;

  if (currentMode === 'quick') {
    stopQuickTunnel(currentProcess);
  } else {
    stopNamedTunnel(currentProcess);
  }

  currentProcess = null;
  emitStatus('stopped');
}

/**
 * Gets the current tunnel URL.
 * @returns {string | null}
 */
export function getUrl() {
  return currentUrl;
}

/**
 * Gets the current tunnel process.
 * @returns {ChildProcess | null}
 */
export function getProcess() {
  return currentProcess;
}

/**
 * Checks if tunnel is currently running.
 * @returns {boolean}
 */
export function isRunning() {
  return currentProcess !== null && !currentProcess.killed;
}

/**
 * Cleanup function for graceful shutdown.
 * Should be called on SIGINT/SIGTERM.
 */
export function cleanup() {
  stopTunnel();
  clearState();
}

export default {
  getState,
  loadSavedState,
  clearState,
  onUrlChanged,
  onStatusChanged,
  startTunnel,
  stopTunnel,
  getUrl,
  getProcess,
  isRunning,
  cleanup,
};

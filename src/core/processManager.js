// src/core/processManager.js
// Manages PID file for tracking running OpenTop processes.
// Enables stop/status commands to work correctly.

import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import logger from '../utils/logger.js';

const RUNTIME_DIR = join(homedir(), '.opentop', 'runtime');
const PID_PATH = join(RUNTIME_DIR, 'opentop.pid');
const STATE_PATH = join(RUNTIME_DIR, 'state.json');

/**
 * Ensures runtime directory exists.
 */
function ensureRuntimeDir() {
  if (!existsSync(RUNTIME_DIR)) {
    mkdirSync(RUNTIME_DIR, { recursive: true });
  }
}

/**
 * Saves the current process PID and optional tunnel PID.
 * @param {number} serverPid - Main server process PID
 * @param {number|null} tunnelPid - Cloudflared process PID (if running)
 */
export function savePids(serverPid, tunnelPid = null) {
  ensureRuntimeDir();

  const data = {
    serverPid,
    tunnelPid,
    startedAt: new Date().toISOString(),
  };

  writeFileSync(PID_PATH, JSON.stringify(data, null, 2), 'utf-8');
  logger.info('PIDs saved', data);
}

/**
 * Loads saved PIDs.
 * @returns {{ serverPid: number, tunnelPid: number|null, startedAt: string } | null}
 */
export function loadPids() {
  if (!existsSync(PID_PATH)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(PID_PATH, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Clears PID file.
 */
export function clearPids() {
  if (existsSync(PID_PATH)) {
    unlinkSync(PID_PATH);
  }
}

/**
 * Checks if a process with given PID is running.
 * @param {number} pid
 * @returns {boolean}
 */
export function isProcessRunning(pid) {
  try {
    // Sending signal 0 doesn't kill, just checks if process exists
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Kills a process by PID.
 * @param {number} pid
 * @returns {boolean} True if killed, false if not running
 */
export function killProcess(pid) {
  try {
    process.kill(pid, 'SIGTERM');
    return true;
  } catch {
    return false;
  }
}

/**
 * Saves runtime state (tunnel URL, port, etc).
 * @param {object} state
 */
export function saveState(state) {
  ensureRuntimeDir();
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
}

/**
 * Loads runtime state.
 * @returns {object|null}
 */
export function loadState() {
  if (!existsSync(STATE_PATH)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(STATE_PATH, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Clears runtime state.
 */
export function clearState() {
  if (existsSync(STATE_PATH)) {
    unlinkSync(STATE_PATH);
  }
}

/**
 * Clears all runtime data (PIDs, state, pairing token).
 */
export function clearAllRuntime() {
  clearPids();
  clearState();
  logger.info('Runtime data cleared');
}

/**
 * Gets the current server status.
 * @returns {{ running: boolean, serverPid: number|null, tunnelPid: number|null, startedAt: string|null, url: string|null, port: number|null }}
 */
export function getServerStatus() {
  const pids = loadPids();
  const state = loadState();

  if (!pids) {
    return {
      running: false,
      serverPid: null,
      tunnelPid: null,
      startedAt: null,
      url: null,
      port: null,
    };
  }

  const serverRunning = isProcessRunning(pids.serverPid);
  const tunnelRunning = pids.tunnelPid ? isProcessRunning(pids.tunnelPid) : false;

  // If server is not running, clean up stale PID file
  if (!serverRunning) {
    clearPids();
    clearState();
    return {
      running: false,
      serverPid: null,
      tunnelPid: null,
      startedAt: null,
      url: null,
      port: null,
    };
  }

  return {
    running: true,
    serverPid: pids.serverPid,
    tunnelPid: tunnelRunning ? pids.tunnelPid : null,
    startedAt: pids.startedAt,
    url: state?.tunnelUrl || null,
    port: state?.port || null,
  };
}

export { PID_PATH, STATE_PATH, RUNTIME_DIR };

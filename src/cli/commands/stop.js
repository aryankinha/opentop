// src/cli/commands/stop.js
// Stop command — stops running server and tunnel.

import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

import ui from '../ui.js';

const CONFIG_DIR = join(homedir(), '.opentop');
const RUNTIME_DIR = join(CONFIG_DIR, 'runtime');
const PID_PATH = join(RUNTIME_DIR, 'opentop.pid');

/**
 * Loads runtime PIDs from disk.
 * @returns {{ serverPid: number, tunnelPid: number | null } | null}
 */
function loadRuntimePids() {
  if (!existsSync(PID_PATH)) return null;
  try {
    return JSON.parse(readFileSync(PID_PATH, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Checks if a process is running.
 * @param {number} pid
 * @returns {boolean}
 */
function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Kills a process by PID.
 * @param {number} pid
 * @returns {boolean}
 */
function killProcess(pid) {
  try {
    process.kill(pid, 'SIGTERM');
    return true;
  } catch {
    return false;
  }
}

/**
 * Main stop command handler.
 */
export async function stop() {
  console.log('');
  console.log(ui.header('OpenTop — Stop'));

  const pids = loadRuntimePids();

  if (!pids) {
    console.log('');
    console.log(ui.error('OpenTop is not running'));
    console.log(ui.info('No PID file found'));
    console.log('');
    process.exit(1);
  }

  let stopped = false;

  // Kill tunnel first (if tracked)
  if (pids.tunnelPid && isProcessRunning(pids.tunnelPid)) {
    killProcess(pids.tunnelPid);
    console.log(ui.success(`Stopped tunnel (PID ${pids.tunnelPid})`));
    stopped = true;
  }

  // Kill server
  if (pids.serverPid && isProcessRunning(pids.serverPid)) {
    killProcess(pids.serverPid);
    console.log(ui.success(`Stopped server (PID ${pids.serverPid})`));
    stopped = true;
  }

  if (!stopped) {
    console.log('');
    console.log(ui.info('No running processes found (may have already stopped)'));
  }

  // Clean up runtime files
  try {
    if (existsSync(RUNTIME_DIR)) {
      rmSync(RUNTIME_DIR, { recursive: true });
    }
    console.log(ui.success('Cleaned up runtime files'));
  } catch {
    // Ignore cleanup errors
  }

  console.log('');
}

export default { stop };

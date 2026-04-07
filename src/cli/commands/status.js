// src/cli/commands/status.js
// Status command — shows server status, URL, and sessions.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

import ui from '../ui.js';

const CONFIG_DIR = join(homedir(), '.opentop');
const RUNTIME_DIR = join(CONFIG_DIR, 'runtime');
const PID_PATH = join(RUNTIME_DIR, 'opentop.pid');
const STATE_PATH = join(RUNTIME_DIR, 'state.json');

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
 * Loads runtime state from disk.
 * @returns {object | null}
 */
function loadRuntimeState() {
  if (!existsSync(STATE_PATH)) return null;
  try {
    return JSON.parse(readFileSync(STATE_PATH, 'utf-8'));
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
 * Formats uptime in human readable format.
 * @param {number} seconds
 * @returns {string}
 */
function formatUptime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

/**
 * Main status command handler.
 * @param {object} flags
 * @param {number} [flags.port=3000]
 */
export async function status(flags = {}) {
  const port = flags.port ? parseInt(flags.port, 10) : 3000;

  console.log('');
  console.log(ui.header('OpenTop — Status'));

  const pids = loadRuntimePids();
  const state = loadRuntimeState();

  if (!pids || !isProcessRunning(pids.serverPid)) {
    console.log('');
    console.log(`  Status:   ${ui.colors.error('❌ Not running')}`);
    console.log('');
    console.log(`  Start with: ${ui.colors.command('opentop')}`);
    console.log('');
    process.exit(1);
  }

  // Try to get health info from running server
  const checkPort = state?.port || port;
  try {
    const res = await fetch(`http://localhost:${checkPort}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    console.log('');
    console.log(`  Status:     ${ui.colors.success('✅ Running')}`);
    console.log(`  PID:        ${ui.colors.highlight(String(pids.serverPid))}`);
    console.log(`  Uptime:     ${formatUptime(data.uptime)}`);
    console.log(`  Sessions:   ${data.sessions} active`);
    console.log(`  Port:       ${checkPort}`);

    if (state?.tunnelUrl) {
      console.log(`  Tunnel:     ${ui.colors.highlight(state.tunnelUrl)}`);
      console.log(`  Mode:       ${state.tunnelMode || 'quick'}`);
    } else {
      console.log(`  Tunnel:     ${ui.colors.warning('❌ Not active')}`);
    }

    if (state?.pairingPin) {
      console.log(`  Pairing:    ${ui.colors.highlight(state.pairingPin)}`);
    }

    console.log('');
    console.log(ui.divider(40));
    console.log('');
    console.log(`  Local:      ${ui.colors.highlight(`http://localhost:${checkPort}`)}`);
    if (state?.tunnelUrl) {
      console.log(`  Public:     ${ui.colors.highlight(state.tunnelUrl)}`);
    }
    console.log('');

  } catch (err) {
    console.log('');
    console.log(`  Status:     ${ui.colors.warning('⚠️ Process running but server not responding')}`);
    console.log(`  PID:        ${pids.serverPid}`);
    console.log(`  Error:      ${ui.colors.error(err.message)}`);
    console.log('');
    console.log(`  Try: ${ui.colors.command('opentop stop && opentop')}`);
    console.log('');
    process.exit(1);
  }
}

export default { status };

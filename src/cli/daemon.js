// src/cli/daemon.js
// Daemon mode — spawns server as detached background process.

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONFIG_DIR = join(homedir(), '.opentop');
const RUNTIME_DIR = join(CONFIG_DIR, 'runtime');
const PID_FILE = join(RUNTIME_DIR, 'opentop.pid');
const LOG_FILE = join(RUNTIME_DIR, 'opentop.log');

/**
 * Ensures runtime directory exists.
 */
function ensureRuntimeDir() {
  if (!existsSync(RUNTIME_DIR)) {
    mkdirSync(RUNTIME_DIR, { recursive: true });
  }
}

/**
 * Checks if daemon is currently running.
 * @returns {{ pid: number, port: number, url: string | null } | null}
 */
export function getDaemonStatus() {
  if (!existsSync(PID_FILE)) return null;
  
  try {
    const data = JSON.parse(readFileSync(PID_FILE, 'utf-8'));
    
    // Check if process is actually running
    try {
      process.kill(data.serverPid, 0);
      return {
        pid: data.serverPid,
        port: data.port,
        url: data.tunnelUrl,
        pairingPin: data.pairingPin,
        startedAt: data.startedAt,
      };
    } catch {
      // Process not running, clean up stale PID file
      rmSync(PID_FILE, { force: true });
      return null;
    }
  } catch {
    return null;
  }
}

/**
 * Starts the server as a detached background daemon.
 * @param {object} options
 * @param {number} options.port
 * @param {string} [options.model]
 * @param {boolean} [options.noTunnel]
 * @returns {Promise<{ success: boolean, pid?: number, error?: string }>}
 */
export async function startDaemon(options) {
  const { port, model, noTunnel } = options;
  
  ensureRuntimeDir();
  
  // Check if already running
  const status = getDaemonStatus();
  if (status) {
    return {
      success: false,
      error: `OpenTop is already running (PID ${status.pid}, port ${status.port})`,
    };
  }
  
  // Build args for the daemon process
  const daemonScript = join(__dirname, 'daemon-runner.js');
  const args = [daemonScript, '--port', String(port)];
  if (model) args.push('--model', model);
  if (noTunnel) args.push('--no-tunnel');
  
  // Spawn detached process
  const child = spawn(process.execPath, args, {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      OPENTOP_DAEMON: 'true',
    },
  });
  
  // Wait for startup confirmation (read from stdout)
  return new Promise((resolve) => {
    let output = '';
    let timeout;
    
    const cleanup = () => {
      child.stdout?.removeAllListeners();
      child.stderr?.removeAllListeners();
      clearTimeout(timeout);
    };
    
    // Timeout after 30 seconds
    timeout = setTimeout(() => {
      cleanup();
      child.unref();
      resolve({
        success: false,
        error: 'Daemon startup timed out',
      });
    }, 30000);
    
    child.stdout?.on('data', (data) => {
      output += data.toString();
      
      // Look for startup confirmation
      if (output.includes('DAEMON_READY:')) {
        cleanup();
        child.unref();
        
        // Parse startup info
        const match = output.match(/DAEMON_READY:(\{.*\})/);
        if (match) {
          try {
            const info = JSON.parse(match[1]);
            resolve({
              success: true,
              pid: child.pid,
              port: info.port,
              url: info.url,
              pairingPin: info.pairingPin,
            });
            return;
          } catch {}
        }
        
        resolve({
          success: true,
          pid: child.pid,
        });
      }
    });
    
    child.stderr?.on('data', (data) => {
      // Log errors to file
      ensureRuntimeDir();
      appendFileSync(LOG_FILE, data.toString());
    });
    
    child.on('error', (err) => {
      cleanup();
      resolve({
        success: false,
        error: `Failed to spawn daemon: ${err.message}`,
      });
    });
    
    child.on('exit', (code) => {
      if (code !== 0) {
        cleanup();
        resolve({
          success: false,
          error: `Daemon exited with code ${code}`,
        });
      }
    });
  });
}

/**
 * Stops the running daemon.
 * @returns {{ success: boolean, error?: string }}
 */
export function stopDaemon() {
  const status = getDaemonStatus();
  
  if (!status) {
    return {
      success: false,
      error: 'OpenTop is not running',
    };
  }
  
  try {
    process.kill(status.pid, 'SIGTERM');
    
    // Clean up PID file
    if (existsSync(PID_FILE)) {
      rmSync(PID_FILE, { force: true });
    }
    
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: `Failed to stop daemon: ${err.message}`,
    };
  }
}

/**
 * Writes daemon runtime info to PID file.
 * Called by daemon-runner.js after startup.
 * @param {object} info
 */
export function writeDaemonInfo(info) {
  ensureRuntimeDir();
  writeFileSync(PID_FILE, JSON.stringify(info, null, 2));
}

export default {
  getDaemonStatus,
  startDaemon,
  stopDaemon,
  writeDaemonInfo,
};

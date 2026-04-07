// src/tunnel/quick.js
// Quick tunnel support using trycloudflare.com.
// No setup required — URL changes each restart.

import { spawn, execSync } from 'node:child_process';

/**
 * Checks if cloudflared is installed.
 * @returns {boolean}
 */
export function isCloudflaredInstalled() {
  try {
    execSync('which cloudflared', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets the cloudflared version string.
 * @returns {string | null}
 */
export function getCloudflaredVersion() {
  try {
    const output = execSync('cloudflared --version', { stdio: 'pipe' }).toString().trim();
    // Output is like "cloudflared version 2024.1.0 (built 2024-01-01)"
    const match = output.match(/version\s+([\d.]+)/);
    return match ? match[1] : output.split('\n')[0];
  } catch {
    return null;
  }
}

/**
 * Starts a quick tunnel (trycloudflare.com).
 * Returns the public URL and the child process.
 *
 * @param {number} localPort - Local port to expose
 * @param {object} [options]
 * @param {number} [options.timeout=30000] - Timeout in ms waiting for URL
 * @param {function} [options.onStderr] - Callback for stderr output
 * @returns {Promise<{ url: string, process: ChildProcess }>}
 */
export async function startQuickTunnel(localPort, options = {}) {
  const { timeout = 30000, onStderr } = options;

  return new Promise((resolve, reject) => {
    const proc = spawn('cloudflared', [
      'tunnel',
      '--url', `http://localhost:${localPort}`,
      '--no-autoupdate',
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let resolved = false;
    const urlPattern = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;

    const onData = (data) => {
      const text = data.toString();

      // Forward stderr if callback provided
      if (onStderr) {
        onStderr(text);
      }

      const match = text.match(urlPattern);
      if (match && !resolved) {
        resolved = true;
        resolve({ url: match[0], process: proc });
      }
    };

    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        proc.kill();
        reject(new Error(`Quick tunnel timeout after ${timeout / 1000}s — cloudflared may be having issues`));
      }
    }, timeout);

    proc.on('exit', (code) => {
      clearTimeout(timeoutId);
      if (!resolved) {
        reject(new Error(`cloudflared exited with code ${code} before providing URL`));
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeoutId);
      if (!resolved) {
        reject(new Error(`Failed to start cloudflared: ${err.message}`));
      }
    });
  });
}

/**
 * Stops a tunnel process.
 * @param {ChildProcess} tunnelProcess
 */
export function stopQuickTunnel(tunnelProcess) {
  if (tunnelProcess && !tunnelProcess.killed) {
    tunnelProcess.kill('SIGTERM');
  }
}

export default {
  isCloudflaredInstalled,
  getCloudflaredVersion,
  startQuickTunnel,
  stopQuickTunnel,
};

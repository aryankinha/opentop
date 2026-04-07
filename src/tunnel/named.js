// src/tunnel/named.js
// Named/persistent tunnel support.
// Requires Cloudflare account and domain — provides fixed URL.

import { spawn, execSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CLOUDFLARED_CONFIG_DIR = join(homedir(), '.cloudflared');
const TUNNEL_CREDENTIALS_PATH = join(CLOUDFLARED_CONFIG_DIR, 'cert.pem');

/**
 * Checks if user is logged into Cloudflare.
 * @returns {boolean}
 */
export function isCloudflareLoggedIn() {
  return existsSync(TUNNEL_CREDENTIALS_PATH);
}

/**
 * Runs `cloudflared tunnel login` interactively.
 * Opens browser for Cloudflare authentication.
 * @returns {Promise<boolean>} True if login successful
 */
export function loginToCloudflare() {
  return new Promise((resolve) => {
    const child = spawn('cloudflared', ['tunnel', 'login'], {
      stdio: 'inherit',
    });

    child.on('exit', (code) => {
      resolve(code === 0);
    });

    child.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Lists existing tunnels.
 * @returns {Array<{ id: string, name: string, createdAt: string }>}
 */
export function listTunnels() {
  try {
    const output = execSync('cloudflared tunnel list --output json', {
      stdio: ['pipe', 'pipe', 'pipe'],
    }).toString();

    const tunnels = JSON.parse(output);
    return tunnels.map((t) => ({
      id: t.id,
      name: t.name,
      createdAt: t.created_at,
    }));
  } catch {
    return [];
  }
}

/**
 * Gets a tunnel by name.
 * @param {string} name - Tunnel name
 * @returns {{ id: string, name: string } | null}
 */
export function getTunnelByName(name) {
  const tunnels = listTunnels();
  return tunnels.find((t) => t.name === name) || null;
}

/**
 * Creates a new named tunnel.
 * @param {string} name - Tunnel name (e.g., "opentop")
 * @returns {{ id: string, name: string } | null}
 */
export function createTunnel(name) {
  try {
    // Create the tunnel
    const output = execSync(`cloudflared tunnel create ${name}`, {
      stdio: ['pipe', 'pipe', 'pipe'],
    }).toString();

    // Extract tunnel ID from output
    const match = output.match(/([a-f0-9-]{36})/);
    if (match) {
      return { id: match[1], name };
    }

    // Fallback: try to get it from list
    return getTunnelByName(name);
  } catch (err) {
    // Tunnel might already exist
    const existing = getTunnelByName(name);
    if (existing) return existing;
    throw err;
  }
}

/**
 * Routes a domain to the tunnel via DNS.
 * @param {string} tunnelName - Tunnel name
 * @param {string} domain - Full domain (e.g., "api.example.com")
 * @returns {boolean} Success
 */
export function routeDNS(tunnelName, domain) {
  try {
    execSync(`cloudflared tunnel route dns ${tunnelName} ${domain}`, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Generates the cloudflared config file for a named tunnel.
 * @param {object} opts
 * @param {string} opts.tunnelId - Tunnel UUID
 * @param {string} opts.tunnelName - Tunnel name
 * @param {string} opts.domain - Hostname (e.g., "api.example.com")
 * @param {number} opts.localPort - Local port to forward to
 * @returns {string} Path to config file
 */
export function generateTunnelConfig({ tunnelId, tunnelName, domain, localPort }) {
  const configDir = join(homedir(), '.opentop');
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  const configPath = join(configDir, 'tunnel-config.yml');

  // Find credentials file
  const credentialsPath = join(CLOUDFLARED_CONFIG_DIR, `${tunnelId}.json`);

  const config = `
tunnel: ${tunnelId}
credentials-file: ${credentialsPath}

ingress:
  - hostname: ${domain}
    service: http://localhost:${localPort}
  - service: http_status:404
`.trim();

  writeFileSync(configPath, config, 'utf-8');
  return configPath;
}

/**
 * Starts a named tunnel.
 * @param {object} opts
 * @param {string} opts.tunnelName - Tunnel name
 * @param {string} opts.domain - Domain
 * @param {number} opts.localPort - Local port
 * @param {function} [opts.onStderr] - Callback for stderr
 * @returns {Promise<{ url: string, process: ChildProcess }>}
 */
export async function startNamedTunnel({ tunnelName, domain, localPort, onStderr }) {
  // Get or create tunnel
  let tunnel = getTunnelByName(tunnelName);
  if (!tunnel) {
    tunnel = createTunnel(tunnelName);
    if (!tunnel) {
      throw new Error(`Failed to create tunnel: ${tunnelName}`);
    }
  }

  // Generate config
  const configPath = generateTunnelConfig({
    tunnelId: tunnel.id,
    tunnelName,
    domain,
    localPort,
  });

  return new Promise((resolve, reject) => {
    const proc = spawn('cloudflared', [
      'tunnel',
      '--config', configPath,
      'run',
      tunnelName,
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let resolved = false;

    // Named tunnels don't output URL, we know it from domain
    const url = `https://${domain}`;

    const onData = (data) => {
      const text = data.toString();
      if (onStderr) onStderr(text);

      // Look for "connection registered" or similar success indicator
      if (!resolved && (
        text.includes('Connection') ||
        text.includes('Registered tunnel connection') ||
        text.includes('Initial protocol')
      )) {
        resolved = true;
        resolve({ url, process: proc });
      }
    };

    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);

    // Give it a short time to connect, then resolve anyway
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve({ url, process: proc });
      }
    }, 5000);

    proc.on('error', (err) => {
      if (!resolved) {
        reject(new Error(`Failed to start named tunnel: ${err.message}`));
      }
    });

    proc.on('exit', (code) => {
      if (!resolved) {
        reject(new Error(`Named tunnel exited with code ${code}`));
      }
    });
  });
}

/**
 * Stops a named tunnel process.
 * @param {ChildProcess} tunnelProcess
 */
export function stopNamedTunnel(tunnelProcess) {
  if (tunnelProcess && !tunnelProcess.killed) {
    tunnelProcess.kill('SIGTERM');
  }
}

/**
 * Deletes a tunnel by name.
 * @param {string} name - Tunnel name
 * @returns {boolean} Success
 */
export function deleteTunnel(name) {
  try {
    execSync(`cloudflared tunnel delete ${name}`, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return true;
  } catch {
    return false;
  }
}

export default {
  isCloudflareLoggedIn,
  loginToCloudflare,
  listTunnels,
  getTunnelByName,
  createTunnel,
  routeDNS,
  generateTunnelConfig,
  startNamedTunnel,
  stopNamedTunnel,
  deleteTunnel,
};

// src/tunnel.js
// Cloudflare tunnel management using quick tunnels (trycloudflare.com).
// Quick tunnels don't require a Cloudflare account — URL changes each restart.

import { spawn, execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import logger from './utils/logger.js';

const TUNNEL_CONFIG_PATH = join(homedir(), '.opentop', 'tunnel.json');

export function isTunnelConfigured() {
  return existsSync(TUNNEL_CONFIG_PATH);
}

export function getTunnelUrl() {
  if (!isTunnelConfigured()) return null;
  try {
    const config = JSON.parse(readFileSync(TUNNEL_CONFIG_PATH, 'utf8'));
    return config.url;
  } catch {
    return null;
  }
}

export function saveTunnelUrl(url) {
  const dir = join(homedir(), '.opentop');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const config = { url, createdAt: new Date().toISOString() };
  writeFileSync(TUNNEL_CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function isCloudflaredInstalled() {
  try {
    execSync('which cloudflared', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

export async function startQuickTunnel(localPort) {
  return new Promise((resolve, reject) => {
    const proc = spawn('cloudflared', [
      'tunnel', '--url', `http://localhost:${localPort}`,
      '--no-autoupdate'
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    let resolved = false;
    const urlPattern = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;

    const onData = (data) => {
      const text = data.toString();
      const match = text.match(urlPattern);
      if (match && !resolved) {
        resolved = true;
        resolve({ url: match[0], process: proc });
      }
    };

    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);

    setTimeout(() => {
      if (!resolved) reject(new Error('Tunnel timeout after 30s'));
    }, 30000);

    proc.on('exit', (code) => {
      if (!resolved) reject(new Error(`cloudflared exited with code ${code}`));
    });
  });
}

export function stopTunnel(tunnelProcess) {
  if (tunnelProcess) {
    tunnelProcess.kill();
  }
}

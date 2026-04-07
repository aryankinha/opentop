// src/auth/token.js
// Token caching and management.
// Loads GitHub token ONCE at startup and caches in memory.

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** @type {string | null} Cached token */
let cachedToken = null;

/** @type {boolean} Whether token has been loaded */
let tokenLoaded = false;

/**
 * Discovers a stored GitHub token by checking multiple locations in priority order:
 *   1. COPILOT_GITHUB_TOKEN env var (highest priority)
 *   2. GH_TOKEN env var
 *   3. GITHUB_TOKEN env var
 *   4. ~/.copilot/config.json — logged_in_users[].token / oauth_token / access_token
 *   5. macOS Keychain — service "copilot-cli", account "<host>:<login>"
 *   6. ~/.config/github-copilot/hosts.json — github.com oauth_token
 *
 * @returns {string | null} The first token found, or null if none found.
 */
function discoverToken() {
  // 1. Environment variables (highest priority)
  if (process.env.COPILOT_GITHUB_TOKEN) {
    return process.env.COPILOT_GITHUB_TOKEN;
  }
  if (process.env.GH_TOKEN) {
    return process.env.GH_TOKEN;
  }
  if (process.env.GITHUB_TOKEN) {
    return process.env.GITHUB_TOKEN;
  }

  // 2. Try ~/.copilot/config.json for inline tokens
  let copilotConfig = null;
  try {
    const configPath = join(homedir(), '.copilot', 'config.json');
    copilotConfig = JSON.parse(readFileSync(configPath, 'utf8'));

    const users = copilotConfig.logged_in_users || copilotConfig.users || [];
    for (const user of users) {
      if (user.token) return user.token;
      if (user.oauth_token) return user.oauth_token;
      if (user.access_token) return user.access_token;
    }
    // Top-level token field
    if (copilotConfig.token) return copilotConfig.token;
    if (copilotConfig.oauth_token) return copilotConfig.oauth_token;
  } catch {
    // Config doesn't exist or is invalid
  }

  // 3. macOS Keychain — the Copilot CLI stores tokens here
  if (process.platform === 'darwin') {
    const users = copilotConfig?.logged_in_users || copilotConfig?.users || [];
    const lastUser = copilotConfig?.last_logged_in_user;
    const candidates = [...users];
    if (lastUser) candidates.push(lastUser);

    for (const user of candidates) {
      const host = user.host || 'https://github.com';
      const login = user.login;
      if (!login) continue;

      const account = `${host}:${login}`;
      try {
        const token = execSync(
          `security find-generic-password -s "copilot-cli" -a "${account}" -w`,
          { timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
        ).toString().trim();

        if (token) {
          return token;
        }
      } catch {
        // No keychain entry for this account
      }
    }

    // Fallback: try without specific account (any copilot-cli entry)
    try {
      const token = execSync(
        'security find-generic-password -s "copilot-cli" -w',
        { timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
      ).toString().trim();

      if (token) {
        return token;
      }
    } catch {
      // No generic copilot-cli entry
    }
  }

  // 4. Try ~/.config/github-copilot/hosts.json
  try {
    const hostsPath = join(homedir(), '.config', 'github-copilot', 'hosts.json');
    const hosts = JSON.parse(readFileSync(hostsPath, 'utf8'));

    const githubHost =
      hosts['github.com'] ||
      hosts['https://github.com'] ||
      hosts['github.com:443'] ||
      {};
    if (githubHost.oauth_token) return githubHost.oauth_token;
    if (githubHost.token) return githubHost.token;

    // Try iterating all hosts
    for (const [, data] of Object.entries(hosts)) {
      if (data?.oauth_token) return data.oauth_token;
      if (data?.token) return data.token;
    }
  } catch {
    // hosts.json doesn't exist or is invalid
  }

  return null;
}

/**
 * Loads and caches the GitHub token.
 * Should be called ONCE at startup.
 * @returns {string | null} The cached token
 */
export function loadToken() {
  if (!tokenLoaded) {
    cachedToken = discoverToken();
    tokenLoaded = true;
  }
  return cachedToken;
}

/**
 * Gets the cached GitHub token.
 * If token hasn't been loaded yet, loads it first.
 * @returns {string | null}
 */
export function getToken() {
  if (!tokenLoaded) {
    return loadToken();
  }
  return cachedToken;
}

/**
 * Checks if a token is available (without exposing it).
 * @returns {boolean}
 */
export function hasToken() {
  return getToken() !== null;
}

/**
 * Gets info about where the token was found.
 * @returns {object} Token source info
 */
export function getTokenSource() {
  if (process.env.COPILOT_GITHUB_TOKEN) {
    return { source: 'env', name: 'COPILOT_GITHUB_TOKEN' };
  }
  if (process.env.GH_TOKEN) {
    return { source: 'env', name: 'GH_TOKEN' };
  }
  if (process.env.GITHUB_TOKEN) {
    return { source: 'env', name: 'GITHUB_TOKEN' };
  }

  // Check if token came from keychain
  if (process.platform === 'darwin' && cachedToken) {
    try {
      const configPath = join(homedir(), '.copilot', 'config.json');
      const config = JSON.parse(readFileSync(configPath, 'utf8'));
      const users = config.logged_in_users || config.users || [];

      // Check if any user has inline token
      for (const user of users) {
        if (user.token || user.oauth_token || user.access_token) {
          return { source: 'config', path: configPath };
        }
      }

      // If we have a token but no inline token, it came from keychain
      return { source: 'keychain', service: 'copilot-cli' };
    } catch {
      return { source: 'keychain', service: 'copilot-cli' };
    }
  }

  // Check config file
  const configPath = join(homedir(), '.copilot', 'config.json');
  try {
    readFileSync(configPath, 'utf8');
    return { source: 'config', path: configPath };
  } catch {
    // Try hosts.json
    const hostsPath = join(homedir(), '.config', 'github-copilot', 'hosts.json');
    try {
      readFileSync(hostsPath, 'utf8');
      return { source: 'hosts', path: hostsPath };
    } catch {
      return { source: 'unknown' };
    }
  }
}

/**
 * Clears the cached token (useful for logout/reset).
 */
export function clearToken() {
  cachedToken = null;
  tokenLoaded = false;
}

/**
 * Gets a masked version of the token for logging.
 * @returns {string}
 */
export function getMaskedToken() {
  const token = getToken();
  if (!token) return 'none';
  return token.slice(0, 8) + '...' + token.slice(-4);
}

export default {
  loadToken,
  getToken,
  hasToken,
  getTokenSource,
  clearToken,
  getMaskedToken,
};

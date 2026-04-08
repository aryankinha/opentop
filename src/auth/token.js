// src/auth/token.js
// Token caching and management.
// Loads GitHub token ONCE at startup and caches in memory.
// Supports local token caching to avoid repeated auth prompts.

import { readFileSync, writeFileSync, chmodSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { runDeviceAuth } from './deviceFlow.js';

/** @type {string | null} Cached token */
let cachedToken = null;

/** @type {boolean} Whether token has been loaded */
let tokenLoaded = false;

/** @type {string} Source of the token (for debugging) */
let tokenSource = 'unknown';

const OPENTOP_CONFIG_DIR = join(homedir(), '.opentop');
const OPENTOP_CONFIG_PATH = join(OPENTOP_CONFIG_DIR, 'config.json');

/**
 * Determines whether local token caching is enabled.
 * Supports both legacy and current config keys.
 * @param {object|null} config
 * @returns {boolean}
 */
function isLocalCachingEnabled(config) {
  const auth = config?.auth || {};

  if (typeof auth.cacheTokenLocally === 'boolean') {
    return auth.cacheTokenLocally;
  }

  if (typeof auth.cacheToken === 'boolean') {
    return auth.cacheToken;
  }

  return true;
}

/**
 * Reads the OpenTop config file.
 * @returns {object|null} The config object or null if not found/invalid
 */
function readOpenTopConfig() {
  try {
    if (existsSync(OPENTOP_CONFIG_PATH)) {
      return JSON.parse(readFileSync(OPENTOP_CONFIG_PATH, 'utf8'));
    }
  } catch {
    // Config doesn't exist or is invalid
  }
  return null;
}

/**
 * Saves a token to local config cache.
 * @param {string} token - The token to cache
 */
function saveTokenToLocalCache(token) {
  try {
    // Ensure config directory exists
    if (!existsSync(OPENTOP_CONFIG_DIR)) {
      mkdirSync(OPENTOP_CONFIG_DIR, { recursive: true });
    }
    
    // Read existing config or create new
    let config = {};
    try {
      if (existsSync(OPENTOP_CONFIG_PATH)) {
        config = JSON.parse(readFileSync(OPENTOP_CONFIG_PATH, 'utf8'));
      }
    } catch {
      // Start fresh
    }
    
    // Update auth section
    config.auth = config.auth || {};
    config.auth.cachedToken = token;
    config.auth.cacheTokenLocally = true;
    config.auth.cacheToken = true;
    
    // Write back with restricted permissions
    writeFileSync(OPENTOP_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
    
    // Set file permissions to user-only read/write (0600)
    try {
      chmodSync(OPENTOP_CONFIG_PATH, 0o600);
    } catch {
      // chmod might fail on some systems, continue anyway
    }
    
    console.log('[Auth] Token cached locally to avoid repeated auth prompts');
  } catch (error) {
    console.error('[Auth] Failed to cache token locally:', error.message);
  }
}

/**
 * Discovers a stored GitHub token by checking multiple locations in priority order:
 *   1. COPILOT_GITHUB_TOKEN env var (highest priority)
 *   2. GH_TOKEN env var
 *   3. GITHUB_TOKEN env var
 *   4. Local cache in ~/.opentop/config.json
 *   5. ~/.copilot/config.json — logged_in_users[].token / oauth_token / access_token
 *   6. ~/.config/github-copilot/hosts.json — github.com oauth_token
 *
 * @returns {string | null} The first token found, or null if none found.
 */
function discoverToken() {
  // 1. Environment variables (highest priority)
  if (process.env.COPILOT_GITHUB_TOKEN) {
    tokenSource = 'env:COPILOT_GITHUB_TOKEN';
    return process.env.COPILOT_GITHUB_TOKEN;
  }
  if (process.env.GH_TOKEN) {
    tokenSource = 'env:GH_TOKEN';
    return process.env.GH_TOKEN;
  }
  if (process.env.GITHUB_TOKEN) {
    tokenSource = 'env:GITHUB_TOKEN';
    return process.env.GITHUB_TOKEN;
  }

  // 2. Check local token cache in ~/.opentop/config.json
  const opentopConfig = readOpenTopConfig();
  const cachingEnabled = isLocalCachingEnabled(opentopConfig);

  if (cachingEnabled && opentopConfig?.auth?.cachedToken) {
    tokenSource = 'local-cache';
    console.log('[Auth] Using locally cached token');
    return opentopConfig.auth.cachedToken;
  }

  // Track if we should cache locally after finding a token
  const shouldCacheLocally = cachingEnabled;

  // 3. Try ~/.copilot/config.json for inline tokens
  let copilotConfig = null;
  try {
    const configPath = join(homedir(), '.copilot', 'config.json');
    copilotConfig = JSON.parse(readFileSync(configPath, 'utf8'));

    const users = copilotConfig.logged_in_users || copilotConfig.users || [];
    for (const user of users) {
      if (user.token) {
        tokenSource = 'copilot-config:user.token';
        if (shouldCacheLocally) saveTokenToLocalCache(user.token);
        return user.token;
      }
      if (user.oauth_token) {
        tokenSource = 'copilot-config:user.oauth_token';
        if (shouldCacheLocally) saveTokenToLocalCache(user.oauth_token);
        return user.oauth_token;
      }
      if (user.access_token) {
        tokenSource = 'copilot-config:user.access_token';
        if (shouldCacheLocally) saveTokenToLocalCache(user.access_token);
        return user.access_token;
      }
    }
    // Top-level token field
    if (copilotConfig.token) {
      tokenSource = 'copilot-config:token';
      if (shouldCacheLocally) saveTokenToLocalCache(copilotConfig.token);
      return copilotConfig.token;
    }
    if (copilotConfig.oauth_token) {
      tokenSource = 'copilot-config:oauth_token';
      if (shouldCacheLocally) saveTokenToLocalCache(copilotConfig.oauth_token);
      return copilotConfig.oauth_token;
    }
  } catch {
    // Config doesn't exist or is invalid
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
    
    if (githubHost.oauth_token) {
      tokenSource = 'hosts.json:oauth_token';
      if (shouldCacheLocally) saveTokenToLocalCache(githubHost.oauth_token);
      return githubHost.oauth_token;
    }
    if (githubHost.token) {
      tokenSource = 'hosts.json:token';
      if (shouldCacheLocally) saveTokenToLocalCache(githubHost.token);
      return githubHost.token;
    }

    // Try iterating all hosts
    for (const [, data] of Object.entries(hosts)) {
      if (data?.oauth_token) {
        tokenSource = 'hosts.json:other.oauth_token';
        if (shouldCacheLocally) saveTokenToLocalCache(data.oauth_token);
        return data.oauth_token;
      }
      if (data?.token) {
        tokenSource = 'hosts.json:other.token';
        if (shouldCacheLocally) saveTokenToLocalCache(data.token);
        return data.token;
      }
    }
  } catch {
    // hosts.json doesn't exist or is invalid
  }

  tokenSource = 'none';
  return null;
}

/**
 * Stores a token in local cache and memory.
 * @param {string} token
 * @param {string} [source='manual']
 * @returns {string}
 */
export function storeToken(token, source = 'manual') {
  const normalized = typeof token === 'string' ? token.trim() : '';
  if (!normalized) {
    throw new Error('Token must be a non-empty string');
  }

  saveTokenToLocalCache(normalized);
  cachedToken = normalized;
  tokenLoaded = true;
  tokenSource = source;

  return normalized;
}

/**
 * Runs GitHub OAuth device flow and stores the resulting token.
 * @param {object} [options]
 * @returns {Promise<string>}
 */
export async function authenticateWithDeviceFlow(options = {}) {
  const token = await runDeviceAuth(options);
  return storeToken(token, 'device-flow');
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
  // Use the tracked source from discoverToken()
  if (tokenSource.startsWith('env:')) {
    return { source: 'env', name: tokenSource.replace('env:', '') };
  }
  if (tokenSource === 'local-cache') {
    return { source: 'local-cache', path: OPENTOP_CONFIG_PATH };
  }
  if (tokenSource === 'device-flow') {
    return { source: 'device-flow', path: OPENTOP_CONFIG_PATH };
  }
  if (tokenSource.startsWith('copilot-config:')) {
    return { source: 'copilot-config', path: join(homedir(), '.copilot', 'config.json') };
  }
  if (tokenSource.startsWith('hosts.json:')) {
    return { source: 'hosts.json', path: join(homedir(), '.config', 'github-copilot', 'hosts.json') };
  }
  return { source: tokenSource || 'unknown' };
}

/**
 * Clears the cached token (useful for logout/reset).
 * Also clears the local token cache file if present.
 */
export function clearToken() {
  cachedToken = null;
  tokenLoaded = false;
  tokenSource = 'unknown';
  
  // Also clear local cache
  clearLocalTokenCache();
}

/**
 * Clears only the local token cache (without clearing memory).
 */
export function clearLocalTokenCache() {
  try {
    if (existsSync(OPENTOP_CONFIG_PATH)) {
      const config = JSON.parse(readFileSync(OPENTOP_CONFIG_PATH, 'utf8'));
      if (config.auth?.cachedToken) {
        delete config.auth.cachedToken;
        writeFileSync(OPENTOP_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
        console.log('[Auth] Local token cache cleared');
      }
    }
  } catch (error) {
    console.error('[Auth] Failed to clear local token cache:', error.message);
  }
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
  storeToken,
  authenticateWithDeviceFlow,
  getTokenSource,
  clearToken,
  clearLocalTokenCache,
  getMaskedToken,
};

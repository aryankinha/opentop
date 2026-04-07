// src/config.js
// Loads config from ~/.opentop/config.json.
// If the file does not exist, creates it with defaults.
// Validates config values at startup.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import logger from './utils/logger.js';
import { generateDeviceName } from './utils/deviceName.js';

const CONFIG_DIR = join(homedir(), '.opentop');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

export { CONFIG_DIR, CONFIG_PATH };

const DEFAULT_CONFIG = {
  deviceName: generateDeviceName(), // Auto-generated on first run
  port: 3000,
  defaultModel: 'claude-sonnet-4.5',
  availableModels: [
    'claude-sonnet-4.5',
    'claude-haiku-4.5',
    'claude-opus-4.5',
    'gpt-5.3-codex',
    'gpt-5-mini',
  ],
  workspacePath: '~',
  trustedFolders: ['~'],
  trustedFolder: '~',
  autoApproveTools: ['read'],
  requireApprovalTools: ['shell', 'write', 'url', 'mcp'],
  maxContextTokens: 8000,
  keepRecentMessages: 10,
  walEnabled: true,
  // Tunnel configuration
  tunnel: {
    mode: 'quick',        // "quick" | "persistent" | "disabled"
    domain: null,         // For persistent mode (e.g., "api.example.com")
    tunnelName: 'opentop', // Named tunnel identifier
    tunnelId: null,       // UUID from cloudflared (auto-populated)
  },
  // Auth configuration  
  auth: {
    cacheToken: true,     // Cache token in memory at startup
  },
};

function loadConfig() {
  // Ensure config directory exists
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
    logger.info('Created config directory', { path: CONFIG_DIR });
  }

  // If config file doesn't exist, write defaults
  if (!existsSync(CONFIG_PATH)) {
    writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8');
    logger.info('Created default config', { path: CONFIG_PATH });
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    const userConfig = JSON.parse(raw);
    // Merge with defaults so new keys are always present
    const merged = { ...DEFAULT_CONFIG, ...userConfig };
    logger.info('Loaded config', { path: CONFIG_PATH });
    return merged;
  } catch (err) {
    logger.error('Failed to parse config, using defaults', { error: err.message });
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Validates config values and replaces invalid ones with defaults.
 * Logs a warning for each invalid value found.
 * @param {object} cfg - The config object to validate (mutated in place)
 */
export function validateConfig(cfg) {
  // port: must be a number between 1024 and 65535
  if (typeof cfg.port !== 'number' || cfg.port < 1024 || cfg.port > 65535) {
    logger.warn('Invalid config: port must be 1024–65535, using default', {
      got: cfg.port,
      using: DEFAULT_CONFIG.port,
    });
    cfg.port = DEFAULT_CONFIG.port;
  }

  // defaultModel: must be a non-empty string
  if (typeof cfg.defaultModel !== 'string' || cfg.defaultModel.trim().length === 0) {
    logger.warn('Invalid config: defaultModel must be a non-empty string, using default', {
      got: cfg.defaultModel,
      using: DEFAULT_CONFIG.defaultModel,
    });
    cfg.defaultModel = DEFAULT_CONFIG.defaultModel;
  }

  // maxContextTokens: must be a number > 0
  if (typeof cfg.maxContextTokens !== 'number' || cfg.maxContextTokens <= 0) {
    logger.warn('Invalid config: maxContextTokens must be > 0, using default', {
      got: cfg.maxContextTokens,
      using: DEFAULT_CONFIG.maxContextTokens,
    });
    cfg.maxContextTokens = DEFAULT_CONFIG.maxContextTokens;
  }

  // keepRecentMessages: must be a number > 0
  if (typeof cfg.keepRecentMessages !== 'number' || cfg.keepRecentMessages <= 0) {
    logger.warn('Invalid config: keepRecentMessages must be > 0, using default', {
      got: cfg.keepRecentMessages,
      using: DEFAULT_CONFIG.keepRecentMessages,
    });
    cfg.keepRecentMessages = DEFAULT_CONFIG.keepRecentMessages;
  }
}

export const config = loadConfig();
validateConfig(config);

// ─── Device name helpers ────────────────────────────────────────────

/**
 * Gets the device name from config.
 * @returns {string}
 */
export function getDeviceName() {
  return config.deviceName || DEFAULT_CONFIG.deviceName;
}

/**
 * Sets a new device name in config.
 * @param {string} name - New device name
 */
export async function setDeviceName(name) {
  const { isValidDeviceName } = await import('./utils/deviceName.js');
  
  if (!isValidDeviceName(name)) {
    throw new Error('Invalid device name. Must be 3-50 characters, alphanumeric + hyphens only.');
  }
  
  config.deviceName = name;
  
  // Write back to file
  const current = existsSync(CONFIG_PATH) 
    ? JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))
    : {};
  
  current.deviceName = name;
  writeFileSync(CONFIG_PATH, JSON.stringify(current, null, 2), 'utf-8');
  logger.info('Device name updated', { name });
}

// ─── Ensure ~ is trusted by Copilot CLI ─────────────────────────────

function ensureHomeTrusted() {
  const copilotConfigPath = join(homedir(), '.copilot', 'config.json');
  try {
    const raw = readFileSync(copilotConfigPath, 'utf8');
    const copilotCfg = JSON.parse(raw);
    const folders = copilotCfg.trusted_folders || [];
    const home = homedir();
    if (!folders.includes(home) && !folders.includes('~')) {
      copilotCfg.trusted_folders = [...folders, home];
      writeFileSync(copilotConfigPath, JSON.stringify(copilotCfg, null, 2));
      logger.info('Added ~ to Copilot trusted folders');
    }
  } catch {
    // Ignore if copilot config doesn't exist
  }
}

ensureHomeTrusted();

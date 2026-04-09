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

export const PERMISSION_TOOL_KINDS = Object.freeze([
  'read',
  'shell',
  'write',
  'url',
  'mcp',
]);

const DEFAULT_CONFIG = {
  deviceName: generateDeviceName(), // Auto-generated on first run
  displayName: null, // User's display name (auto-generated if null)
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
    cacheToken: true,           // Cache token in memory at startup
    cacheTokenLocally: true,    // Cache token in config file (avoids repeated auth prompts)
    cachedToken: null,          // The locally cached GitHub token
  },
};

function normalizePermissionToolList(value, fallback = []) {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  return [...new Set(
    value
      .filter((item) => typeof item === 'string')
      .map((item) => item.trim().toLowerCase())
      .filter((item) => PERMISSION_TOOL_KINDS.includes(item)),
  )];
}

function buildRequireApprovalTools(autoApproveTools) {
  return PERMISSION_TOOL_KINDS.filter((kind) => !autoApproveTools.includes(kind));
}

function readConfigFileOrEmpty() {
  if (!existsSync(CONFIG_PATH)) {
    return {};
  }

  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function createDefaultConfig() {
  return {
    ...DEFAULT_CONFIG,
    availableModels: [...DEFAULT_CONFIG.availableModels],
    trustedFolders: [...DEFAULT_CONFIG.trustedFolders],
    autoApproveTools: [...DEFAULT_CONFIG.autoApproveTools],
    requireApprovalTools: [...DEFAULT_CONFIG.requireApprovalTools],
    tunnel: { ...DEFAULT_CONFIG.tunnel },
    auth: { ...DEFAULT_CONFIG.auth },
  };
}

function normalizeAuthConfig(authConfig = {}) {
  const auth = { ...authConfig };

  if (typeof auth.cacheTokenLocally !== 'boolean' && typeof auth.cacheToken === 'boolean') {
    auth.cacheTokenLocally = auth.cacheToken;
  }

  if (typeof auth.cacheToken !== 'boolean' && typeof auth.cacheTokenLocally === 'boolean') {
    auth.cacheToken = auth.cacheTokenLocally;
  }

  if (typeof auth.cacheTokenLocally !== 'boolean') {
    auth.cacheTokenLocally = true;
  }

  if (typeof auth.cacheToken !== 'boolean') {
    auth.cacheToken = auth.cacheTokenLocally;
  }

  if (typeof auth.cachedToken !== 'string' || auth.cachedToken.trim().length === 0) {
    auth.cachedToken = null;
  }

  return auth;
}

function loadConfig() {
  // Ensure config directory exists
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
    logger.info('Created config directory', { path: CONFIG_DIR });
  }

  // If config file doesn't exist, write defaults
  if (!existsSync(CONFIG_PATH)) {
    const defaultConfig = createDefaultConfig();
    writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2), 'utf-8');
    logger.info('Created default config', { path: CONFIG_PATH });
    return defaultConfig;
  }

  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    const userConfig = JSON.parse(raw);
    // Merge with defaults so new keys are always present
    const defaults = createDefaultConfig();
    const autoApproveTools = normalizePermissionToolList(
      userConfig.autoApproveTools,
      defaults.autoApproveTools,
    );
    const merged = {
      ...defaults,
      ...userConfig,
      autoApproveTools,
      requireApprovalTools: buildRequireApprovalTools(autoApproveTools),
      tunnel: {
        ...defaults.tunnel,
        ...(userConfig.tunnel || {}),
      },
      auth: normalizeAuthConfig({
        ...defaults.auth,
        ...(userConfig.auth || {}),
      }),
    };
    logger.info('Loaded config', { path: CONFIG_PATH });
    return merged;
  } catch (err) {
    logger.error('Failed to parse config, using defaults', { error: err.message });
    return createDefaultConfig();
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

  // Permission policy arrays
  cfg.autoApproveTools = normalizePermissionToolList(
    cfg.autoApproveTools,
    DEFAULT_CONFIG.autoApproveTools,
  );
  cfg.requireApprovalTools = buildRequireApprovalTools(cfg.autoApproveTools);
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

/**
 * Returns permission policy for tool approvals.
 * @returns {{ availableTools: string[], autoApproveTools: string[], requireApprovalTools: string[] }}
 */
export function getPermissionPolicy() {
  const autoApproveTools = normalizePermissionToolList(
    config.autoApproveTools,
    DEFAULT_CONFIG.autoApproveTools,
  );

  return {
    availableTools: [...PERMISSION_TOOL_KINDS],
    autoApproveTools,
    requireApprovalTools: buildRequireApprovalTools(autoApproveTools),
  };
}

/**
 * Updates and persists auto-approval tool kinds.
 * @param {string[]} autoApproveTools - Tool kinds to always allow.
 * @returns {{ availableTools: string[], autoApproveTools: string[], requireApprovalTools: string[] }}
 */
export function setPermissionPolicy(autoApproveTools) {
  if (!Array.isArray(autoApproveTools)) {
    throw new Error('autoApproveTools must be an array');
  }

  const normalizedAutoApproveTools = normalizePermissionToolList(autoApproveTools, []);
  config.autoApproveTools = normalizedAutoApproveTools;
  config.requireApprovalTools = buildRequireApprovalTools(normalizedAutoApproveTools);

  const current = readConfigFileOrEmpty();
  current.autoApproveTools = [...config.autoApproveTools];
  current.requireApprovalTools = [...config.requireApprovalTools];

  writeFileSync(CONFIG_PATH, JSON.stringify(current, null, 2), 'utf-8');
  logger.info('Permission policy updated', {
    autoApproveTools: config.autoApproveTools,
    requireApprovalTools: config.requireApprovalTools,
  });

  return getPermissionPolicy();
}

// ─── Display name helpers ────────────────────────────────────────────

/**
 * Gets the display name from config. If not set, generates one.
 * @returns {string}
 */
export function getDisplayName() {
  if (!config.displayName) {
    // Auto-generate display name on first access
    config.displayName = generateRandomDisplayName();
    
    // Persist to file
    try {
      const current = existsSync(CONFIG_PATH) 
        ? JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))
        : {};
      
      current.displayName = config.displayName;
      writeFileSync(CONFIG_PATH, JSON.stringify(current, null, 2), 'utf-8');
      logger.info('Display name auto-generated', { name: config.displayName });
    } catch (error) {
      logger.error('Failed to save auto-generated display name', { error: error.message });
    }
  }
  
  return config.displayName;
}

/**
 * Sets a new display name in config.
 * @param {string} name - New display name
 */
export function setDisplayName(name) {
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new Error('Display name must be a non-empty string');
  }
  
  const trimmed = name.trim().slice(0, 50); // Max 50 characters
  config.displayName = trimmed;
  
  // Write back to file
  try {
    const current = existsSync(CONFIG_PATH) 
      ? JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))
      : {};
    
    current.displayName = trimmed;
    writeFileSync(CONFIG_PATH, JSON.stringify(current, null, 2), 'utf-8');
    logger.info('Display name updated', { name: trimmed });
  } catch (error) {
    logger.error('Failed to save display name', { error: error.message });
    throw error;
  }
}

/**
 * Generates a random display name (adjective-creature format)
 * @returns {string}
 */
function generateRandomDisplayName() {
  const adjectives = [
    'swift', 'clever', 'brave', 'mighty', 'shadow', 'lightning', 
    'mystic', 'golden', 'silver', 'crimson', 'azure', 'emerald',
    'frost', 'storm', 'cosmic', 'stellar', 'lunar', 'solar',
    'wild', 'noble', 'fierce', 'gentle', 'silent', 'roaring'
  ];
  
  const creatures = [
    'pikachu', 'charizard', 'bulbasaur', 'squirtle', 'eevee', 'snorlax',
    'mewtwo', 'dragonite', 'gengar', 'lucario', 'garchomp', 'blaziken',
    'fox', 'wolf', 'tiger', 'lion', 'bear', 'eagle', 'hawk', 'falcon',
    'dragon', 'phoenix', 'griffin', 'unicorn', 'panther', 'raven', 'owl'
  ];
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const creature = creatures[Math.floor(Math.random() * creatures.length)];
  return `${adjective}-${creature}`;
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

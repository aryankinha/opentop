// src/core/pairingToken.js
// Manages pairing token generation, storage, and validation.
// Token is generated on each `opentop start` and required for API requests.
// Static files and UI are served without auth.

import { randomBytes, randomInt } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import logger from '../utils/logger.js';

const RUNTIME_DIR = join(homedir(), '.opentop', 'runtime');
const TOKEN_PATH = join(RUNTIME_DIR, 'pairing.json');

// ─── Public paths that don't require auth ───────────────────────────

const PUBLIC_PATH_PREFIXES = [
  '/assets',
  '/icons',
  '/_app',
  '/static',
];

const PUBLIC_EXACT_PATHS = [
  '/',
  '/index.html',
  '/health',
  '/favicon.ico',
  '/favicon.svg',
  '/manifest.json',
  '/manifest.webmanifest',
  '/sw.js',
  '/service-worker.js',
  '/robots.txt',
];

// File extensions that are always public (static assets)
const PUBLIC_EXTENSIONS = /\.(js|css|html|svg|png|jpg|jpeg|gif|ico|woff|woff2|ttf|eot|webmanifest|json|map)$/i;

/**
 * Checks if a path is public (doesn't require auth).
 * @param {string} path - Request path
 * @returns {boolean}
 */
function isPublicPath(path) {
  // Exact matches
  if (PUBLIC_EXACT_PATHS.includes(path)) {
    return true;
  }
  
  // Prefix matches
  if (PUBLIC_PATH_PREFIXES.some(prefix => path.startsWith(prefix))) {
    return true;
  }
  
  // Static file extensions
  if (PUBLIC_EXTENSIONS.test(path)) {
    return true;
  }
  
  return false;
}

/**
 * Checks if a path is a protected API route.
 * @param {string} path - Request path
 * @returns {boolean}
 */
function isApiPath(path) {
  return (
    path.startsWith('/api') ||
    path.startsWith('/session') ||
    path.startsWith('/sessions') ||
    path.startsWith('/chat')
  );
}

/**
 * Generates a new 6-digit pairing PIN.
 * @returns {string} 6-digit PIN as string (e.g., "839201")
 */
export function generatePairingPin() {
  return String(randomInt(100000, 999999));
}

/**
 * Generates a secure random token (32 bytes hex).
 * @returns {string} 64-character hex string
 */
export function generateSecureToken() {
  return randomBytes(32).toString('hex');
}

/**
 * Generates and saves a new pairing token.
 * Returns both the PIN (for display) and full token (for auth).
 * @returns {{ pin: string, token: string, createdAt: string }}
 */
export function createPairingToken() {
  // Ensure runtime directory exists
  if (!existsSync(RUNTIME_DIR)) {
    mkdirSync(RUNTIME_DIR, { recursive: true });
  }

  const pin = generatePairingPin();
  const token = generateSecureToken();
  const createdAt = new Date().toISOString();

  const data = {
    pin,
    token,
    createdAt,
  };

  writeFileSync(TOKEN_PATH, JSON.stringify(data, null, 2), 'utf-8');
  logger.info('Pairing token created');

  return data;
}

/**
 * Loads the current pairing token from disk.
 * @returns {{ pin: string, token: string, createdAt: string } | null}
 */
export function loadPairingToken() {
  if (!existsSync(TOKEN_PATH)) {
    return null;
  }

  try {
    const raw = readFileSync(TOKEN_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    logger.warn('Failed to load pairing token', { error: err.message });
    return null;
  }
}

/**
 * Validates a token against the stored pairing token.
 * Accepts either the full token OR the PIN.
 * @param {string} providedToken - Token from Authorization header
 * @returns {boolean}
 */
export function validatePairingToken(providedToken) {
  const stored = loadPairingToken();
  if (!stored) {
    // No token stored = pairing not required (dev mode / direct access)
    return true;
  }

  if (!providedToken) {
    return false;
  }

  // Accept either full token or PIN
  return providedToken === stored.token || providedToken === stored.pin;
}

/**
 * Clears the pairing token (on stop/reset).
 */
export function clearPairingToken() {
  if (existsSync(TOKEN_PATH)) {
    unlinkSync(TOKEN_PATH);
    logger.info('Pairing token cleared');
  }
}

/**
 * Express middleware that requires a valid pairing token for API routes.
 * Static files and UI routes are served without auth.
 * 
 * Token can be provided via:
 *   - Authorization: Bearer <token>
 *   - X-Pairing-Token: <token>
 *   - Query param: ?token=<token>
 */
export function pairingAuthMiddleware(req, res, next) {
  // Skip auth for public paths (static files, UI)
  if (isPublicPath(req.path)) {
    return next();
  }

  // Only require auth for API paths
  if (!isApiPath(req.path)) {
    // Not an API path and not explicitly public — let it through
    // (will likely hit 404 or SPA fallback)
    return next();
  }

  // Extract token from various sources
  let token = null;

  // 1. Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  // 2. X-Pairing-Token header
  if (!token && req.headers['x-pairing-token']) {
    token = req.headers['x-pairing-token'];
  }

  // 3. Query param
  if (!token && req.query.token) {
    token = req.query.token;
  }

  // Validate
  if (!validatePairingToken(token)) {
    // Only log for actual API requests, not static file 404s
    logger.debug('Unauthorized API request', { path: req.path });
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid pairing PIN required. Enter your 6-digit PIN to connect.',
    });
  }

  next();
}

export { TOKEN_PATH, RUNTIME_DIR, isPublicPath, isApiPath };

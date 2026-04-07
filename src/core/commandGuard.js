// src/core/commandGuard.js
// Blocks dangerous commands that could damage the system.
// These are blocked at the permission layer - they never reach user approval.

import { homedir } from 'node:os';
import logger from '../utils/logger.js';

/**
 * Dangerous command patterns that are ALWAYS blocked.
 * These match commands that could wipe system directories.
 */
const DANGEROUS_PATTERNS = [
  // rm -rf on root directory
  /\brm\s+(-[rRfvI]+\s+)*\/\s*$/,
  /\brm\s+(-[rRfvI]+\s+)*\/\*\s*/,
  /\brm\s+(-[rRfvI]+\s+)*\/\.\.\s*/,
  
  // rm -rf on home directory
  /\brm\s+(-[rRfvI]+\s+)*~\/?(\s|$)/,
  /\brm\s+(-[rRfvI]+\s+)*\$HOME\/?(\s|$)/,
  /\brm\s+(-[rRfvI]+\s+)*\$\{HOME\}\/?(\s|$)/,
  
  // sudo variants of rm -rf on root or home
  /\bsudo\s+rm\s+(-[rRfvI]+\s+)*\/(\s|$|\*)/,
  /\bsudo\s+rm\s+(-[rRfvI]+\s+)*~\/?(\s|$)/,
  /\bsudo\s+rm\s+(-[rRfvI]+\s+)*\$HOME\/?(\s|$)/,
  
  // rm -rf on critical system directories
  /\brm\s+(-[rRfvI]+\s+)*\/(etc|usr|bin|sbin|var|boot|lib|lib64|opt|root|System|Applications)\b/,
  /\bsudo\s+rm\s+(-[rRfvI]+\s+)*\/(etc|usr|bin|sbin|var|boot|lib|lib64|opt|root|System|Applications)\b/,
  
  // dd writing to disk devices (can wipe entire disk)
  /\bdd\s+.*\bof=\/dev\/(sd[a-z]|hd[a-z]|nvme\d+n\d+|disk\d+)\b/,
  /\bsudo\s+dd\s+.*\bof=\/dev\/(sd[a-z]|hd[a-z]|nvme\d+n\d+|disk\d+)\b/,
  
  // mkfs on system drives (formats entire partition)
  /\bmkfs(\.\w+)?\s+.*\/dev\/(sd[a-z]|hd[a-z]|nvme\d+n\d+|disk\d+)/,
  /\bsudo\s+mkfs(\.\w+)?\s+.*\/dev\/(sd[a-z]|hd[a-z]|nvme\d+n\d+|disk\d+)/,
  
  // Fork bomb
  /:\s*\(\s*\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;?\s*:/,
  
  // chmod/chown recursive on root
  /\b(chmod|chown)\s+(-[rR]+\s+)*([\d]+|[\w:]+)\s+\/\s*$/,
  /\bsudo\s+(chmod|chown)\s+(-[rR]+\s+)*([\d]+|[\w:]+)\s+\/\s*$/,
  
  // Overwriting critical files
  />\s*\/etc\/(passwd|shadow|sudoers|fstab)/,
  />\s*\/boot\//,
];

/**
 * Protected paths that cannot be deleted with rm -rf.
 * Checked as exact paths or parent directories.
 */
const PROTECTED_PATHS = [
  '/',
  '/etc',
  '/usr',
  '/bin',
  '/sbin',
  '/var',
  '/boot',
  '/lib',
  '/lib64',
  '/opt',
  '/root',
  '/System',           // macOS system
  '/Library',          // macOS library
  '/Applications',     // macOS apps
  '/Users',            // macOS users (but not specific user dirs)
  '/home',             // Linux home root
  homedir(),           // Current user's home directory
];

/**
 * Check if a command matches any dangerous pattern.
 * @param {string} command - The shell command to check
 * @returns {{ blocked: boolean, reason?: string }}
 */
export function checkCommand(command) {
  if (!command || typeof command !== 'string') {
    return { blocked: false };
  }

  const normalizedCommand = command.trim();

  // Check against dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(normalizedCommand)) {
      const reason = getDangerReason(pattern, normalizedCommand);
      logger.warn('Dangerous command blocked', { 
        command: normalizedCommand.slice(0, 100), 
        pattern: pattern.toString(),
        reason,
      });
      return { 
        blocked: true, 
        reason: reason || 'This command matches a dangerous pattern and has been blocked for safety.',
      };
    }
  }

  // Check for rm -rf targeting protected paths explicitly
  const rmMatch = normalizedCommand.match(/\brm\s+(-[rRfvI]+\s+)*(.+)/);
  if (rmMatch) {
    const targetPath = rmMatch[2].trim().split(/\s+/)[0];
    const normalizedPath = normalizePath(targetPath);
    
    for (const protectedPath of PROTECTED_PATHS) {
      if (normalizedPath === protectedPath || normalizedPath === protectedPath + '/') {
        logger.warn('Protected path deletion blocked', { 
          command: normalizedCommand.slice(0, 100), 
          targetPath: normalizedPath,
          protectedPath,
        });
        return { 
          blocked: true, 
          reason: `Cannot delete protected path: ${protectedPath}`,
        };
      }
    }
  }

  return { blocked: false };
}

/**
 * Check if a file path is a protected system path.
 * Used for write operations.
 * @param {string} path - The file path to check
 * @returns {{ blocked: boolean, reason?: string }}
 */
export function checkPath(path) {
  if (!path || typeof path !== 'string') {
    return { blocked: false };
  }

  const normalizedPath = normalizePath(path);

  // Check if trying to overwrite critical system files
  const criticalFiles = [
    '/etc/passwd',
    '/etc/shadow',
    '/etc/sudoers',
    '/etc/fstab',
    '/etc/hosts',
    '/boot/grub/grub.cfg',
  ];

  for (const criticalFile of criticalFiles) {
    if (normalizedPath === criticalFile) {
      logger.warn('Critical file write blocked', { path: normalizedPath });
      return {
        blocked: true,
        reason: `Cannot modify critical system file: ${criticalFile}`,
      };
    }
  }

  return { blocked: false };
}

/**
 * Normalize a path for comparison.
 * Expands ~ and $HOME, removes trailing slashes.
 * @param {string} path 
 * @returns {string}
 */
function normalizePath(path) {
  let normalized = path.trim();
  
  // Expand ~ to home directory
  if (normalized.startsWith('~')) {
    normalized = homedir() + normalized.slice(1);
  }
  
  // Expand $HOME
  normalized = normalized.replace(/\$HOME/g, homedir());
  normalized = normalized.replace(/\$\{HOME\}/g, homedir());
  
  // Remove trailing slash (except for root)
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  
  return normalized;
}

/**
 * Get a human-readable reason for why a command was blocked.
 * @param {RegExp} pattern - The pattern that matched
 * @param {string} command - The command that was blocked
 * @returns {string}
 */
function getDangerReason(pattern, command) {
  const patternStr = pattern.toString();
  
  if (patternStr.includes('rm') && patternStr.includes('\\/\\s*$')) {
    return 'Cannot recursively delete the root directory (/)';
  }
  if (patternStr.includes('rm') && (patternStr.includes('~') || patternStr.includes('HOME'))) {
    return 'Cannot recursively delete the home directory';
  }
  if (patternStr.includes('rm') && patternStr.includes('etc|usr|bin')) {
    return 'Cannot delete critical system directories';
  }
  if (patternStr.includes('dd') && patternStr.includes('of=')) {
    return 'Cannot write directly to disk devices (could wipe entire disk)';
  }
  if (patternStr.includes('mkfs')) {
    return 'Cannot format disk partitions';
  }
  if (patternStr.includes(':\\s*\\(')) {
    return 'Fork bomb detected - this would crash the system';
  }
  if (patternStr.includes('chmod|chown')) {
    return 'Cannot recursively change permissions on root directory';
  }
  
  return 'This command could cause serious system damage';
}

/**
 * List of all blocked pattern descriptions for documentation.
 */
export const BLOCKED_DESCRIPTIONS = [
  'rm -rf / (delete entire filesystem)',
  'rm -rf ~ or $HOME (delete home directory)',
  'rm -rf on /etc, /usr, /bin, /var, /boot, etc.',
  'sudo rm -rf variants of the above',
  'dd writing to disk devices (/dev/sda, /dev/nvme0n1, etc.)',
  'mkfs formatting disk partitions',
  'Fork bombs ( :(){ :|:& };: )',
  'chmod/chown -R on root directory',
  'Overwriting /etc/passwd, /etc/shadow, /etc/sudoers',
];

export default {
  checkCommand,
  checkPath,
  BLOCKED_DESCRIPTIONS,
};

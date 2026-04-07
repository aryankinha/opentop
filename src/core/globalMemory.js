// src/core/globalMemory.js
// Manages global memory for OpenTop.
// Legacy: single file at ~/.opentop/memory.md  (still works, untouched)
// New:    folder at ~/.opentop/memory/ with system.md, projects.md, chats.md, index.md

import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir, hostname, platform, arch } from 'node:os';
import { execSync } from 'node:child_process';

// ─── Legacy single-file constants ───────────────────────────────────

const MEMORY_DIR = join(homedir(), '.opentop');
const MEMORY_TEMPLATE = `# OpenTop Global Memory
# This file persists important facts across all sessions.
# OpenTop automatically updates this when you ask it to remember things.

- User: Aryan
- System: macOS, home directory accessible
- Projects: Located in ~/Documents/Aryan/Project/
`;

// ─── Legacy single-file helpers (unchanged) ─────────────────────────

/**
 * Returns the path to the legacy global memory file.
 * @returns {string}
 */
export function getGlobalMemoryPath() {
  return join(homedir(), '.opentop', 'memory.md');
}

/**
 * Ensures the legacy memory file exists, creating it with a starter template if not.
 */
function ensureMemoryFile() {
  if (!existsSync(MEMORY_DIR)) {
    mkdirSync(MEMORY_DIR, { recursive: true });
  }
  const path = getGlobalMemoryPath();
  if (!existsSync(path)) {
    writeFileSync(path, MEMORY_TEMPLATE, 'utf8');
  }
}

// Initialize legacy on import
ensureMemoryFile();

/**
 * Loads the legacy global memory content.
 * @returns {string | null} Memory content or null if empty/missing
 */
export function loadGlobalMemory() {
  const path = getGlobalMemoryPath();
  if (!existsSync(path)) return null;
  const content = readFileSync(path, 'utf8').trim();
  return content.length > 0 ? content : null;
}

/**
 * Overwrites the entire legacy global memory file.
 * @param {string} content
 */
export function saveGlobalMemory(content) {
  ensureMemoryFile();
  const path = getGlobalMemoryPath();
  writeFileSync(path, content, 'utf8');
}

/**
 * Appends a single fact to the legacy global memory file.
 * @param {string} fact
 */
export function appendGlobalMemory(fact) {
  const existing = loadGlobalMemory() || '';
  const timestamp = new Date().toISOString().split('T')[0];
  const newContent = existing
    ? existing + '\n- [' + timestamp + '] ' + fact
    : '- [' + timestamp + '] ' + fact;
  saveGlobalMemory(newContent);
}

/**
 * Returns the last modified date of the legacy memory file.
 * @returns {string | null} ISO date string or null
 */
export function getMemoryLastModified() {
  const path = getGlobalMemoryPath();
  if (!existsSync(path)) return null;
  try {
    const stat = statSync(path);
    return stat.mtime.toISOString();
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  NEW: Folder-based structured memory at ~/.opentop/memory/
// ═══════════════════════════════════════════════════════════════════════

const STRUCTURED_MEMORY_DIR = join(homedir(), '.opentop', 'memory');

// ─── Templates for initial files ────────────────────────────────────

const SYSTEM_TEMPLATE = `# System Memory
Auto-updated by OpenTop. Contains persistent facts about the user.

## User
- Name: (not yet known)
- Machine: macOS
- Home: ${homedir()}

## Preferences
(none yet)

## Skills & Background
(none yet)
`;

const PROJECTS_TEMPLATE = `# Projects Memory
Auto-updated by OpenTop. One entry per known project.

## Active Projects
(none yet discovered)

## Completed Projects
(none yet)
`;

const CHATS_TEMPLATE = `# Chat History Summaries
One entry per session, added when the session ends or is compacted.
Format: [DATE] [SESSION_ID_SHORT] [MODEL] — <summary>
`;

const INDEX_TEMPLATE = `# OpenTop Memory Index
Last updated: ${new Date().toISOString()}

## What I Know
- System: see system.md
- Projects: see projects.md
- Chat history: see chats.md

## Quick Facts
(regenerated automatically)
`;

// ─── CHANGE 1: Initialize memory folder structure ───────────────────

/**
 * Creates the ~/.opentop/memory/ folder and initial template files
 * if they do not exist.
 */
function initMemoryFolder() {
  if (!existsSync(STRUCTURED_MEMORY_DIR)) {
    mkdirSync(STRUCTURED_MEMORY_DIR, { recursive: true });
  }

  const files = {
    'system.md': SYSTEM_TEMPLATE,
    'projects.md': PROJECTS_TEMPLATE,
    'chats.md': CHATS_TEMPLATE,
    'index.md': INDEX_TEMPLATE,
  };

  for (const [filename, template] of Object.entries(files)) {
    const filePath = join(STRUCTURED_MEMORY_DIR, filename);
    if (!existsSync(filePath)) {
      writeFileSync(filePath, template, 'utf8');
    }
  }
}

// Initialize on import
initMemoryFolder();

// ─── CHANGE 2: Read/write functions for structured memory files ─────

/**
 * Returns the path to the structured memory directory.
 * @returns {string}
 */
export function getMemoryDir() {
  return join(homedir(), '.opentop', 'memory');
}

/**
 * Reads a file from ~/.opentop/memory/<filename>.
 * @param {string} filename
 * @returns {string | null} File content or null if not exists
 */
export function readMemoryFile(filename) {
  const filePath = join(getMemoryDir(), filename);
  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Writes content to ~/.opentop/memory/<filename>.
 * @param {string} filename
 * @param {string} content
 */
export function writeMemoryFile(filename, content) {
  const filePath = join(getMemoryDir(), filename);
  writeFileSync(filePath, content, 'utf8');
}

/**
 * Appends a line to ~/.opentop/memory/<filename>.
 * @param {string} filename
 * @param {string} line
 */
export function appendToMemoryFile(filename, line) {
  const existing = readMemoryFile(filename) || '';
  const filePath = join(getMemoryDir(), filename);
  writeFileSync(filePath, existing.trimEnd() + '\n' + line + '\n', 'utf8');
}

/**
 * Builds the full memory context string combining all structured memory files.
 * Only includes the last 20 lines of chats.md to keep context small.
 * @returns {string}
 */
export function buildFullMemoryContext() {
  const system = readMemoryFile('system.md') || '';
  const projects = readMemoryFile('projects.md') || '';
  const chats = readMemoryFile('chats.md') || '';

  // Only include last 20 lines of chats.md to keep context small
  const recentChats = chats.split('\n').slice(-20).join('\n');

  return `[GLOBAL MEMORY START]

${system}

${projects}

## Recent Chat History
${recentChats}

[GLOBAL MEMORY END]`;
}

// ─── CHANGE 3: Updated buildGlobalMemoryPrompt (prefers folder) ─────

/**
 * Builds the prompt block to inject global memory into a session.
 * Prefers the new folder-based structured memory; falls back to legacy memory.md.
 * @returns {string | null} Formatted prompt or null if no memory exists
 */
export function buildGlobalMemoryPrompt() {
  const fullContext = buildFullMemoryContext();
  // Check if we have any real content (more than just templates)
  const hasContent = fullContext.length > 200;
  if (hasContent) return fullContext;

  // Fallback to old single-file memory
  const legacy = loadGlobalMemory();
  if (legacy) return `[GLOBAL MEMORY]\n${legacy}\n[END GLOBAL MEMORY]`;

  return null;
}

// ─── CHANGE 4: System discovery ─────────────────────────────────────

/**
 * Discovers system info and populates system.md and projects.md.
 * Only runs if system.md still contains "(not yet known)" — meaning first run.
 * Non-blocking, non-fatal. Safe to call at any time.
 */
export async function discoverSystem() {
  try {
    const existing = readMemoryFile('system.md') || '';
    // Only run if system.md still has the placeholder
    if (!existing.includes('(not yet known)')) return;

    const home = homedir();
    let projectsFound = [];

    // Find projects — look for package.json files 2-3 levels deep in ~/Documents
    try {
      const result = execSync(
        `find ~/Documents -maxdepth 3 -name "package.json" -not -path "*/node_modules/*" 2>/dev/null | head -20`,
        { encoding: 'utf8', timeout: 5000 }
      );
      projectsFound = result.trim().split('\n').filter(Boolean)
        .map(p => p.replace(home, '~').replace('/package.json', ''));
    } catch {
      // find may not work or timeout — non-fatal
    }

    const content = `# System Memory
Auto-updated by OpenTop.

## User
- Name: ${process.env.USER || process.env.USERNAME || 'unknown'}
- Machine: ${hostname()}
- Platform: ${platform()} ${arch()}
- Home: ${home}
- Shell: ${process.env.SHELL || 'unknown'}

## Environment
- Node.js: ${process.version}
- OpenTop version: 0.1.0

## Known Project Locations
${projectsFound.map(p => '- ' + p).join('\n') || '- (scanning in progress)'}

## Preferences
- Responses: concise and direct
- Code style: ESM modules, no TypeScript unless asked

## Skills & Background
(to be learned from conversations)
`;

    writeMemoryFile('system.md', content);

    // Also update projects.md with what we found
    if (projectsFound.length > 0) {
      const projectContent = `# Projects Memory
Auto-updated by OpenTop.

## Discovered Projects
${projectsFound.map(p => `### ${p.split('/').pop()}\n- Path: ${p}\n- Status: (unknown)\n`).join('\n')}

## Active Projects
(to be determined from conversations)
`;
      writeMemoryFile('projects.md', projectContent);
    }

    // Update index.md timestamp
    const indexContent = `# OpenTop Memory Index
Last updated: ${new Date().toISOString()}

## What I Know
- System: see system.md (${process.env.USER || 'unknown'}@${hostname()})
- Projects: see projects.md (${projectsFound.length} discovered)
- Chat history: see chats.md

## Quick Facts
- Platform: ${platform()} ${arch()}
- Node: ${process.version}
- Home: ${home}
`;
    writeMemoryFile('index.md', indexContent);

  } catch (err) {
    // Non-fatal — never crash the server
    // Re-throw so the caller can log it
    throw err;
  }
}

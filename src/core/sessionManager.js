// src/core/sessionManager.js
// Manages sessions in memory and persists message history to disk.
// One JSON file per session at storage/sessions/<sessionId>.json.
// Features: atomic writes, WAL for crash safety, token counting, memory compaction.

import { v4 as uuidv4 } from 'uuid';
import {
  readFileSync,
  writeFileSync,
  appendFileSync,
  renameSync,
  readdirSync,
  unlinkSync,
  mkdirSync,
  existsSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { config } from '../config.js';
import { closeSession as closeCopilotSession } from './copilotClient.js';
import { appendToMemoryFile } from './globalMemory.js';
import logger from '../utils/logger.js';

const GLOBAL_STORAGE_DIR = join(homedir(), '.opentop', 'storage');
const SESSIONS_DIR = join(GLOBAL_STORAGE_DIR, 'sessions');
const LEGACY_SESSIONS_DIR = resolve('storage/sessions');

export { SESSIONS_DIR, LEGACY_SESSIONS_DIR };

// Ensure storage directory exists
if (!existsSync(SESSIONS_DIR)) {
  mkdirSync(SESSIONS_DIR, { recursive: true });
}

/** @type {Map<string, object>} In-memory session store */
const sessions = new Map();

// ─── Path helpers ───────────────────────────────────────────────────

function sessionPath(sessionId) {
  return join(SESSIONS_DIR, `${sessionId}.json`);
}

function legacySessionPath(sessionId) {
  return join(LEGACY_SESSIONS_DIR, `${sessionId}.json`);
}

function walPath(sessionId) {
  return join(SESSIONS_DIR, `${sessionId}.wal`);
}

function legacyWalPath(sessionId) {
  return join(LEGACY_SESSIONS_DIR, `${sessionId}.wal`);
}

function archivePath(sessionId) {
  return join(SESSIONS_DIR, `${sessionId}.archive.json`);
}

function legacyArchivePath(sessionId) {
  return join(LEGACY_SESSIONS_DIR, `${sessionId}.archive.json`);
}

function hasAnySessionFile(sessionId) {
  return (
    existsSync(sessionPath(sessionId)) ||
    existsSync(legacySessionPath(sessionId))
  );
}

/**
 * Removes sessions from memory when their backing JSON files are missing.
 * This keeps API results accurate if files are deleted while the server is running.
 */
function reconcileSessionsWithDisk() {
  let removed = 0;

  for (const [sessionId] of sessions) {
    if (!hasAnySessionFile(sessionId)) {
      sessions.delete(sessionId);
      removed++;
    }
  }

  if (removed > 0) {
    logger.warn('Removed in-memory sessions with missing files', { removed });
  }
}

// ─── Token estimation ───────────────────────────────────────────────

/**
 * Estimates token count using a simple heuristic: ~4 chars per token.
 * @param {string} text
 * @returns {number}
 */
export function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Returns total estimated token count for all messages in a session.
 * @param {string} sessionId
 * @returns {number}
 */
export function getSessionTokenCount(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return 0;
  return session.messages.reduce((sum, msg) => sum + estimateTokens(msg.content), 0);
}

// ─── WAL (Write-Ahead Log) ──────────────────────────────────────────

/**
 * Appends a single entry to the WAL file for crash recovery.
 * Uses synchronous append for atomicity.
 * @param {string} sessionId
 * @param {object} entry - { timestamp, role, content, meta }
 */
function appendToWAL(sessionId, entry) {
  if (!config.walEnabled) return;

  const wp = walPath(sessionId);
  try {
    appendFileSync(wp, JSON.stringify(entry) + '\n', 'utf-8');
  } catch (err) {
    logger.error('Failed to append to WAL', { sessionId, error: err.message });
  }
}

/**
 * Replays WAL entries that are not already in the session's messages.
 * Compares by timestamp to avoid duplicates.
 * @param {string} sessionId
 */
function replayWAL(sessionId) {
  const wp = walPath(sessionId);
  if (!existsSync(wp)) return;

  const session = sessions.get(sessionId);
  if (!session) return;

  try {
    const raw = readFileSync(wp, 'utf-8').trim();
    if (!raw) return;

    const lines = raw.split('\n');
    const existingTimestamps = new Set(session.messages.map((m) => m.timestamp));
    let replayed = 0;

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (!existingTimestamps.has(entry.timestamp)) {
          // Reconstruct the message from the WAL entry
          const message = buildMessage(entry.role, entry.content, entry.meta || {});
          message.timestamp = entry.timestamp; // preserve original timestamp
          session.messages.push(message);
          replayed++;
        }
      } catch {
        // Skip malformed lines
      }
    }

    if (replayed > 0) {
      logger.info('Replayed WAL entries', { sessionId, replayed });
      saveToDisk(session);
    }

    // Clear WAL after successful replay + save
    clearWAL(sessionId);
  } catch (err) {
    logger.error('Failed to replay WAL', { sessionId, error: err.message });
  }
}

/**
 * Deletes the WAL file for a session.
 * @param {string} sessionId
 */
function clearWAL(sessionId) {
  const wp = walPath(sessionId);
  try {
    if (existsSync(wp)) unlinkSync(wp);
  } catch {
    // Non-critical — next save will create a fresh WAL
  }
}

// ─── Message builder ────────────────────────────────────────────────

/**
 * Builds a message object with role-appropriate fields.
 * User messages never get toolsUsed; assistant messages do.
 * @param {string} role
 * @param {string} content
 * @param {object} meta
 * @returns {object}
 */
function buildMessage(role, content, meta = {}) {
  const base = {
    role,
    content,
    timestamp: new Date().toISOString(),
  };

  if (role === 'assistant') {
    base.toolsUsed = meta.toolsUsed || [];
    if (meta.tokensUsed != null) base.tokensUsed = meta.tokensUsed;
    if (meta.model) base.model = meta.model; // Track which model was used
  }

  // System messages (compacted memory) get isCompacted flag
  if (role === 'system' && meta.isCompacted) {
    base.isCompacted = true;
  }

  return base;
}

// ─── Persistence helpers ────────────────────────────────────────────

function saveToDisk(session) {
  const filePath = sessionPath(session.sessionId);
  const tmpPath = filePath + '.tmp';

  // Serialize without the live SDK session object
  const serializable = {
    sessionId: session.sessionId,
    model: session.model,
    project: session.project || null,
    name: session.name || null,
    createdAt: session.createdAt,
    messages: session.messages,
    status: session.status,
    title: session.title || null,
    titleVersion: session.titleVersion || 0,
    titleUpdatedAt: session.titleUpdatedAt || null,
    customTitle: session.customTitle || false,
  };

  try {
    writeFileSync(tmpPath, JSON.stringify(serializable, null, 2), 'utf-8');
    renameSync(tmpPath, filePath);
  } catch (err) {
    logger.error('Failed to save session to disk', {
      sessionId: session.sessionId,
      error: err.message,
    });
  }
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Creates a new session and saves it to disk.
 * @param {string} [model] - Model to use; defaults to config.defaultModel
 * @param {object} [project] - Optional project context { name, path }
 * @returns {string} The new sessionId
 */
export function createSession(model, project = null) {
  const sessionId = uuidv4();
  const session = {
    sessionId,
    model: model || config.defaultModel,
    project: project || null,
    name: project ? project.name : null,
    createdAt: new Date().toISOString(),
    messages: [],
    copilotSession: null,
    status: 'idle',
    title: null,
    titleVersion: 0,
    titleUpdatedAt: null,
    customTitle: false,
  };

  sessions.set(sessionId, session);
  saveToDisk(session);

  logger.info('Session created', { sessionId, model: session.model, project: project?.name || null });
  return sessionId;
}

/**
 * Returns a session object or null.
 * @param {string} sessionId
 * @returns {object | null}
 */
export function getSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return null;

  // If the backing file was deleted manually, treat session as deleted.
  if (!hasAnySessionFile(sessionId)) {
    sessions.delete(sessionId);
    logger.warn('Session evicted from memory because file is missing', { sessionId });
    return null;
  }

  return session;
}

/**
 * Returns array of all sessions (without copilotSession field).
 * @returns {object[]}
 */
export function getAllSessions() {
  reconcileSessionsWithDisk();

  return Array.from(sessions.values()).map((s) => ({
    sessionId: s.sessionId,
    name: s.name || null,
    model: s.model,
    project: s.project || null,
    createdAt: s.createdAt,
    messageCount: s.messages.length,
    status: s.status,
    title: s.title || null,
    titleVersion: s.titleVersion || 0,
    customTitle: s.customTitle || false,
  }));
}

/**
 * Appends a message to a session and saves to disk.
 * Uses WAL for crash safety: WAL → in-memory → disk → clear WAL.
 *
 * @param {string} sessionId
 * @param {string} role - "user" | "assistant" | "system"
 * @param {string} content
 * @param {object} [meta] - Optional metadata (toolsUsed, tokensUsed, isCompacted)
 */
export function addMessage(sessionId, role, content, meta = {}) {
  const session = sessions.get(sessionId);
  if (!session) {
    logger.warn('addMessage: session not found', { sessionId });
    return;
  }

  const message = buildMessage(role, content, meta);

  // 1. WAL first (crash safety)
  appendToWAL(sessionId, {
    timestamp: message.timestamp,
    role,
    content,
    meta,
  });

  // 2. Update in-memory
  session.messages.push(message);

  // 3. Atomic save to disk
  saveToDisk(session);

  // 4. Clear WAL only after successful save
  clearWAL(sessionId);

  logger.info('Message added', {
    sessionId,
    role,
    contentLength: content.length,
  });
}

// ─── Chat summary for global memory ─────────────────────────────────

/**
 * Saves a one-line chat summary to ~/.opentop/memory/chats.md.
 * @param {string} sessionId
 * @param {string} summary
 * @param {string} model
 */
export function saveChatSummaryToGlobalMemory(sessionId, summary, model) {
  const date = new Date().toISOString().split('T')[0];
  const shortId = sessionId.slice(0, 8);
  const oneLiner = summary.split('\n')[0].slice(0, 120);
  const line = `[${date}] [${shortId}] [${model || 'unknown'}] — ${oneLiner}`;
  appendToMemoryFile('chats.md', line);
}

// ─── Memory compaction ──────────────────────────────────────────────

/**
 * Compacts a session's message history if it exceeds the token limit.
 * Keeps the most recent messages and summarizes older ones.
 *
 * @param {string}   sessionId
 * @param {Function} summarizer - async (messages[]) => summary string
 * @param {object}   [options]
 * @param {boolean}  [options.force=false] - Force compaction regardless of token count
 * @returns {Promise<{ compacted: boolean, archivedCount?: number, summary?: string }>}
 */
export async function compactSession(sessionId, summarizer, options = {}) {
  const session = sessions.get(sessionId);
  if (!session) {
    logger.warn('compactSession: session not found', { sessionId });
    return { compacted: false };
  }

  const tokenCount = getSessionTokenCount(sessionId);
  const maxTokens = config.maxContextTokens || 8000;
  const keepRecent = config.keepRecentMessages || 10;

  // Check if compaction is needed
  if (!options.force && tokenCount <= maxTokens) {
    return { compacted: false };
  }

  // Need at least keepRecent+1 messages to compact anything
  if (session.messages.length <= keepRecent) {
    logger.debug('Not enough messages to compact', {
      sessionId,
      messageCount: session.messages.length,
      keepRecent,
    });
    return { compacted: false };
  }

  logger.info('Starting memory compaction', {
    sessionId,
    tokenCount,
    maxTokens,
    messageCount: session.messages.length,
  });

  // Split: older messages to summarize, recent messages to keep
  const splitIndex = session.messages.length - keepRecent;
  const oldMessages = session.messages.slice(0, splitIndex);
  const recentMessages = session.messages.slice(splitIndex);

  // Archive full pre-compaction messages
  const ap = archivePath(sessionId);
  try {
    const archive = {
      sessionId,
      archivedAt: new Date().toISOString(),
      messages: session.messages.slice(), // full copy
    };
    writeFileSync(ap, JSON.stringify(archive, null, 2), 'utf-8');
    logger.info('Session messages archived', { sessionId, path: ap });
  } catch (err) {
    logger.error('Failed to write archive', { sessionId, error: err.message });
  }

  // Generate summary of old messages
  let summary;
  try {
    summary = await summarizer(oldMessages);
  } catch (err) {
    logger.error('Summarizer failed, skipping compaction', {
      sessionId,
      error: err.message,
    });
    return { compacted: false };
  }

  // Build new message array: compacted summary + recent messages
  const compactedMessage = buildMessage('system', '[Memory] ' + summary, {
    isCompacted: true,
  });

  session.messages = [compactedMessage, ...recentMessages];
  saveToDisk(session);

  logger.info('Session compacted', {
    sessionId,
    archivedCount: oldMessages.length,
    newTokenCount: getSessionTokenCount(sessionId),
  });

  // Save chat summary to global memory
  try {
    saveChatSummaryToGlobalMemory(sessionId, summary, session.model);
  } catch (err) {
    logger.warn('Failed to save chat summary to global memory', { sessionId, error: err.message });
  }

  return {
    compacted: true,
    archivedCount: oldMessages.length,
    summary,
  };
}

/**
 * Marks a session as closed and closes the Copilot session if open.
 * @param {string} sessionId
 */
export async function closeSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) {
    logger.warn('closeSession: session not found', { sessionId });
    return;
  }

  session.status = 'closed';

  // Save chat summary to global memory if session has enough messages
  try {
    if (session.messages.length > 4) {
      const lastAssistant = [...session.messages]
        .reverse()
        .find(m => m.role === 'assistant');
      if (lastAssistant) {
        const snippet = lastAssistant.content.slice(0, 100).replace(/\n/g, ' ');
        saveChatSummaryToGlobalMemory(sessionId, snippet, session.model);
      }
    }
  } catch (err) {
    logger.warn('Failed to save chat summary on close', { sessionId, error: err.message });
  }

  if (session.copilotSession) {
    await closeCopilotSession(session.copilotSession);
    session.copilotSession = null;
  }

  saveToDisk(session);
  logger.info('Session closed', { sessionId });
}

/**
 * Removes a session from memory and deletes all disk files.
 * @param {string} sessionId
 */
export async function deleteSession(sessionId) {
  await closeSession(sessionId);
  sessions.delete(sessionId);

  // Clean up all related files
  for (const path of [
    sessionPath(sessionId),
    walPath(sessionId),
    archivePath(sessionId),
    legacySessionPath(sessionId),
    legacyWalPath(sessionId),
    legacyArchivePath(sessionId),
  ]) {
    try {
      if (existsSync(path)) unlinkSync(path);
    } catch {
      // Non-critical
    }
  }
  logger.info('Session files deleted', { sessionId });
}

/**
 * Updates the title of a session.
 * @param {string} sessionId
 * @param {string} title - The new title
 * @param {number} version - Title version (1 = quick, 2 = refined)
 * @param {boolean} [isCustom=false] - Whether this is a user-provided custom title
 */
export function updateSessionTitle(sessionId, title, version, isCustom = false) {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  // Don't auto-update if user has set a custom title
  if (!isCustom && session.customTitle) {
    return;
  }

  session.title = title;
  session.titleVersion = version;
  session.titleUpdatedAt = new Date().toISOString();
  session.customTitle = isCustom;

  saveToDisk(session);
  logger.info('Session title updated', { sessionId, title, version, custom: isCustom });
}

/**
 * Loads all session files from disk into memory.
 * Also replays any WAL files for crash recovery.
 * Called once at server startup.
 */
export function loadAllSessions() {
  const sourceDirs = [
    SESSIONS_DIR,
    ...(existsSync(LEGACY_SESSIONS_DIR) ? [LEGACY_SESSIONS_DIR] : []),
  ];

  for (const dir of sourceDirs) {
    const files = readdirSync(dir).filter(
      (f) => f.endsWith('.json') && !f.endsWith('.archive.json')
    );

    for (const file of files) {
      try {
        const raw = readFileSync(join(dir, file), 'utf-8');
        const data = JSON.parse(raw);

        // Prefer the global store if the same session exists in multiple places.
        if (sessions.has(data.sessionId) && dir !== SESSIONS_DIR) {
          continue;
        }

        // Restore session into memory (copilotSession is null until re-created)
        sessions.set(data.sessionId, {
          ...data,
          copilotSession: null,
        });
      } catch (err) {
        logger.error('Failed to load session file', {
          file,
          dir,
          error: err.message,
        });
      }
    }
  }

  // Replay WAL files for crash recovery
  for (const [sessionId] of sessions) {
    replayWAL(sessionId);
  }

  logger.info('Sessions loaded from disk', {
    count: sessions.size,
    storageDir: SESSIONS_DIR,
    legacyStorageDir: existsSync(LEGACY_SESSIONS_DIR) ? LEGACY_SESSIONS_DIR : null,
  });
}

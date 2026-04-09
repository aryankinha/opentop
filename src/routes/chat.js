// src/routes/chat.js
// API routes for session and chat management.
// Mounted at / in the Express app.

import { Router } from 'express';
import { existsSync, readdirSync, statSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';
import {
  createSession,
  getSession,
  getAllSessions,
  addMessage,
  deleteSession,
  estimateTokens,
  getSessionTokenCount,
  compactSession,
  updateSessionTitle,
} from '../core/sessionManager.js';
import {
  createAgentSession,
  closeSession as closeCopilotSdkSession,
  sendMessage,
  summarizeMessages,
  getStoredGithubToken,
} from '../core/copilotClient.js';
import { fetchCopilotQuota } from '../core/quotaFetcher.js';
import { createHandler } from '../core/permissionBroker.js';
import {
  loadGlobalMemory,
  saveGlobalMemory,
  appendGlobalMemory,
  getGlobalMemoryPath,
  getMemoryLastModified,
  readMemoryFile,
  writeMemoryFile,
  appendToMemoryFile,
} from '../core/globalMemory.js';
import { generateQuickTitle, generateRefinedTitle, sanitizeTitle } from '../core/titleGenerator.js';
import { trackUsage, getUsage, getDailyHistory, getSessionUsage } from '../core/usageTracker.js';
import {
  PERMISSION_TOOL_KINDS,
  getPermissionPolicy,
  setPermissionPolicy,
} from '../config.js';
import logger from '../utils/logger.js';

// Patterns to detect memory-save signals in assistant responses
const MEMORY_PATTERNS = [
  /I[\u2018\u2019']ll remember that[:\s]+(.+)/i,
  /I[\u2018\u2019']ve noted that[:\s]+(.+)/i,
  /I[\u2018\u2019']ll keep in mind[:\s]+(.+)/i,
  /Remembered[:\s]+(.+)/i,
];

const SESSIONS_DIR = resolve('storage/sessions');
const CUSTOM_PROJECTS_FILE = resolve('storage/custom-projects.json');

function isStaleSdkSessionError(error) {
  const message = String(error?.message || '');
  return message.includes('Session not found');
}

function normalizePathInput(pathInput) {
  let normalized = String(pathInput || '').trim();
  if (normalized.startsWith('~')) {
    normalized = join(homedir(), normalized.slice(1));
  }
  return resolve(normalized);
}

function readCustomProjects() {
  try {
    if (!existsSync(CUSTOM_PROJECTS_FILE)) return [];
    const raw = readFileSync(CUSTOM_PROJECTS_FILE, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    logger.warn('Failed to read custom projects file', { error: err.message });
    return [];
  }
}

function writeCustomProjects(projects) {
  mkdirSync(resolve('storage'), { recursive: true });
  writeFileSync(CUSTOM_PROJECTS_FILE, JSON.stringify(projects, null, 2), 'utf8');
}

function buildProjectEntry(pathInput, nameInput = null, custom = false) {
  const path = normalizePathInput(pathInput);
  const stat = statSync(path);

  return {
    name: nameInput || basename(path),
    path,
    type: detectProjectType(path),
    hasReadme: existsSync(join(path, 'README.md')),
    lastModified: stat.mtime.toISOString(),
    custom,
  };
}

function upsertCustomProject(project) {
  const existing = readCustomProjects();
  const idx = existing.findIndex((p) => p.path === project.path);
  const customProject = { ...project, custom: true };

  if (idx >= 0) {
    existing[idx] = customProject;
  } else {
    existing.push(customProject);
  }

  writeCustomProjects(existing);
  return customProject;
}

/**
 * Creates and returns the chat router.
 * @param {Map} wsClients - Map<sessionId, Set<ws>> from the server
 * @returns {Router}
 */
export function createChatRouter(wsClients) {
  const router = Router();
  const activeTurns = new Map();

  // ─── POST /session ──────────────────────────────────────────────
  // Creates a new session. Optionally accepts a project.
  router.post('/session', async (req, res, next) => {
    try {
      const { model, project } = req.body || {};

      // Validate project if provided
      let validatedProject = null;
      if (project) {
        if (!project.path || typeof project.path !== 'string') {
          return res.status(400).json({ error: 'project.path is required and must be a string' });
        }

        // Resolve ~ in path
        let resolvedPath = project.path;
        if (resolvedPath.startsWith('~')) {
          resolvedPath = join(homedir(), resolvedPath.slice(1));
        }

        if (!existsSync(resolvedPath)) {
          return res.status(400).json({ error: 'Project path does not exist' });
        }

        validatedProject = {
          name: project.name || basename(resolvedPath),
          path: resolvedPath,
        };
      }

      const sessionId = createSession(model, validatedProject);
      const session = getSession(sessionId);
      logger.info('HTTP session created', {
        sessionId,
        project: session.project?.path || null,
        model: session.model,
      });

      res.status(201).json({
        sessionId: session.sessionId,
        model: session.model,
        project: session.project || null,
        name: session.name || null,
        createdAt: session.createdAt,
      });
    } catch (err) {
      next(err);
    }
  });

  // ─── GET /sessions ─────────────────────────────────────────────
  // Returns array of all sessions with their message counts.
  router.get('/sessions', (_req, res, next) => {
    try {
      const sessions = getAllSessions();
      logger.info('Sessions fetched', {
        count: sessions.length,
        sessionIds: sessions.map((session) => session.sessionId),
      });
      res.json(sessions);
    } catch (err) {
      next(err);
    }
  });

  // ─── GET /session/:id ──────────────────────────────────────────
  // Returns full session object including messages array.
  router.get('/session/:id', (req, res, next) => {
    try {
      const session = getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Return without copilotSession (non-serializable)
      const { copilotSession, ...safe } = session;
      res.json(safe);
    } catch (err) {
      next(err);
    }
  });

  // ─── PATCH /session/:id/title ──────────────────────────────────
  // Manually update session title
  router.patch('/session/:id/title', (req, res, next) => {
    try {
      const { id } = req.params;
      const { title } = req.body || {};

      if (!title || typeof title !== 'string') {
        return res.status(400).json({ error: 'title is required and must be a string' });
      }

      const session = getSession(id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Update as custom title (won't be auto-updated)
      updateSessionTitle(id, sanitizeTitle(title), session.titleVersion || 0, true);
      
      res.json({ 
        success: true,
        title: session.title,
        customTitle: session.customTitle,
      });
    } catch (err) {
      next(err);
    }
  });

  // ─── DELETE /session/:id ───────────────────────────────────────
  // Closes and removes the session.
  router.delete('/session/:id', async (req, res, next) => {
    try {
      const session = getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      await deleteSession(req.params.id);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  // ─── POST /session/:id/chat ────────────────────────────────────
  // The main endpoint. Sends a message through the Copilot SDK.
  router.post('/session/:id/chat', async (req, res, next) => {
    try {
      const { id } = req.params;
      const { message, model } = req.body || {};

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'message is required and must be a string' });
      }

      const session = getSession(id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      if (session.status === 'closed') {
        return res.status(410).json({ error: 'Session is closed' });
      }

      if (activeTurns.has(id)) {
        return res.status(409).json({ error: 'A response is already in progress for this session' });
      }

      // 1. Add user message to history
      addMessage(id, 'user', message);

      const turnAbortController = new AbortController();
      activeTurns.set(id, {
        startedAt: new Date().toISOString(),
        abort: () => turnAbortController.abort(),
      });

      // 2. Lazily create Copilot SDK session if it doesn't exist yet
      const isFirstCreate = !session.copilotSession;
      if (!session.copilotSession) {
        // Check if this is a resume (session has messages from disk, loaded before restart)
        // Exclude the user message we just added above — it will be sent as the real turn
        const existingMessages = session.messages.slice(0, -1);
        const isResume = existingMessages.length > 0;

        const onPermission = createHandler(id, wsClients);
        session.copilotSession = await createAgentSession(
          id,
          session.model,
          onPermission,
          isResume ? existingMessages : [],
          session.project || null,
        );
        session.status = 'active';
        logger.info('Copilot SDK session attached', {
          sessionId: id,
          resumed: isResume,
          primedMessages: isResume ? existingMessages.length : 0,
          project: session.project?.name || null,
        });

        // Auto-prime with project context on first creation (not resume)
        if (session.project && !isResume) {
          try {
            const primingPrompt = `I am starting a new session in the project: ${session.project.name}
Path: ${session.project.path}

Please do these steps silently without responding yet:
1. Read the directory structure (top 2 levels)
2. If package.json exists, read it
3. If README.md exists, read the first 50 lines
4. Note the tech stack and project purpose

After this silent preparation, you will be ready for my first question.
Do not respond to this message - just acknowledge with "Ready."`;

            await sendMessage(session.copilotSession, primingPrompt);
            // Discard the "Ready." response — do not save to messages
            logger.info('Project context primed', {
              sessionId: id,
              project: session.project.name,
            });
          } catch (primingErr) {
            // Non-fatal: session still works without priming
            logger.warn('Project priming failed', {
              sessionId: id,
              error: primingErr.message,
            });
          }
        }
      }

      // 3. Send message through Copilot SDK
      logger.info('Sending message to Copilot', {
        sessionId: id,
        messageLength: message.length,
        requestedModel: model || null,
        sessionModel: session.model,
      });

      let result;
      try {
        result = await sendMessage(session.copilotSession, message, {
          signal: turnAbortController.signal,
        });
      } catch (sendErr) {
        if (sendErr?.name === 'AbortError') {
          logger.warn('Copilot turn canceled', { sessionId: id });
          session.status = 'idle';
          session.copilotSession = null;
          return res.status(499).json({
            canceled: true,
            sessionId: id,
          });
        }

        if (!isStaleSdkSessionError(sendErr)) {
          throw sendErr;
        }

        logger.warn('Copilot SDK session became stale, recreating and retrying', {
          sessionId: id,
          error: sendErr.message,
        });

        const onPermission = createHandler(id, wsClients);
        const existingMessages = session.messages.slice(0, -1);
        session.copilotSession = await createAgentSession(
          id,
          session.model,
          onPermission,
          existingMessages,
          session.project || null,
        );
        session.status = 'active';

        result = await sendMessage(session.copilotSession, message, {
          signal: turnAbortController.signal,
        });
      }

      // 4. Add assistant response to history with correct meta
      const responseTokens = estimateTokens(result.content);
      addMessage(id, 'assistant', result.content, {
        toolsUsed: result.toolsUsed,
        tokensUsed: responseTokens,
        model: session.model, // Track which model was used
      });

      // 4a. Track global usage
      const userTokens = estimateTokens(message);
      trackUsage(id, userTokens + responseTokens);

      // 4b. Auto-extract memory from assistant response
      for (const pattern of MEMORY_PATTERNS) {
        const match = result.content.match(pattern);
        if (match) {
          appendGlobalMemory(match[1].trim());
          logger.info('Global memory updated', { fact: match[1].trim() });
          break;
        }
      }

      // 5. Check if memory compaction is needed
      let compact = { compacted: false };
      try {
        compact = await compactSession(
          id,
          (msgs) => summarizeMessages(msgs),
        );
        if (compact.compacted) {
          logger.info('Session compacted', {
            sessionId: id,
            archivedCount: compact.archivedCount,
            summary: compact.summary,
          });
        }
      } catch (err) {
        logger.warn('Compaction check failed', { sessionId: id, error: err.message });
      }

      // 6. Auto-generate title after message exchange
      try {
        const messageCount = session.messages.length;
        
        // After first exchange (2 messages: user + assistant)
        if (messageCount === 2 && (!session.titleVersion || session.titleVersion === 0)) {
          const firstUserMsg = session.messages.find(m => m.role === 'user');
          if (firstUserMsg) {
            const quickTitle = generateQuickTitle(firstUserMsg.content);
            updateSessionTitle(id, sanitizeTitle(quickTitle), 1);
            logger.info('Quick title generated', { sessionId: id, title: quickTitle });
          }
        }
        
        // After 3rd exchange (6 messages) - refine the title
        else if (messageCount === 6 && session.titleVersion === 1 && !session.customTitle) {
          const refinedTitle = generateRefinedTitle(session.messages);
          if (refinedTitle) {
            updateSessionTitle(id, sanitizeTitle(refinedTitle), 2);
            logger.info('Refined title generated', { sessionId: id, title: refinedTitle });
          }
        }
      } catch (titleErr) {
        // Non-critical: title generation failure shouldn't break chat
        logger.warn('Title generation failed', { sessionId: id, error: titleErr.message });
      }

      // 7. Return result with memory info
      res.json({
        response: result.content,
        toolsUsed: result.toolsUsed,
        sessionId: id,
        confidence: 1.0,
        tokenCount: getSessionTokenCount(id),
        compacted: compact.compacted,
        title: session.title || null,
        titleVersion: session.titleVersion || 0,
        model: session.model, // Include model in response
      });
    } catch (err) {
      next(err);
    } finally {
      activeTurns.delete(req.params.id);
    }
  });

  // ─── POST /session/:id/chat/cancel ──────────────────────────────
  // Cancels an in-flight response for the session.
  router.post('/session/:id/chat/cancel', async (req, res, next) => {
    try {
      const { id } = req.params;
      const session = getSession(id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const activeTurn = activeTurns.get(id);
      if (!activeTurn) {
        return res.json({ success: true, canceled: false });
      }

      activeTurn.abort?.();

      if (session.copilotSession) {
        await closeCopilotSdkSession(session.copilotSession);
        session.copilotSession = null;
      }

      session.status = 'idle';
      logger.info('Session turn canceled via API', { sessionId: id });

      res.json({ success: true, canceled: true, sessionId: id });
    } catch (err) {
      next(err);
    }
  });

  // ─── GET /session/:id/messages ─────────────────────────────────
  // Returns just the messages array for a session.
  router.get('/session/:id/messages', (req, res, next) => {
    try {
      const session = getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      logger.info('Session messages fetched', {
        sessionId: req.params.id,
        messageCount: session.messages.length,
      });
      res.json(session.messages);
    } catch (err) {
      next(err);
    }
  });

  // ─── GET /session/:id/memory ───────────────────────────────────
  // Returns the current memory state for a session.
  router.get('/session/:id/memory', (req, res, next) => {
    try {
      const { id } = req.params;
      const session = getSession(id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Find compacted memory summary if it exists
      const compactedMsg = session.messages.find((m) => m.isCompacted === true);
      const archiveExists = existsSync(join(SESSIONS_DIR, `${id}.archive.json`));

      res.json({
        sessionId: id,
        messageCount: session.messages.length,
        estimatedTokens: getSessionTokenCount(id),
        hasCompactedMemory: !!compactedMsg,
        compactedSummary: compactedMsg ? compactedMsg.content : null,
        archiveExists,
      });
    } catch (err) {
      next(err);
    }
  });

  // ─── POST /session/:id/compact ─────────────────────────────────
  // Manually trigger memory compaction regardless of token limit.
  router.post('/session/:id/compact', async (req, res, next) => {
    try {
      const { id } = req.params;
      const session = getSession(id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const compact = await compactSession(
        id,
        (msgs) => summarizeMessages(msgs),
        { force: true },
      );

      res.json({
        ...compact,
        tokenCount: getSessionTokenCount(id),
        messageCount: getSession(id).messages.length,
      });
    } catch (err) {
      next(err);
    }
  });

  // ─── GET /memory ─────────────────────────────────────────────────
  // Returns the current global memory.
  router.get('/memory', (_req, res, next) => {
    try {
      const content = loadGlobalMemory();
      const path = getGlobalMemoryPath();
      const lastModified = getMemoryLastModified();
      res.json({ content, path, lastModified });
    } catch (err) {
      next(err);
    }
  });

  // ─── POST /memory ───────────────────────────────────────────────
  // Overwrites the entire global memory file.
  router.post('/memory', (req, res, next) => {
    try {
      const { content } = req.body || {};
      if (typeof content !== 'string') {
        return res.status(400).json({ error: 'content is required and must be a string' });
      }
      saveGlobalMemory(content);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  // ─── POST /memory/append ────────────────────────────────────────
  // Appends a single fact to global memory.
  router.post('/memory/append', (req, res, next) => {
    try {
      const { fact } = req.body || {};
      if (!fact || typeof fact !== 'string') {
        return res.status(400).json({ error: 'fact is required and must be a string' });
      }
      appendGlobalMemory(fact);
      res.json({ success: true, fact });
    } catch (err) {
      next(err);
    }
  });

  // ─── DELETE /memory ─────────────────────────────────────────────
  // Clears the global memory file.
  router.delete('/memory', (_req, res, next) => {
    try {
      saveGlobalMemory('');
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  // ─── GET /memory/system ──────────────────────────────────────────
  // Returns contents of system.md from structured memory.
  router.get('/memory/system', (_req, res, next) => {
    try {
      const content = readMemoryFile('system.md');
      res.json({ file: 'system.md', content });
    } catch (err) {
      next(err);
    }
  });

  // ─── GET /memory/projects ───────────────────────────────────────
  // Returns contents of projects.md from structured memory.
  router.get('/memory/projects', (_req, res, next) => {
    try {
      const content = readMemoryFile('projects.md');
      res.json({ file: 'projects.md', content });
    } catch (err) {
      next(err);
    }
  });

  // ─── GET /memory/chats ─────────────────────────────────────────
  // Returns last 50 lines of chats.md from structured memory.
  router.get('/memory/chats', (_req, res, next) => {
    try {
      const content = readMemoryFile('chats.md') || '';
      const lines = content.split('\n');
      const last50 = lines.slice(-50).join('\n');
      res.json({ file: 'chats.md', content: last50 });
    } catch (err) {
      next(err);
    }
  });

  // ─── GET /memory/all ───────────────────────────────────────────
  // Returns all structured memory files combined.
  router.get('/memory/all', (_req, res, next) => {
    try {
      const chatsRaw = readMemoryFile('chats.md') || '';
      const chatsLines = chatsRaw.split('\n');
      const last50 = chatsLines.slice(-50).join('\n');

      res.json({
        system: readMemoryFile('system.md'),
        projects: readMemoryFile('projects.md'),
        chats: last50,
        index: readMemoryFile('index.md'),
      });
    } catch (err) {
      next(err);
    }
  });

  // ─── POST /memory/system ───────────────────────────────────────
  // Overwrites system.md.
  router.post('/memory/system', (req, res, next) => {
    try {
      const { content } = req.body || {};
      if (typeof content !== 'string') {
        return res.status(400).json({ error: 'content is required and must be a string' });
      }
      writeMemoryFile('system.md', content);
      res.json({ success: true, file: 'system.md' });
    } catch (err) {
      next(err);
    }
  });

  // ─── POST /memory/projects ─────────────────────────────────────
  // Overwrites projects.md.
  router.post('/memory/projects', (req, res, next) => {
    try {
      const { content } = req.body || {};
      if (typeof content !== 'string') {
        return res.status(400).json({ error: 'content is required and must be a string' });
      }
      writeMemoryFile('projects.md', content);
      res.json({ success: true, file: 'projects.md' });
    } catch (err) {
      next(err);
    }
  });

  // ─── POST /memory/learn ────────────────────────────────────────
  // Appends a fact to the appropriate memory file based on category.
  router.post('/memory/learn', (req, res, next) => {
    try {
      const { fact, category } = req.body || {};
      if (!fact || typeof fact !== 'string') {
        return res.status(400).json({ error: 'fact is required and must be a string' });
      }
      if (!category || !['system', 'projects', 'general'].includes(category)) {
        return res.status(400).json({ error: 'category must be "system", "projects", or "general"' });
      }

      const timestamp = new Date().toISOString().split('T')[0];
      let file;

      if (category === 'system') {
        appendToMemoryFile('system.md', `- [${timestamp}] ${fact}`);
        file = 'system.md';
      } else if (category === 'projects') {
        appendToMemoryFile('projects.md', `- [${timestamp}] ${fact}`);
        file = 'projects.md';
      } else {
        // general → legacy memory.md
        appendGlobalMemory(fact);
        file = 'memory.md';
      }

      res.json({ success: true, file, fact });
    } catch (err) {
      next(err);
    }
  });

  // ─── GET /usage ────────────────────────────────────────────────
  // Returns real Copilot quota from GitHub API.
  router.get('/usage', async (_req, res, next) => {
    try {
      const token = getStoredGithubToken();
      
      if (!token) {
        return res.status(503).json({
          error: 'No GitHub token found',
          message: 'Unable to fetch Copilot quota without GitHub token'
        });
      }

      const quota = await fetchCopilotQuota(token);
      
      res.json({
        percentRemaining: quota.percentRemaining,
        remaining: quota.remaining,
        total: quota.total,
        resetDate: quota.resetDate,
        daysUntilReset: quota.daysUntilReset,
        unlimited: quota.unlimited,
        plan: quota.plan,
        stale: quota.stale || false
      });
    } catch (err) {
      logger.error('Failed to fetch usage', { error: err.message });
      res.status(500).json({
        error: 'Failed to fetch quota',
        message: err.message
      });
    }
  });

  // ─── GET /usage/history ────────────────────────────────────────
  // Returns daily usage history.
  router.get('/usage/history', (req, res, next) => {
    try {
      const days = parseInt(req.query.days) || 7;
      const history = getDailyHistory(Math.min(days, 30));
      res.json(history);
    } catch (err) {
      next(err);
    }
  });

  // ─── GET /usage/session/:id ────────────────────────────────────
  // Returns usage for a specific session.
  router.get('/usage/session/:id', (req, res, next) => {
    try {
      const usage = getSessionUsage(req.params.id);
      if (!usage) {
        return res.json({ tokens: 0, requests: 0 });
      }
      res.json(usage);
    } catch (err) {
      next(err);
    }
  });

  // ─── GET /user ──────────────────────────────────────────────────
  // Returns user info and context for personalized greeting.
  router.get('/user', async (_req, res) => {
    try {
      const { execSync } = await import('node:child_process');
      const { getDisplayName } = await import('../config.js');
      
      // Get display name (auto-generated if not set)
      const displayName = getDisplayName();
      
      // Get system username (for context, not display)
      let username = null;
      try {
        username = execSync('whoami', { encoding: 'utf-8' }).trim();
      } catch {
        // Fallback - try environment variables
        username = process.env.USER || process.env.USERNAME || null;
      }

      // Get context from global memory (projects.md for startup/project info)
      let projectContext = null;
      try {
        const projectsMemory = readMemoryFile('projects.md');
        if (projectsMemory && projectsMemory.length > 50) {
          // Extract first project mention or recent activity
          const lines = projectsMemory.split('\n').filter(l => l.trim());
          if (lines.length > 0) {
            // Look for project names or recent entries
            const recentLine = lines[lines.length - 1];
            const projectMatch = recentLine.match(/\[.*?\]\s*(.+)/);
            if (projectMatch) {
              projectContext = projectMatch[1].slice(0, 100);
            }
          }
        }
      } catch {
        // No projects memory yet
      }

      res.json({
        displayName,
        username, // Keep for backward compatibility
        projectContext,
        greeting: displayName 
          ? `Welcome, ${displayName}`
          : 'What can I help you with today?',
      });
    } catch (err) {
      res.json({ 
        displayName: null,
        username: null, 
        projectContext: null,
        greeting: 'What can I help you with today?',
      });
    }
  });
  
  // ─── PATCH /user ────────────────────────────────────────────────
  // Updates user display name
  router.patch('/user', async (req, res) => {
    try {
      const { displayName } = req.body;
      
      if (!displayName || typeof displayName !== 'string') {
        return res.status(400).json({ 
          error: 'Display name is required and must be a string' 
        });
      }
      
      const { setDisplayName } = await import('../config.js');
      setDisplayName(displayName);
      
      res.json({ 
        success: true, 
        displayName,
        message: 'Display name updated successfully' 
      });
    } catch (err) {
      logger.error('Failed to update display name', { error: err.message });
      res.status(500).json({ 
        error: 'Failed to update display name',
        message: err.message 
      });
    }
  });

  // ─── GET /settings/permissions ─────────────────────────────────
  // Returns tool permission policy used by the approval broker.
  router.get('/settings/permissions', (_req, res, next) => {
    try {
      res.json(getPermissionPolicy());
    } catch (err) {
      next(err);
    }
  });

  // ─── PATCH /settings/permissions ───────────────────────────────
  // Updates tool kinds that should be auto-approved.
  router.patch('/settings/permissions', (req, res, next) => {
    try {
      const { autoApproveTools } = req.body || {};

      if (!Array.isArray(autoApproveTools)) {
        return res.status(400).json({ error: 'autoApproveTools must be an array of tool kinds' });
      }

      const normalized = autoApproveTools
        .filter((item) => typeof item === 'string')
        .map((item) => item.trim().toLowerCase());
      const invalidKinds = normalized.filter((kind) => !PERMISSION_TOOL_KINDS.includes(kind));

      if (invalidKinds.length > 0) {
        return res.status(400).json({
          error: `Unsupported tool kinds: ${[...new Set(invalidKinds)].join(', ')}`,
          supportedKinds: PERMISSION_TOOL_KINDS,
        });
      }

      const policy = setPermissionPolicy(normalized);
      res.json({ success: true, ...policy });
    } catch (err) {
      next(err);
    }
  });

  // ─── GET /projects ─────────────────────────────────────────────
  // Returns only user-selected custom projects.
  router.get('/projects', (_req, res) => {
    try {
      const customProjects = readCustomProjects();
      const allProjects = [];
      for (const customProject of customProjects) {
        try {
          if (!customProject?.path || !existsSync(customProject.path)) {
            continue;
          }
          allProjects.push(
            buildProjectEntry(customProject.path, customProject.name, true)
          );
        } catch {
          // Skip invalid custom entries
        }
      }

      // Sort by lastModified descending (most recent first)
      allProjects.sort((a, b) =>
        new Date(b.lastModified) - new Date(a.lastModified)
      );

      // Deduplicate by path
      const seen = new Set();
      const unique = allProjects.filter(p => {
        if (seen.has(p.path)) return false;
        seen.add(p.path);
        return true;
      });

      res.json({ projects: unique, count: unique.length });
    } catch (err) {
      res.json({ projects: [], count: 0, error: err.message });
    }
  });

  // ─── POST /projects/custom ────────────────────────────────────
  // Adds a custom project path to persistent project list.
  router.post('/projects/custom', (req, res) => {
    try {
      const { path, name } = req.body || {};

      if (!path || typeof path !== 'string') {
        return res.status(400).json({ error: 'path is required and must be a string' });
      }

      const normalizedPath = normalizePathInput(path);
      if (!existsSync(normalizedPath)) {
        return res.status(400).json({ error: 'Selected path does not exist' });
      }

      let isDirectory = false;
      try {
        isDirectory = statSync(normalizedPath).isDirectory();
      } catch {
        isDirectory = false;
      }

      if (!isDirectory) {
        return res.status(400).json({ error: 'Selected path must be a directory' });
      }

      const project = buildProjectEntry(normalizedPath, name, true);
      const saved = upsertCustomProject(project);

      res.json({ success: true, project: saved });
    } catch (err) {
      res.status(500).json({ error: 'Failed to add custom project', message: err.message });
    }
  });

  // ─── POST /projects/pick-folder ───────────────────────────────
  // Opens native macOS folder picker and adds chosen folder as custom project.
  router.post('/projects/pick-folder', (_req, res) => {
    if (process.platform !== 'darwin') {
      return res.status(400).json({ error: 'Native folder picker is only available on macOS' });
    }

    try {
      const selectedPathRaw = execFileSync(
        'osascript',
        [
          '-e',
          'set chosenFolder to choose folder with prompt "Select a project folder"',
          '-e',
          'POSIX path of chosenFolder',
        ],
        { encoding: 'utf8' }
      );

      const selectedPath = normalizePathInput(selectedPathRaw);
      if (!selectedPath || !existsSync(selectedPath)) {
        return res.status(400).json({ error: 'No folder selected' });
      }

      const project = buildProjectEntry(selectedPath, null, true);
      const saved = upsertCustomProject(project);

      res.json({ success: true, project: saved });
    } catch (err) {
      const stderr = String(err?.stderr || '');
      if (/User canceled/i.test(stderr) || /User canceled/i.test(String(err?.message || ''))) {
        return res.json({ success: false, canceled: true });
      }

      res.status(500).json({ error: 'Failed to open folder picker', message: err.message });
    }
  });

  return router;
}

// ─── Project scanning helpers ─────────────────────────────────────

function detectProjectType(dirPath) {
  if (existsSync(join(dirPath, 'package.json'))) return 'node';
  if (existsSync(join(dirPath, 'requirements.txt'))) return 'python';
  if (existsSync(join(dirPath, 'Cargo.toml'))) return 'rust';
  if (existsSync(join(dirPath, 'go.mod'))) return 'go';
  if (existsSync(join(dirPath, 'pom.xml'))) return 'java';
  if (existsSync(join(dirPath, '.git'))) return 'git';
  return 'unknown';
}

function scanForProjects(baseDir, maxDepth = 2, currentDepth = 0) {
  if (currentDepth >= maxDepth) return [];
  if (!existsSync(baseDir)) return [];

  const projects = [];
  try {
    const entries = readdirSync(baseDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.')) continue;
      if (entry.name === 'node_modules') continue;

      const fullPath = join(baseDir, entry.name);
      const type = detectProjectType(fullPath);

      if (type !== 'unknown') {
        try {
          const stat = statSync(fullPath);
          projects.push({
            name: entry.name,
            path: fullPath,
            type,
            hasReadme: existsSync(join(fullPath, 'README.md')),
            lastModified: stat.mtime.toISOString(),
          });
        } catch {
          // Skip if stat fails
        }
      } else {
        // Go deeper if not a project itself
        projects.push(...scanForProjects(fullPath, maxDepth, currentDepth + 1));
      }
    }
  } catch {
    // Skip if can't read directory
  }
  return projects;
}

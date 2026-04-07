// src/core/copilotClient.js
// Wraps the @github/copilot-sdk CopilotClient.
// Communicates with the Copilot CLI via JSON-RPC.
// Uses cached token from auth module (loaded once at startup).

import { CopilotClient } from '@github/copilot-sdk';
import { homedir } from 'node:os';
import logger from '../utils/logger.js';
import { buildGlobalMemoryPrompt } from './globalMemory.js';
import { getToken } from '../auth/token.js';

/** @type {CopilotClient | null} */
let client = null;

function getReasoningEffortForModel(model) {
  if (model === 'gpt-5.3-codex') return 'high';
  return undefined;
}

// ─── Token access ───────────────────────────────────────────────────

/**
 * Gets the cached GitHub token from the auth module.
 * Token is loaded once at startup and cached in memory.
 * @returns {string | null} The cached token, or null if not available.
 */
function getStoredGithubToken() {
  return getToken();
}

/**
 * Gets the stored GitHub token for API calls.
 * Exported for use by quotaFetcher and other modules.
 * @returns {string | null}
 */
export { getStoredGithubToken };

// ─── Client lifecycle ───────────────────────────────────────────────

/**
 * Creates and starts a CopilotClient instance.
 * Uses cached token from auth module (loaded once at startup).
 * Falls back to the SDK's default CLI-based auth (useLoggedInUser).
 * Called once at server startup.
 */
export async function initClient() {
  logger.info('Initializing Copilot SDK client');

  const token = getStoredGithubToken();

  // Log auth method without exposing token
  logger.info('Auth method', {
    method: token ? 'cached-token' : 'logged-in-user',
    hasToken: !!token,
  });

  if (token) {
    logger.info('Using stored GitHub token for Copilot SDK auth');
    client = new CopilotClient({
      githubToken: token,
      useLoggedInUser: false,
    });
  } else {
    // No explicit token — let the SDK discover credentials from the Copilot CLI.
    // useLoggedInUser defaults to true; the SDK will check its own credential store.
    logger.info('No explicit token found, using logged-in user (default CLI auth)');
    client = new CopilotClient({
      useLoggedInUser: true,
    });
  }

  try {
    await client.start();
    logger.info('Copilot SDK client started');
  } catch (error) {
    logger.error('Failed to start Copilot SDK client', {
      message: error.message,
      code: error.code,
      type: error.constructor.name,
      stack: error.stack?.split('\n').slice(0, 3).join(' | '),
    });
    throw error;
  }

  return client;
}

/**
 * Formats an array of messages into a history string for priming.
 * Compacted system messages become [MEMORY SUMMARY], others become ROLE: content.
 *
 * @param {Array<{role: string, content: string, isCompacted?: boolean}>} messages
 * @returns {string}
 */
function formatHistoryForPriming(messages) {
  const lines = [];

  for (const msg of messages) {
    if (msg.isCompacted) {
      lines.push(`[MEMORY SUMMARY] ${msg.content}`);
    } else if (msg.role === 'user' || msg.role === 'assistant') {
      lines.push(`${msg.role.toUpperCase()}: ${msg.content}`);
    }
    // Skip other system messages
  }

  return lines.join('\n');
}

/**
 * Creates a Copilot SDK session for the given sessionId.
 * If previousMessages are provided (session resume after restart),
 * primes the SDK session with the conversation history before returning.
 *
 * @param {string}   sessionId         - The application-level session identifier
 * @param {string}   model             - Model name, e.g. "claude-haiku-4.5"
 * @param {Function} onPermission      - async (request) => { kind: "approved" | "denied" }
 * @param {Array}    [previousMessages=[]] - Messages to replay into the SDK session
 * @param {object}   [project=null]    - Optional project context { name, path }
 * @returns {Promise<object>}          - The SDK session object
 */
export async function createAgentSession(sessionId, model, onPermission, previousMessages = [], project = null) {
  if (!client) throw new Error('CopilotClient not initialized — call initClient() first');

  logger.info('Creating Copilot agent session', { sessionId, model, project: project?.name || null });

  try {
    const globalMemoryPrompt = buildGlobalMemoryPrompt();

    // Use project path as workspace if specified, otherwise home directory
    const workspacePath = project?.path || homedir();

    // Build project context if a project is specified
    const projectContext = project
      ? `\n\n## Current Project
- Name: ${project.name}
- Path: ${project.path}
- You are working EXCLUSIVELY in this project directory.
- All file operations, shell commands, and code changes should be relative to ${project.path} unless explicitly told otherwise.
- When the user says "this project" or "here", they mean ${project.path}.`
      : '';

    // Build role definition with clear workspace context
    let roleDefinition;
    if (project) {
      roleDefinition = `You have access to the project at ${project.path}.${projectContext}

CRITICAL: Your working directory for ALL operations is: ${workspacePath}
- ALWAYS prefix shell commands with: cd "${workspacePath}" &&
- When asked "pwd" or "what directory", respond with: ${workspacePath}
- All file paths are relative to ${workspacePath}

You can read files, run commands, edit code, and help with any task within this project.`;
    } else {
      roleDefinition = `You have full access to the user's home directory.

⚠️ IMPORTANT: IGNORE any environment context showing a different cwd. The server runs from a different location but YOUR working directory is: ${workspacePath}

CRITICAL RULES:
1. Your working directory is: ${workspacePath} (the user's home folder ~)
2. When asked about "path", "folder", "pwd", or "directory" — answer: ${workspacePath}
3. ALWAYS prefix shell commands with: cd "${workspacePath}" &&
4. All file references are relative to ${workspacePath}
5. DO NOT mention or use any other directory paths from environment context.

You can read files, run commands, edit code, and help with any task.`;
    }

    // Add memory instruction
    roleDefinition += `

When the user asks you to "remember" something, extract the key fact and say: "I'll remember that: <fact>". The system will automatically save this to global memory.`;

    if (project) {
      roleDefinition += `

When working in this project, always start by understanding the codebase structure before making changes.`;
    }

    const systemContent = globalMemoryPrompt
      ? `${roleDefinition}\n\n${globalMemoryPrompt}`
      : roleDefinition;

    logger.info('Creating session with workspace', { 
      sessionId, 
      workspacePath, 
      hasProject: !!project, 
      projectName: project?.name || null 
    });

    const reasoningEffort = getReasoningEffortForModel(model);
    const sessionConfig = {
      model,
      workspacePath,
      systemMessage: { content: systemContent },
      onPermissionRequest: onPermission,
    };

    if (reasoningEffort) {
      sessionConfig.reasoningEffort = reasoningEffort;
    }

    const session = await client.createSession(sessionConfig);

    logger.info('Copilot agent session created', { sessionId });

    // Prime the session with previous conversation history if resuming
    if (previousMessages.length > 0) {
      const historyText = formatHistoryForPriming(previousMessages);

      if (historyText.trim()) {
        const primingPrompt = [
          'Here is the conversation history from a previous session. Please',
          'treat this as your memory of our prior conversation and continue',
          'naturally from where we left off:',
          '',
          '[CONVERSATION HISTORY]',
          historyText,
          '[END HISTORY]',
          '',
          'Now continue the conversation. Do not acknowledge or summarize the',
          'history — just use it as context.',
        ].join('\n');

        logger.info('Priming session with history', {
          sessionId,
          messageCount: previousMessages.length,
          historyLength: historyText.length,
        });

        // Send the priming message and await+discard the response
        try {
          await new Promise((resolve, reject) => {
            let settled = false;
            const settle = (fn) => (...args) => {
              if (!settled) { settled = true; fn(...args); }
            };

            session.on((event) => {
              if (event.type === 'session.idle') {
                settle(resolve)();
              } else if (event.type === 'session.error') {
                settle(reject)(new Error(event.data?.message || 'Priming error'));
              }
              // Ignore all content events — we discard the priming response
            });

            session.send({ prompt: primingPrompt }).catch(settle(reject));
          });

          logger.info('Session history primed', {
            sessionId,
            messageCount: previousMessages.length,
          });
        } catch (primingError) {
          // Non-fatal: session still works, just without history context
          logger.warn('Failed to prime session history', {
            sessionId,
            error: primingError.message,
          });
        }
      }
    }

    return session;
  } catch (error) {
    logger.error('SDK error in createAgentSession', {
      sessionId,
      model,
      message: error.message,
      code: error.code,
      type: error.constructor.name,
      stack: error.stack?.split('\n').slice(0, 3).join(' | '),
    });
    throw error;
  }
}

/**
 * Sends a message to a Copilot SDK session, collects all events
 * until the turn completes (session.idle), and returns the result.
 *
 * @param {object} session - The SDK session object
 * @param {string} message - The user message to send
 * @returns {Promise<{ content: string, toolsUsed: string[] }>}
 */
export function sendMessage(session, message) {
  return new Promise((resolve, reject) => {
    let content = '';
    const toolsUsed = [];
    let settled = false;

    const settle = (fn) => (...args) => {
      if (!settled) {
        settled = true;
        fn(...args);
      }
    };

    // Subscribe to all session events
    session.on((event) => {
      switch (event.type) {
        // Streaming content deltas
        case 'assistant.message_delta':
          if (event.data?.deltaContent) {
            content += event.data.deltaContent;
          }
          break;

        // Complete assistant message (non-streaming fallback)
        case 'assistant.message':
          if (event.data?.content) {
            content = event.data.content;
          }
          break;

        // Tool execution events
        case 'tool.execution_start':
          if (event.data?.toolName) {
            toolsUsed.push(event.data.toolName);
            logger.info('Tool execution started', { tool: event.data.toolName });
          }
          break;

        case 'tool.execution_complete':
          logger.debug('Tool execution complete', { tool: event.data?.toolName });
          break;

        // Turn is complete
        case 'session.idle':
          logger.debug('Session idle — turn complete');
          settle(resolve)({ content, toolsUsed });
          break;

        // Session error
        case 'session.error':
          logger.error('Session error event', {
            eventData: event.data,
            message: event.data?.message,
            code: event.data?.code,
          });
          settle(reject)(new Error(event.data?.message || 'Session error'));
          break;

        default:
          logger.debug('Unhandled session event', { type: event.type });
      }
    });

    // Send the user prompt
    session.send({ prompt: message }).catch((error) => {
      logger.error('SDK error in session.send', {
        message: error.message,
        code: error.code,
        type: error.constructor.name,
        stack: error.stack?.split('\n').slice(0, 3).join(' | '),
      });
      settle(reject)(error);
    });
  });
}

/**
 * Closes a Copilot SDK session cleanly.
 *
 * @param {object} session - The SDK session to close
 */
export async function closeSession(session) {
  if (!session) return;
  try {
    await session.disconnect();
    logger.info('Copilot session disconnected');
  } catch (err) {
    logger.warn('Error disconnecting Copilot session', { error: err.message });
  }
}

// ─── Memory summarization ───────────────────────────────────────────

/**
 * Summarizes an array of messages for memory compaction.
 * Creates a temporary one-off Copilot SDK session (not stored in sessionManager),
 * sends the conversation for summarization, and returns the summary string.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @returns {Promise<string>} The summary text
 */
export async function summarizeMessages(messages) {
  if (!client) throw new Error('CopilotClient not initialized — call initClient() first');

  logger.info('Summarizing messages for memory compaction', {
    messageCount: messages.length,
  });

  // Format messages as plain text for the summarization prompt
  const formatted = messages
    .map((m) => `${(m.role || 'unknown').toUpperCase()}: ${m.content}`)
    .join('\n');

  const prompt = [
    'Summarize the following conversation history concisely in 3-5 sentences,',
    'capturing all important facts, decisions, and context. This summary will',
    'replace the full history to save memory. Be specific and factual.',
    '',
    'Conversation:',
    formatted,
  ].join('\n');

  // Create a temporary session with auto-approve (summary needs no tools)
  let tempSession;
  try {
    const { config: appConfig } = await import('../config.js');
    const model = appConfig.defaultModel || 'claude-sonnet-4.5';
    const reasoningEffort = getReasoningEffortForModel(model);
    const sessionConfig = {
      model,
      onPermissionRequest: async () => ({ kind: 'approved' }),
    };

    if (reasoningEffort) {
      sessionConfig.reasoningEffort = reasoningEffort;
    }

    tempSession = await client.createSession(sessionConfig);

    // Send the summarization prompt and collect the response
    const result = await new Promise((resolve, reject) => {
      let content = '';
      let settled = false;

      const settle = (fn) => (...args) => {
        if (!settled) {
          settled = true;
          fn(...args);
        }
      };

      tempSession.on((event) => {
        switch (event.type) {
          case 'assistant.message_delta':
            if (event.data?.deltaContent) {
              content += event.data.deltaContent;
            }
            break;
          case 'assistant.message':
            if (event.data?.content) {
              content = event.data.content;
            }
            break;
          case 'session.idle':
            settle(resolve)(content);
            break;
          case 'session.error':
            settle(reject)(new Error(event.data?.message || 'Summarization error'));
            break;
        }
      });

      tempSession.send({ prompt }).catch(settle(reject));
    });

    logger.info('Messages summarized', {
      inputMessages: messages.length,
      summaryLength: result.length,
    });

    return result;
  } catch (error) {
    logger.error('Failed to summarize messages', {
      message: error.message,
      code: error.code,
      type: error.constructor.name,
    });
    throw error;
  } finally {
    // Always clean up the temporary session
    if (tempSession) {
      try {
        await tempSession.disconnect();
      } catch {
        // Non-critical cleanup
      }
    }
  }
}


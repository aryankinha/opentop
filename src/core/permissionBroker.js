// src/core/permissionBroker.js
// Bridge between Copilot's onPermissionRequest and the user's phone/client.
// When Copilot wants to execute a tool, onPermissionRequest fires.
// This module decides whether to auto-approve, deny, or wait for user decision via WebSocket.

import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';
import { checkCommand, checkPath } from './commandGuard.js';
import logger from '../utils/logger.js';

/**
 * Map of pending permission requests.
 * Key: permission request id
 * Value: { resolve, reject, timer }
 */
const pendingPermissions = new Map();

/** Timeout for waiting on user decision (ms) */
const PERMISSION_TIMEOUT_MS = 60_000;

/**
 * Called when the user responds to a permission request via WebSocket.
 *
 * @param {string}  id       - The permission request id
 * @param {boolean} approved - Whether the user approved
 */
export function resolvePermission(id, approved) {
  const pending = pendingPermissions.get(id);
  if (!pending) {
    logger.warn('Permission response for unknown request', { id });
    return;
  }

  clearTimeout(pending.timer);
  pendingPermissions.delete(id);

  const decision = approved
    ? { kind: 'approved' }
    : { kind: 'denied', reason: 'Denied by user' };

  logger.info('Permission resolved', { id, approved });
  pending.resolve(decision);
}

/**
 * Creates the onPermissionRequest handler for a specific session.
 * This is passed to createAgentSession as the onPermissionRequest callback.
 *
 * @param {string}     sessionId - The session this handler belongs to
 * @param {Map}        wsClients - Map<sessionId, Set<ws>> of connected WebSocket clients
 * @returns {Function} The async onPermissionRequest handler
 */
export function createHandler(sessionId, wsClients) {
  return async (request) => {
    const kind = request.kind;

    logger.info('Permission request received', {
      sessionId,
      kind,
      detail: request,
    });

    // 0. SAFETY CHECK: Block dangerous commands before anything else
    if (kind === 'shell' && request.command) {
      const guardResult = checkCommand(request.command);
      if (guardResult.blocked) {
        logger.warn('Dangerous command blocked by guard', {
          sessionId,
          command: request.command.slice(0, 100),
          reason: guardResult.reason,
        });
        return { 
          kind: 'denied', 
          reason: `🛡️ BLOCKED: ${guardResult.reason}` 
        };
      }
    }

    // Also check write paths for dangerous targets
    if (kind === 'write' && request.path) {
      const pathResult = checkPath(request.path);
      if (pathResult.blocked) {
        logger.warn('Dangerous path write blocked by guard', {
          sessionId,
          path: request.path,
          reason: pathResult.reason,
        });
        return { 
          kind: 'denied', 
          reason: `🛡️ BLOCKED: ${pathResult.reason}` 
        };
      }
    }

    // 1. Auto-approve if kind is in autoApproveTools
    if (config.autoApproveTools.includes(kind)) {
      logger.info('Auto-approved permission', { sessionId, kind });
      return { kind: 'approved' };
    }

    // 2. Requires user approval — build request and push to WebSocket clients
    const id = uuidv4();
    const timestamp = new Date().toISOString();

    // Build detail from the request object
    const detail = {
      kind,
      command: request.command,
      path: request.path,
      url: request.url,
      description: request.description,
    };

    const permissionPayload = {
      type: 'permission_request',
      id,
      sessionId,
      kind,
      detail,
      timestamp,
    };

    // Push to all WebSocket clients subscribed to this session
    const clients = wsClients.get(sessionId);
    if (clients && clients.size > 0) {
      const msg = JSON.stringify(permissionPayload);
      for (const ws of clients) {
        try {
          ws.send(msg);
        } catch (err) {
          logger.warn('Failed to send permission request to WS client', {
            error: err.message,
          });
        }
      }
      logger.info('Permission request pushed to WebSocket clients', {
        id,
        sessionId,
        clientCount: clients.size,
      });
    } else {
      logger.warn('No WebSocket clients for session, denying permission', {
        id,
        sessionId,
      });
      return { kind: 'denied', reason: 'No connected clients to approve' };
    }

    // 3. Wait for user response (or timeout)
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        pendingPermissions.delete(id);
        logger.warn('Permission request timed out', { id, sessionId });
        resolve({ kind: 'denied', reason: 'Permission request timed out' });
      }, PERMISSION_TIMEOUT_MS);

      pendingPermissions.set(id, { resolve, timer });
    });
  };
}

// src/server.js
// Express HTTP + WebSocket server.
// This is the main entry point for the OpenTop backend.
// Can be run directly (npm start) or imported by the CLI (bin/opentop.js).

import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { WebSocketServer } from 'ws';

import { config } from './config.js';
import { initClient } from './core/copilotClient.js';
import { loadAllSessions, getAllSessions, SESSIONS_DIR } from './core/sessionManager.js';
import { discoverSystem } from './core/globalMemory.js';
import { resolvePermission } from './core/permissionBroker.js';
import { pairingAuthMiddleware, createPairingToken, loadPairingToken } from './core/pairingToken.js';
import { createChatRouter } from './routes/chat.js';
import logger from './utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const server = createServer(app);
const instanceId = `${process.pid}-${Date.now()}`;

// ─── Static files directory ─────────────────────────────────────────
const publicDir = join(__dirname, 'public');

// ─── Middleware (ORDER MATTERS!) ────────────────────────────────────

// 1. CORS - allow cross-origin requests
app.use(cors());

// 2. Debug logging middleware (if debug mode enabled)
if (process.env.OPENTOP_DEBUG === 'true') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.debug('HTTP request', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: `${duration}ms`,
        hasAuth: !!req.headers.authorization || !!req.headers['x-pairing-token'],
      });
    });
    next();
  });
}

// 3. Serve static files FIRST (no auth required)
//    This ensures CSS, JS, images, favicon etc. are served without PIN
if (existsSync(publicDir)) {
  app.use(express.static(publicDir, {
    // Set proper MIME types
    setHeaders: (res, path) => {
      if (path.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      }
    }
  }));
  logger.info('Serving static files from src/public/');
}

// 4. Parse JSON bodies (for API routes)
app.use(express.json());

// 5. Auth middleware - only applies to API routes (static already served above)
app.use(pairingAuthMiddleware);

// ─── WebSocket clients map ──────────────────────────────────────────
// Map<sessionId, Set<WebSocket>>
const wsClients = new Map();

// ─── Health endpoint ────────────────────────────────────────────────
const startTime = Date.now();

app.get('/health', (_req, res) => {
  const sessions = getAllSessions();
  res.json({
    status: 'healthy',
    sessions: sessions.length,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    pid: process.pid,
    instanceId,
    port: config.port,
    storageDir: SESSIONS_DIR,
  });
});

// ─── Mount chat routes ──────────────────────────────────────────────
app.use(createChatRouter(wsClients));

// ─── Global error handler ───────────────────────────────────────────
app.use((err, _req, res, _next) => {
  logger.error('Unhandled route error', {
    message: err.message,
    stack: err.stack,
  });
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// ─── SPA fallback ───────────────────────────────────────────────────
// Serve index.html for all non-API routes (client-side routing support)
if (existsSync(publicDir)) {
  app.get('*', (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api') || 
        req.path.startsWith('/session') || 
        req.path.startsWith('/sessions') ||
        req.path.startsWith('/chat')) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    const indexPath = join(publicDir, 'index.html');
    if (existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).json({ error: 'Web UI not built. Run: npm run build:web' });
    }
  });
} else {
  logger.info('No web UI found. Run: npm run build:web to build it.');
}

// ─── WebSocket server ───────────────────────────────────────────────
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  logger.info('WebSocket client connected');

  let subscribedSessionId = null;

  ws.on('message', (raw) => {
    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      return;
    }

    switch (data.type) {
      // Subscribe to a session's permission requests
      case 'subscribe': {
        const { sessionId } = data;
        if (!sessionId) {
          ws.send(JSON.stringify({ type: 'error', message: 'sessionId is required' }));
          return;
        }

        // Remove from previous subscription if any
        if (subscribedSessionId) {
          const prevSet = wsClients.get(subscribedSessionId);
          if (prevSet) {
            prevSet.delete(ws);
            if (prevSet.size === 0) wsClients.delete(subscribedSessionId);
          }
        }

        // Add to new subscription
        if (!wsClients.has(sessionId)) {
          wsClients.set(sessionId, new Set());
        }
        wsClients.get(sessionId).add(ws);
        subscribedSessionId = sessionId;

        ws.send(JSON.stringify({ type: 'subscribed', sessionId }));
        logger.info('WebSocket subscribed to session', { sessionId });
        break;
      }

      // Handle user response to a permission request
      case 'permission_response': {
        const { id, approved } = data;
        if (!id || typeof approved !== 'boolean') {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'id (string) and approved (boolean) are required',
          }));
          return;
        }

        resolvePermission(id, approved);
        ws.send(JSON.stringify({ type: 'permission_acknowledged', id }));
        break;
      }

      default:
        ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${data.type}` }));
    }
  });

  ws.on('close', () => {
    // Clean up subscription on disconnect
    if (subscribedSessionId) {
      const set = wsClients.get(subscribedSessionId);
      if (set) {
        set.delete(ws);
        if (set.size === 0) wsClients.delete(subscribedSessionId);
      }
    }
    logger.info('WebSocket client disconnected');
  });

  ws.on('error', (err) => {
    logger.error('WebSocket error', { error: err.message });
  });
});

// ─── Startup ────────────────────────────────────────────────────────

/**
 * Starts the OpenTop server.
 * Can be called directly or from the CLI with overrides.
 *
 * @param {object} [overrides] - Optional overrides for config
 * @param {number} [overrides.port] - Override server port
 * @param {boolean} [overrides.verbose] - Enable verbose/debug logging
 * @param {boolean} [overrides.debug] - Enable debug mode (HTTP request logging)
 * @param {string} [overrides.model] - Override default model
 */
export async function startServer(overrides = {}) {
  try {
    // Apply overrides
    if (overrides.port) config.port = overrides.port;
    if (overrides.verbose) process.env.OPENTOP_VERBOSE = 'true';
    if (overrides.debug) {
      process.env.LOG_LEVEL = 'debug';
      process.env.OPENTOP_DEBUG = 'true';
    }
    if (overrides.model) config.defaultModel = overrides.model;

    // 1. Load config (already done via import)
    logger.info('Config loaded', { port: config.port, defaultModel: config.defaultModel });

    // 2. Start Copilot SDK client
    await initClient();

    // 3. Restore sessions from disk
    loadAllSessions();

    // 4. Run system discovery in background (non-blocking)
    discoverSystem().catch(err =>
      logger.warn('System discovery failed', { error: err.message })
    );

    // 4.5 Ensure pairing credentials exist and are visible when starting directly.
    const pairing = loadPairingToken() || createPairingToken();

    // 5. Start HTTP + WebSocket server
    server.listen(config.port, () => {
      logger.info(`OpenTop server running on port ${config.port}`, {
        instanceId,
        pid: process.pid,
        storageDir: SESSIONS_DIR,
        port: config.port,
        endpoints: {
          health: `GET /health`,
          createSession: `POST /session`,
          listSessions: `GET /sessions`,
          getSession: `GET /session/:id`,
          deleteSession: `DELETE /session/:id`,
          chat: `POST /session/:id/chat`,
          messages: `GET /session/:id/messages`,
          memory: `GET /session/:id/memory`,
          compact: `POST /session/:id/compact`,
          websocket: `ws://localhost:${config.port}`,
        },
      });
      logger.info('Pairing PIN ready', { pairingPin: pairing.pin });
      console.log(`OpenTop URL: http://localhost:${config.port}`);
      console.log(`OpenTop PIN: ${pairing.pin}`);
    });
  } catch (err) {
    logger.error('Fatal: failed to start server', {
      message: err.message,
      stack: err.stack,
    });
    process.exit(1);
  }
}

// ─── Graceful shutdown ──────────────────────────────────────────────
function shutdown(signal) {
  logger.info(`Received ${signal}, shutting down gracefully`);

  wss.close(() => {
    logger.info('WebSocket server closed');
  });

  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Never crash the process on unhandled rejections
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason: String(reason) });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { message: err.message, stack: err.stack });
});

// ─── Auto-start when run directly ───────────────────────────────────
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  startServer();
}

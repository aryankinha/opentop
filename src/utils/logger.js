// src/utils/logger.js
// Structured JSON logger — all log output goes to stdout as JSON lines.

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = LEVELS[process.env.LOG_LEVEL || 'info'] ?? LEVELS.info;

function formatLog(level, message, meta = {}) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  });
}

function shouldLog(level) {
  return (LEVELS[level] ?? 0) >= currentLevel;
}

const logger = {
  debug(message, meta) {
    if (shouldLog('debug')) console.log(formatLog('debug', message, meta));
  },
  info(message, meta) {
    if (shouldLog('info')) console.log(formatLog('info', message, meta));
  },
  warn(message, meta) {
    if (shouldLog('warn')) console.warn(formatLog('warn', message, meta));
  },
  error(message, meta) {
    if (shouldLog('error')) console.error(formatLog('error', message, meta));
  },
};

export default logger;

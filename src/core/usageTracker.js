// src/core/usageTracker.js
// Tracks token usage globally across all sessions.
// Persists to ~/.opentop/usage.json.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import logger from '../utils/logger.js';

const CONFIG_DIR = join(homedir(), '.opentop');
const USAGE_PATH = join(CONFIG_DIR, 'usage.json');

// Default monthly quota (can be configured)
// This is an estimate - actual Copilot limits may vary
const DEFAULT_MONTHLY_QUOTA = 500000;

/**
 * Default usage structure
 */
const DEFAULT_USAGE = {
  totalTokensUsed: 0,
  totalRequests: 0,
  quotaLimit: DEFAULT_MONTHLY_QUOTA,
  quotaResetDate: getNextMonthStart(),
  lastUpdated: new Date().toISOString(),
  dailyUsage: {},
  sessionUsage: {},
};

/**
 * In-memory usage cache
 */
let usageCache = null;

/**
 * Get the first day of next month as ISO string
 */
function getNextMonthStart() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString().split('T')[0];
}

/**
 * Get today's date as YYYY-MM-DD
 */
function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Load usage from disk or return defaults
 */
export function loadUsage() {
  if (usageCache) {
    return usageCache;
  }

  try {
    if (existsSync(USAGE_PATH)) {
      const raw = readFileSync(USAGE_PATH, 'utf-8');
      usageCache = { ...DEFAULT_USAGE, ...JSON.parse(raw) };
      
      // Check if we need to reset for new month
      resetIfNewMonth();
      
      return usageCache;
    }
  } catch (err) {
    logger.warn('Failed to load usage data, using defaults', { error: err.message });
  }

  usageCache = { ...DEFAULT_USAGE };
  return usageCache;
}

/**
 * Save usage to disk
 */
export function saveUsage() {
  if (!usageCache) return;

  try {
    usageCache.lastUpdated = new Date().toISOString();
    writeFileSync(USAGE_PATH, JSON.stringify(usageCache, null, 2), 'utf-8');
  } catch (err) {
    logger.error('Failed to save usage data', { error: err.message });
  }
}

/**
 * Reset usage if we've entered a new month
 */
function resetIfNewMonth() {
  if (!usageCache) return;

  const today = getTodayKey();
  const resetDate = usageCache.quotaResetDate;

  if (today >= resetDate) {
    logger.info('New month detected, resetting usage stats', { 
      previousTotal: usageCache.totalTokensUsed,
      resetDate,
    });

    // Archive previous month's data (optional)
    const previousMonth = {
      totalTokensUsed: usageCache.totalTokensUsed,
      totalRequests: usageCache.totalRequests,
      endDate: resetDate,
    };

    // Reset counters
    usageCache.totalTokensUsed = 0;
    usageCache.totalRequests = 0;
    usageCache.quotaResetDate = getNextMonthStart();
    usageCache.dailyUsage = {};
    usageCache.sessionUsage = {};
    usageCache.previousMonth = previousMonth;

    saveUsage();
  }
}

/**
 * Track token usage for a session
 * @param {string} sessionId - The session ID
 * @param {number} tokensUsed - Number of tokens used
 */
export function trackUsage(sessionId, tokensUsed) {
  const usage = loadUsage();
  const today = getTodayKey();

  // Update totals
  usage.totalTokensUsed += tokensUsed;
  usage.totalRequests += 1;

  // Update daily usage
  if (!usage.dailyUsage[today]) {
    usage.dailyUsage[today] = { tokens: 0, requests: 0 };
  }
  usage.dailyUsage[today].tokens += tokensUsed;
  usage.dailyUsage[today].requests += 1;

  // Update session usage
  if (!usage.sessionUsage[sessionId]) {
    usage.sessionUsage[sessionId] = { tokens: 0, requests: 0, firstUsed: today };
  }
  usage.sessionUsage[sessionId].tokens += tokensUsed;
  usage.sessionUsage[sessionId].requests += 1;
  usage.sessionUsage[sessionId].lastUsed = today;

  // Clean up old daily usage (keep last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];
  
  for (const date of Object.keys(usage.dailyUsage)) {
    if (date < cutoffDate) {
      delete usage.dailyUsage[date];
    }
  }

  saveUsage();
  
  logger.debug('Usage tracked', { 
    sessionId, 
    tokensUsed, 
    totalTokens: usage.totalTokensUsed,
  });
}

/**
 * Get current usage stats
 * @returns {object} Usage statistics
 */
export function getUsage() {
  const usage = loadUsage();
  const today = getTodayKey();
  const todayUsage = usage.dailyUsage[today] || { tokens: 0, requests: 0 };

  // Calculate quota percentage
  const quotaUsedPercent = Math.min(
    Math.round((usage.totalTokensUsed / usage.quotaLimit) * 100),
    100
  );

  // Calculate days until reset
  const resetDate = new Date(usage.quotaResetDate);
  const now = new Date();
  const daysUntilReset = Math.ceil((resetDate - now) / (1000 * 60 * 60 * 24));

  return {
    totalTokens: usage.totalTokensUsed,
    totalRequests: usage.totalRequests,
    quotaLimit: usage.quotaLimit,
    quotaUsedPercent,
    quotaRemaining: Math.max(0, usage.quotaLimit - usage.totalTokensUsed),
    todayTokens: todayUsage.tokens,
    todayRequests: todayUsage.requests,
    resetDate: usage.quotaResetDate,
    daysUntilReset: Math.max(0, daysUntilReset),
    lastUpdated: usage.lastUpdated,
  };
}

/**
 * Get usage for a specific session
 * @param {string} sessionId 
 * @returns {object|null}
 */
export function getSessionUsage(sessionId) {
  const usage = loadUsage();
  return usage.sessionUsage[sessionId] || null;
}

/**
 * Get daily usage history (last N days)
 * @param {number} days - Number of days to return
 * @returns {Array<{date: string, tokens: number, requests: number}>}
 */
export function getDailyHistory(days = 7) {
  const usage = loadUsage();
  const history = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];
    const dayUsage = usage.dailyUsage[dateKey] || { tokens: 0, requests: 0 };
    history.push({
      date: dateKey,
      tokens: dayUsage.tokens,
      requests: dayUsage.requests,
    });
  }

  return history.reverse();
}

/**
 * Update quota limit (for configuration)
 * @param {number} newLimit 
 */
export function setQuotaLimit(newLimit) {
  const usage = loadUsage();
  usage.quotaLimit = newLimit;
  saveUsage();
  logger.info('Quota limit updated', { newLimit });
}

/**
 * Format token count for display (e.g., 125000 -> "125K")
 * @param {number} tokens 
 * @returns {string}
 */
export function formatTokens(tokens) {
  if (tokens >= 1000000) {
    return (tokens / 1000000).toFixed(1) + 'M';
  }
  if (tokens >= 1000) {
    return (tokens / 1000).toFixed(0) + 'K';
  }
  return tokens.toString();
}

export default {
  loadUsage,
  saveUsage,
  trackUsage,
  getUsage,
  getSessionUsage,
  getDailyHistory,
  setQuotaLimit,
  formatTokens,
};

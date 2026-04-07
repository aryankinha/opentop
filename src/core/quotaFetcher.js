// src/core/quotaFetcher.js
// Fetches real Copilot quota from GitHub's internal API.
// Uses the same endpoint as VSCode, Copilot CLI, and Zed.

import logger from '../utils/logger.js';

// Cache to avoid hitting GitHub API too frequently
let cachedQuota = null;
let cacheExpiry = 0;
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

/**
 * Fetches real Copilot quota from GitHub's internal API.
 * This is the same endpoint used by the official Copilot CLI.
 * 
 * @param {string} githubToken - GitHub personal access token
 * @returns {Promise<object>} Quota information
 */
export async function fetchCopilotQuota(githubToken) {
  // Return cached data if still fresh
  if (cachedQuota && Date.now() < cacheExpiry) {
    logger.debug('Returning cached quota data');
    return cachedQuota;
  }

  if (!githubToken) {
    throw new Error('GitHub token is required to fetch quota');
  }

  try {
    logger.debug('Fetching Copilot quota from GitHub API');
    
    const res = await fetch('https://api.github.com/copilot_internal/user', {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/json',
        'User-Agent': 'OpenTop/1.0'
      }
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      logger.error('GitHub API error', {
        status: res.status,
        statusText: res.statusText,
        body: errorText
      });
      throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    
    logger.debug('GitHub API response', {
      hasQuotaSnapshots: !!data.quota_snapshots,
      hasChat: !!data.quota_snapshots?.chat,
      plan: data.copilot_plan
    });

    // Calculate days until reset
    let daysUntilReset = null;
    if (data.quota_reset_date) {
      const resetDate = new Date(data.quota_reset_date);
      const now = new Date();
      daysUntilReset = Math.ceil((resetDate - now) / (1000 * 60 * 60 * 24));
    }

    const quota = {
      percentRemaining: data.quota_snapshots?.chat?.percent_remaining ?? null,
      remaining: data.quota_snapshots?.chat?.remaining ?? null,
      total: data.quota_snapshots?.chat?.entitlement ?? null,
      resetDate: data.quota_reset_date ?? null,
      daysUntilReset,
      unlimited: data.quota_snapshots?.chat?.unlimited ?? false,
      plan: data.copilot_plan ?? null,
      overageCount: data.quota_snapshots?.chat?.overage_count ?? 0,
      overagePermitted: data.quota_snapshots?.chat?.overage_permitted ?? false
    };

    // Cache the result
    cachedQuota = quota;
    cacheExpiry = Date.now() + CACHE_TTL;

    logger.info('Fetched Copilot quota', {
      percentRemaining: quota.percentRemaining,
      remaining: quota.remaining,
      total: quota.total,
      unlimited: quota.unlimited
    });

    return quota;
  } catch (error) {
    logger.error('Failed to fetch Copilot quota', {
      message: error.message,
      type: error.constructor.name
    });
    
    // If we have cached data, return it even if expired
    if (cachedQuota) {
      logger.warn('Returning stale cached quota data due to API error');
      return { ...cachedQuota, stale: true };
    }
    
    throw error;
  }
}

/**
 * Clears the quota cache, forcing a fresh fetch on next request.
 */
export function clearQuotaCache() {
  cachedQuota = null;
  cacheExpiry = 0;
  logger.debug('Quota cache cleared');
}

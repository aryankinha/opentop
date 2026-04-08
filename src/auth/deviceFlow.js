// src/auth/deviceFlow.js
// Native GitHub OAuth Device Flow for OpenTop.
// This avoids depending on Copilot CLI and macOS Keychain.

const GITHUB_BASE_URL = 'https://github.com';
const DEFAULT_GITHUB_CLIENT_ID = 'Iv1.b507a08c87ecfe98';
const GITHUB_CLIENT_ID = process.env.OPENTOP_GITHUB_CLIENT_ID
  || process.env.GITHUB_CLIENT_ID
  || DEFAULT_GITHUB_CLIENT_ID;
const GITHUB_APP_SCOPES = 'read:user';
const DEVICE_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:device_code';

function standardHeaders() {
  return {
    'content-type': 'application/json',
    accept: 'application/json',
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function formatDeviceFlowError(prefix, payload) {
  if (payload?.error_description) {
    return `${prefix}: ${payload.error_description}`;
  }
  if (payload?.message) {
    return `${prefix}: ${payload.message}`;
  }
  if (payload?.error) {
    return `${prefix}: ${payload.error}`;
  }
  return prefix;
}

/**
 * Requests a GitHub device code.
 * @returns {Promise<object>} Device code response payload
 */
export async function requestDeviceCode() {
  const response = await fetch(`${GITHUB_BASE_URL}/login/device/code`, {
    method: 'POST',
    headers: standardHeaders(),
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      scope: GITHUB_APP_SCOPES,
    }),
  });

  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(formatDeviceFlowError('Failed to request device code', payload));
  }

  if (!payload?.device_code || !payload?.user_code || !payload?.verification_uri) {
    throw new Error('GitHub device code response was missing required fields');
  }

  return payload;
}

/**
 * Polls GitHub for an OAuth access token using the device code.
 * @param {object} deviceCodeResponse
 * @param {object} [options]
 * @param {(status: string, details?: object) => void} [options.onStatus]
 * @returns {Promise<string>} GitHub OAuth token
 */
export async function pollAccessToken(deviceCodeResponse, options = {}) {
  if (!deviceCodeResponse?.device_code) {
    throw new Error('device_code is required for polling');
  }

  const onStatus = typeof options.onStatus === 'function' ? options.onStatus : null;
  const expiresInSec = Math.max(1, Number(deviceCodeResponse.expires_in) || 900);
  const deadline = Date.now() + (expiresInSec * 1000);

  let intervalMs = Math.max(1, Number(deviceCodeResponse.interval) || 5) * 1000;

  while (Date.now() < deadline) {
    const response = await fetch(`${GITHUB_BASE_URL}/login/oauth/access_token`, {
      method: 'POST',
      headers: standardHeaders(),
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        device_code: deviceCodeResponse.device_code,
        grant_type: DEVICE_GRANT_TYPE,
      }),
    });

    const payload = await parseJsonResponse(response);

    if (!response.ok) {
      onStatus?.('poll_http_error', payload);
      await sleep(intervalMs);
      continue;
    }

    if (payload?.access_token) {
      return payload.access_token;
    }

    const errorCode = payload?.error;

    if (errorCode === 'authorization_pending') {
      onStatus?.('authorization_pending');
      await sleep(intervalMs);
      continue;
    }

    if (errorCode === 'slow_down') {
      intervalMs += 5000;
      onStatus?.('slow_down', { intervalMs });
      await sleep(intervalMs);
      continue;
    }

    if (errorCode === 'expired_token') {
      throw new Error('Device code expired before authorization completed');
    }

    if (errorCode === 'access_denied') {
      throw new Error('Authorization was denied from the GitHub verification page');
    }

    if (errorCode) {
      throw new Error(formatDeviceFlowError('Failed to get access token', payload));
    }

    await sleep(intervalMs);
  }

  throw new Error('Timed out waiting for GitHub authorization');
}

/**
 * Runs the full GitHub OAuth Device Flow.
 * @param {object} [options]
 * @param {(details: object) => void} [options.onUserCode]
 * @param {(status: string, details?: object) => void} [options.onStatus]
 * @returns {Promise<string>} GitHub OAuth token
 */
export async function runDeviceAuth(options = {}) {
  const deviceCode = await requestDeviceCode();

  if (typeof options.onUserCode === 'function') {
    options.onUserCode({
      userCode: deviceCode.user_code,
      verificationUri: deviceCode.verification_uri,
      verificationUriComplete: deviceCode.verification_uri_complete || null,
      expiresIn: deviceCode.expires_in,
      interval: deviceCode.interval,
    });
  }

  options.onStatus?.('polling_started', {
    interval: deviceCode.interval,
    expiresIn: deviceCode.expires_in,
  });

  const token = await pollAccessToken(deviceCode, {
    onStatus: options.onStatus,
  });

  options.onStatus?.('authorized');
  return token;
}

export default {
  requestDeviceCode,
  pollAccessToken,
  runDeviceAuth,
};

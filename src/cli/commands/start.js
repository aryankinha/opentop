// src/cli/commands/start.js
// Smart start command — handles setup if needed, then starts server + tunnel.

import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { createServer } from 'node:net';

import ui from '../ui.js';
import { shouldRunSetup, runSetup, loadConfig } from '../setup.js';
import { startTunnel, stopTunnel, getUrl, onStatusChanged, cleanup as tunnelCleanup } from '../../tunnel/manager.js';
import { isCloudflaredInstalled } from '../../tunnel/quick.js';
import { loadToken, hasToken } from '../../auth/token.js';
import { startDaemon, getDaemonStatus } from '../daemon.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONFIG_DIR = join(homedir(), '.opentop');
const RUNTIME_DIR = join(CONFIG_DIR, 'runtime');
const VERSION = '0.1.0';

// Port range to auto-select from (high ports to avoid conflicts)
const PORT_RANGE_START = 15000;
const PORT_RANGE_END = 65000;
const MAX_PORT_ATTEMPTS = 10;

/**
 * Checks if a port is available.
 * @param {number} port
 * @returns {Promise<boolean>}
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, '127.0.0.1');
  });
}

/**
 * Finds an available port in the specified range.
 * Uses random selection for speed, falls back to sequential scan.
 * @param {number} start - Start of port range
 * @param {number} end - End of port range
 * @returns {Promise<number|null>} Available port or null if none found
 */
async function findAvailablePort(start = PORT_RANGE_START, end = PORT_RANGE_END) {
  const { randomInt } = await import('node:crypto');
  
  // Try random ports first (fast, no collisions)
  for (let i = 0; i < MAX_PORT_ATTEMPTS; i++) {
    const port = randomInt(start, end + 1);
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  
  // Fallback: sequential scan (slower but guaranteed if any port is free)
  for (let port = start; port <= end; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  
  return null;
}

/**
 * Checks if server is already running.
 * @param {number} port
 * @returns {Promise<boolean>}
 */
async function isServerRunning(port) {
  try {
    const res = await fetch(`http://localhost:${port}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Main start command handler.
 * @param {object} flags - Command flags
 * @param {number} [flags.port] - Specific port (auto-selects if not provided)
 * @param {boolean} [flags.verbose=false]
 * @param {boolean} [flags.debug=false]
 * @param {string} [flags.model]
 * @param {boolean} [flags.tunnel] - Force tunnel (backwards compat)
 * @param {boolean} [flags.noTunnel=false] - Disable tunnel
 * @param {boolean} [flags.foreground=false] - Run in foreground (blocks terminal)
 */
export async function start(flags = {}) {
  const verbose = flags.verbose || false;
  const debug = flags.debug || false;
  const noTunnel = flags.noTunnel || false;
  const foreground = flags.foreground || false;

  // Set debug mode
  if (debug) {
    process.env.LOG_LEVEL = 'debug';
    process.env.OPENTOP_DEBUG = 'true';
  }

  // Load token at startup (caches for entire session)
  loadToken();

  // ─── Check if setup is needed ────────────────────────────────────────
  if (shouldRunSetup()) {
    const { success, config } = await runSetup();
    if (!success) {
      process.exit(1);
    }
    console.log(ui.loading('Starting OpenTop...'));
    console.log('');
  }

  // Determine port: use specified port or auto-select from range
  let port;
  if (flags.port) {
    port = parseInt(flags.port, 10);
  } else {
    port = await findAvailablePort();
    if (!port) {
      console.log('');
      console.log(ui.error(`No available ports in range ${PORT_RANGE_START}-${PORT_RANGE_END}`));
      console.log('');
      console.log(`  Try specifying a port: ${ui.colors.command('opentop --port 9999')}`);
      console.log('');
      process.exit(1);
    }
  }

  // Check if already running
  const existingDaemon = getDaemonStatus();
  if (existingDaemon) {
    console.log('');
    console.log(ui.error('OpenTop is already running'));
    console.log(`  ${ui.colors.muted('Port:')} ${existingDaemon.port}`);
    if (existingDaemon.url) {
      console.log(`  ${ui.colors.muted('URL:')} ${existingDaemon.url}`);
    }
    console.log(`  ${ui.colors.muted('PIN:')} ${existingDaemon.pairingPin}`);
    console.log('');
    console.log(`  Stop it first: ${ui.colors.command('opentop stop')}`);
    console.log('');
    process.exit(1);
  }

  // ─── Background mode (default) ───────────────────────────────────────
  if (!foreground) {
    return startBackground(port, flags);
  }

  // ─── Foreground mode ─────────────────────────────────────────────────
  return startForeground(port, flags);
}

/**
 * Starts OpenTop in background (daemon) mode.
 */
async function startBackground(port, flags) {
  const { model, noTunnel, debug } = flags;

  console.log('');
  console.log(ui.header('OpenTop — Starting'));
  console.log('');
  console.log(ui.loading('Starting background server...'));

  const result = await startDaemon({
    port,
    model,
    noTunnel,
    debug,
  });

  if (!result.success) {
    console.log('');
    console.log(ui.error(result.error));
    console.log('');
    process.exit(1);
  }

  // Get device name
  const { getDeviceName } = await import('../../config.js');
  const deviceName = getDeviceName();

  console.log('');
  
  // Show QR code with URL + PIN
  const displayUrl = result.url || `http://localhost:${result.port}`;
  const connectUrl = `${displayUrl}?pin=${result.pairingPin}`;
  try {
    const { printQR } = await import('../../utils/qr.js');
    printQR(connectUrl);
  } catch (err) {
    // QR print failed, continue
    if (debug) {
      console.log(ui.warn(`QR code failed: ${err.message}`));
    }
  }

  console.log(ui.box('OpenTop is running ' + ui.symbols.rocket, [
    { label: 'Device', value: deviceName },
    { label: 'URL', value: result.url || `http://localhost:${result.port}` },
    { label: 'PIN', value: result.pairingPin },
    { label: 'Port', value: String(result.port) },
  ]));

  console.log('');
  console.log(`  ${ui.symbols.link} Open: ${ui.colors.highlight(result.url || `http://localhost:${result.port}`)}`);
  console.log(`  ${ui.symbols.lock} PIN: ${ui.colors.highlight(result.pairingPin)}`);
  if (result.url) {
    console.log('');
    console.log(ui.info('Scan QR code or open URL on your phone'));
  }
  console.log('');
  console.log(`  Stop: ${ui.colors.command('opentop stop')}`);
  console.log(`  Status: ${ui.colors.command('opentop status')}`);
  console.log('');
}

/**
 * Starts OpenTop in foreground mode (blocks terminal).
 */
async function startForeground(port, flags) {
  const { verbose, noTunnel, model, debug } = flags;

  // Load config
  const config = loadConfig() || {};
  const tunnelMode = config.tunnel?.mode || 'quick';
  const tunnelDomain = config.tunnel?.domain;

  // Check cloudflared if tunnel needed
  if (!noTunnel && !isCloudflaredInstalled()) {
    console.log(ui.cloudflaredInstallHelp());
    process.exit(1);
  }

  // Check authentication
  if (!hasToken()) {
    console.log('');
    console.log(ui.error('Not authenticated with GitHub'));
    console.log('');
    console.log(`  Run: ${ui.colors.command('copilot login')}`);
    console.log(`  Then: ${ui.colors.command('opentop')}`);
    console.log('');
    process.exit(1);
  }

  // ─── Print banner ────────────────────────────────────────────────────
  console.log(ui.banner(VERSION));

  // ─── Generate pairing token ──────────────────────────────────────────
  const { createPairingToken } = await import('../../core/pairingToken.js');
  const pairing = createPairingToken();

  console.log(`  ${ui.symbols.lock} Pairing PIN: ${ui.colors.highlight(pairing.pin)}`);
  console.log('');

  // ─── Start server ────────────────────────────────────────────────────
  const overrides = { port };
  if (verbose) overrides.verbose = true;
  if (debug) overrides.debug = true;
  if (flags.model) overrides.model = flags.model;

  const serverPath = join(__dirname, '..', '..', 'server.js');
  const { startServer } = await import(serverPath);
  await startServer(overrides);

  console.log(ui.success(`Local: http://localhost:${port}`));

  // Check if web UI is built
  const publicDir = join(__dirname, '..', '..', 'public');
  if (existsSync(join(publicDir, 'index.html'))) {
    console.log(ui.success(`Web UI: http://localhost:${port}`));
  } else {
    console.log(ui.warning('Web UI not built. Run: npm run build:web'));
  }

  // ─── Start tunnel ────────────────────────────────────────────────────
  let tunnelUrl = null;

  if (!noTunnel) {
    console.log(ui.loading('Starting tunnel...'));

    // Set up status handler
    onStatusChanged((event) => {
      if (event.status === 'crashed') {
        console.log(ui.warning(`Tunnel crashed (code ${event.code}), restarting...`));
      } else if (event.status === 'recovered') {
        const newUrl = getUrl();
        if (newUrl && newUrl !== tunnelUrl) {
          tunnelUrl = newUrl;
          console.log(ui.success(`Tunnel restarted: ${ui.colors.highlight(newUrl)}`));
        }
      } else if (event.status === 'failed') {
        console.log(ui.error(`Tunnel failed: ${event.reason}`));
      }
    });

    try {
      const result = await startTunnel({
        mode: tunnelMode,
        port,
        domain: tunnelDomain,
        tunnelName: config.tunnel?.tunnelName || 'opentop',
        autoRestart: true,
      });

      tunnelUrl = result.url;
      console.log(ui.success(`Tunnel: ${ui.colors.highlight(tunnelUrl)}`));
    } catch (err) {
      console.log(ui.error(`Tunnel failed: ${err.message}`));
      console.log(ui.info('Continuing without tunnel...'));
    }
  }

  // ─── Save runtime state ──────────────────────────────────────────────
  const { savePids, saveState } = await import('../../core/processManager.js');
  savePids(process.pid, null); // Tunnel PID managed by tunnel manager
  saveState({
    port,
    tunnelUrl,
    tunnelMode,
    pairingPin: pairing.pin,
    startedAt: new Date().toISOString(),
  });

  // ─── Display final status ────────────────────────────────────────────
  console.log('');

  if (tunnelUrl) {
    // Print QR code with PIN included in URL
    const connectUrl = `${tunnelUrl}?pin=${pairing.pin}`;
    try {
      const { printQR } = await import('../../utils/qr.js');
      printQR(connectUrl);
    } catch {
      // QR print failed, continue
    }

    // Display running box
    console.log(ui.runningBox({
      url: tunnelUrl,
      pin: pairing.pin,
      port,
    }));

    console.log('');
    console.log(`  ${ui.symbols.link} Open: ${ui.colors.highlight(tunnelUrl)}`);
    console.log(`  ${ui.symbols.lock} PIN: ${ui.colors.highlight(pairing.pin)}`);
    console.log('');
    console.log(ui.info('Scan QR code or open URL on your phone'));
  } else {
    console.log(ui.box('OpenTop is running ' + ui.symbols.rocket, [
      { label: 'Local', value: `http://localhost:${port}` },
      { label: 'PIN', value: pairing.pin },
    ]));
    console.log('');
    console.log(ui.info('For public access, install cloudflared and restart'));
  }

  console.log('');
  console.log(`  Press ${ui.colors.bold('Ctrl+C')} to stop`);
  console.log('');

  // ─── Graceful shutdown ───────────────────────────────────────────────
  const handleShutdown = async () => {
    console.log('\n' + ui.action('Shutting down...'));

    // Stop tunnel
    tunnelCleanup();

    // Clear runtime files
    try {
      const { clearPairingToken } = await import('../../core/pairingToken.js');
      const { clearAllRuntime } = await import('../../core/processManager.js');
      clearPairingToken();
      clearAllRuntime();
    } catch {
      // Ignore cleanup errors
    }

    // Give server time to close
    setTimeout(() => process.exit(0), 500);
  };

  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);
}

export default { start };

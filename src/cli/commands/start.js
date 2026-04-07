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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONFIG_DIR = join(homedir(), '.opentop');
const RUNTIME_DIR = join(CONFIG_DIR, 'runtime');
const PWA_BASE_URL = process.env.OPENTOP_PWA_URL || 'https://opentop.vercel.app';
const VERSION = '0.1.0';

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
 * @param {number} [flags.port=3000]
 * @param {boolean} [flags.verbose=false]
 * @param {string} [flags.model]
 * @param {boolean} [flags.tunnel] - Force tunnel (backwards compat)
 * @param {boolean} [flags.noTunnel=false] - Disable tunnel
 */
export async function start(flags = {}) {
  const port = flags.port ? parseInt(flags.port, 10) : 3000;
  const verbose = flags.verbose || false;
  const noTunnel = flags.noTunnel || false;

  // Load token at startup (caches for entire session)
  loadToken();

  // ─── Check if setup is needed ────────────────────────────────────────
  if (shouldRunSetup()) {
    const { success, config } = await runSetup();
    if (!success) {
      process.exit(1);
    }
    // Continue with start after setup
    console.log(ui.loading('Starting OpenTop...'));
    console.log('');
  }

  // Load config
  const config = loadConfig() || {};
  const tunnelMode = config.tunnel?.mode || 'quick';
  const tunnelDomain = config.tunnel?.domain;

  // ─── Pre-flight checks ───────────────────────────────────────────────
  // Check if already running
  if (await isServerRunning(port)) {
    console.log('');
    console.log(ui.error('OpenTop is already running'));
    console.log(`  ${ui.colors.muted('Port:')} ${port}`);
    console.log('');
    console.log(`  Stop it first: ${ui.colors.command('opentop stop')}`);
    console.log('');
    process.exit(1);
  }

  // Check port availability
  if (!(await isPortAvailable(port))) {
    console.log('');
    console.log(ui.error(`Port ${port} is already in use`));
    console.log('');
    console.log(`  Try: ${ui.colors.command(`opentop --port ${port + 1}`)}`);
    console.log('');
    process.exit(1);
  }

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
    // Build connect URL with pairing info
    const connectUrl = `${PWA_BASE_URL}/connect?url=${encodeURIComponent(tunnelUrl)}&pin=${pairing.pin}`;

    // Print QR code
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
    console.log(`  ${ui.symbols.phone} PWA: ${ui.colors.highlight(PWA_BASE_URL)}`);
    console.log(`  ${ui.symbols.link} API: ${ui.colors.highlight(tunnelUrl)}`);
    console.log(`  ${ui.symbols.lock} PIN: ${ui.colors.highlight(pairing.pin)}`);
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

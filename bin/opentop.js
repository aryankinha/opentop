#!/usr/bin/env node

// bin/opentop.js
// CLI entry point for OpenTop.
// Usage: opentop <command> [options]

import { parseArgs } from 'node:util';
import { join, dirname } from 'node:path';
import { existsSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { execSync, spawn, spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';
import { createServer } from 'node:net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const VERSION = '0.1.0';
const CONFIG_DIR = join(homedir(), '.opentop');
const RUNTIME_DIR = join(CONFIG_DIR, 'runtime');
const PWA_BASE_URL = process.env.OPENTOP_PWA_URL || 'https://opentop.vercel.app';

// ─── Argument parsing ───────────────────────────────────────────────

const args = process.argv.slice(2);
const command = args[0];

// Remove the command from args before parsing flags
const flagArgs = args.slice(1);

let flags = {};
try {
  const parsed = parseArgs({
    args: flagArgs,
    options: {
      port: { type: 'string', short: 'p' },
      verbose: { type: 'boolean', short: 'v', default: false },
      model: { type: 'string', short: 'm' },
      help: { type: 'boolean', short: 'h', default: false },
      tunnel: { type: 'boolean', short: 't', default: false },
      force: { type: 'boolean', short: 'f', default: false },
    },
    allowPositionals: true,
    strict: false,
  });
  flags = parsed.values;
} catch {
  // Ignore parse errors for unknown flags
}

// ─── Helpers ─────────────────────────────────────────────────────────

function ask(rl, question) {
  return new Promise(resolve => rl.question(question, resolve));
}

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

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function killProcess(pid) {
  try {
    process.kill(pid, 'SIGTERM');
    return true;
  } catch {
    return false;
  }
}

function loadRuntimePids() {
  const pidPath = join(RUNTIME_DIR, 'opentop.pid');
  if (!existsSync(pidPath)) return null;
  try {
    return JSON.parse(readFileSync(pidPath, 'utf-8'));
  } catch {
    return null;
  }
}

function loadRuntimeState() {
  const statePath = join(RUNTIME_DIR, 'state.json');
  if (!existsSync(statePath)) return null;
  try {
    return JSON.parse(readFileSync(statePath, 'utf-8'));
  } catch {
    return null;
  }
}

function formatUptime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

// ─── Commands ───────────────────────────────────────────────────────

async function cmdStart() {
  const port = flags.port ? parseInt(flags.port, 10) : 3000;
  const verbose = flags.verbose || false;
  const useTunnel = flags.tunnel || false;

  // Check if already running
  const pids = loadRuntimePids();
  if (pids && isProcessRunning(pids.serverPid)) {
    console.log('');
    console.log('  ✗ OpenTop is already running');
    console.log(`    PID: ${pids.serverPid}`);
    console.log('');
    console.log('    Stop it first: opentop stop');
    console.log('');
    process.exit(1);
  }

  // Check port availability
  if (!(await isPortAvailable(port))) {
    console.log('');
    console.log(`  ✗ Port ${port} is already in use`);
    console.log('');
    console.log('    Try a different port: opentop start --port 4000');
    console.log('    Or stop whatever is using that port.');
    console.log('');
    process.exit(1);
  }

  // Print startup banner
  console.log('');
  console.log('  ╔════════════════════════════════════════════╗');
  console.log(`  ║     OpenTop Agent Server  v${VERSION}        ║`);
  console.log('  ╚════════════════════════════════════════════╝');
  console.log('');

  // Generate pairing token
  const { createPairingToken } = await import(join(__dirname, '..', 'src', 'core', 'pairingToken.js'));
  const pairing = createPairingToken();

  console.log(`  🔐 Pairing PIN: ${pairing.pin}`);
  console.log('');

  // Build overrides
  const overrides = { port };
  if (verbose) overrides.verbose = true;
  if (flags.model) overrides.model = flags.model;

  // Import and start server
  const serverPath = join(__dirname, '..', 'src', 'server.js');
  const { startServer } = await import(serverPath);
  await startServer(overrides);

  // Save PID and state
  const { savePids, saveState } = await import(join(__dirname, '..', 'src', 'core', 'processManager.js'));
  
  let tunnelProcess = null;
  let tunnelUrl = null;

  console.log(`  ✓ Local:   http://localhost:${port}`);

  // Check if web UI is built
  const publicDir = join(__dirname, '..', 'src', 'public');
  if (existsSync(join(publicDir, 'index.html'))) {
    console.log(`  ✓ Web UI:  http://localhost:${port}`);
  } else {
    console.log('  ⚠ Web UI:  Not built. Run: npm run build:web');
  }

  // Handle tunnel
  if (useTunnel) {
    const tunnelMod = await import(join(__dirname, '..', 'src', 'tunnel.js'));

    if (!tunnelMod.isCloudflaredInstalled()) {
      console.log('');
      console.log('  ✗ cloudflared is not installed.');
      console.log('    Install it with: brew install cloudflared');
      console.log('    Then run: opentop start --tunnel');
      console.log('');
    } else {
      console.log('  ⏳ Starting tunnel...');

      try {
        // Wait a moment for the server to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));

        const { url, process: proc } = await tunnelMod.startQuickTunnel(port);
        tunnelProcess = proc;
        tunnelUrl = url;

        tunnelMod.saveTunnelUrl(url);
        console.log(`  ✓ Tunnel:  ${url}`);

        // Build connect URL with pairing info
        const connectUrl = `${PWA_BASE_URL}/connect?url=${encodeURIComponent(url)}&pin=${pairing.pin}`;

        // Print QR code
        const { printQR } = await import(join(__dirname, '..', 'src', 'utils', 'qr.js'));
        printQR(connectUrl);

        console.log('  ────────────────────────────────────────────');
        console.log(`  📱 Open PWA: ${PWA_BASE_URL}`);
        console.log(`  🔗 Server:   ${url}`);
        console.log(`  🔐 PIN:      ${pairing.pin}`);
        console.log('  ────────────────────────────────────────────');
      } catch (err) {
        console.log(`  ✗ Tunnel failed: ${err.message}`);
        console.log('');
      }
    }
  } else {
    console.log('');
    console.log('  ℹ️  For public access, restart with: opentop start --tunnel');
  }

  // Save state
  savePids(process.pid, tunnelProcess?.pid || null);
  saveState({
    port,
    tunnelUrl,
    pairingPin: pairing.pin,
    startedAt: new Date().toISOString(),
  });

  console.log('');
  console.log('  Press Ctrl+C to stop');
  console.log('');

  // Auto-restart tunnel on crash
  if (tunnelProcess) {
    tunnelProcess.on('exit', async (code) => {
      if (code !== null && code !== 0) {
        console.log('  ⚠ Tunnel crashed, restarting in 3s...');
        await new Promise(r => setTimeout(r, 3000));
        try {
          const tunnelMod = await import(join(__dirname, '..', 'src', 'tunnel.js'));
          const { url, process: newProc } = await tunnelMod.startQuickTunnel(port);
          tunnelProcess = newProc;
          tunnelUrl = url;
          tunnelMod.saveTunnelUrl(url);
          console.log(`  ✓ Tunnel restarted: ${url}`);
          
          // Update state with new URL
          saveState({
            port,
            tunnelUrl: url,
            pairingPin: pairing.pin,
            startedAt: new Date().toISOString(),
          });
        } catch (err) {
          console.log(`  ✗ Tunnel restart failed: ${err.message}`);
        }
      }
    });
  }

  // Graceful shutdown
  const handleShutdown = async () => {
    console.log('\n  Shutting down...');

    if (tunnelProcess) {
      tunnelProcess.kill();
    }

    // Clear runtime files
    const { clearPairingToken } = await import(join(__dirname, '..', 'src', 'core', 'pairingToken.js'));
    const { clearAllRuntime } = await import(join(__dirname, '..', 'src', 'core', 'processManager.js'));
    clearPairingToken();
    clearAllRuntime();

    // Give server time to close
    setTimeout(() => process.exit(0), 500);
  };

  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);
}

async function cmdStop() {
  console.log('');
  console.log('  OpenTop — Stop');
  console.log('  ──────────────');

  const pids = loadRuntimePids();

  if (!pids) {
    console.log('');
    console.log('  ✗ OpenTop is not running (no PID file found)');
    console.log('');
    process.exit(1);
  }

  let stopped = false;

  // Kill tunnel first
  if (pids.tunnelPid && isProcessRunning(pids.tunnelPid)) {
    killProcess(pids.tunnelPid);
    console.log(`  ✓ Stopped tunnel (PID ${pids.tunnelPid})`);
    stopped = true;
  }

  // Kill server
  if (pids.serverPid && isProcessRunning(pids.serverPid)) {
    killProcess(pids.serverPid);
    console.log(`  ✓ Stopped server (PID ${pids.serverPid})`);
    stopped = true;
  }

  if (!stopped) {
    console.log('');
    console.log('  ℹ️  No running processes found (may have already stopped)');
  }

  // Clean up runtime files
  try {
    if (existsSync(RUNTIME_DIR)) {
      rmSync(RUNTIME_DIR, { recursive: true });
    }
    console.log('  ✓ Cleaned up runtime files');
  } catch {
    // Ignore
  }

  console.log('');
}

async function cmdStatus() {
  const port = flags.port ? parseInt(flags.port, 10) : 3000;

  console.log('');
  console.log('  OpenTop — Status');
  console.log('  ─────────────────');

  const pids = loadRuntimePids();
  const state = loadRuntimeState();

  if (!pids || !isProcessRunning(pids.serverPid)) {
    console.log('');
    console.log('  Status:   ❌ Not running');
    console.log('');
    console.log('  Start with: opentop start --tunnel');
    console.log('');
    process.exit(1);
  }

  // Try to get health info from running server
  const checkPort = state?.port || port;
  try {
    const res = await fetch(`http://localhost:${checkPort}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    console.log('');
    console.log('  Status:     ✅ Running');
    console.log(`  PID:        ${pids.serverPid}`);
    console.log(`  Uptime:     ${formatUptime(data.uptime)}`);
    console.log(`  Sessions:   ${data.sessions} active`);
    console.log(`  Port:       ${checkPort}`);

    if (state?.tunnelUrl) {
      console.log(`  Tunnel:     ${state.tunnelUrl}`);
    } else {
      console.log('  Tunnel:     ❌ Not active');
    }

    if (state?.pairingPin) {
      console.log(`  Pairing:    ${state.pairingPin}`);
    }

    console.log('');
    console.log(`  Local:      http://localhost:${checkPort}`);
    if (state?.tunnelUrl) {
      console.log(`  Public:     ${state.tunnelUrl}`);
    }
    console.log('');
  } catch (err) {
    console.log('');
    console.log('  Status:     ⚠️ Process running but server not responding');
    console.log(`  PID:        ${pids.serverPid}`);
    console.log(`  Error:      ${err.message}`);
    console.log('');
    console.log('  Try: opentop stop && opentop start --tunnel');
    console.log('');
    process.exit(1);
  }
}

async function cmdReset() {
  console.log('');
  console.log('  OpenTop — Reset');
  console.log('  ────────────────');
  console.log('');

  if (!flags.force) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const answer = await ask(rl, '  This will delete ALL OpenTop config. Continue? (y/N): ');
    rl.close();

    if (answer.toLowerCase() !== 'y') {
      console.log('  Cancelled.');
      console.log('');
      process.exit(0);
    }
  }

  // Stop any running processes first
  const pids = loadRuntimePids();
  if (pids) {
    if (pids.tunnelPid && isProcessRunning(pids.tunnelPid)) {
      killProcess(pids.tunnelPid);
      console.log(`  ✓ Stopped tunnel (PID ${pids.tunnelPid})`);
    }
    if (pids.serverPid && isProcessRunning(pids.serverPid)) {
      killProcess(pids.serverPid);
      console.log(`  ✓ Stopped server (PID ${pids.serverPid})`);
    }
  }

  // Delete config directory
  if (existsSync(CONFIG_DIR)) {
    rmSync(CONFIG_DIR, { recursive: true });
    console.log(`  ✓ Deleted ${CONFIG_DIR}`);
  } else {
    console.log('  ℹ️  Config directory does not exist');
  }

  console.log('');
  console.log('  Reset complete. Run "opentop setup" to start fresh.');
  console.log('');
}

function cmdConfig() {
  const configPath = join(CONFIG_DIR, 'config.json');

  console.log('');
  console.log('  OpenTop — Configuration');
  console.log('  ────────────────────────');
  console.log('');
  console.log(`  Config file: ${configPath}`);
  console.log('');

  if (!existsSync(configPath)) {
    console.log('  ✗ Config file does not exist. It will be created on first start.');
    console.log('');
    return;
  }

  try {
    const raw = readFileSync(configPath, 'utf-8');
    const cfg = JSON.parse(raw);

    const maxKeyLen = Math.max(...Object.keys(cfg).map((k) => k.length));
    for (const [key, value] of Object.entries(cfg)) {
      const displayValue = Array.isArray(value)
        ? value.join(', ')
        : String(value);
      console.log(`  ${key.padEnd(maxKeyLen + 2)}${displayValue}`);
    }
    console.log('');
  } catch (err) {
    console.log(`  ✗ Failed to read config: ${err.message}`);
    console.log('');
  }
}

async function cmdDoctor() {
  console.log('');
  console.log('  OpenTop — Doctor');
  console.log('  ─────────────────');
  console.log('');

  let issues = 0;

  // 1. Check Node version
  const nodeVersion = parseInt(process.version.slice(1));
  if (nodeVersion >= 18) {
    console.log(`  ✓ Node.js ${process.version}`);
  } else {
    console.log(`  ✗ Node.js ${process.version} (18+ required)`);
    issues++;
  }

  // 2. Check cloudflared
  const tunnelMod = await import(join(__dirname, '..', 'src', 'tunnel.js'));
  if (tunnelMod.isCloudflaredInstalled()) {
    try {
      const version = execSync('cloudflared --version', { stdio: 'pipe' }).toString().trim().split('\n')[0];
      console.log(`  ✓ cloudflared: ${version}`);
    } catch {
      console.log('  ✓ cloudflared installed');
    }
  } else {
    console.log('  ✗ cloudflared not installed');
    console.log('      Install: brew install cloudflared');
    issues++;
  }

  // 3. Check Copilot CLI
  try {
    execSync('which copilot', { stdio: 'pipe' });
    console.log('  ✓ GitHub Copilot CLI');
  } catch {
    console.log('  ⚠ GitHub Copilot CLI not found (optional)');
    console.log('      Install: npm install -g @github/copilot');
  }

  // 4. Check GitHub token
  const hasToken = !!(process.env.COPILOT_GITHUB_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_TOKEN);
  if (hasToken) {
    console.log('  ✓ GitHub token found in environment');
  } else {
    // Check keychain
    try {
      execSync("security find-generic-password -s 'copilot-cli' 2>/dev/null", { stdio: 'pipe' });
      console.log('  ✓ GitHub token found in keychain');
    } catch {
      console.log('  ⚠ No GitHub token found');
      console.log('      Run: copilot login');
    }
  }

  // 5. Check default port
  const defaultPort = 3000;
  if (await isPortAvailable(defaultPort)) {
    console.log(`  ✓ Port ${defaultPort} available`);
  } else {
    console.log(`  ⚠ Port ${defaultPort} in use`);
    console.log('      Use: opentop start --port 4000');
  }

  // 6. Check config directory
  if (existsSync(CONFIG_DIR)) {
    console.log(`  ✓ Config directory: ${CONFIG_DIR}`);
  } else {
    console.log(`  ℹ️  Config directory will be created on first run`);
  }

  // 7. Check config file integrity
  const configPath = join(CONFIG_DIR, 'config.json');
  if (existsSync(configPath)) {
    try {
      JSON.parse(readFileSync(configPath, 'utf-8'));
      console.log('  ✓ Config file valid');
    } catch {
      console.log('  ✗ Config file corrupted');
      console.log('      Fix: opentop reset');
      issues++;
    }
  }

  // 8. Check for stale PID files
  const pids = loadRuntimePids();
  if (pids) {
    if (!isProcessRunning(pids.serverPid)) {
      console.log('  ⚠ Stale PID file found (server not running)');
      console.log('      Fix: opentop stop');
    }
  }

  console.log('');
  if (issues === 0) {
    console.log('  ✅ All checks passed!');
  } else {
    console.log(`  ⚠ ${issues} issue(s) found`);
  }
  console.log('');
}

async function cmdAuth() {
  console.log('');
  console.log('  OpenTop — Authentication');
  console.log('  ─────────────────────────');
  console.log('');

  // Check if an env token is already set
  if (process.env.COPILOT_GITHUB_TOKEN) {
    console.log('  ✓ COPILOT_GITHUB_TOKEN is set in environment');
    console.log('    You can skip the login flow if this token is valid.');
    console.log('');
  }

  // Check if Copilot CLI exists
  let copilotPath;
  try {
    copilotPath = execSync('which copilot', { stdio: 'pipe' }).toString().trim();
  } catch {
    console.log('  ✗ Copilot CLI not found.');
    console.log('');
    console.log('    Install it with:');
    console.log('      npm install -g @github/copilot');
    console.log('');
    console.log('    Then run:');
    console.log('      opentop auth');
    console.log('');
    process.exit(1);
  }

  console.log(`  ✓ Copilot CLI found: ${copilotPath}`);
  console.log('  Starting interactive login...');
  console.log('');

  // Run copilot login interactively
  const child = spawn('copilot', ['login'], { stdio: 'inherit' });
  child.on('exit', (code) => {
    if (code === 0) {
      console.log('');
      console.log('  ✓ Authentication successful!');
      console.log('    Run "opentop start" to start the server.');
      console.log('');
    }
    process.exit(code ?? 0);
  });
  child.on('error', (err) => {
    console.error(`  ✗ Failed to run copilot login: ${err.message}`);
    process.exit(1);
  });
}

async function cmdSetup() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║      Welcome to OpenTop Setup              ║');
  console.log('╚════════════════════════════════════════════╝\n');

  // Step 1: Check Node version
  console.log('Checking requirements...');
  const nodeVersion = parseInt(process.version.slice(1));
  if (nodeVersion < 18) {
    console.log('  ✗ Node.js 18+ required. Current: ' + process.version);
    rl.close();
    process.exit(1);
  }
  console.log('  ✓ Node.js ' + process.version);

  // Step 2: Check Copilot CLI
  try {
    execSync('which copilot', { stdio: 'pipe' });
    console.log('  ✓ GitHub Copilot CLI found');
  } catch {
    console.log('  ✗ GitHub Copilot CLI not found');
    const install = await ask(rl, '  Install it now? (y/n): ');
    if (install.toLowerCase() === 'y') {
      console.log('  → Installing @github/copilot...');
      try {
        execSync('npm install -g @github/copilot', { stdio: 'inherit' });
        console.log('  ✓ Installed');
      } catch (err) {
        console.log(`  ✗ Installation failed: ${err.message}`);
      }
    }
  }

  // Step 3: Check auth
  console.log('\nChecking GitHub authentication...');
  const hasToken = !!(process.env.COPILOT_GITHUB_TOKEN || process.env.GH_TOKEN);
  if (!hasToken) {
    console.log('  ✗ Not authenticated');
    const auth = await ask(rl, '  Run copilot login now? (y/n): ');
    if (auth.toLowerCase() === 'y') {
      console.log('  → Opening GitHub login...');
      spawnSync('copilot', ['login'], { stdio: 'inherit' });
    }
  } else {
    console.log('  ✓ GitHub token found');
  }

  // Step 4: Check cloudflared
  console.log('\nChecking tunnel support...');
  const tunnelMod = await import(join(__dirname, '..', 'src', 'tunnel.js'));
  if (tunnelMod.isCloudflaredInstalled()) {
    console.log('  ✓ cloudflared installed');
  } else {
    console.log('  ✗ cloudflared not found');
    const installCf = await ask(rl, '  Install cloudflared for public access? (y/n): ');
    if (installCf.toLowerCase() === 'y') {
      console.log('  → Install cloudflared with:');
      console.log('    brew install cloudflared');
      console.log('    (or visit https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)');
    }
  }

  // Step 5: Config
  console.log('\nSetting up config...');
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  console.log(`  ✓ Config: ${join(CONFIG_DIR, 'config.json')}`);

  // Done
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║  Setup complete!                           ║');
  console.log('║                                            ║');
  console.log('║  Start OpenTop:                            ║');
  console.log('║    opentop start                           ║');
  console.log('║                                            ║');
  console.log('║  With public tunnel:                       ║');
  console.log('║    opentop start --tunnel                  ║');
  console.log('╚════════════════════════════════════════════╝\n');

  rl.close();
}

function cmdHelp() {
  console.log(`
  OpenTop v${VERSION}
  Self-hosted AI agent backend powered by GitHub Copilot SDK.

  USAGE
    opentop <command> [options]

  COMMANDS
    start              Start the OpenTop server
    stop               Stop the running server and tunnel
    status             Show server status, URL, and sessions
    setup              Interactive setup wizard
    auth               Authenticate with GitHub Copilot
    config             Show current configuration
    reset              Delete all config and stop processes
    doctor             Check system requirements and diagnose issues
    help               Show this help message

  OPTIONS (start)
    --port, -p <N>     Port to run the server on (default: 3000)
    --verbose, -v      Enable verbose/debug logging
    --model, -m <M>    Override the default model
    --tunnel, -t       Start a Cloudflare tunnel for public access

  OPTIONS (reset)
    --force, -f        Skip confirmation prompt

  EXAMPLES
    opentop start --tunnel          Start with public access
    opentop start --port 4000       Use custom port
    opentop status                  Check if running
    opentop stop                    Stop server and tunnel
    opentop doctor                  Diagnose issues
    opentop reset --force           Full reset

  SECURITY
    When starting with --tunnel, a pairing PIN is generated.
    The PWA must provide this PIN to connect.

  CONFIG
    ~/.opentop/config.json

  DOCS
    https://github.com/opentop/opentop
`);
}

// ─── Router ─────────────────────────────────────────────────────────

if (!command || command === 'help' || flags.help) {
  cmdHelp();
} else if (command === 'start') {
  cmdStart().catch((err) => {
    console.error(`\n  ✗ Failed to start: ${err.message}\n`);
    process.exit(1);
  });
} else if (command === 'stop') {
  cmdStop().catch((err) => {
    console.error(`\n  ✗ Stop error: ${err.message}\n`);
    process.exit(1);
  });
} else if (command === 'status') {
  cmdStatus().catch((err) => {
    console.error(`\n  ✗ Status error: ${err.message}\n`);
    process.exit(1);
  });
} else if (command === 'reset') {
  cmdReset().catch((err) => {
    console.error(`\n  ✗ Reset error: ${err.message}\n`);
    process.exit(1);
  });
} else if (command === 'doctor') {
  cmdDoctor().catch((err) => {
    console.error(`\n  ✗ Doctor error: ${err.message}\n`);
    process.exit(1);
  });
} else if (command === 'setup') {
  cmdSetup().catch((err) => {
    console.error(`\n  ✗ Setup error: ${err.message}\n`);
    process.exit(1);
  });
} else if (command === 'auth') {
  cmdAuth().catch((err) => {
    console.error(`\n  ✗ Auth error: ${err.message}\n`);
    process.exit(1);
  });
} else if (command === 'config') {
  cmdConfig();
} else {
  console.error(`\n  ✗ Unknown command: ${command}`);
  console.error('    Run "opentop help" for usage.\n');
  process.exit(1);
}

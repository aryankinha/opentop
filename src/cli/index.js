// src/cli/index.js
// Main CLI entry point.
// Routes commands to appropriate handlers.

import { parseArgs } from 'node:util';
import { join, dirname } from 'node:path';
import { existsSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { execSync, spawn, spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';
import { createServer } from 'node:net';

import ui from './ui.js';
import { start } from './commands/start.js';
import { stop } from './commands/stop.js';
import { status } from './commands/status.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const VERSION = '0.1.0';
const CONFIG_DIR = join(homedir(), '.opentop');
const RUNTIME_DIR = join(CONFIG_DIR, 'runtime');

// ─── Argument parsing ───────────────────────────────────────────────

/**
 * Parses CLI arguments.
 * @param {string[]} args
 * @returns {{ command: string | null, flags: object }}
 */
export function parseCliArgs(args) {
  const command = args[0] && !args[0].startsWith('-') ? args[0] : null;
  const flagArgs = command ? args.slice(1) : args;

  let flags = {};
  try {
    const parsed = parseArgs({
      args: flagArgs,
      options: {
        port: { type: 'string', short: 'p' },
        verbose: { type: 'boolean', short: 'v', default: false },
        debug: { type: 'boolean', short: 'd', default: false },
        model: { type: 'string', short: 'm' },
        help: { type: 'boolean', short: 'h', default: false },
        version: { type: 'boolean', default: false },
        'no-tunnel': { type: 'boolean', default: false },
        foreground: { type: 'boolean', default: false },
        force: { type: 'boolean', short: 'f', default: false },
      },
      allowPositionals: true,
      strict: false,
    });
    flags = parsed.values;
  } catch {
    // Ignore parse errors for unknown flags
  }

  return { command, flags };
}

// ─── Helper functions ───────────────────────────────────────────────

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

// ─── Commands ───────────────────────────────────────────────────────

async function cmdReset(flags) {
  console.log('');
  console.log(ui.header('OpenTop — Reset'));
  console.log('');

  if (!flags.force) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const answer = await ask(rl, `  ${ui.prompt('This will delete ALL OpenTop config. Continue? (y/N):')} `);
    rl.close();

    if (answer.toLowerCase() !== 'y') {
      console.log(ui.info('Cancelled.'));
      console.log('');
      process.exit(0);
    }
  }

  // Stop any running processes first
  const pids = loadRuntimePids();
  if (pids) {
    if (pids.tunnelPid && isProcessRunning(pids.tunnelPid)) {
      killProcess(pids.tunnelPid);
      console.log(ui.success(`Stopped tunnel (PID ${pids.tunnelPid})`));
    }
    if (pids.serverPid && isProcessRunning(pids.serverPid)) {
      killProcess(pids.serverPid);
      console.log(ui.success(`Stopped server (PID ${pids.serverPid})`));
    }
  }

  // Delete config directory
  if (existsSync(CONFIG_DIR)) {
    rmSync(CONFIG_DIR, { recursive: true });
    console.log(ui.success(`Deleted ${CONFIG_DIR}`));
  } else {
    console.log(ui.info('Config directory does not exist'));
  }

  console.log('');
  console.log(ui.success('Reset complete.'));
  console.log(`  Run ${ui.colors.command('opentop')} to start fresh.`);
  console.log('');
}

async function cmdConfig(args) {
  const configPath = join(CONFIG_DIR, 'config.json');

  // Handle 'config set name <value>'
  if (args[0] === 'set' && args[1] === 'name' && args[2]) {
    const newName = args[2];
    
    try {
      const { setDeviceName } = await import('../config.js');
      await setDeviceName(newName);
      
      console.log('');
      console.log(ui.success(`Device name updated to: ${ui.colors.highlight(newName)}`));
      console.log('');
      return;
    } catch (err) {
      console.log('');
      console.log(ui.error(err.message));
      console.log('');
      process.exit(1);
    }
  }

  // Default: show config
  console.log('');
  console.log(ui.header('OpenTop — Configuration'));
  console.log('');
  console.log(`  ${ui.colors.muted('Config file:')} ${configPath}`);
  console.log('');

  if (!existsSync(configPath)) {
    console.log(ui.warning('Config file does not exist.'));
    console.log(ui.info('It will be created on first start.'));
    console.log('');
    return;
  }

  try {
    const raw = readFileSync(configPath, 'utf-8');
    const cfg = JSON.parse(raw);

    const maxKeyLen = Math.max(...Object.keys(cfg).map((k) => k.length));
    for (const [key, value] of Object.entries(cfg)) {
      let displayValue;
      if (typeof value === 'object') {
        displayValue = JSON.stringify(value);
      } else if (Array.isArray(value)) {
        displayValue = value.join(', ');
      } else {
        displayValue = String(value);
      }
      console.log(`  ${ui.colors.bold(key.padEnd(maxKeyLen + 2))}${displayValue}`);
    }
    console.log('');
    console.log(ui.info('Set device name: opentop config set name <value>'));
    console.log('');
  } catch (err) {
    console.log(ui.error(`Failed to read config: ${err.message}`));
    console.log('');
  }
}

async function cmdDoctor() {
  console.log('');
  console.log(ui.header('OpenTop — Doctor'));
  console.log('');

  let issues = 0;

  // 1. Check Node version
  const nodeVersion = parseInt(process.version.slice(1));
  if (nodeVersion >= 18) {
    console.log(ui.success(`Node.js ${process.version}`));
  } else {
    console.log(ui.error(`Node.js ${process.version} (18+ required)`));
    issues++;
  }

  // 2. Check cloudflared
  const { isCloudflaredInstalled, getCloudflaredVersion } = await import('../tunnel/quick.js');
  if (isCloudflaredInstalled()) {
    const version = getCloudflaredVersion();
    console.log(ui.success(`cloudflared ${version || 'installed'}`));
  } else {
    console.log(ui.error('cloudflared not installed'));
    console.log(`      Install: ${ui.colors.command('brew install cloudflared')}`);
    issues++;
  }

  // 3. Check Copilot CLI
  try {
    execSync('which copilot', { stdio: 'pipe' });
    console.log(ui.success('GitHub Copilot CLI'));
  } catch {
    console.log(ui.warning('GitHub Copilot CLI not found (optional)'));
    console.log(`      Install: ${ui.colors.command('npm install -g @github/copilot')}`);
  }

  // 4. Check GitHub token
  const { hasToken, getTokenSource } = await import('../auth/token.js');
  if (hasToken()) {
    const source = getTokenSource();
    console.log(ui.success(`GitHub token found (${source.source})`));
  } else {
    console.log(ui.warning('No GitHub token found'));
    console.log(`      Run: ${ui.colors.command('copilot login')}`);
  }

  // 5. Check default port
  const defaultPort = 3000;
  if (await isPortAvailable(defaultPort)) {
    console.log(ui.success(`Port ${defaultPort} available`));
  } else {
    console.log(ui.warning(`Port ${defaultPort} in use`));
    console.log(`      Use: ${ui.colors.command('opentop --port 4000')}`);
  }

  // 6. Check config directory
  if (existsSync(CONFIG_DIR)) {
    console.log(ui.success(`Config directory: ${CONFIG_DIR}`));
  } else {
    console.log(ui.info('Config directory will be created on first run'));
  }

  // 7. Check config file integrity
  const configPath = join(CONFIG_DIR, 'config.json');
  if (existsSync(configPath)) {
    try {
      JSON.parse(readFileSync(configPath, 'utf-8'));
      console.log(ui.success('Config file valid'));
    } catch {
      console.log(ui.error('Config file corrupted'));
      console.log(`      Fix: ${ui.colors.command('opentop reset')}`);
      issues++;
    }
  }

  // 8. Check for stale PID files
  const pids = loadRuntimePids();
  if (pids) {
    if (!isProcessRunning(pids.serverPid)) {
      console.log(ui.warning('Stale PID file found (server not running)'));
      console.log(`      Fix: ${ui.colors.command('opentop stop')}`);
    }
  }

  console.log('');
  if (issues === 0) {
    console.log(ui.success('All checks passed! ✅'));
  } else {
    console.log(ui.warning(`${issues} issue(s) found`));
  }
  console.log('');
}

async function cmdAuth() {
  console.log('');
  console.log(ui.header('OpenTop — Authentication'));
  console.log('');

  // Check if an env token is already set
  if (process.env.COPILOT_GITHUB_TOKEN) {
    console.log(ui.success('COPILOT_GITHUB_TOKEN is set in environment'));
    console.log(ui.info('You can skip the login flow if this token is valid.'));
    console.log('');
  }

  // Check if Copilot CLI exists
  let copilotPath;
  try {
    copilotPath = execSync('which copilot', { stdio: 'pipe' }).toString().trim();
  } catch {
    console.log(ui.error('Copilot CLI not found.'));
    console.log('');
    console.log('  Install it with:');
    console.log(ui.command('npm install -g @github/copilot'));
    console.log('');
    console.log('  Then run:');
    console.log(ui.command('opentop auth'));
    console.log('');
    process.exit(1);
  }

  console.log(ui.success(`Copilot CLI found: ${copilotPath}`));
  console.log(ui.action('Starting interactive login...'));
  console.log('');

  // Run copilot login interactively
  const child = spawn('copilot', ['login'], { stdio: 'inherit' });
  child.on('exit', (code) => {
    if (code === 0) {
      console.log('');
      console.log(ui.success('Authentication successful!'));
      console.log(`    Run ${ui.colors.command('opentop')} to start the server.`);
      console.log('');
    }
    process.exit(code ?? 0);
  });
  child.on('error', (err) => {
    console.log(ui.error(`Failed to run copilot login: ${err.message}`));
    process.exit(1);
  });
}

function cmdHelp() {
  console.log(`
  ${ui.colors.bold('OpenTop')} ${ui.colors.muted(`v${VERSION}`)}
  ${ui.colors.muted('Self-hosted AI agent backend powered by GitHub Copilot SDK.')}

  ${ui.colors.bold('USAGE')}
    ${ui.colors.command('opentop')}                    ${ui.colors.muted('# Start (runs setup on first run)')}
    ${ui.colors.command('opentop <command>')}          ${ui.colors.muted('# Run specific command')}

  ${ui.colors.bold('COMMANDS')}
    ${ui.colors.action('start')}              Start the server ${ui.colors.muted('(default command)')}
    ${ui.colors.action('stop')}               Stop the running server
    ${ui.colors.action('status')}             Show server status
    ${ui.colors.action('auth')}               Authenticate with GitHub
    ${ui.colors.action('config')}             Show current configuration
    ${ui.colors.action('doctor')}             Diagnose issues
    ${ui.colors.action('reset')}              Delete all config and stop processes
    ${ui.colors.action('help')}               Show this help message

  ${ui.colors.bold('OPTIONS')}
    ${ui.colors.muted('--port, -p <N>')}      Port to run on ${ui.colors.muted('(auto-selects 15000-65000)')}
    ${ui.colors.muted('--no-tunnel')}         Disable tunnel (local only)
    ${ui.colors.muted('--foreground')}        Run in foreground (blocks terminal)
    ${ui.colors.muted('--debug, -d')}         Enable debug logging (HTTP requests, auth)
    ${ui.colors.muted('--verbose, -v')}       Enable verbose logging
    ${ui.colors.muted('--model, -m <M>')}     Override default model
    ${ui.colors.muted('--force, -f')}         Skip confirmations (reset)

  ${ui.colors.bold('EXAMPLES')}
    ${ui.colors.command('opentop')}                    ${ui.colors.muted('# Start with tunnel')}
    ${ui.colors.command('opentop --port 4000')}        ${ui.colors.muted('# Use custom port')}
    ${ui.colors.command('opentop status')}             ${ui.colors.muted('# Check if running')}
    ${ui.colors.command('opentop stop')}               ${ui.colors.muted('# Stop server')}
    ${ui.colors.command('opentop doctor')}             ${ui.colors.muted('# Diagnose issues')}
    ${ui.colors.command('opentop reset --force')}      ${ui.colors.muted('# Full reset')}

  ${ui.colors.bold('CONFIG')}
    ${ui.colors.muted('~/.opentop/config.json')}

  ${ui.colors.bold('DOCS')}
    ${ui.colors.highlight('https://github.com/opentop/opentop')}
`);
}

function cmdVersion() {
  console.log(`opentop v${VERSION}`);
}

// ─── Main Router ────────────────────────────────────────────────────

/**
 * Main CLI entry point.
 * @param {string[]} args - Command line arguments
 */
export async function main(args = process.argv.slice(2)) {
  const { command, flags } = parseCliArgs(args);

  // Handle --version flag
  if (flags.version) {
    cmdVersion();
    return;
  }

  // Handle --help flag or help command
  if (flags.help || command === 'help') {
    cmdHelp();
    return;
  }

  // Route to command handlers
  try {
    if (!command || command === 'start') {
      // Default command: smart start
      await start({
        port: flags.port,
        verbose: flags.verbose,
        debug: flags.debug,
        model: flags.model,
        noTunnel: flags['no-tunnel'],
        foreground: flags.foreground,
      });
    } else if (command === 'stop') {
      await stop();
    } else if (command === 'status') {
      await status({ port: flags.port });
    } else if (command === 'auth') {
      await cmdAuth();
    } else if (command === 'config') {
      // Pass remaining args for subcommands
      await cmdConfig(args.slice(1));
    } else if (command === 'doctor') {
      await cmdDoctor();
    } else if (command === 'reset') {
      await cmdReset(flags);
    } else {
      console.log(ui.error(`Unknown command: ${command}`));
      console.log(`  Run ${ui.colors.command('opentop help')} for usage.`);
      process.exit(1);
    }
  } catch (err) {
    console.log(ui.error(`Error: ${err.message}`));
    if (flags.verbose) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

export default { main, parseCliArgs };

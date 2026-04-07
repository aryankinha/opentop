// src/cli/setup.js
// First-run interactive setup wizard.
// Guides users through cloudflared install, auth, and tunnel mode selection.

import readline from 'node:readline';
import { execSync, spawn } from 'node:child_process';
import { existsSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

import ui from './ui.js';
import { isCloudflaredInstalled, getCloudflaredVersion } from '../tunnel/quick.js';
import { isCloudflareLoggedIn, loginToCloudflare, createTunnel, routeDNS } from '../tunnel/named.js';
import { hasToken } from '../auth/token.js';

const CONFIG_DIR = join(homedir(), '.opentop');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

/**
 * Creates a readline interface for prompts.
 * @returns {readline.Interface}
 */
function createReadline() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Promisified question.
 * @param {readline.Interface} rl
 * @param {string} question
 * @returns {Promise<string>}
 */
function ask(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

/**
 * Checks if the setup wizard should run.
 * @returns {boolean}
 */
export function shouldRunSetup() {
  // Run setup if config doesn't exist
  if (!existsSync(CONFIG_PATH)) {
    return true;
  }

  try {
    const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
    // Run setup if tunnel hasn't been configured
    if (!config.tunnel || !config.tunnel.mode) {
      return true;
    }
  } catch {
    return true;
  }

  return false;
}

/**
 * Checks if Copilot CLI is installed.
 * @returns {boolean}
 */
function isCopilotCliInstalled() {
  try {
    execSync('which copilot', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Runs the interactive setup wizard.
 * @returns {Promise<{ success: boolean, config: object }>}
 */
export async function runSetup() {
  const rl = createReadline();

  console.log('\n' + ui.colors.bold('╔════════════════════════════════════════════╗'));
  console.log(ui.colors.bold('║      Welcome to OpenTop Setup              ║'));
  console.log(ui.colors.bold('╚════════════════════════════════════════════╝\n'));

  const config = {
    port: 3000,
    tunnel: {
      mode: 'quick',
      domain: null,
      tunnelName: 'opentop',
    },
    auth: {
      cacheToken: true,
    },
  };

  try {
    // ─── Step 1: Check Node.js ─────────────────────────────────────────
    console.log(ui.header('Checking requirements'));

    const nodeVersion = parseInt(process.version.slice(1));
    if (nodeVersion >= 18) {
      console.log(ui.success(`Node.js ${process.version}`));
    } else {
      console.log(ui.error(`Node.js ${process.version} — version 18+ required`));
      rl.close();
      return { success: false, config };
    }

    // ─── Step 2: Check cloudflared ─────────────────────────────────────
    if (isCloudflaredInstalled()) {
      const version = getCloudflaredVersion();
      console.log(ui.success(`cloudflared ${version || 'installed'}`));
    } else {
      console.log(ui.cloudflaredInstallHelp());
      console.log(ui.warning('Install cloudflared and run opentop again.'));
      rl.close();
      return { success: false, config };
    }

    // ─── Step 3: Check GitHub authentication ───────────────────────────
    console.log(ui.header('GitHub Authentication'));

    if (hasToken()) {
      console.log(ui.success('GitHub token found'));
    } else {
      console.log(ui.warning('Not authenticated with GitHub'));

      if (isCopilotCliInstalled()) {
        const answer = await ask(rl, `\n  ${ui.prompt('Run copilot login now? (Y/n):')} `);
        if (answer.toLowerCase() !== 'n') {
          console.log(ui.action('Opening GitHub login...'));
          rl.close();

          // Run copilot login interactively
          const success = await new Promise((resolve) => {
            const child = spawn('copilot', ['login'], { stdio: 'inherit' });
            child.on('exit', (code) => resolve(code === 0));
            child.on('error', () => resolve(false));
          });

          if (!success) {
            console.log(ui.error('Login failed or was cancelled'));
            return { success: false, config };
          }

          console.log(ui.success('Authentication successful!'));
          return runSetup(); // Restart setup after login
        }
      } else {
        console.log(ui.error('Copilot CLI not installed'));
        console.log('');
        console.log('  Install it with:');
        console.log(ui.command('npm install -g @github/copilot'));
        console.log('');
        console.log('  Then run:');
        console.log(ui.command('copilot login'));
        console.log('');
        rl.close();
        return { success: false, config };
      }
    }

    // ─── Step 4: Tunnel Mode Selection ─────────────────────────────────
    console.log(ui.header('Connection Mode'));
    console.log('');
    console.log(ui.choice(1, 'Quick', 'No setup, URL changes each run', true));
    console.log(ui.choice(2, 'Persistent', 'Fixed URL, requires your domain'));
    console.log('');

    const modeAnswer = await ask(rl, `  ${ui.prompt('Select mode [1]:')} `);
    const mode = modeAnswer === '2' ? 'persistent' : 'quick';
    config.tunnel.mode = mode;

    // ─── Step 5: Persistent tunnel setup ───────────────────────────────
    if (mode === 'persistent') {
      console.log(ui.header('Persistent Tunnel Setup'));

      // Check Cloudflare login
      if (!isCloudflareLoggedIn()) {
        console.log(ui.warning('Not logged into Cloudflare'));
        const loginAnswer = await ask(rl, `\n  ${ui.prompt('Login to Cloudflare now? (Y/n):')} `);

        if (loginAnswer.toLowerCase() !== 'n') {
          console.log(ui.action('Opening Cloudflare login...'));
          rl.close();

          const success = await loginToCloudflare();
          if (!success) {
            console.log(ui.error('Cloudflare login failed'));
            return { success: false, config };
          }

          return runSetup(); // Restart setup after login
        } else {
          console.log(ui.warning('Falling back to Quick mode'));
          config.tunnel.mode = 'quick';
        }
      }

      if (config.tunnel.mode === 'persistent') {
        // Ask for domain
        console.log('');
        console.log('  Enter your domain (e.g., opentop.yourdomain.com)');
        console.log(ui.info('  Domain must be managed by Cloudflare'));
        console.log('');

        const domain = await ask(rl, `  ${ui.prompt('Domain:')} `);

        if (!domain || !domain.includes('.')) {
          console.log(ui.error('Invalid domain, falling back to Quick mode'));
          config.tunnel.mode = 'quick';
        } else {
          config.tunnel.domain = domain.trim().toLowerCase();

          // Create tunnel
          console.log(ui.loading('Creating tunnel...'));
          try {
            const tunnel = createTunnel(config.tunnel.tunnelName);
            if (tunnel) {
              console.log(ui.success(`Tunnel created: ${tunnel.name} (${tunnel.id.slice(0, 8)}...)`));

              // Route DNS
              console.log(ui.loading('Configuring DNS...'));
              const dnsOk = routeDNS(config.tunnel.tunnelName, config.tunnel.domain);
              if (dnsOk) {
                console.log(ui.success(`DNS routed: ${config.tunnel.domain}`));
              } else {
                console.log(ui.warning('DNS routing failed — you may need to configure manually'));
              }
            }
          } catch (err) {
            console.log(ui.error(`Tunnel setup failed: ${err.message}`));
            console.log(ui.warning('Falling back to Quick mode'));
            config.tunnel.mode = 'quick';
          }
        }
      }
    }

    // ─── Step 6: Save config ───────────────────────────────────────────
    console.log(ui.header('Saving configuration'));

    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }

    // Merge with existing config if present
    let existingConfig = {};
    if (existsSync(CONFIG_PATH)) {
      try {
        existingConfig = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
      } catch {
        // Ignore corrupt config
      }
    }

    const finalConfig = {
      ...existingConfig,
      ...config,
      tunnel: {
        ...existingConfig.tunnel,
        ...config.tunnel,
      },
    };

    writeFileSync(CONFIG_PATH, JSON.stringify(finalConfig, null, 2));
    console.log(ui.success(`Config saved to ${CONFIG_PATH}`));

    // ─── Done ──────────────────────────────────────────────────────────
    console.log('\n' + ui.colors.bold('╔════════════════════════════════════════════╗'));
    console.log(ui.colors.bold('║  Setup complete! 🎉                        ║'));
    console.log(ui.colors.bold('╚════════════════════════════════════════════╝\n'));

    if (config.tunnel.mode === 'quick') {
      console.log('  Your tunnel URL will change each time you start OpenTop.');
    } else {
      console.log(`  Your fixed URL: ${ui.colors.highlight(`https://${config.tunnel.domain}`)}`);
    }

    console.log('');
    rl.close();
    return { success: true, config: finalConfig };

  } catch (err) {
    rl.close();
    console.log(ui.error(`Setup failed: ${err.message}`));
    return { success: false, config };
  }
}

/**
 * Loads the saved config.
 * @returns {object | null}
 */
export function loadConfig() {
  if (!existsSync(CONFIG_PATH)) return null;
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    return null;
  }
}

export default {
  shouldRunSetup,
  runSetup,
  loadConfig,
};

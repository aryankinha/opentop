#!/usr/bin/env node
// src/cli/daemon-runner.js
// This script runs as a detached background process.
// It starts the server and tunnel, then reports ready status.

import { join } from 'node:path';
import { existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONFIG_DIR = join(homedir(), '.opentop');
const RUNTIME_DIR = join(CONFIG_DIR, 'runtime');
const LOG_FILE = join(RUNTIME_DIR, 'opentop.log');

// Ensure runtime dir exists
if (!existsSync(RUNTIME_DIR)) {
  mkdirSync(RUNTIME_DIR, { recursive: true });
}

// Log helper
function log(msg) {
  const timestamp = new Date().toISOString();
  appendFileSync(LOG_FILE, `[${timestamp}] ${msg}\n`);
}

// Parse arguments
const { values: flags } = parseArgs({
  options: {
    port: { type: 'string' },
    model: { type: 'string' },
    'no-tunnel': { type: 'boolean' },
    debug: { type: 'boolean' },
  },
  allowPositionals: true,
});

const port = parseInt(flags.port, 10) || 4000;
const model = flags.model;
const noTunnel = flags['no-tunnel'] || false;
const debug = flags.debug || false;

// Set debug env vars
if (debug) {
  process.env.LOG_LEVEL = 'debug';
  process.env.OPENTOP_DEBUG = 'true';
}

async function main() {
  log(`Daemon starting on port ${port} (debug=${debug})`);
  
  try {
    // Load auth token
    const { loadToken, hasToken } = await import('../auth/token.js');
    loadToken();
    
    if (!hasToken()) {
      log('ERROR: Not authenticated with GitHub');
      process.exit(1);
    }
    
    // Generate pairing token
    const { createPairingToken } = await import('../core/pairingToken.js');
    const pairing = createPairingToken();
    log(`Pairing PIN generated: ${pairing.pin}`);
    
    // Start server
    const serverPath = join(__dirname, '..', 'server.js');
    const { startServer } = await import(serverPath);
    
    const overrides = { port };
    if (model) overrides.model = model;
    if (debug) overrides.debug = true;
    
    await startServer(overrides);
    log(`Server started on port ${port}`);
    
    // Start tunnel (if not disabled)
    let tunnelUrl = null;
    
    if (!noTunnel) {
      try {
        const { startTunnel, getUrl } = await import('../tunnel/manager.js');
        const { loadConfig } = await import('./setup.js');
        
        const config = loadConfig() || {};
        const tunnelMode = config.tunnel?.mode || 'quick';
        const tunnelDomain = config.tunnel?.domain;
        
        const result = await startTunnel({
          mode: tunnelMode,
          port,
          domain: tunnelDomain,
          tunnelName: config.tunnel?.tunnelName || 'opentop',
          autoRestart: true,
        });
        
        tunnelUrl = result.url;
        log(`Tunnel started: ${tunnelUrl}`);
      } catch (err) {
        log(`Tunnel failed: ${err.message}`);
        // Continue without tunnel
      }
    }
    
    // Write PID file
    const { writeDaemonInfo } = await import('./daemon.js');
    writeDaemonInfo({
      serverPid: process.pid,
      port,
      tunnelUrl,
      pairingPin: pairing.pin,
      startedAt: new Date().toISOString(),
    });
    
    // Signal ready to parent process
    const readyInfo = JSON.stringify({
      port,
      url: tunnelUrl,
      pairingPin: pairing.pin,
    });
    console.log(`DAEMON_READY:${readyInfo}`);
    
    log('Daemon ready and running');
    
    // Handle shutdown signals
    const handleShutdown = async () => {
      log('Shutdown signal received');
      
      if (!noTunnel) {
        try {
          const { cleanup } = await import('../tunnel/manager.js');
          await cleanup();
        } catch {}
      }
      
      process.exit(0);
    };
    
    process.on('SIGTERM', handleShutdown);
    process.on('SIGINT', handleShutdown);
    
  } catch (err) {
    log(`ERROR: ${err.message}\n${err.stack}`);
    process.exit(1);
  }
}

main();

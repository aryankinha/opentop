#!/usr/bin/env node

// bin/opentop.js
// CLI entry point for OpenTop.
// Delegates to src/cli/index.js for all command handling.
//
// Usage: opentop [command] [options]
//
// NEW: Running `opentop` without arguments is now the primary flow.
// It automatically handles first-run setup and starts with tunnel.

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import and run the new CLI
const cliPath = join(__dirname, '..', 'src', 'cli', 'index.js');
const { main } = await import(cliPath);

// Run CLI with command line args
main(process.argv.slice(2));

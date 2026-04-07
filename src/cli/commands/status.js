// src/cli/commands/status.js
// Status command — shows daemon status, URL, and sessions.

import ui from '../ui.js';
import { getDaemonStatus } from '../daemon.js';

/**
 * Formats uptime in human readable format.
 * @param {number} seconds
 * @returns {string}
 */
function formatUptime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

/**
 * Main status command handler.
 */
export async function status() {
  console.log('');
  console.log(ui.header('OpenTop — Status'));

  const daemonStatus = getDaemonStatus();

  if (!daemonStatus) {
    console.log('');
    console.log(`  Status:   ${ui.colors.error('❌ Not running')}`);
    console.log('');
    console.log(`  Start with: ${ui.colors.command('opentop')}`);
    console.log('');
    process.exit(1);
  }

  // Try to get health info from running server
  try {
    const res = await fetch(`http://localhost:${daemonStatus.port}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    console.log('');
    console.log(`  Status:     ${ui.colors.success('✅ Running')}`);
    console.log(`  PID:        ${ui.colors.highlight(String(daemonStatus.pid))}`);
    console.log(`  Uptime:     ${formatUptime(data.uptime)}`);
    console.log(`  Sessions:   ${data.sessions} active`);
    console.log(`  Port:       ${daemonStatus.port}`);

    if (daemonStatus.url) {
      console.log(`  Tunnel:     ${ui.colors.highlight(daemonStatus.url)}`);
    } else {
      console.log(`  Tunnel:     ${ui.colors.warning('❌ Not active')}`);
    }

    if (daemonStatus.pairingPin) {
      console.log(`  PIN:        ${ui.colors.highlight(daemonStatus.pairingPin)}`);
    }

    console.log('');
    console.log(ui.divider(40));
    console.log('');
    console.log(`  Local:      ${ui.colors.highlight(`http://localhost:${daemonStatus.port}`)}`);
    if (daemonStatus.url) {
      console.log(`  Public:     ${ui.colors.highlight(daemonStatus.url)}`);
    }
    console.log('');

  } catch (err) {
    console.log('');
    console.log(`  Status:     ${ui.colors.warning('⚠️ Process running but server not responding')}`);
    console.log(`  PID:        ${daemonStatus.pid}`);
    console.log(`  Error:      ${ui.colors.error(err.message)}`);
    console.log('');
    console.log(`  Try: ${ui.colors.command('opentop stop && opentop')}`);
    console.log('');
    process.exit(1);
  }
}

export default { status };

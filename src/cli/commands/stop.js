// src/cli/commands/stop.js
// Stop command — stops running daemon.

import ui from '../ui.js';
import { stopDaemon, getDaemonStatus } from '../daemon.js';

/**
 * Main stop command handler.
 */
export async function stop() {
  console.log('');
  console.log(ui.header('OpenTop — Stop'));

  const status = getDaemonStatus();

  if (!status) {
    console.log('');
    console.log(ui.error('OpenTop is not running'));
    console.log('');
    process.exit(1);
  }

  console.log('');
  console.log(ui.info(`Stopping server (PID ${status.pid})...`));

  const result = stopDaemon();

  if (result.success) {
    console.log(ui.success('OpenTop stopped'));
  } else {
    console.log(ui.error(result.error));
    process.exit(1);
  }

  console.log('');
}

export default { stop };

// src/cli/ui.js
// Chalk-based UI helpers for styled CLI output.
// Provides colors, boxes, and command highlighting.

import chalk from 'chalk';

// ─── Color Palette ──────────────────────────────────────────────────

export const colors = {
  error: chalk.red,
  success: chalk.green,
  warning: chalk.yellow,
  info: chalk.dim,
  action: chalk.cyan,
  highlight: chalk.yellow.bold,
  command: chalk.cyan.bold,
  muted: chalk.gray,
  bold: chalk.bold,
};

// ─── Symbols ────────────────────────────────────────────────────────

export const symbols = {
  success: colors.success('✓'),
  error: colors.error('✗'),
  warning: colors.warning('⚠'),
  info: colors.info('ℹ'),
  arrow: colors.action('→'),
  rocket: '🚀',
  lock: '🔐',
  link: '🔗',
  phone: '📱',
  spinner: '⏳',
};

// ─── Box Drawing ────────────────────────────────────────────────────

const BOX_WIDTH = 50;

/**
 * Creates a styled box with title and content.
 * @param {string} title - Box title
 * @param {Array<{label: string, value: string}>} items - Key-value pairs to display
 * @returns {string} Formatted box string
 */
export function box(title, items = []) {
  const lines = [];
  const innerWidth = BOX_WIDTH - 2;

  // Top border
  lines.push(colors.muted('╔' + '═'.repeat(innerWidth) + '╗'));

  // Title
  const titleText = `   ${title}`;
  const titlePadded = titleText.padEnd(innerWidth);
  lines.push(colors.muted('║') + colors.bold(titlePadded) + colors.muted('║'));

  // Separator
  if (items.length > 0) {
    lines.push(colors.muted('╠' + '═'.repeat(innerWidth) + '╣'));
  }

  // Items
  for (const item of items) {
    const label = `   ${item.label}:  `;
    const value = item.value;
    const content = label + colors.highlight(value);
    // Need to account for ANSI codes when padding
    const visibleLength = label.length + value.length;
    const padding = Math.max(0, innerWidth - visibleLength);
    lines.push(colors.muted('║') + content + ' '.repeat(padding) + colors.muted('║'));
  }

  // Bottom border
  lines.push(colors.muted('╚' + '═'.repeat(innerWidth) + '╝'));

  return lines.join('\n');
}

/**
 * Creates a simple horizontal divider.
 * @param {number} width - Width of divider
 * @returns {string}
 */
export function divider(width = 48) {
  return colors.muted('─'.repeat(width));
}

// ─── Command Highlighting ───────────────────────────────────────────

/**
 * Formats a command for display with highlighting.
 * @param {string} cmd - Command to highlight
 * @returns {string}
 */
export function command(cmd) {
  return `  ${colors.muted('$')} ${colors.command(cmd)}`;
}

/**
 * Shows an action with an arrow prefix.
 * @param {string} text - Action text
 * @returns {string}
 */
export function action(text) {
  return `  ${symbols.arrow} ${colors.action(text)}`;
}

// ─── Status Messages ────────────────────────────────────────────────

/**
 * Success message with checkmark.
 * @param {string} text
 * @returns {string}
 */
export function success(text) {
  return `  ${symbols.success} ${text}`;
}

/**
 * Error message with X.
 * @param {string} text
 * @returns {string}
 */
export function error(text) {
  return `  ${symbols.error} ${colors.error(text)}`;
}

/**
 * Warning message.
 * @param {string} text
 * @returns {string}
 */
export function warning(text) {
  return `  ${symbols.warning} ${colors.warning(text)}`;
}

/**
 * Info message.
 * @param {string} text
 * @returns {string}
 */
export function info(text) {
  return `  ${symbols.info} ${colors.info(text)}`;
}

// ─── Banners & Headers ──────────────────────────────────────────────

/**
 * Creates the OpenTop startup banner.
 * @param {string} version
 * @returns {string}
 */
export function banner(version) {
  const lines = [
    '',
    colors.muted('  ╔════════════════════════════════════════════╗'),
    colors.muted('  ║') + colors.bold('     OpenTop Agent Server') + colors.muted('  v' + version + '        ║'),
    colors.muted('  ╚════════════════════════════════════════════╝'),
    '',
  ];
  return lines.join('\n');
}

/**
 * Creates a section header.
 * @param {string} title
 * @returns {string}
 */
export function header(title) {
  return `\n  ${colors.bold(title)}\n  ${colors.muted('─'.repeat(title.length + 2))}`;
}

// ─── Running Status Box ─────────────────────────────────────────────

/**
 * Creates the "OpenTop is running" display box.
 * @param {object} opts
 * @param {string} opts.url - Public URL
 * @param {string} opts.pin - Pairing PIN
 * @param {number} [opts.port] - Local port
 * @returns {string}
 */
export function runningBox({ url, pin, port }) {
  const items = [
    { label: 'URL', value: url },
    { label: 'Pairing Code', value: pin },
  ];
  if (port) {
    items.push({ label: 'Local', value: `http://localhost:${port}` });
  }
  return box('OpenTop is running ' + symbols.rocket, items);
}

// ─── Install Commands by OS ─────────────────────────────────────────

/**
 * Returns OS-specific install commands for cloudflared.
 * @returns {object} Commands for different OSes
 */
export function getCloudflaredInstallCommands() {
  return {
    darwin: {
      name: 'macOS (Homebrew)',
      command: 'brew install cloudflared',
    },
    linux: {
      name: 'Linux',
      commands: [
        'curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared',
        'chmod +x cloudflared',
        'sudo mv cloudflared /usr/local/bin/',
      ],
    },
    win32: {
      name: 'Windows',
      command: 'winget install Cloudflare.cloudflared',
    },
  };
}

/**
 * Displays cloudflared installation instructions for current OS.
 * @returns {string}
 */
export function cloudflaredInstallHelp() {
  const os = process.platform;
  const commands = getCloudflaredInstallCommands();

  const lines = [
    '',
    error('cloudflared is not installed'),
    '',
    `  ${colors.bold('Install it with:')}`,
    '',
  ];

  if (os === 'darwin') {
    lines.push(command(commands.darwin.command));
  } else if (os === 'linux') {
    for (const cmd of commands.linux.commands) {
      lines.push(command(cmd));
    }
  } else if (os === 'win32') {
    lines.push(command(commands.win32.command));
  } else {
    lines.push(`  Visit: ${colors.highlight('https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/')}`);
  }

  lines.push('');
  lines.push(`  ${colors.muted('Then run:')} ${colors.command('opentop')}`);
  lines.push('');

  return lines.join('\n');
}

// ─── Prompt Styling ─────────────────────────────────────────────────

/**
 * Formats a question prompt.
 * @param {string} question
 * @returns {string}
 */
export function prompt(question) {
  return colors.bold(question);
}

/**
 * Formats a choice option.
 * @param {number} num - Option number
 * @param {string} label - Option label
 * @param {string} [desc] - Optional description
 * @param {boolean} [isDefault] - Whether this is the default
 * @returns {string}
 */
export function choice(num, label, desc, isDefault = false) {
  const marker = isDefault ? colors.success(`[${num}]`) : colors.muted(`[${num}]`);
  const labelText = isDefault ? colors.bold(label) : label;
  const descText = desc ? colors.muted(` - ${desc}`) : '';
  const defaultTag = isDefault ? colors.success(' (default)') : '';
  return `  ${marker} ${labelText}${defaultTag}${descText}`;
}

// ─── Spinners (simple) ──────────────────────────────────────────────

/**
 * Shows a loading message.
 * @param {string} text
 * @returns {string}
 */
export function loading(text) {
  return `  ${symbols.spinner} ${colors.action(text)}`;
}

export default {
  colors,
  symbols,
  box,
  divider,
  command,
  action,
  success,
  error,
  warning,
  info,
  banner,
  header,
  runningBox,
  cloudflaredInstallHelp,
  getCloudflaredInstallCommands,
  prompt,
  choice,
  loading,
};

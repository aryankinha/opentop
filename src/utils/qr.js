// src/utils/qr.js
// Prints a QR code to the terminal for easy mobile access.

import qrcode from 'qrcode-terminal';

export function printQR(url) {
  console.log('\n  Scan to open OpenTop on your phone:\n');
  qrcode.generate(url, { small: true }, (qr) => {
    const lines = qr.split('\n');
    lines.forEach(line => console.log('  ' + line));
  });
  console.log(`\n  URL: ${url}\n`);
}

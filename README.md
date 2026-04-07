# OpenTop

Self-hosted AI agent backend powered by GitHub Copilot SDK.
Control your desktop AI agent from any device.

## Install

```bash
npm install -g opentop
```

## Quick Start

1. **Check requirements:**

   ```bash
   opentop doctor
   ```

2. **Authenticate with GitHub:**

   ```bash
   opentop auth
   ```

3. **Start the server with public access:**

   ```bash
   opentop start --tunnel
   ```

4. **Scan the QR code** from your phone or visit the printed URL.

## CLI Commands

```
opentop start              Start the server
opentop start --tunnel     Start with Cloudflare tunnel + QR code
opentop start --port 4000  Use a custom port
opentop stop               Stop the running server
opentop status             Check server status, URL, sessions
opentop doctor             Diagnose system requirements
opentop setup              Interactive setup wizard
opentop auth               Authenticate with GitHub Copilot
opentop config             Show current configuration
opentop reset              Delete all config and stop processes
opentop help               Show help
```

## Security

When starting with `--tunnel`, a **6-digit pairing PIN** is generated. 
The PWA must provide this PIN to connect. This ensures only you can access your agent.

## Requirements

- **Node.js 18+**
- **GitHub Copilot subscription**
- **cloudflared** (for `--tunnel`): `brew install cloudflared`

## Mobile App (PWA)

After running `opentop start --tunnel`, scan the QR code to open the PWA.
The PWA connects directly to your Mac — no cloud required.

## Configuration

Config file: `~/.opentop/config.json`

```json
{
  "port": 3000,
  "defaultModel": "claude-sonnet-4.5",
  "maxContextTokens": 8000,
  "keepRecentMessages": 10
}
```

## API

| Method   | Endpoint                 | Description            |
| -------- | -----------------------  | ---------------------- |
| `POST`   | `/session`               | Create a session       |
| `POST`   | `/session/:id/chat`      | Send a message         |
| `GET`    | `/session/:id/messages`  | Get message history    |
| `GET`    | `/sessions`              | List all sessions      |
| `DELETE` | `/session/:id`           | Delete a session       |
| `GET`    | `/health`                | Server health          |

All endpoints except `/health` require `Authorization: Bearer <PIN>`.

## License

MIT

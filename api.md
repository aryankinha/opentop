# OpenTop API Reference

This file documents all server APIs currently exposed by OpenTop, what each endpoint does, and how the frontend uses each one.

## Base URL and Auth

- Base URL (frontend): `window.location.origin` (set in `web/src/lib/api.js`)
- API auth: Pairing token is sent as `Authorization: Bearer <pin-or-token>` for all API requests except `GET /health`
- Auth middleware: `src/core/pairingToken.js` (`pairingAuthMiddleware`)
- Static files are public; protected API routes are mainly paths starting with:
  - `/session`
  - `/sessions`
  - `/chat`
  - `/api`

## Backend Endpoint Inventory

All routes below are defined in:
- `src/server.js` (`/health`, websocket server)
- `src/routes/chat.js` (all REST routes mounted via `app.use(createChatRouter(...))`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Health/status of backend instance (includes session count, uptime, pid, port, storage dir). |
| POST | `/session` | Create a new chat session (optionally with `model` and `project`). |
| GET | `/sessions` | List all sessions. |
| GET | `/session/:id` | Get one session (metadata + messages, excluding non-serializable SDK session object). |
| PATCH | `/session/:id/title` | Manually update a session title. |
| DELETE | `/session/:id` | Delete/close a session. |
| POST | `/session/:id/chat` | Send a user message and get assistant response (main chat endpoint). |
| POST | `/session/:id/chat/cancel` | Cancel an in-flight chat turn for a session. |
| GET | `/session/:id/messages` | Fetch messages for a session. |
| GET | `/session/:id/memory` | Inspect session memory/compaction status. |
| POST | `/session/:id/compact` | Force session memory compaction. |
| GET | `/memory` | Read global memory content. |
| POST | `/memory` | Overwrite global memory content. |
| POST | `/memory/append` | Append a fact to global memory. |
| DELETE | `/memory` | Clear global memory. |
| GET | `/memory/system` | Read structured `system.md` memory file. |
| GET | `/memory/projects` | Read structured `projects.md` memory file. |
| GET | `/memory/chats` | Read last 50 lines of structured `chats.md`. |
| GET | `/memory/all` | Read combined structured memory (`system`, `projects`, `chats`, `index`). |
| POST | `/memory/system` | Overwrite structured `system.md`. |
| POST | `/memory/projects` | Overwrite structured `projects.md`. |
| POST | `/memory/learn` | Append a fact to memory by category (`system`, `projects`, `general`). |
| GET | `/usage` | Fetch Copilot quota/usage data. |
| GET | `/usage/history` | Fetch daily usage history (query `days`). |
| GET | `/usage/session/:id` | Fetch usage metrics for one session. |
| GET | `/user` | Fetch user/profile context (display name, username, greeting, project context). |
| PATCH | `/user` | Update user display name. |
| GET | `/settings/permissions` | Fetch tool permission policy. |
| PATCH | `/settings/permissions` | Update auto-approve tool kinds. |
| GET | `/projects` | List persisted custom projects. |
| POST | `/projects/custom` | Add a custom project path. |
| POST | `/projects/pick-folder` | Open native macOS folder picker and add selected folder as project. |

## Frontend API Client Mapping

Frontend REST wrapper is `web/src/lib/api.js` (`ApiClient`).

| Frontend Method | Backend Endpoint | Used In Frontend |
|---|---|---|
| `getHealth()` | `GET /health` | `web/src/context/AppContext.jsx` (connection check). |
| `createSessionWithProject(model, project)` | `POST /session` | `web/src/context/AppContext.jsx` (new session creation, model/project-specific sessions). |
| `createSession(model)` | `POST /session` | Exposed wrapper; mainly via hook utility (`useApi`). |
| `getSessions()` | `GET /sessions` | `web/src/context/AppContext.jsx` (session list refresh, startup sync). |
| `getSession(sessionId)` | `GET /session/:id` | Exposed; available via `useApi` hook, not primary path in current chat flow. |
| `updateSessionTitle(sessionId, title)` | `PATCH /session/:id/title` | `web/src/context/AppContext.jsx`, triggered from `web/src/components/SessionItem.jsx`. |
| `deleteSession(sessionId)` | `DELETE /session/:id` | `web/src/context/AppContext.jsx`, triggered from `web/src/components/SessionItem.jsx`. |
| `sendMessage(sessionId, message, { model, signal })` | `POST /session/:id/chat` | `web/src/context/AppContext.jsx` send flow (chat + model selection). |
| `cancelSessionTurn(sessionId)` | `POST /session/:id/chat/cancel` | `web/src/context/AppContext.jsx` cancel flow. |
| `getMessages(sessionId)` | `GET /session/:id/messages` | `web/src/context/AppContext.jsx` (load current conversation). |
| `getSessionMemory(sessionId)` | `GET /session/:id/memory` | Exposed in client; not currently used by main screens. |
| `compactSession(sessionId)` | `POST /session/:id/compact` | Exposed in client; not currently used by main screens. |
| `getGlobalMemory()` | `GET /memory` | `web/src/components/Settings/MemorySettings.jsx`. |
| `saveGlobalMemory(content)` | `POST /memory` | `web/src/components/Settings/MemorySettings.jsx`. |
| `appendGlobalMemory(fact)` | `POST /memory/append` | Exposed; not currently used by main screens. |
| `clearGlobalMemory()` | `DELETE /memory` | `web/src/components/Settings/MemorySettings.jsx`. |
| `getUsage()` | `GET /usage` | `web/src/components/SystemStatus.jsx`, `web/src/components/Layout/Header.jsx`, `web/src/components/Layout/UsageDisplay.jsx`. |
| `getUsageHistory(days)` | `GET /usage/history` | Exposed; not currently used by main screens. |
| `getSessionUsage(sessionId)` | `GET /usage/session/:id` | Exposed; not currently used by main screens. |
| `getUser()` | `GET /user` | `web/src/context/AppContext.jsx`, `web/src/components/Chat/WelcomeScreen.jsx`. |
| `updateUser(updates)` | `PATCH /user` | `web/src/context/AppContext.jsx` (`updateDisplayName`). |
| `getPermissionSettings()` | `GET /settings/permissions` | `web/src/App.jsx`, `web/src/components/Settings/PermissionSettings.jsx`. |
| `updatePermissionSettings(autoApproveTools)` | `PATCH /settings/permissions` | `web/src/App.jsx`, `web/src/components/Settings/PermissionSettings.jsx`. |
| `getProjects()` | `GET /projects` | `web/src/App.jsx` (project list fetch). |
| `addCustomProject(path, name)` | `POST /projects/custom` | `web/src/components/Sidebar.jsx` (add project path). |
| `pickProjectFolder()` | `POST /projects/pick-folder` | `web/src/components/Sidebar.jsx` (native macOS picker). |

## WebSocket API (Realtime Permissions)

WebSocket server is in `src/server.js` (`ws` package).  
Frontend client is `web/src/lib/websocket.js`.

### Client -> Server messages

| Type | Payload | Purpose |
|---|---|---|
| `subscribe` | `{ type: "subscribe", sessionId }` | Subscribe to permission requests for a session. |
| `permission_response` | `{ type: "permission_response", id, approved }` | Approve/deny a pending tool permission request. |

### Server -> Client messages

| Type | Payload | Purpose |
|---|---|---|
| `subscribed` | `{ type: "subscribed", sessionId }` | Acknowledge subscription. |
| `permission_request` | Permission request object | Ask UI for approval/denial. |
| `permission_acknowledged` | `{ type: "permission_acknowledged", id }` | Confirm permission response was received. |
| `error` | `{ type: "error", message }` | Report websocket-side errors. |

### Frontend websocket usage

- `web/src/context/AppContext.jsx`
  - `ws.setUrl(...)`
  - `ws.connect(sessionId)`
  - listeners: `connection`, `permission_request`, `permission_acknowledged`
  - send decisions: `ws.sendPermissionResponse(id, approved)`
- `web/src/hooks/useWebSocket.js`
  - Alternative hook abstraction for same events/actions.

## Notes

- Project APIs:
  - `/projects` returns persisted **custom projects** (not full filesystem scan).
  - `/projects/pick-folder` works only on macOS (`osascript` picker).
- Memory APIs:
  - Settings UI currently uses only global memory endpoints (`/memory` GET/POST/DELETE).
  - Structured memory endpoints (`/memory/system`, `/memory/projects`, etc.) are currently backend-exposed but not primary in current frontend flow.

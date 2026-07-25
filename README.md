# ChatApp — Real-time chat (React + Node + Socket.IO + MongoDB)

A small but real-time chat app with multiple rooms, JWT auth, end-to-end encryption, and persisted message history.

## Structure
- `server/` — Node + Express + Socket.IO + Mongoose + Redis
- `client/` — React (Vite) + socket.io-client

## Prerequisites
- **Node.js 18+**
- **MongoDB** running locally on `mongodb://127.0.0.1:27017` (or any URI you set in `MONGODB_URI`)
- **Redis** running locally on `redis://127.0.0.1:6379` (or any URI you set in `REDIS_URL`)

## Run the server
```bash
cd server
cp .env.example .env       # then edit MONGODB_URI / JWT_SECRET / REDIS_URL if needed
npm install
npm run dev                # starts on http://localhost:4000
```

## Run the client
In a second terminal:
```bash
cd client
npm install
npm run dev                # opens http://localhost:5173
```

## Try it out
1. Open `http://localhost:5173` in one browser window → register a user (e.g. `alice`).
2. Open `http://localhost:5173` in a second window (incognito works) → register `bob`.
3. In either window, type a room name in the sidebar (e.g. `general`) and press `+`.
4. Both windows see `# general` in the list. Click it.
5. Type messages — they appear in real time in both windows. Messages persist in MongoDB; refresh to load history.

## API surface
- `POST /api/auth/register` `{ username, email, password }` → `{ accessToken, refreshToken, user }`
- `POST /api/auth/login` `{ identifier, password }` → `{ accessToken, refreshToken, user }` (`identifier` = email or username)
- `POST /api/auth/refresh` `{ refreshToken }` → `{ accessToken, refreshToken }` (family-based rotation with reuse detection)
- `POST /api/auth/logout` `{ refreshToken }` → `{ ok }`
- `GET  /api/auth/me` (Bearer token) → `{ user }`
- `GET  /api/rooms` (Bearer token) → `{ rooms, memberships, pending }`
- `POST /api/rooms` `{ name, type?, encryptedKeys? }` (Bearer token) → `{ room }`
- `GET  /api/rooms/:id/messages?after=&limit=` (Bearer token) → `{ messages }`
- `POST /api/rooms/backfill` `{ rooms: [{ roomId, after }] }` (Bearer token) → `{ backfill }` (batched, max 20)
- `POST /api/rooms/:id/members/:userId/kick` `{ ban? }` (moderator+) → `{ ok }`
- `POST /api/rooms/:id/ban/:userId` (moderator+) → `{ ok }`
- `POST /api/rooms/:id/unban/:userId` (moderator+) → `{ ok }`
- `GET  /api/rooms/:id/banned` (moderator+) → `{ banned }`

## Socket.IO events
Client → server:
- `room:join` `{ roomId }`
- `room:leave` `{ roomId }`
- `message:send` `{ roomId, text, clientMsgId? }`
- `message:thread-reply` `{ roomId, parentMessageId, text, clientMsgId? }`
- `message:read` `{ roomId, lastReadMessageId }`
- `user:typing` `{ roomId }`
- `room:kick` `{ roomId, userId, ban? }`
- `room:key-request` / `room:key-share` / `room:key-store` (E2EE key exchange)

Server → client:
- `message:new` `{ roomId, message }`
- `message:thread-reply` `{ roomId, parentMessageId, reply }`
- `room:online` `{ roomId, online, members }`
- `room:user-joined` / `room:user-left` / `room:user-kicked`
- `room:kicked` (sent only to the kicked user's sockets in that room)
- `presence:update` `{ userId, status, currentRoom }`
- `user:typing` / `user:stopped-typing`
- `error` `{ message }`

## Testing
```bash
cd server
npm test
```
Runs integration tests using Jest + mongodb-memory-server (no external services needed).

## Architecture decisions

### Auth & sessions
- JWT access tokens (15 min) + UUID refresh tokens with family-based rotation.
- Refresh token reuse detection: if a revoked token is presented, all tokens in that family are immediately revoked.
- Hard logout clears all tokens and force-disconnects all sockets via a DOM event to avoid circular imports.

### Presence
- Redis-backed with per-socket TTL heartbeat keys (`presence:heartbeat:<userId>:<socketId>`, 60s TTL).
- Atomic connection counter per user; user is online only while counter > 0.
- `reconcilePresence()` runs every 90s using SCAN (not KEYS) to mark stale users offline.

### Messages & backfill
- Reconnect backfill uses a batched `POST /backfill` endpoint (max 20 rooms) with per-room auth checks.
- `clientMsgId` (UUID) prevents duplicate messages across reconnections; enforced by a sparse unique index and a belt-and-suspenders app-level check.
- `GET /:roomId/messages?after=<objectId>` uses `_id >` ordering, not timestamp ordering.

### Moderation
- Kick/ban operate at the room level (`s.leave(roomId)`), not the socket level — a user kicked from one room stays connected to others.
- Banned users are force-disconnected from the room's Socket.IO room on both socket events and REST endpoints.
- Ban list persisted on the Room model; checked on join and message send.

### E2EE
- RSA-OAEP key pairs generated per user in the browser; public keys stored in the handshake.
- AES-GCM room keys encrypted per-member and stored on the Room model.
- Key exchange happens via Socket.IO events when a new user joins a private room.

## Known limitations

1. **E2EE key rotation on member removal.** When a user is kicked or banned, their encrypted copy of the room key is removed, but the room key itself is not rotated. Remaining members can still decrypt old messages with the existing key. A full fix would require re-keying: generate a new AES-GCM key, encrypt it for every remaining member, and re-encrypt any stored data. This is a non-trivial protocol that would need all online members to participate in a key exchange round.

2. **No multi-device key recovery.** Each device generates its own RSA key pair. If a user logs in from a new device, they cannot decrypt messages from before they received the room key on that device. There is no key escrow, backup, or cross-device sync mechanism. This is a deliberate tradeoff — key recovery systems (e.g. key escrow servers, social recovery) add significant complexity and attack surface. In the current design, a user must be online when the room key is shared to receive it.

3. **Single Redis instance.** The Redis adapter for Socket.IO assumes a single Redis server. For horizontal scaling behind a load balancer, this would need to be replaced with Redis Cluster or a pub/sub adapter that supports multi-node topologies.

4. **No rate limiting on socket reconnect.** While message sending is rate-limited, rapid reconnection loops (e.g. from a misbehaving client) are not throttled and could cause presence churn in Redis.

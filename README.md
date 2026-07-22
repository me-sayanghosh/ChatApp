# ChatApp — Real-time chat (React + Node + Socket.IO + MongoDB)

A small but real-time chat app with multiple rooms, JWT auth, and persisted message history.

## Structure
- `server/` — Node + Express + Socket.IO + Mongoose
- `client/` — React (Vite) + socket.io-client

## Prerequisites
- **Node.js 18+**
- **MongoDB** running locally on `mongodb://127.0.0.1:27017` (or any URI you set in `MONGODB_URI`)

## Run the server
```bash
cd server
cp .env.example .env       # then edit MONGODB_URI / JWT_SECRET if needed
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
- `POST /api/auth/register` `{ username, email, password }` → `{ token, user }`
- `POST /api/auth/login` `{ identifier, password }` → `{ token, user }` (`identifier` = email or username)
- `GET  /api/auth/me` (Bearer token)
- `GET  /api/rooms` (Bearer token) → `{ rooms: [...] }`
- `POST /api/rooms` `{ name }` (Bearer token) → `{ room }` (idempotent on name)
- `GET  /api/rooms/:id/messages` (Bearer token) → last 100 messages

## Socket.IO events
Client → server:
- `room:join` `{ roomId }`
- `room:leave` `{ roomId }`
- `message:send` `{ roomId, text }`

Server → client:
- `message:new` `{ roomId, message }`
- `room:online` `{ roomId, online: [{id, username}, ...] }`
- `room:user-joined` / `room:user-left`
- `error` `{ message }`

The client connects with the JWT in `auth.token` (`socket.io-client` handshake).

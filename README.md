# DropTalk / ChatApp — Real-time Encrypted Chat

A feature-based modular real-time chat application built with **React (Vite)**, **Node.js (Express)**, **Socket.IO**, **MongoDB**, and **Redis**.

Featuring **End-to-End Encryption (E2EE)**, **AI-powered Summaries & Suggestions**, **Threaded Replies**, **Real-Time Presence Map**, **Role-Based Moderation**, and **Offline Queueing**.

---

## 📁 Architecture & File Structure

Both the backend (`server/src`) and frontend (`client/src`) are organized using a **Feature-Based Modular Architecture** where code is grouped by domain feature alongside a `shared/` core layer for cross-cutting infrastructure, utilities, and UI primitives.

```
c:\ChatApp/
├── server/
│   ├── src/
│   │   ├── index.js                  # Main server entry point
│   │   ├── shared/                   # Cross-cutting backend infrastructure
│   │   │   ├── config/               # DB & Redis connection pools (db.js, redis.js)
│   │   │   ├── middleware/           # Core middlewares (auth.js, rateLimit.js, roles.js)
│   │   │   ├── socket/               # Socket.IO initialization & adapter (index.js)
│   │   │   └── utils/                # Helpers & constants (constants.js, errors.js)
│   │   └── features/                 # Domain feature modules
│   │       ├── auth/                 # User authentication (user.model.js, auth.routes.js)
│   │       ├── rooms/                # Room lifecycle & state (room.model.js, rooms.routes.js, rooms.socket.js)
│   │       ├── messages/             # Messaging, backfill & threads (message.model.js, messages.routes.js, messages.socket.js, threads.routes.js, readReceipts.service.js)
│   │       ├── presence/             # Redis presence & heartbeat (presence.service.js, presence.socket.js)
│   │       ├── keys/                 # E2EE key distribution (keys.routes.js, keys.socket.js)
│   │       ├── ai/                   # Gemini AI summaries & suggestions (ai.routes.js)
│   │       └── moderation/           # Kick, ban, mute & role elevation (moderation.routes.js)
│   └── tests/                        # Integration test suite (Jest + mongodb-memory-server)
│
└── client/
    ├── src/
    │   ├── main.jsx                  # React entry point
    │   ├── App.jsx                   # Main router setup
    │   ├── styles.css                # Custom glassmorphism & dark theme styles
    │   ├── shared/                   # Cross-cutting frontend infrastructure
    │   │   ├── components/ui/        # Reusable UI primitives (Stepper, AnimatedList)
    │   │   ├── context/              # Application AuthContext
    │   │   └── utils/                # API client, WebSockets & E2EE Crypto (api.js, socket.js, crypto.js)
    │   └── features/                 # Domain feature modules
    │       ├── auth/                 # Auth pages (Login.jsx, Register.jsx, SetUsername.jsx)
    │       ├── home/                 # Landing page & hero animations (Home.jsx, Aurora, ScrollFloat)
    │       ├── profile/              # User profile settings (Profile.jsx)
    │       └── chat/                 # Chat interface (Chat.jsx, useChat.js, Channels, MemberList, MessageList, MessageInput, ThreadPanel, AIPanel, PendingRequests, PresenceMap)
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+**
- **MongoDB** running on `mongodb://127.0.0.1:27017` (or set `MONGODB_URI`)
- **Redis** running on `redis://127.0.0.1:6379` (or set `REDIS_URL`)

### 1. Run the Server

```bash
cd server
cp .env.example .env       # Edit MONGODB_URI / JWT_SECRET / REDIS_URL / GEMINI_API_KEY if needed
npm install
npm run dev                # Runs on http://localhost:4000
```

### 2. Run the Client

```bash
cd client
npm install
npm run dev                # Runs on http://localhost:5173
```

---

## ✨ Features

- **🔐 End-to-End Encryption (E2EE)**: RSA-OAEP key exchange + AES-GCM encryption for private rooms. Messages stay encrypted before leaving the client browser.
- **⚡ Real-Time WebSockets**: Instant message delivery powered by Socket.IO with a Redis adapter for multi-tab synchronization.
- **🤖 Gemini AI Integration**: One-click chat summarization and smart inline autocomplete reply suggestions.
- **💬 Threaded Replies**: Side-panel thread discussions for any message.
- **👥 Real-Time Presence & Typing**: Dynamic user presence maps, heartbeat tracking, and live typing indicators.
- **🛡️ Role-Based Moderation**: Owner & Moderator roles supporting kick, room bans, muting members, and role assignment.
- **🔄 Offline Queueing & Backfill**: Seamless offline message queueing with automatic backfill on reconnect.

---

## 📡 API Reference

### Auth
- `POST /api/auth/register` — `{ username?, name?, email, password }` → `{ accessToken, refreshToken, user }`
- `POST /api/auth/login` — `{ identifier, password }` → `{ accessToken, refreshToken, user }`
- `POST /api/auth/refresh` — `{ refreshToken }` → `{ accessToken, refreshToken }`
- `POST /api/auth/logout` — (Bearer token) `{ refreshToken }` → `{ ok }`
- `GET /api/auth/me` — (Bearer token) → `{ user }`
- `GET /api/auth/check-username/:username` — (Bearer token) → `{ available }`
- `PUT /api/auth/profile` — (Bearer token) `{ name?, username?, profileImage? }` → `{ user }`

### Rooms & Messages
- `GET /api/rooms` — `{ rooms, memberships, pending }`
- `POST /api/rooms` — `{ name, type, inactivityMinutes? }`
- `GET /api/rooms/:roomId/messages?after=&limit=` — `{ messages }`
- `POST /api/rooms/backfill` — `{ rooms: [{ roomId, after }] }`
- `POST /api/rooms/:roomId/request-join` — Submit join request for private room
- `GET /api/rooms/:roomId/pending-requests` — View pending join requests

### Moderation & AI
- `POST /api/rooms/:roomId/members/:userId/kick` — Kick/Ban member
- `POST /api/rooms/:roomId/members/:userId/mute` — Toggle mute
- `POST /api/rooms/:roomId/summarize` — AI-generated chat summary
- `POST /api/rooms/:roomId/suggest` — AI reply suggestions

---

## 🔌 Socket.IO Events

### Client → Server
- `room:join` / `room:leave` — Join or leave a room channel
- `message:send` — Send room message
- `message:thread-reply` — Send thread reply
- `message:react` — Toggle emoji reaction
- `user:typing` / `user:stopped-typing` — Live typing notifications
- `room:key-request` / `room:key-share` / `room:key-store` — E2EE key distribution

### Server → Client
- `message:new` — Broadcast new room message
- `message:thread-reply` — Broadcast new thread reply
- `message:reaction` — Broadcast reaction updates
- `presence:update` — User status changes (`online`/`offline`)
- `room:online` — Online members count and user list
- `room:user-kicked` / `room:kicked` — Kicked/banned notifications

---

## 🧪 Testing

Run backend unit & integration tests using Jest:

```bash
cd server
npm test
```

Includes in-memory MongoDB testing (`mongodb-memory-server`) covering authentication, backfill logic, and role-based kick/ban moderation workflows.

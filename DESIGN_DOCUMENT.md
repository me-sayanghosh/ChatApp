# DropTalk / ChatApp — System Architecture & Design Document

**Document Status:** Approved & Implemented  
**Version:** 1.0.0  
**Target Environment:** Node.js (v18+), React (v18+ / Vite), MongoDB, Redis, WebRTC, Socket.IO, Google Gemini API  

---

## 1. Executive Overview

**DropTalk (ChatApp)** is a high-performance, real-time, privacy-first messaging and collaboration platform. It is engineered with a **Feature-Based Modular Architecture** on both the frontend and backend to support enterprise scalability, zero-trust security (via End-to-End Encryption), and intelligent workspace assistance (via Google Gemini AI).

### Core Pillars
1. **Zero-Trust Security**: Client-side End-to-End Encryption (E2EE) using RSA-OAEP 2048-bit key exchange and AES-GCM 256-bit payload encryption.
2. **Sub-Millisecond Synchronization**: Event-driven WebSockets with Socket.IO backed by Redis Pub/Sub adapter for multi-node horizontal scaling.
3. **AI Workspace Copilot**: Direct integration with Google Gemini AI for real-time conversation summarization and contextual smart reply generation.
4. **Rich Communication Suite**: Public/Private channels, Direct Messages (DMs), Threaded discussions, WebRTC Voice & Video calling, and interactive presence heatmaps.
5. **Resilient Offline Architecture**: Client-side IndexedDB/LocalStorage queueing with state backfill upon reconnection.

---

## 2. High-Level System Architecture

```
                               ┌──────────────────────────────────────────────┐
                               │           React (Vite) Frontend              │
                               │  - State & AuthContext   - Glassmorphic UI   │
                               │  - E2EE Crypto Engine    - WebRTC Client     │
                               └──────────────────────┬───────────────────────┘
                                                      │
                                    HTTP Rest / WS Socket.IO
                                                      │
                                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                Node.js / Express API & Socket.IO Gateway                        │
│                                                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Auth Module  │  │ Rooms Module │  │ DMs Module   │  │ E2EE Keys    │  │ Gemini AI Service │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  └───────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Messages Engine││ WebRTC Calls │  │ Presence Svc │  │ Moderation   │  │ Notification Svc  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  └───────────────────┘  │
└──────────────────────┬──────────────────────┬──────────────────────┬────────────────────────────┘
                       │                      │                      │
                       ▼                      ▼                      ▼
           ┌──────────────────────┐┌──────────────────────┐┌──────────────────────┐
           │   MongoDB Storage    ││   Redis In-Memory    ││  Google Gemini API   │
           │  (Users, Messages,   ││  (Presence, Heartbeat││  (Summaries, Smart   │
           │   Rooms, Call Logs)  ││   Pub/Sub Adapter)   ││   Reply Suggestions) │
           └──────────────────────┘└──────────────────────┘└──────────────────────┘
```

---

## 3. Comprehensive Feature Breakdown

### 3.1 Authentication & User Identity Management
- **Registration & Login**: Dual-token authentication with short-lived JWT Access Tokens and long-lived Refresh Tokens. Password hashing powered by `bcryptjs`.
- **Username Reservation**: Dynamic username check API (`/api/auth/check-username/:username`) ensuring unique handle assignment.
- **Profile Customization**: Custom display names, profile avatars, status bio, custom sound settings, and theme preferences.

### 3.2 Real-Time Socket Messaging Engine
- **Bi-directional WebSockets**: Socket.IO transport layer for instant message broadcast, typing indicators, and online state notifications.
- **Redis Multi-Node Sync**: Redis Pub/Sub socket adapter allows multi-instance server deployment with zero message duplication.
- **Rich Message Content**: Full Markdown support, inline code syntax highlighting, file attachments, and image previews.
- **Message Operations**: Live message editing, soft deletion, pinned messages, and message forwarding across channels and DMs.
- **Emoji Reactions**: Dynamic real-time emoji reactions attached to individual messages.

### 3.3 End-to-End Encryption (E2EE)
- **Asymmetric Key Exchange**: RSA-OAEP 2048-bit client-generated public/private key pairs. Public keys are registered on the backend (`/api/rooms/keys`).
- **Symmetric Encryption**: AES-GCM 256-bit secret key per private channel, shared securely using RSA encryption.
- **Zero-Knowledge Backend**: Server stores only ciphertext data; decryption occurs strictly inside user browser memory.

### 3.4 Direct Messaging & Friends System
- **1-on-1 DM Channels**: Dedicated private messaging between connected users.
- **Direct Call Invites**: Instant audio/video call initialization directly from DM channels.
- **Unread Counters & Read Receipts**: Real-time read receipt tracking with blue check indicators.

### 3.5 Room & Channel Lifecycle Management
- **Public & Private Channels**: Custom channel categorization, topic definitions, and configurable inactivity timeout auto-archiving.
- **Join Request Workflow**: Private channels support approval workflows (`/api/rooms/:roomId/request-join`), enabling room owners and moderators to review pending requests.

### 3.6 Contextual Threaded Discussions
- **Sub-thread Conversations**: Any message can open a side-panel discussion thread.
- **Thread Metadata**: Track total reply count, last reply timestamp, and participant avatars.

### 3.7 WebRTC Voice & Video Calling
- **P2P Audio/Video Streams**: Peer-to-Peer mesh connectivity using WebRTC APIs.
- **Socket Signaling**: Socket.IO handles Offer, Answer, and ICE candidate negotiation.
- **In-Call Controls**: Mute microphone, toggle camera video stream, screen sharing, and call duration timer.
- **Call Logging**: Persistent call logs tracking missed, answered, and outgoing call durations (`CallLog` MongoDB model).

### 3.8 Gemini AI Integration (Copilot)
- **Room Chat Summarization**: Analyzes recent room messages and generates structured bulleted summaries via Google Gemini.
- **Smart Reply Suggestions**: Contextually suggests quick response snippets based on incoming conversation flow.
- **Dedicated AI Assistant Panel**: In-app panel for drafting responses or querying AI assistance directly.

### 3.9 Presence Tracking, Heartbeat & Activity Map
- **Redis Heartbeat Mechanism**: High-performance TTL tracking in Redis to maintain active user states (`online`, `idle`, `dnd`, `offline`).
- **Typing Indicators**: Debounced broadcast signals ("User is typing...").
- **Presence Heatmap**: Visual dashboard widget rendering member density and activity across rooms.

### 3.10 Granular Role-Based Moderation
- **Role Hierarchy**: Room Owner, Admin/Moderator, Member.
- **Moderation Actions**: Kick member, Ban member (User ID/IP), Mute member (suppressing socket broadcast), and promote/demote roles.
- **Forced Disconnection**: Server emits `room:kicked` socket events to forcibly eject moderated users.

### 3.11 Offline Queueing, Caching & Message Backfill
- **Client Cache**: LocalStorage/IndexedDB storage for immediate initial room renders.
- **Offline Outbox**: Messages drafted offline are queued locally and automatically dispatched on reconnect.
- **Backfill API**: `/api/rooms/backfill` synchronizes missing messages since the last received timestamp.

### 3.12 Notifications System
- **In-App Notification Center**: Drawer tracking @mentions, room invitations, and calls.
- **Web Push Notifications**: Browser Notifications API integration for background alerts.

### 3.13 UI/UX Design System
- **Glassmorphism Theme**: Ultra-modern translucent dark aesthetic built with custom CSS variables.
- **Quick Switcher**: Command palette (`Cmd/Ctrl + K`) for rapid navigation between rooms and DMs.
- **Accessibility & Shortcuts**: Global keyboard shortcut modal and accessible navigation patterns.

---

## 4. Data Models & Database Schemas (MongoDB)

### 4.1 `User` Schema
```javascript
{
  username: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  profileImage: { type: String, default: "" },
  bio: { type: String, default: "" },
  publicKey: { type: String, default: null }, // RSA Public Key for E2EE
  settings: {
    theme: { type: String, default: "dark" },
    soundEnabled: { type: Boolean, default: true }
  },
  createdAt: { type: Date, default: Date.now }
}
```

### 4.2 `Room` Schema
```javascript
{
  name: { type: String, required: true },
  type: { type: String, enum: ["public", "private", "encrypted"], default: "public" },
  topic: { type: String, default: "" },
  owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
  members: [{
    user: { type: Schema.Types.ObjectId, ref: "User" },
    role: { type: String, enum: ["owner", "admin", "member"], default: "member" },
    isMuted: { type: Boolean, default: false },
    joinedAt: { type: Date, default: Date.now }
  }],
  bannedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  pendingRequests: [{ type: Schema.Types.ObjectId, ref: "User" }],
  inactivityMinutes: { type: Number, default: 0 },
  encryptedKey: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
}
```

### 4.3 `Message` Schema
```javascript
{
  room: { type: Schema.Types.ObjectId, ref: "Room", required: true, index: true },
  sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  isEncrypted: { type: Boolean, default: false },
  attachments: [{
    url: String,
    filename: String,
    fileType: String,
    size: Number
  }],
  reactions: [{
    emoji: String,
    users: [{ type: Schema.Types.ObjectId, ref: "User" }]
  }],
  isPinned: { type: Boolean, default: false },
  parentMessage: { type: Schema.Types.ObjectId, ref: "Message", default: null }, // For threads
  replyCount: { type: Number, default: 0 },
  readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now, index: true }
}
```

### 4.4 `CallLog` Schema
```javascript
{
  caller: { type: Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["audio", "video"], required: true },
  status: { type: String, enum: ["answered", "missed", "rejected"], required: true },
  durationSeconds: { type: Number, default: 0 },
  startedAt: { type: Date, default: Date.now }
}
```

---

## 5. Security & Verification Standard

1. **Authentication Policy**: Stateless access tokens with short lifetimes (15 mins) alongside refresh tokens validated against Redis store.
2. **Input Sanitization**: HTML escaping and XSS prevention on message rendering.
3. **Rate Limiting**: Express rate limiting middleware applied to login, registration, and AI routes.
4. **E2EE Integrity**: AES-256-GCM authenticated tag verification on client side to prevent payload tampering.

---

## 6. Directory Structure Reference

```
c:\ChatApp/
├── DESIGN_DOCUMENT.md            # Master System Architecture & Design Specification
├── README.md                     # Quick Start & Setup Guide
├── client/                       # React + Vite Frontend App
│   └── src/
│       ├── features/             # Feature Modules (auth, calls, chat, home, notifications, profile)
│       └── shared/               # Core Utilities, Contexts, UI Components, E2EE Crypto
└── server/                       # Node.js + Express Backend API
    ├── src/
    │   ├── features/             # Backend Domain Services (auth, ai, calls, dm, keys, messages, etc.)
    │   └── shared/               # Database, Redis, WebSockets, Middleware Infrastructure
    └── tests/                    # Integration Tests (Jest + mongodb-memory-server)
```

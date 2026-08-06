import 'dotenv/config';
import http from 'http';
import dns from 'node:dns/promises';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { CORS_ORIGINS } from './shared/utils/constants.js';

dns.setServers(['1.1.1.1', '8.8.8.8']);

process.on('uncaughtException', (err) => {
  console.error('[fatal] uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[fatal] unhandled rejection:', reason);
});

import { connectDB } from './shared/config/db.js';
import authRoutes from './features/auth/auth.routes.js';
import roomRoutes from './features/rooms/rooms.routes.js';
import messageRoutes from './features/messages/messages.routes.js';
import moderationRoutes from './features/moderation/moderation.routes.js';
import threadRoutes from './features/messages/threads.routes.js';
import keyRoutes from './features/keys/keys.routes.js';
import aiRoutes from './features/ai/ai.routes.js';
import dmRoutes from './features/dm/dm.routes.js';
import path from 'path';
import notificationRoutes from './features/notifications/notifications.routes.js';
import uploadRoutes from './features/upload/upload.routes.js';
import callRoutes from './features/calls/calls.routes.js';
import { attachSocket } from './shared/socket/index.js';
import { reconcilePresence } from './features/presence/presence.service.js';

const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: CORS_ORIGINS, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/rooms', messageRoutes);
app.use('/api/rooms', moderationRoutes);
app.use('/api/rooms', threadRoutes);
app.use('/api/rooms', keyRoutes);
app.use('/api/rooms', aiRoutes);
app.use('/api/dm', dmRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/calls', callRoutes);

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chatapp';

try {
  await connectDB(MONGODB_URI);
} catch (err) {
  console.error('[fatal] database connection failed:', err.message);
  process.exit(1);
}

const server = http.createServer(app);
const { close: closeSocket } = attachSocket(server);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[fatal] port ${PORT} is already in use`);
  } else {
    console.error('[fatal] server error:', err);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`[server] http://localhost:${PORT}`);
  setInterval(() => {
    reconcilePresence().catch((err) => console.error('[reconcile] error:', err.message));
  }, 90000);
});

const gracefulShutdown = (signal) => {
  console.log(`[server] ${signal} received, shutting down...`);
  server.close(async () => {
    await closeSocket();
    process.exit(0);
  });
  setTimeout(() => {
    console.error('[server] forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.once('SIGINT', () => gracefulShutdown('SIGINT'));
process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.once('SIGUSR2', () => gracefulShutdown('SIGUSR2'));

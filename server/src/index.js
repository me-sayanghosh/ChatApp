import 'dotenv/config';
import http from 'http';
import dns from 'node:dns/promises';
import express from 'express';
import cors from 'cors';

dns.setServers(['1.1.1.1', '8.8.8.8']);
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';
import messageRoutes from './routes/messages.js';
import { attachSocket } from './socket/index.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/rooms', messageRoutes); // /api/rooms/:id/messages

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chatapp';

await connectDB(MONGODB_URI);

const server = http.createServer(app);
attachSocket(server);

server.listen(PORT, () => {
  console.log(`[server] http://localhost:${PORT}`);
});

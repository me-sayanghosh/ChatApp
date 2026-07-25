import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import express from 'express';

process.env.JWT_SECRET = 'test-secret-for-jest';

import { setupMongo, teardownMongo } from './setup.js';
import { User } from '../src/models/User.js';
import { Room } from '../src/models/Room.js';
import { Message } from '../src/models/Message.js';
import authRoutes from '../src/routes/auth.js';
import messageRoutes from '../src/routes/messages.js';
import { backfillMessages } from '../src/routes/messages.js';

let app;
let server;
let owner;

function buildApp() {
  const a = express();
  a.use(express.json());
  a.use('/api/auth', authRoutes);
  a.use('/api/rooms', messageRoutes);
  return a;
}

function makeToken(user) {
  return jwt.sign({ sub: user._id.toString(), username: user.username }, process.env.JWT_SECRET, { expiresIn: '15m' });
}

beforeAll(async () => {
  await setupMongo();
  app = buildApp();
  server = app.listen(0);
  owner = await User.create({
    username: 'backfill_owner',
    email: 'backfill@test.com',
    passwordHash: '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01',
  });
});

afterAll(async () => {
  server?.close();
  await teardownMongo();
});

beforeEach(async () => {
  await Room.deleteMany({});
  await Message.deleteMany({});
});

const PORT = () => server.address().port;

async function httpGet(path, token) {
  const http = await import('node:http');
  return new Promise((resolve, reject) => {
    const r = http.default.request(`http://127.0.0.1:${PORT()}${path}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(buf) }));
    });
    r.on('error', reject);
    r.end();
  });
}

async function httpPost(path, body, token) {
  const http = await import('node:http');
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) };
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = http.default.request(`http://127.0.0.1:${PORT()}${path}`, { method: 'POST', headers }, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(buf) }));
    });
    r.on('error', reject);
    r.write(data);
    r.end();
  });
}

describe('GET /:roomId/messages ObjectId validation', () => {
  test('invalid after parameter returns 400', async () => {
    const room = await Room.create({
      name: 'msg-test-room',
      createdBy: owner._id,
      type: 'public',
      members: [{ user: owner._id, role: 'owner', joinedAt: new Date(), muted: false }],
    });

    const token = makeToken(owner);
    const res = await httpGet(`/api/rooms/${room._id}/messages?after=not-an-objectid`, token);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid after/i);
  });

  test('valid after filters messages correctly', async () => {
    const room = await Room.create({
      name: 'msg-filter-room',
      createdBy: owner._id,
      type: 'public',
      members: [{ user: owner._id, role: 'owner', joinedAt: new Date(), muted: false }],
    });

    const msg1 = await Message.create({ room: room._id, sender: owner._id, text: 'first' });
    const msg2 = await Message.create({ room: room._id, sender: owner._id, text: 'second' });
    const msg3 = await Message.create({ room: room._id, sender: owner._id, text: 'third' });

    const token = makeToken(owner);
    const res = await httpGet(`/api/rooms/${room._id}/messages?after=${msg1._id}`, token);
    expect(res.status).toBe(200);
    expect(res.body.messages.length).toBe(2);
    expect(res.body.messages[0].text).toBe('second');
    expect(res.body.messages[1].text).toBe('third');
  });

  test('non-member cannot read private room messages', async () => {
    const stranger = await User.create({
      username: 'stranger_' + Date.now(),
      email: `stranger_${Date.now()}@test.com`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01',
    });

    const room = await Room.create({
      name: 'private-msg-room',
      createdBy: owner._id,
      type: 'private',
      members: [{ user: owner._id, role: 'owner', joinedAt: new Date(), muted: false }],
    });

    const token = makeToken(stranger);
    const res = await httpGet(`/api/rooms/${room._id}/messages`, token);
    expect(res.status).toBe(403);
  });
});

describe('POST /backfill batched endpoint', () => {
  test('returns 400 when rooms array is missing', async () => {
    const token = makeToken(owner);
    const res = await httpPost('/api/rooms/backfill', {}, token);
    expect(res.status).toBe(400);
  });

  test('returns 400 when rooms is empty', async () => {
    const token = makeToken(owner);
    const res = await httpPost('/api/rooms/backfill', { rooms: [] }, token);
    expect(res.status).toBe(400);
  });

  test('caps at 20 rooms', async () => {
    const roomIds = [];
    for (let i = 0; i < 25; i++) {
      const room = await Room.create({
        name: `batch-room-${i}-${Date.now()}`,
        createdBy: owner._id,
        type: 'public',
        members: [{ user: owner._id, role: 'owner', joinedAt: new Date(), muted: false }],
      });
      roomIds.push(room._id.toString());
    }

    const rooms = roomIds.map((id) => ({ roomId: id, after: '000000000000000000000001' }));
    const token = makeToken(owner);
    const res = await httpPost('/api/rooms/backfill', { rooms }, token);
    expect(res.status).toBe(200);

    const resultKeys = Object.keys(res.body.backfill);
    expect(resultKeys.length).toBeLessThanOrEqual(20);
  });

  test('skips rooms where user is not a member (private)', async () => {
    const other = await User.create({
      username: 'other_' + Date.now(),
      email: `other_${Date.now()}@test.com`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01',
    });

    const myRoom = await Room.create({
      name: `my-room-${Date.now()}`,
      createdBy: owner._id,
      type: 'private',
      members: [{ user: owner._id, role: 'owner', joinedAt: new Date(), muted: false }],
    });

    const theirRoom = await Room.create({
      name: `their-room-${Date.now()}`,
      createdBy: other._id,
      type: 'private',
      members: [{ user: other._id, role: 'owner', joinedAt: new Date(), muted: false }],
    });

    const msg = await Message.create({ room: myRoom._id, sender: owner._id, text: 'hello' });

    const token = makeToken(owner);
    const res = await httpPost('/api/rooms/backfill', {
      rooms: [
        { roomId: myRoom._id.toString(), after: '000000000000000000000001' },
        { roomId: theirRoom._id.toString(), after: '000000000000000000000001' },
      ],
    }, token);

    expect(res.status).toBe(200);
    expect(res.body.backfill[myRoom._id.toString()].length).toBe(1);
    expect(res.body.backfill[theirRoom._id.toString()] || []).toHaveLength(0);
  });

  test('invalid roomId or after in batch is silently skipped', async () => {
    const token = makeToken(owner);
    const res = await httpPost('/api/rooms/backfill', {
      rooms: [
        { roomId: 'not-a-valid-id', after: 'also-bad' },
        { roomId: new mongoose.Types.ObjectId().toString(), after: 'bad-after' },
      ],
    }, token);
    expect(res.status).toBe(200);
    expect(Object.keys(res.body.backfill).length).toBe(0);
  });
});

describe('backfillMessages() direct function test', () => {
  test('returns messages after the given ObjectId', async () => {
    const room = await Room.create({
      name: `direct-backfill-${Date.now()}`,
      createdBy: owner._id,
      type: 'public',
      members: [{ user: owner._id, role: 'owner', joinedAt: new Date(), muted: false }],
    });

    const m1 = await Message.create({ room: room._id, sender: owner._id, text: 'a' });
    const m2 = await Message.create({ room: room._id, sender: owner._id, text: 'b' });
    const m3 = await Message.create({ room: room._id, sender: owner._id, text: 'c' });

    const results = await backfillMessages(owner._id.toString(), [
      { roomId: room._id.toString(), after: m1._id.toString() },
    ]);

    expect(results[room._id.toString()].length).toBe(2);
    expect(results[room._id.toString()][0].text).toBe('b');
    expect(results[room._id.toString()][1].text).toBe('c');
  });
});

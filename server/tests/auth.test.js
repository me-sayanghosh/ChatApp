import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import express from 'express';

process.env.JWT_SECRET = 'test-secret-for-jest';

import { setupMongo, teardownMongo } from './setup.js';
import { User } from '../src/features/auth/user.model.js';
import authRoutes from '../src/features/auth/auth.routes.js';

let app;
let server;

function buildApp() {
  const a = express();
  a.use(express.json());
  a.use('/api/auth', authRoutes);
  return a;
}

beforeAll(async () => {
  await setupMongo();
  app = buildApp();
  server = app.listen(0);
});

afterAll(async () => {
  server?.close();
  await teardownMongo();
});

beforeEach(async () => {
  await User.deleteMany({});
});

function makeToken(user) {
  return jwt.sign({ sub: user._id.toString(), username: user.username }, process.env.JWT_SECRET, { expiresIn: '15m' });
}

describe('Refresh token reuse detection', () => {
  test('reusing an old refresh token after rotation revokes ALL sessions', async () => {
    const http = await import('node:http');
    const req = (path, body) =>
      new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const r = http.default.request(`http://127.0.0.1:${server.address().port}${path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
        }, (res) => {
          let buf = '';
          res.on('data', (c) => (buf += c));
          res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(buf) }));
        });
        r.on('error', reject);
        r.write(data);
        r.end();
      });

    const reg = await req('/api/auth/register', { username: 'reuser', email: 'reuse@test.com', password: 'pass123' });
    expect(reg.status).toBe(201);
    const originalRefresh = reg.body.refreshToken;

    const rotate = await req('/api/auth/refresh', { refreshToken: originalRefresh });
    expect(rotate.status).toBe(200);
    const newRefresh = rotate.body.refreshToken;
    expect(newRefresh).not.toBe(originalRefresh);

    const reuse = await req('/api/auth/refresh', { refreshToken: originalRefresh });
    expect(reuse.status).toBe(401);
    expect(reuse.body.error).toMatch(/reuse detected/);

    const user = await User.findById(reg.body.user.id);
    expect(user.refreshTokens.length).toBe(0);
  });

  test('new refresh token from rotation works', async () => {
    const http = await import('node:http');
    const req = (path, body) =>
      new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const r = http.default.request(`http://127.0.0.1:${server.address().port}${path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
        }, (res) => {
          let buf = '';
          res.on('data', (c) => (buf += c));
          res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(buf) }));
        });
        r.on('error', reject);
        r.write(data);
        r.end();
      });

    const reg = await req('/api/auth/register', { username: 'rotator', email: 'rotate@test.com', password: 'pass123' });
    expect(reg.status).toBe(201);

    const rotate = await req('/api/auth/refresh', { refreshToken: reg.body.refreshToken });
    expect(rotate.status).toBe(200);

    const useNew = await req('/api/auth/refresh', { refreshToken: rotate.body.refreshToken });
    expect(useNew.status).toBe(200);
    expect(useNew.body.accessToken).toBeDefined();
    expect(useNew.body.refreshToken).toBeDefined();
    expect(useNew.body.refreshToken).not.toBe(rotate.body.refreshToken);
  });

  test('totally fake refresh token returns 401 without crashing', async () => {
    const http = await import('node:http');
    const req = (path, body) =>
      new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const r = http.default.request(`http://127.0.0.1:${server.address().port}${path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
        }, (res) => {
          let buf = '';
          res.on('data', (c) => (buf += c));
          res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(buf) }));
        });
        r.on('error', reject);
        r.write(data);
        r.end();
      });

    const res = await req('/api/auth/refresh', { refreshToken: 'totally-fake-uuid-token' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/);
  });

  test('logout removes only the used refresh token, siblings still work', async () => {
    const http = await import('node:http');
    const req = (path, body, headers = {}) =>
      new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const r = http.default.request(`http://127.0.0.1:${server.address().port}${path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers },
        }, (res) => {
          let buf = '';
          res.on('data', (c) => (buf += c));
          res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(buf) }));
        });
        r.on('error', reject);
        r.write(data);
        r.end();
      });

    const reg = await req('/api/auth/register', { username: 'logoutter', email: 'logout@test.com', password: 'pass123' });
    expect(reg.status).toBe(201);

    const refreshA = uuidv4();
    const refreshB = uuidv4();
    const family = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await User.findByIdAndUpdate(reg.body.user.id, {
      $push: {
        refreshTokens: [
          { token: refreshA, family, createdAt: new Date(), expiresAt },
          { token: refreshB, family, createdAt: new Date(), expiresAt },
        ],
      },
    });

    const token = makeToken(await User.findById(reg.body.user.id));
    const logout = await req('/api/auth/logout', { refreshToken: refreshA }, { Authorization: `Bearer ${token}` });
    expect(logout.status).toBe(200);

    const useB = await req('/api/auth/refresh', { refreshToken: refreshB });
    expect(useB.status).toBe(200);

    const useA = await req('/api/auth/refresh', { refreshToken: refreshA });
    expect(useA.status).toBe(401);
  });
});

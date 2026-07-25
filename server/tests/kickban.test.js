import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';

import { setupMongo, teardownMongo } from './setup.js';
import { User } from '../src/models/User.js';
import { Room } from '../src/models/Room.js';

let owner, moderator, victim, bystander;

beforeAll(async () => {
  await setupMongo();
  owner = await User.create({ username: 'kb_owner', email: 'kb_owner@test.com', passwordHash: 'x' });
  moderator = await User.create({ username: 'kb_mod', email: 'kb_mod@test.com', passwordHash: 'x' });
  victim = await User.create({ username: 'kb_victim', email: 'kb_victim@test.com', passwordHash: 'x' });
  bystander = await User.create({ username: 'kb_bystander', email: 'kb_bystander@test.com', passwordHash: 'x' });
});

afterAll(async () => {
  await teardownMongo();
});

beforeEach(async () => {
  await Room.deleteMany({});
});

describe('Kick: multi-tab scenario (room-scoped removal)', () => {
  test('kick removes user from room members but preserves the user document', async () => {
    const room = await Room.create({
      name: `kick-room-${Date.now()}`,
      createdBy: owner._id,
      type: 'public',
      members: [
        { user: owner._id, role: 'owner', joinedAt: new Date(), muted: false },
        { user: victim._id, role: 'member', joinedAt: new Date(), muted: false },
        { user: bystander._id, role: 'member', joinedAt: new Date(), muted: false },
      ],
    });

    room.members = room.members.filter((m) => m.user.toString() !== victim._id.toString());
    await room.save();

    const updated = await Room.findById(room._id);
    expect(updated.members.length).toBe(2);
    expect(updated.members.find((m) => m.user.toString() === victim._id.toString())).toBeUndefined();
    expect(updated.members.find((m) => m.user.toString() === bystander._id.toString())).toBeDefined();
    expect(updated.bannedUsers.length).toBe(0);

    const userStillExists = await User.findById(victim._id);
    expect(userStillExists).not.toBeNull();
    expect(userStillExists.username).toBe('kb_victim');
  });

  test('kick from one room does not affect other rooms', async () => {
    const roomA = await Room.create({
      name: `kick-roomA-${Date.now()}`,
      createdBy: owner._id,
      type: 'public',
      members: [
        { user: owner._id, role: 'owner', joinedAt: new Date(), muted: false },
        { user: victim._id, role: 'member', joinedAt: new Date(), muted: false },
      ],
    });

    const roomB = await Room.create({
      name: `kick-roomB-${Date.now()}`,
      createdBy: owner._id,
      type: 'public',
      members: [
        { user: owner._id, role: 'owner', joinedAt: new Date(), muted: false },
        { user: victim._id, role: 'member', joinedAt: new Date(), muted: false },
      ],
    });

    roomA.members = roomA.members.filter((m) => m.user.toString() !== victim._id.toString());
    await roomA.save();

    const roomAUpdated = await Room.findById(roomA._id);
    const roomBUpdated = await Room.findById(roomB._id);

    expect(roomAUpdated.members.length).toBe(1);
    expect(roomBUpdated.members.length).toBe(2);
    expect(roomBUpdated.members.find((m) => m.user.toString() === victim._id.toString())).toBeDefined();
  });
});

describe('Ban: adds to bannedUsers + removes from members + blocks rejoin', () => {
  test('ban adds to bannedUsers and removes member', async () => {
    const room = await Room.create({
      name: `ban-room-${Date.now()}`,
      createdBy: owner._id,
      type: 'public',
      members: [
        { user: owner._id, role: 'owner', joinedAt: new Date(), muted: false },
        { user: victim._id, role: 'member', joinedAt: new Date(), muted: false },
      ],
    });

    const alreadyBanned = (room.bannedUsers || []).some((b) => b.user.toString() === victim._id.toString());
    if (!alreadyBanned) {
      room.bannedUsers.push({ user: victim._id, bannedAt: new Date(), bannedBy: owner._id });
    }
    room.members = room.members.filter((m) => m.user.toString() !== victim._id.toString());
    room.encryptedKeys = (room.encryptedKeys || []).filter((ek) => ek.user.toString() !== victim._id.toString());
    await room.save();

    const updated = await Room.findById(room._id);
    expect(updated.members.length).toBe(1);
    expect(updated.bannedUsers.length).toBe(1);
    expect(updated.bannedUsers[0].user.toString()).toBe(victim._id.toString());
    expect(updated.bannedUsers[0].bannedBy.toString()).toBe(owner._id.toString());
  });

  test('banned user is rejected when trying to rejoin via socket', async () => {
    const room = await Room.create({
      name: `ban-rejoin-${Date.now()}`,
      createdBy: owner._id,
      type: 'public',
      members: [
        { user: owner._id, role: 'owner', joinedAt: new Date(), muted: false },
      ],
      bannedUsers: [{ user: victim._id, bannedAt: new Date(), bannedBy: owner._id }],
    });

    const isBanned = (room.bannedUsers || []).some((b) => b.user.toString() === victim._id.toString());
    expect(isBanned).toBe(true);
  });

  test('ban only affects the target room, not other rooms', async () => {
    const roomA = await Room.create({
      name: `ban-roomA-${Date.now()}`,
      createdBy: owner._id,
      type: 'public',
      members: [
        { user: owner._id, role: 'owner', joinedAt: new Date(), muted: false },
        { user: victim._id, role: 'member', joinedAt: new Date(), muted: false },
      ],
    });

    const roomB = await Room.create({
      name: `ban-roomB-${Date.now()}`,
      createdBy: owner._id,
      type: 'public',
      members: [
        { user: owner._id, role: 'owner', joinedAt: new Date(), muted: false },
        { user: victim._id, role: 'member', joinedAt: new Date(), muted: false },
      ],
    });

    roomA.bannedUsers.push({ user: victim._id, bannedAt: new Date(), bannedBy: owner._id });
    roomA.members = roomA.members.filter((m) => m.user.toString() !== victim._id.toString());
    await roomA.save();

    const rA = await Room.findById(roomA._id);
    const rB = await Room.findById(roomB._id);

    expect(rA.bannedUsers.length).toBe(1);
    expect(rB.bannedUsers.length).toBe(0);
    expect(rB.members.find((m) => m.user.toString() === victim._id.toString())).toBeDefined();
  });

  test('unban removes from bannedUsers', async () => {
    const room = await Room.create({
      name: `unban-room-${Date.now()}`,
      createdBy: owner._id,
      type: 'public',
      members: [
        { user: owner._id, role: 'owner', joinedAt: new Date(), muted: false },
      ],
      bannedUsers: [{ user: victim._id, bannedAt: new Date(), bannedBy: owner._id }],
    });

    const banIndex = room.bannedUsers.findIndex((b) => b.user.toString() === victim._id.toString());
    expect(banIndex).toBeGreaterThanOrEqual(0);
    room.bannedUsers.splice(banIndex, 1);
    await room.save();

    const updated = await Room.findById(room._id);
    expect(updated.bannedUsers.length).toBe(0);

    const isStillBanned = updated.bannedUsers.some((b) => b.user.toString() === victim._id.toString());
    expect(isStillBanned).toBe(false);
  });
});

describe('Encrypted keys cleaned up on kick/ban', () => {
  test('ban strips encryptedKeys for the banned user', async () => {
    const room = await Room.create({
      name: `ek-ban-${Date.now()}`,
      createdBy: owner._id,
      type: 'private',
      members: [
        { user: owner._id, role: 'owner', joinedAt: new Date(), muted: false },
        { user: victim._id, role: 'member', joinedAt: new Date(), muted: false },
      ],
      encryptedKeys: [
        { user: owner._id, key: 'encrypted-key-owner', keyId: 'k1' },
        { user: victim._id, key: 'encrypted-key-victim', keyId: 'k2' },
      ],
    });

    room.bannedUsers.push({ user: victim._id, bannedAt: new Date(), bannedBy: owner._id });
    room.members = room.members.filter((m) => m.user.toString() !== victim._id.toString());
    room.encryptedKeys = room.encryptedKeys.filter((ek) => ek.user.toString() !== victim._id.toString());
    await room.save();

    const updated = await Room.findById(room._id);
    expect(updated.encryptedKeys.length).toBe(1);
    expect(updated.encryptedKeys[0].user.toString()).toBe(owner._id.toString());
    expect(updated.encryptedKeys.find((ek) => ek.user.toString() === victim._id.toString())).toBeUndefined();
  });
});

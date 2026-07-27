import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, minlength: 1, maxlength: 100 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['public', 'private', 'ephemeral'], default: 'public' },
    isDM: { type: Boolean, default: false },
    dmStatus: { type: String, enum: ['pending', 'accepted'], default: 'pending' },
    dmInitiator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['owner', 'moderator', 'member'], default: 'member' },
        joinedAt: { type: Date, default: Date.now },
        muted: { type: Boolean, default: false },
      },
    ],
    encryptedKeys: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        key: { type: String, required: true },
        keyId: { type: String, default: null },
      },
    ],
    pendingRequests: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        requestedAt: { type: Date, default: Date.now },
      },
    ],
    bannedUsers: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        bannedAt: { type: Date, default: Date.now },
        bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      },
    ],
    pinnedMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
    topic: { type: String, default: '', maxlength: 250 },
    category: { type: String, default: 'General', maxlength: 50 },
    slowMode: { type: Number, default: 0 },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

roomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

roomSchema.methods.toClient = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    createdBy: this.createdBy.toString(),
    type: this.type,
    isDM: !!this.isDM,
    dmStatus: this.dmStatus || 'accepted',
    dmInitiator: this.dmInitiator ? this.dmInitiator.toString() : null,
    topic: this.topic || '',
    category: this.category || 'General',
    slowMode: this.slowMode || 0,
    members: this.members.map((m) => ({
      user: m.user.toString(),
      role: m.role,
      joinedAt: m.joinedAt,
      muted: m.muted,
    })),
    pendingRequests: this.pendingRequests.map((r) => ({
      user: r.user.toString(),
      requestedAt: r.requestedAt,
    })),
    bannedUsers: (this.bannedUsers || []).map((b) => ({
      user: b.user.toString(),
      bannedAt: b.bannedAt,
      bannedBy: b.bannedBy ? b.bannedBy.toString() : null,
    })),
    pinnedMessages: (this.pinnedMessages || []).map((p) => p.toString()),
    expiresAt: this.expiresAt,
  };
};

roomSchema.methods.toSummary = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    createdBy: this.createdBy.toString(),
    type: this.type,
    isDM: !!this.isDM,
    dmStatus: this.dmStatus || 'accepted',
    dmInitiator: this.dmInitiator ? this.dmInitiator.toString() : null,
    topic: this.topic || '',
    category: this.category || 'General',
    slowMode: this.slowMode || 0,
    pinnedMessages: (this.pinnedMessages || []).map((p) => p.toString()),
    expiresAt: this.expiresAt,
  };
};

export const Room = mongoose.model('Room', roomSchema);

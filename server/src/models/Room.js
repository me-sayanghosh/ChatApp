import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, minlength: 1, maxlength: 40 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['public', 'private', 'ephemeral', 'voice'], default: 'public' },
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
    expiresAt: this.expiresAt,
  };
};

roomSchema.methods.toSummary = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    createdBy: this.createdBy.toString(),
    type: this.type,
    expiresAt: this.expiresAt,
  };
};

export const Room = mongoose.model('Room', roomSchema);

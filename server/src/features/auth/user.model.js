import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 24 },
    name: { type: String, trim: true, default: '' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    profileImage: { type: String, default: '' },
    googleId: { type: String, default: null, sparse: true },
    needsUsername: { type: Boolean, default: false },
    passwordHash: { type: String, required: false },
    refreshTokens: [
      {
        token: { type: String, required: true },
        family: { type: String, default: null },
        createdAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, required: true },
      },
    ],
    revokedTokens: [
      {
        token: { type: String, required: true },
        revokedAt: { type: Date, default: Date.now },
        family: { type: String, default: null },
      },
    ],
    notificationSettings: {
      groupNotifications: { type: Boolean, default: true },
      directNotifications: { type: Boolean, default: true },
      backgroundSync: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

userSchema.methods.toClient = function () {
  return {
    id: this._id.toString(),
    username: this.username,
    name: this.name || '',
    email: this.email,
    profileImage: this.profileImage || '',
    needsUsername: !!this.needsUsername,
    googleId: this.googleId || null,
    notificationSettings: this.notificationSettings || {
      groupNotifications: true,
      directNotifications: true,
      backgroundSync: true,
    },
  };
};

export const User = mongoose.model('User', userSchema);

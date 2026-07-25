import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 24 },
    name: { type: String, trim: true, default: '' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    needsUsername: { type: Boolean, default: false },
    passwordHash: { type: String, required: true },
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
  },
  { timestamps: true }
);

userSchema.methods.toClient = function () {
  return { id: this._id.toString(), username: this.username, name: this.name || '', email: this.email, needsUsername: !!this.needsUsername };
};

export const User = mongoose.model('User', userSchema);

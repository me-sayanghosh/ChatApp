import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    type: {
      type: String,
      enum: ['mention', 'dm', 'reaction', 'system', 'channel'],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, default: '' },
    link: { type: String, default: '' },
    roomId: { type: String, default: null },
    messageId: { type: String, default: null },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

notificationSchema.methods.toClient = function () {
  return {
    id: this._id.toString(),
    userId: this.user.toString(),
    actor: this.actor
      ? {
          id: this.actor._id ? this.actor._id.toString() : this.actor.toString(),
          username: this.actor.username || 'User',
          profileImage: this.actor.profileImage || '',
        }
      : null,
    type: this.type,
    title: this.title,
    message: this.message,
    link: this.link,
    roomId: this.roomId,
    messageId: this.messageId,
    read: this.read,
    createdAt: this.createdAt,
  };
};

export const Notification = mongoose.model('Notification', notificationSchema);

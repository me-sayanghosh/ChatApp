import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, maxlength: 2000 },
    parentMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    deleted: { type: Boolean, default: false },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reported: { type: Boolean, default: false },
    reactions: [
      {
        emoji: { type: String, required: true },
        users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      },
    ],
  },
  { timestamps: true }
);

messageSchema.index({ room: 1, parentMessage: 1, createdAt: 1 });

messageSchema.methods.toClient = function () {
  return {
    id: this._id.toString(),
    roomId: this.room.toString(),
    senderId: this.sender.toString ? this.sender.toString() : this.sender,
    text: this.text,
    parentMessage: this.parentMessage ? this.parentMessage.toString() : null,
    deleted: this.deleted,
    reported: this.reported,
    reactions: this.reactions.map((r) => ({
      emoji: r.emoji,
      users: r.users.map((u) => u.toString()),
    })),
    createdAt: this.createdAt,
  };
};

export const Message = mongoose.model('Message', messageSchema);

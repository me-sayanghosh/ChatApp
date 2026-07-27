import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    clientMsgId: { type: String, default: null },
    text: { type: String, default: '', maxlength: 2000 },
    attachments: [
      {
        url: { type: String, required: true },
        filename: { type: String, required: true },
        fileType: { type: String, enum: ['image', 'video', 'audio', 'document'], default: 'document' },
        mimeType: { type: String, default: '' },
        size: { type: Number, default: 0 },
      },
    ],
    parentMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    deleted: { type: Boolean, default: false },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    reported: { type: Boolean, default: false },
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
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
messageSchema.index({ clientMsgId: 1 }, { unique: true, sparse: true, partialFilterExpression: { clientMsgId: { $ne: null } } });

messageSchema.methods.toClient = function () {
  return {
    id: this._id.toString(),
    roomId: this.room.toString(),
    senderId: this.sender.toString ? this.sender.toString() : this.sender,
    clientMsgId: this.clientMsgId || null,
    text: this.text || '',
    attachments: this.attachments || [],
    parentMessage: this.parentMessage ? this.parentMessage.toString() : null,
    replyTo: this.replyTo ? this.replyTo.toString() : null,
    deleted: this.deleted,
    deletedFor: this.deletedFor ? this.deletedFor.map((u) => u.toString()) : [],
    reported: this.reported,
    mentions: (this.mentions || []).map((u) => u.toString()),
    reactions: (this.reactions || []).map((r) => ({
      emoji: r.emoji,
      users: r.users.map((u) => u.toString()),
    })),
    createdAt: this.createdAt,
  };
};

export const Message = mongoose.model('Message', messageSchema);

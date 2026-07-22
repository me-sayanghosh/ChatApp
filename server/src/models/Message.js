import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, maxlength: 2000 },
  },
  { timestamps: true }
);

messageSchema.methods.toClient = function () {
  return {
    id: this._id.toString(),
    roomId: this.room.toString(),
    senderId: this.sender.toString ? this.sender.toString() : this.sender,
    text: this.text,
    createdAt: this.createdAt,
  };
};

export const Message = mongoose.model('Message', messageSchema);

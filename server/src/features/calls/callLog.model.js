import mongoose from 'mongoose';

const callLogSchema = new mongoose.Schema(
  {
    caller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null },
    type: { type: String, enum: ['voice', 'video'], default: 'voice' },
    status: { type: String, enum: ['completed', 'missed', 'rejected', 'cancelled'], default: 'completed' },
    durationSeconds: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

callLogSchema.methods.toClient = function (currentUserId) {
  const isCaller = this.caller?._id
    ? this.caller._id.toString() === currentUserId
    : this.caller.toString() === currentUserId;

  const partnerUser = isCaller ? this.receiver : this.caller;

  return {
    id: this._id.toString(),
    callerId: this.caller?._id ? this.caller._id.toString() : this.caller.toString(),
    receiverId: this.receiver?._id ? this.receiver._id.toString() : this.receiver ? this.receiver.toString() : null,
    partner: partnerUser && typeof partnerUser === 'object'
      ? {
          id: partnerUser._id ? partnerUser._id.toString() : partnerUser.toString(),
          username: partnerUser.username || 'User',
          name: partnerUser.name || '',
          profileImage: partnerUser.profileImage || '',
        }
      : null,
    type: this.type,
    status: this.status,
    direction: isCaller ? 'outgoing' : 'incoming',
    durationSeconds: this.durationSeconds,
    createdAt: this.createdAt,
  };
};

export const CallLog = mongoose.model('CallLog', callLogSchema);

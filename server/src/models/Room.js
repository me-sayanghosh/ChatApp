import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, minlength: 1, maxlength: 40 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

roomSchema.methods.toClient = function () {
  return { id: this._id.toString(), name: this.name, createdBy: this.createdBy.toString() };
};

export const Room = mongoose.model('Room', roomSchema);

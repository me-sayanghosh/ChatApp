import { Notification } from './notification.model.js';
import { User } from '../auth/user.model.js';
import { getIO } from '../../shared/socket/index.js';

export async function createNotification({
  userId,
  actorId = null,
  type,
  title,
  message = '',
  link = '',
  roomId = null,
  messageId = null,
}) {
  try {
    if (!userId || userId.toString() === actorId?.toString()) return null;

    // Check user's notification preferences
    const recipient = await User.findById(userId).select('notificationSettings').lean();
    if (recipient?.notificationSettings) {
      const { groupNotifications = true, directNotifications = true } = recipient.notificationSettings;
      if (type === 'mention' && !groupNotifications) return null;
      if (type === 'dm' && !directNotifications) return null;
    }

    const doc = await Notification.create({
      user: userId,
      actor: actorId,
      type,
      title,
      message,
      link,
      roomId: roomId ? roomId.toString() : null,
      messageId: messageId ? messageId.toString() : null,
    });

    const populated = await Notification.findById(doc._id).populate('actor', 'username profileImage');
    const clientPayload = populated ? populated.toClient() : doc.toClient();

    // Push socket event to user's personal room
    const io = getIO();
    if (io) {
      io.to(`user:${userId.toString()}`).emit('notification:new', clientPayload);
    }

    return clientPayload;
  } catch (err) {
    console.error('[notifications] create error:', err.message);
    return null;
  }
}

import { Room } from '../../features/rooms/room.model.js';
import { ROLE_HIERARCHY } from '../utils/constants.js';

export function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    try {
      const { roomId } = req.params;
      if (!roomId) return res.status(400).json({ error: 'roomId required' });

      const room = await Room.findById(roomId);
      if (!room) return res.status(404).json({ error: 'room not found' });

      const memberEntry = room.members.find((m) => m.user.toString() === req.user.id);
      if (!memberEntry) return res.status(403).json({ error: 'not a member of this room' });

      if (allowedRoles.length > 0 && !allowedRoles.includes(memberEntry.role)) {
        return res.status(403).json({ error: `requires role: ${allowedRoles.join(' or ')}` });
      }

      req.room = room;
      req.roomMember = memberEntry;
      next();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}

export function requireAtLeastRole(minRole) {
  return async (req, res, next) => {
    try {
      const { roomId } = req.params;
      if (!roomId) return res.status(400).json({ error: 'roomId required' });

      const room = await Room.findById(roomId);
      if (!room) return res.status(404).json({ error: 'room not found' });

      const memberEntry = room.members.find((m) => m.user.toString() === req.user.id);
      if (!memberEntry) return res.status(403).json({ error: 'not a member of this room' });

      if ((ROLE_HIERARCHY[memberEntry.role] || 0) < ROLE_HIERARCHY[minRole]) {
        return res.status(403).json({ error: `requires at least ${minRole} role` });
      }

      req.room = room;
      req.roomMember = memberEntry;
      next();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}

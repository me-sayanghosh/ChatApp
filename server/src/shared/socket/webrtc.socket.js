/**
 * WebRTC Signaling Socket Handlers
 */
export function registerWebRTCHandlers(socket, io) {
  // Initiate a call to a target user or room
  socket.on('webrtc:call-initiate', ({ targetUserId, roomId, isVideo }, ack) => {
    try {
      if (!targetUserId && !roomId) throw new Error('targetUserId or roomId required');

      const payload = {
        fromUserId: socket.user.id,
        fromUsername: socket.user.username,
        roomId: roomId || null,
        isVideo: !!isVideo,
      };

      if (targetUserId) {
        socket.to(`user:${targetUserId}`).emit('webrtc:call-incoming', payload);
      } else if (roomId) {
        socket.to(roomId).emit('webrtc:call-incoming', payload);
      }

      ack?.({ ok: true });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  // Accept incoming call
  socket.on('webrtc:call-accept', ({ toUserId, roomId }, ack) => {
    try {
      const payload = {
        acceptedBy: socket.user.id,
        acceptedUsername: socket.user.username,
        roomId: roomId || null,
      };

      if (toUserId) {
        socket.to(`user:${toUserId}`).emit('webrtc:call-accepted', payload);
      } else if (roomId) {
        socket.to(roomId).emit('webrtc:call-accepted', payload);
      }

      ack?.({ ok: true });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  // Reject incoming call
  socket.on('webrtc:call-reject', ({ toUserId, roomId }, ack) => {
    try {
      const payload = {
        rejectedBy: socket.user.id,
        roomId: roomId || null,
      };

      if (toUserId) {
        socket.to(`user:${toUserId}`).emit('webrtc:call-rejected', payload);
      } else if (roomId) {
        socket.to(roomId).emit('webrtc:call-rejected', payload);
      }

      ack?.({ ok: true });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  // Relay WebRTC Offer (SDP)
  socket.on('webrtc:offer', ({ toUserId, roomId, offer }) => {
    const payload = {
      fromUserId: socket.user.id,
      offer,
      roomId: roomId || null,
    };
    if (toUserId) {
      socket.to(`user:${toUserId}`).emit('webrtc:offer', payload);
    } else if (roomId) {
      socket.to(roomId).emit('webrtc:offer', payload);
    }
  });

  // Relay WebRTC Answer (SDP)
  socket.on('webrtc:answer', ({ toUserId, roomId, answer }) => {
    const payload = {
      fromUserId: socket.user.id,
      answer,
      roomId: roomId || null,
    };
    if (toUserId) {
      socket.to(`user:${toUserId}`).emit('webrtc:answer', payload);
    } else if (roomId) {
      socket.to(roomId).emit('webrtc:answer', payload);
    }
  });

  // Relay ICE Candidate
  socket.on('webrtc:ice-candidate', ({ toUserId, roomId, candidate }) => {
    const payload = {
      fromUserId: socket.user.id,
      candidate,
      roomId: roomId || null,
    };
    if (toUserId) {
      socket.to(`user:${toUserId}`).emit('webrtc:ice-candidate', payload);
    } else if (roomId) {
      socket.to(roomId).emit('webrtc:ice-candidate', payload);
    }
  });

  // End Call
  socket.on('webrtc:call-end', ({ toUserId, roomId }) => {
    const payload = {
      endedBy: socket.user.id,
      roomId: roomId || null,
    };
    if (toUserId) {
      socket.to(`user:${toUserId}`).emit('webrtc:call-ended', payload);
    } else if (roomId) {
      socket.to(roomId).emit('webrtc:call-ended', payload);
    }
  });
}

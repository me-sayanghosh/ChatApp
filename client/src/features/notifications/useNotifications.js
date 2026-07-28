import { useState, useEffect, useCallback } from 'react';
import { api } from '../../shared/utils/api.js';
import { getSocket } from '../../shared/utils/socket.js';
import { playNotificationSound, showDesktopNotification } from '../../shared/utils/webNotifications.js';

import { useToast } from '../../shared/context/ToastContext.jsx';

export function useNotifications(user) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  let showToast;
  try {
    const toastContext = useToast();
    showToast = toastContext?.showToast;
  } catch (e) {
    // Fallback if rendered outside ToastProvider
  }

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    if (!socket) return;

    function handleNewNotif(notif) {
      setNotifications((prev) => [notif, ...prev.filter((n) => n.id !== notif.id)]);
      setUnreadCount((prev) => prev + 1);

      // Sound chime
      playNotificationSound();

      // In-app Rich Toast
      if (showToast) {
        showToast({
          title: notif.title,
          snippet: notif.message,
          category: notif.type === 'dm' ? 'dm' : notif.type === 'channel' ? 'channel' : notif.type === 'mention' ? 'mention' : 'info',
          type: notif.type,
        });
      }

      // Native desktop push
      showDesktopNotification(notif.title, {
        body: notif.message,
        onClick: () => {
          window.focus();
        },
      });
    }

    socket.on('notification:new', handleNewNotif);

    return () => {
      socket.off('notification:new', handleNewNotif);
    };
  }, [user]);

  async function markRead(id) {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  }

  async function markAllRead() {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  }

  const removeNotificationsForRoom = useCallback(async (roomId) => {
    if (!roomId || !user) return;
    try {
      setNotifications((prev) => {
        const remaining = prev.filter((n) => n.roomId !== roomId);
        const removedUnread = prev.filter((n) => n.roomId === roomId && !n.read).length;
        setUnreadCount((count) => Math.max(0, count - removedUnread));
        return remaining;
      });
      await api.delete(`/notifications/room/${roomId}`);
    } catch (err) {
      console.warn('Failed to remove room notifications:', err);
    }
  }, [user]);

  const deleteNotification = useCallback(async (id) => {
    if (!id || !user) return;
    try {
      setNotifications((prev) => {
        const target = prev.find((n) => n.id === id);
        if (target && !target.read) {
          setUnreadCount((count) => Math.max(0, count - 1));
        }
        return prev.filter((n) => n.id !== id);
      });
      await api.delete(`/notifications/${id}`);
    } catch (err) {
      console.warn('Failed to delete notification:', err);
    }
  }, [user]);

  const clearAllNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setNotifications([]);
      setUnreadCount(0);
      await api.delete('/notifications/clear-all');
    } catch (err) {
      console.warn('Failed to clear all notifications:', err);
    }
  }, [user]);

  return {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    removeNotificationsForRoom,
    deleteNotification,
    clearAllNotifications,
    refetchNotifications: fetchNotifications,
  };
}

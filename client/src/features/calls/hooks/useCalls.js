import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../shared/utils/api.js';

export function useCalls(user) {
  const [callLogs, setCallLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCallLogs = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await api.get('/calls/history');
      const fetched = res.data.logs || [];
      setCallLogs(fetched);
    } catch (err) {
      console.warn('Failed to fetch call logs:', err);
      setCallLogs([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCallLogs();
  }, [fetchCallLogs]);

  const addCallLog = useCallback(async ({ receiverId, roomId, type = 'voice', status = 'completed', durationSeconds = 0 }) => {
    try {
      const res = await api.post('/calls/log', {
        receiverId,
        roomId,
        type,
        status,
        durationSeconds,
      });
      if (res.data.log) {
        setCallLogs((prev) => [res.data.log, ...prev]);
      }
    } catch (err) {
      console.error('Failed to log call:', err);
    }
  }, []);

  const clearCallHistory = useCallback(async () => {
    try {
      await api.delete('/calls/history');
      setCallLogs([]);
    } catch (err) {
      console.error('Failed to clear call history:', err);
      setCallLogs([]);
    }
  }, []);

  return {
    callLogs,
    loading,
    fetchCallLogs,
    addCallLog,
    clearCallHistory,
  };
}

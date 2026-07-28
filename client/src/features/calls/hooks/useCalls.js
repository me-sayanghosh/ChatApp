import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../shared/utils/api.js';

const INITIAL_SAMPLE_LOGS = [
  {
    id: 'call-sample-1',
    callerId: 'sample-user-1',
    receiverId: 'me',
    partner: { id: 'sample-user-1', username: 'sarah_dev', name: 'Sarah Miller', profileImage: '' },
    type: 'video',
    status: 'completed',
    direction: 'incoming',
    durationSeconds: 312, // 05m 12s
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
  },
  {
    id: 'call-sample-2',
    callerId: 'me',
    receiverId: 'sample-user-2',
    partner: { id: 'sample-user-2', username: 'alex_lead', name: 'Alex Johnson', profileImage: '' },
    type: 'voice',
    status: 'missed',
    direction: 'outgoing',
    durationSeconds: 0,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(), // 5 hours ago
  },
  {
    id: 'call-sample-3',
    callerId: 'sample-user-3',
    receiverId: 'me',
    partner: { id: 'sample-user-3', username: 'elena_ui', name: 'Elena Rostova', profileImage: '' },
    type: 'voice',
    status: 'completed',
    direction: 'incoming',
    durationSeconds: 145, // 02m 25s
    createdAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
  },
  {
    id: 'call-sample-4',
    callerId: 'me',
    receiverId: 'sample-user-4',
    partner: { id: 'sample-user-4', username: 'david_backend', name: 'David Smith', profileImage: '' },
    type: 'video',
    status: 'completed',
    direction: 'outgoing',
    durationSeconds: 840, // 14m 00s
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
  },
];

export function useCalls(user) {
  const [callLogs, setCallLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCallLogs = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await api.get('/calls/history');
      const fetched = res.data.logs || [];
      if (fetched.length === 0) {
        setCallLogs(INITIAL_SAMPLE_LOGS);
      } else {
        setCallLogs(fetched);
      }
    } catch (err) {
      console.warn('Failed to fetch call logs, using sample logs:', err);
      setCallLogs(INITIAL_SAMPLE_LOGS);
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

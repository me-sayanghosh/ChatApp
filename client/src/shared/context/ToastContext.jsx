import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((payload, type = 'info', duration = 4500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    const toastObj =
      typeof payload === 'object' && payload !== null
        ? {
            id,
            title: payload.title || 'Notification',
            snippet: payload.snippet || payload.message || '',
            category: payload.category || payload.type || type,
            type: payload.type || type,
          }
        : { id, message: payload, type };

    setToasts((prev) => [...prev, toastObj]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast, toasts }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

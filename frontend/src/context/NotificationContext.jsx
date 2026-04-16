import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { Bell } from 'lucide-react';
import { notificationAPI } from '../api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

// In dev: Vite proxy only handles HTTP /api routes, not WebSockets.
// Socket.io must connect directly to the Express server (port 5000).
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL
  || (import.meta.env.VITE_API_URL?.replace('/api', ''))
  || 'http://localhost:5000';

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications]   = useState([]);
  const [unreadCount, setUnreadCount]       = useState(0);
  const [taskEvents, setTaskEvents]         = useState(null); // latest task socket event
  const socketRef = useRef(null);

  // ── Initial load from REST ──────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await notificationAPI.getAll();
      const data = res.data.data || [];
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.isRead).length);
    } catch {}
  }, [user]);

  // ── WebSocket connection ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('WebSocket error:', err.message);
    });

    // New notification pushed from server
    socket.on('notification:new', (notif) => {
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Show toast popup
      toast(notif.message || notif.title, {
        icon: <Bell size={16} />,
        duration: 5000,
        style: {
          borderRadius: '12px',
          background: '#1e293b',
          color: '#f8fafc',
          fontSize: '14px',
          padding: '12px 16px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
        },
      });
    });

    // Task-level events (for TasksPage / DashboardPage to react to)
    const emitTaskEvent = (type) => (payload) => {
      setTaskEvents({ type, payload, ts: Date.now() });
    };

    socket.on('task:created',       emitTaskEvent('created'));
    socket.on('task:updated',       emitTaskEvent('updated'));
    socket.on('task:statusChanged', emitTaskEvent('statusChanged'));
    socket.on('task:deleted',       emitTaskEvent('deleted'));

    // Initial fetch
    fetchNotifications();

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, fetchNotifications]);

  const markRead = async (id) => {
    await notificationAPI.markRead(id);
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await notificationAPI.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      taskEvents,
      fetchNotifications,
      markRead,
      markAllRead,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);

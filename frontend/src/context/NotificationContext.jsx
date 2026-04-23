import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { Bell } from 'lucide-react';
import { notificationAPI, userAPI } from '../api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

const RAW_SOCKET_URL = import.meta.env.VITE_SOCKET_URL
  || (import.meta.env.VITE_API_URL?.replace('/api', ''))
  || 'http://localhost:5000';

const SOCKET_URL = RAW_SOCKET_URL
  .replace(/^ws:\/\//i, 'http://')
  .replace(/^wss:\/\//i, 'https://')
  .replace(/\/+$/, '');

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [taskEvents, setTaskEvents]       = useState(null);
  const [bellRing, setBellRing]           = useState(0);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const socketRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await notificationAPI.getAll();
      const data = res.data.data || [];
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.isRead).length);
    } catch {}
  }, [user]);

  // Fetch pending users count for HR / Manager / Admin
  const isHROrAbove = ['admin', 'manager', 'hr'].includes(user?.role);
  useEffect(() => {
    if (!isHROrAbove) return;
    userAPI.getPending()
      .then(res => setPendingUsersCount((res.data.users || []).length))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      // Start with polling and upgrade to websocket to avoid noisy websocket-first failures in some browsers.
      transports: ['polling', 'websocket'],
      upgrade: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => console.log('WebSocket connected:', socket.id));
    socket.on('connect_error', (err) => console.warn('WebSocket error:', err.message));

    socket.on('notification:new', (notif) => {
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);
      setBellRing(prev => prev + 1);
      toast(notif.message || notif.title, {
        icon: <Bell size={16} />,
        duration: 5000,
        style: { borderRadius: '12px', background: '#1e293b', color: '#f8fafc', fontSize: '14px', padding: '12px 16px', boxShadow: '0 10px 40px rgba(0,0,0,0.25)' },
      });
    });

    const emitTaskEvent = (type) => (payload) => setTaskEvents({ type, payload, ts: Date.now() });

    socket.on('task:created',       emitTaskEvent('created'));
    socket.on('task:updated',       emitTaskEvent('updated'));
    socket.on('task:statusChanged', emitTaskEvent('statusChanged'));
    socket.on('task:deleted',       emitTaskEvent('deleted'));
    // New: shared team task claimed by a teammate
    socket.on('task:claimed',       emitTaskEvent('claimed'));

    // ── Pending user approval events ─────────────────────────────────────────
    socket.on('user:registered', () => {
      userAPI.getPending()
        .then(res => setPendingUsersCount((res.data.users || []).length))
        .catch(() => {});
    });
    socket.on('user:approved', ({ userId }) => {
      setPendingUsersCount(prev => Math.max(0, prev - 1));
    });
    socket.on('user:rejected', ({ userId }) => {
      setPendingUsersCount(prev => Math.max(0, prev - 1));
    });

    fetchNotifications();

    return () => { socket.disconnect(); socketRef.current = null; };
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
    <NotificationContext.Provider value={{ notifications, unreadCount, taskEvents, bellRing, fetchNotifications, markRead, markAllRead, socketRef, pendingUsersCount, setPendingUsersCount }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);

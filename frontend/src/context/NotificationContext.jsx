import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { Bell, Megaphone } from 'lucide-react';
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
  const [notifications, setNotifications]     = useState([]);
  const [unreadCount, setUnreadCount]         = useState(0);
  const [taskEvents, setTaskEvents]           = useState(null);
  const [bellRing, setBellRing]               = useState(0);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const socketRef = useRef(null);
  // Holds the navigate fn injected by App — avoids a circular import
  const navigateRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await notificationAPI.getAll();
      const data = res.data.data || [];
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.isRead).length);
    } catch {}
  }, [user]);

  // Allow App.jsx to inject the navigate function once the router is mounted
  const setNavigate = useCallback((fn) => { navigateRef.current = fn; }, []);

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
        style: {
          borderRadius: '12px', background: '#1e293b', color: '#f8fafc',
          fontSize: '14px', padding: '12px 16px', boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
        },
      });
    });

    // ── New announcement: smart redirect with Page Visibility API ──────────────
    socket.on('announcement:new', (ann) => {
      const isHidden = document.hidden; // true = user is in another tab/app

      const doNavigate = () => {
        if (navigateRef.current) {
          navigateRef.current('/announcements');
        } else {
          window.location.href = '/announcements';
        }
      };

      if (isHidden) {
        // ── Tab is not visible: flash the title and redirect when they return ──
        const originalTitle = document.title;
        let flashInterval = null;
        let flashing = true;

        flashInterval = setInterval(() => {
          document.title = flashing
            ? `📣 New Announcement — ${ann.title}`
            : originalTitle;
          flashing = !flashing;
        }, 1000);

        // Browser Notification (if permission granted)
        if (Notification && Notification.permission === 'granted') {
          try {
            new Notification('New Announcement', {
              body: ann.title,
              icon: '/favicon.ico',
            });
          } catch {}
        }

        // When tab becomes visible → stop flashing, redirect, remove listener
        const onVisible = () => {
          if (!document.hidden) {
            clearInterval(flashInterval);
            document.title = originalTitle;
            document.removeEventListener('visibilitychange', onVisible);
            // Small delay so the page paints before navigating
            setTimeout(doNavigate, 150);
          }
        };
        document.addEventListener('visibilitychange', onVisible);

      } else {
        // ── Tab is active: show a dismissible toast with a View button ──────────
        toast(
          (t) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Megaphone size={18} style={{ color: '#FCD34D', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>New Announcement</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>{ann.title}</div>
              </div>
              <button
                onClick={() => { toast.dismiss(t.id); doNavigate(); }}
                style={{
                  flexShrink: 0, padding: '5px 10px', borderRadius: 8,
                  background: '#F59E0B', color: '#1e293b', border: 'none',
                  fontSize: 11, fontWeight: 800, cursor: 'pointer',
                }}
              >
                View
              </button>
            </div>
          ),
          {
            duration: 12000,
            style: {
              borderRadius: '14px', background: '#1e293b', color: '#f8fafc',
              padding: '14px 18px', boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
              border: '1px solid #F59E0B40', maxWidth: 380,
            },
          }
        );
      }
    });

    const emitTaskEvent = (type) => (payload) => setTaskEvents({ type, payload, ts: Date.now() });

    socket.on('task:created',       emitTaskEvent('created'));
    socket.on('task:updated',       emitTaskEvent('updated'));
    socket.on('task:statusChanged', emitTaskEvent('statusChanged'));
    socket.on('task:deleted',       emitTaskEvent('deleted'));
    socket.on('task:claimed',       emitTaskEvent('claimed'));

    socket.on('user:registered', () => {
      userAPI.getPending()
        .then(res => setPendingUsersCount((res.data.users || []).length))
        .catch(() => {});
    });
    socket.on('user:approved', () => {
      setPendingUsersCount(prev => Math.max(0, prev - 1));
    });
    socket.on('user:rejected', () => {
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

  const deleteNotif = async (id) => {
    await notificationAPI.delete(id);
    setNotifications(prev => {
      const removed = prev.find(n => n._id === id);
      const next = prev.filter(n => n._id !== id);
      if (removed && !removed.isRead) setUnreadCount(c => Math.max(0, c - 1));
      return next;
    });
  };

  const clearAllNotifs = async () => {
    await notificationAPI.clearAll();
    setNotifications([]);
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, taskEvents, bellRing,
      fetchNotifications, markRead, markAllRead, deleteNotif, clearAllNotifs,
      socketRef, pendingUsersCount, setPendingUsersCount,
      setNavigate,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);

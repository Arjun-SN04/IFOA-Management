import { useEffect, useMemo, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import DashboardTopbar from './DashboardTopbar';
import { Megaphone, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [activeAnnouncement, setActiveAnnouncement] = useState(null);
  const { user } = useAuth();
  const { notifications, markRead } = useNotifications();
  const navigate = useNavigate();

  const dismissedKey = useMemo(() => {
    const uid = user?._id || user?.id || 'anonymous';
    return `ifoa_announcement_popup_dismissed_${uid}`;
  }, [user]);

  // Lazy init from localStorage — avoids the flash where dismissedIds starts as []
  // before the useEffect loads it, causing a dismissed popup to reappear
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      const uid = user?._id || user?.id;
      if (!uid) return [];
      const raw = localStorage.getItem(`ifoa_announcement_popup_dismissed_${uid}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Keep localStorage in sync whenever dismissedIds changes
  useEffect(() => {
    localStorage.setItem(dismissedKey, JSON.stringify(dismissedIds.slice(-200)));
  }, [dismissedIds, dismissedKey]);

  // Re-load dismissed list when the key changes (e.g. user switches accounts)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(dismissedKey);
      setDismissedIds(raw ? JSON.parse(raw) : []);
    } catch {
      setDismissedIds([]);
    }
  }, [dismissedKey]);

  useEffect(() => {
    if (activeAnnouncement) return;

    const nextAnnouncement = [...notifications]
      .filter((n) =>
        n.type === 'announcement' &&
        !n.isRead &&
        n._id &&
        !dismissedIds.includes(n._id)
      )
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

    if (nextAnnouncement) {
      setActiveAnnouncement(nextAnnouncement);
    }
  }, [notifications, dismissedIds, activeAnnouncement]);

  const dismissAnnouncement = async (navigateToAnnouncements = false) => {
    if (!activeAnnouncement) return;

    // If duplicate announcement notifications exist, dismiss all of them at once
    // so the same popup does not keep reappearing.
    const duplicateIds = notifications
      .filter((n) =>
        n.type === 'announcement' &&
        n._id &&
        n.title === activeAnnouncement.title &&
        n.message === activeAnnouncement.message
      )
      .map((n) => n._id);

    const idsToDismiss = duplicateIds.length ? duplicateIds : [activeAnnouncement._id];

    setDismissedIds((prev) => {
      const merged = new Set(prev);
      idsToDismiss.forEach((id) => merged.add(id));
      return Array.from(merged);
    });

    const unreadIds = notifications
      .filter((n) => idsToDismiss.includes(n._id) && !n.isRead)
      .map((n) => n._id);

    if (unreadIds.length) {
      try {
        await Promise.all(unreadIds.map((id) => markRead(id)));
      } catch (err) {
        console.debug('Announcement markRead sync failed:', err?.message || err);
      }
    }

    setActiveAnnouncement(null);
    if (navigateToAnnouncements) navigate('/announcements');
  };


  return (
    <>
      <div className="flex h-screen overflow-hidden" style={{ background: 'var(--surface-2)', position: 'relative' }}>
        {isMobile && mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.4)',
              zIndex: 85,
              backdropFilter: 'blur(1px)',
              transition: 'opacity 0.2s ease',
            }}
          />
        )}
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} isMobile={isMobile} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        <main className="flex-1 overflow-y-auto scrollbar-thin" style={{ background: '#F8FAFC' }}>
          <DashboardTopbar isMobile={isMobile} onToggleSidebar={() => setMobileOpen(prev => !prev)} />
          <div className="px-6 py-5 lg:px-10 lg:py-7">
            <Outlet />
          </div>
        </main>
      </div>

      {activeAnnouncement && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.32)',
            zIndex: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              width: 'min(640px, 96vw)',
              background: '#ffffff',
              borderRadius: 18,
              border: '1px solid #dbeafe',
              boxShadow: '0 28px 70px rgba(15,23,42,0.25)',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #e2e8f0', background: '#eff6ff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Megaphone size={18} style={{ color: '#1d4ed8' }} />
                <span style={{ fontSize: 15, fontWeight: 800, color: '#1e3a8a' }}>New Announcement</span>
              </div>
              <button
                onClick={() => dismissAnnouncement(false)}
                style={{ border: 'none', background: 'transparent', color: '#334155', cursor: 'pointer', width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '18px 18px 16px' }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a', lineHeight: 1.4 }}>
                {activeAnnouncement.title || 'Announcement Update'}
              </p>
              <p style={{ margin: '10px 0 0', fontSize: 14, color: '#334155', lineHeight: 1.65 }}>
                {activeAnnouncement.message}
              </p>
              <p style={{ margin: '10px 0 0', fontSize: 11, color: '#64748b' }}>
                {new Date(activeAnnouncement.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '0 18px 16px' }}>
              <button
                onClick={() => dismissAnnouncement(false)}
                style={{ border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontSize: 13, fontWeight: 600, borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }}
              >
                Close
              </button>
              <button
                onClick={() => dismissAnnouncement(true)}
                style={{ border: 'none', background: '#2563eb', color: '#fff', fontSize: 13, fontWeight: 700, borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }}
              >
                Open Announcement
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

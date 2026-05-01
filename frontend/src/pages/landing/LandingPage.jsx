import { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FolderKanban, CheckSquare, Zap, CalendarDays,
  Megaphone, BarChart3, ArrowRight,
  Radio, ShieldCheck, Lock,
  Shield, Clock, Users, TrendingUp,
  Database, Activity, GitBranch, Bell, FileText, Target, UserCheck, Layers,
  Plane, Monitor, BookOpen,
} from 'lucide-react';

/* ── Asset imports ── */
import IFOALogo    from '../../assets/IFOA_INDIA.png';
import IFOAWhite   from '../../assets/IFOA_INDIA.png';
import HeroImg     from '../../assets/hero.png';
import HeroSection from '../../assets/herosection_img.png';
import TeamImg     from '../../assets/team.png';

const B = '#1D4ED8';

const SLIDE_DATA = [
  {
    img: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1400&q=85',
    badge: 'Flight Operations',
    title: 'Manage Every\nFlight with Precision',
    sub: 'Centralise schedules, crew logs and dispatch protocols in one powerful hub.',
    accent: '#1D4ED8',
  },
  {
    img: 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=1400&q=85',
    badge: 'Flight Deck',
    title: 'Cockpit-Grade\nSituational Awareness',
    sub: 'Give your operations team real-time visibility across every active flight.',
    accent: '#0EA5E9',
  },
  {
    img: 'https://images.unsplash.com/photo-1500869812169-22a1ad0a3398?w=1400&q=85',
    badge: 'Performance Analytics',
    title: 'Data-Driven\nDecision Making',
    sub: 'Live dashboards, exportable reports and velocity tracking for leadership.',
    accent: '#059669',
  },
  {
    img: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=1400&q=85',
    badge: 'Ground Operations',
    title: 'Ground-to-Gate\nCoordination',
    sub: 'Synchronise ground staff, gate assignments and turnaround workflows seamlessly.',
    accent: '#D97706',
  },
];

const FEATURES = [
  {
    icon: FolderKanban,
    title: 'Project Management',
    desc: 'Full lifecycle visibility — from initiation to delivery — across every team and department.',
    color: '#1D4ED8', bg: '#EFF6FF', tag: 'Core',
    stat: '3× faster', statLabel: 'delivery',
  },
  {
    icon: CheckSquare,
    title: 'Task Boards',
    desc: 'Kanban-style boards with drag-and-drop simplicity and real-time status syncing.',
    color: '#7C3AED', bg: '#F5F3FF', tag: 'Daily',
    stat: '80%', statLabel: 'less missed tasks',
  },
  {
    icon: Zap,
    title: 'Sprint Planning',
    desc: 'Agile sprints with velocity tracking and burndown charts for on-time delivery.',
    color: '#0EA5E9', bg: '#F0F9FF', tag: 'Agile',
    stat: '2-week', statLabel: 'sprint cycles',
  },
  {
    icon: CalendarDays,
    title: 'Leave Management',
    desc: 'Transparent leave tracking, manager approvals and team calendar — all in one place.',
    color: '#059669', bg: '#ECFDF5', tag: 'HR',
    stat: '< 1 min', statLabel: 'approval time',
  },
  {
    icon: Megaphone,
    title: 'Announcements',
    desc: 'Broadcast real-time company-wide updates instantly — no email chains needed.',
    color: '#D97706', bg: '#FFFBEB', tag: 'Comms',
    stat: '100%', statLabel: 'team reach',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Reports',
    desc: 'Live dashboards and exportable CSV/PDF reports for actionable leadership insights.',
    color: '#DC2626', bg: '#FEF2F2', tag: 'Insights',
    stat: '15+ KPIs', statLabel: 'tracked',
  },
];

/* ─── Marquee strip — company management ops ─── */
const STRIP_ITEMS = [
  { icon: FolderKanban, text: 'Project Tracking',      sub: 'End-to-end visibility'    },
  { icon: CheckSquare,  text: 'Task Assignment',        sub: 'Assign, track & close'    },
  { icon: Zap,          text: 'Sprint Velocity',        sub: 'Agile delivery cycles'    },
  { icon: CalendarDays, text: 'Leave Calendar',         sub: 'Team availability sync'   },
  { icon: Megaphone,    text: 'Team Announcements',     sub: 'Instant org-wide broadcast'},
  { icon: BarChart3,    text: 'Reports & Insights',     sub: 'Export CSV / PDF'         },
  { icon: Users,        text: 'Role-based Access',      sub: 'Manager & member tiers'   },
  { icon: Activity,     text: 'Live Dashboards',        sub: '15+ KPIs at a glance'     },
  { icon: Clock,        text: 'Time & Milestones',      sub: 'Deadline monitoring'       },
  { icon: Database,     text: 'Centralised Records',    sub: 'Single source of truth'   },
  { icon: TrendingUp,   text: 'Performance Reviews',    sub: 'Data-driven feedback'     },
  { icon: Shield,       text: 'Audit Trails',           sub: 'Full change history'      },
  { icon: GitBranch,    text: 'Version Control',        sub: 'Track all iterations'     },
  { icon: Bell,         text: 'Smart Notifications',    sub: 'Never miss an update'     },
  { icon: FileText,     text: 'Document Management',    sub: 'Attach files to tasks'    },
  { icon: Target,       text: 'Goal Tracking',          sub: 'OKR-aligned delivery'     },
  { icon: UserCheck,    text: 'Approval Workflows',     sub: 'Manager sign-off flows'   },
  { icon: Layers,       text: 'Multi-project View',     sub: 'Cross-team overview'      },
];

const TRUST = [
  { icon: Lock,       label: 'Private & Secure'  },
  { icon: Radio,      label: 'Real-time Sync'    },
  { icon: ShieldCheck,label: 'Role-based Access' },
];

/* ── IntersectionObserver hook ── */
function useInView(ref, threshold = 0.12) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold, rootMargin: '-40px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return inView;
}

function Reveal({ children, delay = 0, style = {} }) {
  const ref = useRef(null);
  const inView = useInView(ref);
  return (
    <div ref={ref} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? 'translateY(0)' : 'translateY(36px)',
      transition: `opacity .7s cubic-bezier(.22,1,.36,1) ${delay}s, transform .7s cubic-bezier(.22,1,.36,1) ${delay}s`,
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   HERO CAROUSEL
══════════════════════════════════════════════════ */
function HeroCarousel() {
  const [active,  setActive]  = useState(0);
  const [leaving, setLeaving] = useState(null);
  const timerRef  = useRef(null);
  const dragStart = useRef(null);

  const go = useCallback((next) => {
    if (next === active) return;
    setLeaving(active);
    setActive(next);
    setTimeout(() => setLeaving(null), 900);
  }, [active]);

  const resetTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActive(prev => {
        const next = (prev + 1) % SLIDE_DATA.length;
        setLeaving(prev);
        setTimeout(() => setLeaving(null), 900);
        return next;
      });
    }, 5500);
  }, []);

  useEffect(() => { resetTimer(); return () => clearInterval(timerRef.current); }, [resetTimer]);

  const onPointerDown = (e) => { dragStart.current = e.clientX; };
  const onPointerUp   = (e) => {
    if (dragStart.current === null) return;
    const diff = dragStart.current - e.clientX;
    dragStart.current = null;
    if (Math.abs(diff) < 40) return;
    const next = diff > 0
      ? (active + 1) % SLIDE_DATA.length
      : (active - 1 + SLIDE_DATA.length) % SLIDE_DATA.length;
    go(next);
    resetTimer();
  };

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', cursor: 'grab', userSelect: 'none' }}
    >
      {SLIDE_DATA.map((s, i) => (
        <div key={i} style={{
          position: 'absolute', inset: 0,
          opacity: i === active ? 1 : (i === leaving ? 0 : 0),
          transform: i === active ? 'scale(1)' : (i === leaving ? 'scale(1.04)' : 'scale(1.08)'),
          transition: 'opacity .9s cubic-bezier(.4,0,.2,1), transform 1.3s cubic-bezier(.4,0,.2,1)',
          willChange: 'opacity,transform',
        }}>
          <img src={s.img} alt="" draggable={false} style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(110deg,rgba(5,15,40,0.85) 0%,rgba(5,15,40,0.55) 55%,rgba(5,15,40,0.18) 100%)',
          }} />
        </div>
      ))}

      {/* Slide counter */}
      <div style={{
        position: 'absolute', top: 24, right: 20, zIndex: 30,
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 999, padding: '5px 12px',
      }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>{active + 1}</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>/ {SLIDE_DATA.length}</span>
      </div>

      {/* IFOA white logo */}
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 30 }}>
        <img src={IFOAWhite} alt="IFOA" style={{ height: 30, objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.55 }} />
      </div>

      {SLIDE_DATA.map((s, i) => (
        <div key={`txt-${i}`} style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'flex-end',
          padding: 'clamp(32px,5vw,72px)',
          paddingBottom: 'clamp(56px,7vw,90px)',
          pointerEvents: i === active ? 'auto' : 'none',
          opacity: i === active ? 1 : 0,
          transform: i === active ? 'translateY(0)' : 'translateY(18px)',
          transition: 'opacity .6s .28s, transform .7s .22s',
        }}>
          <div style={{ maxWidth: 520 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '5px 14px', borderRadius: 999,
              background: s.accent + '28', border: `1px solid ${s.accent}65`,
              fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: '#fff', marginBottom: 20,
            }}>
              {s.badge}
            </div>
            <h2 style={{
              margin: '0 0 18px',
              fontSize: 'clamp(28px,3.8vw,52px)', fontWeight: 900, lineHeight: 1.1,
              color: '#fff', letterSpacing: '-0.02em', whiteSpace: 'pre-line',
            }}>{s.title}</h2>
            <p style={{ margin: 0, fontSize: 'clamp(13px,1.3vw,16px)', color: 'rgba(255,255,255,0.75)', lineHeight: 1.65 }}>{s.sub}</p>
          </div>
        </div>
      ))}

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.07)', zIndex: 20 }}>
        <div key={active} style={{ height: '100%', background: SLIDE_DATA[active].accent, animation: 'progressBar 5.5s linear forwards' }} />
      </div>
      <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', fontSize: 11, color: 'rgba(255,255,255,0.28)', fontWeight: 500, letterSpacing: '0.06em', zIndex: 20, pointerEvents: 'none', whiteSpace: 'nowrap' }}>⟵ drag to explore ⟶</div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   FEATURE CARD
══════════════════════════════════════════════════ */
 /* eslint-disable-next-line no-unused-vars */
 function FeatureCard({ icon: Icon, title, desc, color, bg, tag, stat, statLabel, delay }) {
  const [hov, setHov] = useState(false);
  return (
    <Reveal delay={delay}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          background: hov ? 'linear-gradient(135deg,' + bg + ' 0%,#ffffff 100%)' : '#FFFFFF',
          border: `1.5px solid ${hov ? color + '45' : '#E8E8FF'}`,
          borderRadius: 16, padding: '28px 24px 24px',
          position: 'relative', overflow: 'hidden',
          transition: 'all .35s cubic-bezier(.22,1,.36,1)',
          transform: hov ? 'translateY(-8px) translateX(-2px)' : 'translateY(0)',
          boxShadow: hov ? `0 24px 48px ${color}22` : '0 4px 12px rgba(29,78,216,0.08)',
          cursor: 'default', display: 'flex', flexDirection: 'column', minHeight: 280,
          backdropFilter: hov ? 'blur(8px)' : 'none',
        }}
      >
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 4,
          background: `linear-gradient(90deg,${color},${color}00)`,
          transform: `scaleX(${hov ? 1 : 0})`, transformOrigin: 'left',
          transition: 'transform .4s cubic-bezier(.22,1,.36,1)',
          borderRadius: '16px 16px 0 0',
        }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 12,
            background: `linear-gradient(135deg,${color}25,${color}12)`,
            border: `1.5px solid ${color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all .3s cubic-bezier(.22,1,.36,1)',
            transform: hov ? 'scale(1.12) rotate(-3deg)' : 'scale(1)',
          }}>
            <Icon size={26} color={color} strokeWidth={1.6} />
          </div>
          <span style={{
            padding: '5px 12px', borderRadius: 8, background: bg, color,
            fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
            textTransform: 'uppercase', border: `1px solid ${color}28`,
          }}>{tag}</span>
        </div>
        <h3 style={{ margin: '0 0 12px', fontSize: 17, fontWeight: 800, color: '#1A1F36', letterSpacing: '-0.01em' }}>{title}</h3>
        <p style={{ margin: 0, fontSize: 13.5, color: '#64748B', lineHeight: 1.7, flex: 1 }}>{desc}</p>
        <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 8, paddingTop: 16, borderTop: `1.5px solid ${color}12` }}>
          <span style={{ fontSize: 19, fontWeight: 900, color, letterSpacing: '-0.02em' }}>{stat}</span>
          <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>{statLabel}</span>
        </div>
      </div>
    </Reveal>
  );
}

/* ══════════════════════════════════════════════════
   INFINITE MARQUEE STRIP
   • Company management operations content
   • 3× duplicated for perfectly seamless loop
   • Compact height — padding: '14px 0'
══════════════════════════════════════════════════ */
function FeatureStrip() {
  const items = [...STRIP_ITEMS, ...STRIP_ITEMS, ...STRIP_ITEMS];
  return (
      <div style={{
      overflow: 'hidden',
      background: '#0F172A',
      borderTop: '1px solid rgba(255,255,255,0.05)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      padding: '14px 0',          /* ← reduced from 22px */
      position: 'relative',
    }}>
      <div style={{ position: 'absolute', inset: '0 auto 0 0', width: 100, background: 'linear-gradient(90deg,#0F172A,transparent)', zIndex: 10, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: '0 0 0 auto', width: 100, background: 'linear-gradient(270deg,#0F172A,transparent)', zIndex: 10, pointerEvents: 'none' }} />

      <div style={{
        display: 'flex',
        gap: 0,
        animation: 'stripScroll 48s linear infinite',
        width: 'max-content',
        willChange: 'transform',
      }}>
        {/* eslint-disable-next-line no-unused-vars */}
        {items.map(({ icon: Icon, text, sub }, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '0 22px',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0, whiteSpace: 'nowrap',
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,      /* ← smaller icon box */
              background: 'rgba(29,78,216,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, border: '1px solid rgba(29,78,216,0.3)',
            }}>
              <Icon size={14} color='#60A5FA' strokeWidth={1.8} />
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#E2E8F0', letterSpacing: '0.01em', lineHeight: 1.2 }}>{text}</div>
              <div style={{ fontSize: 10.5, color: 'rgba(148,163,184,0.65)', marginTop: 1, lineHeight: 1.2 }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════ */
export default function LandingPage() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <div style={{ minHeight: '100vh', overflowX: 'hidden', background: '#fff', fontFamily: "'Outfit',sans-serif", color: '#1A1F36' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes progressBar { from{width:0%} to{width:100%} }
        @keyframes heroFadeUp  { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn      { from{opacity:0} to{opacity:1} }
        @keyframes pulseDot    { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.5)} }
        @keyframes stripScroll { from{transform:translateX(0)} to{transform:translateX(-33.333%)} }

        .hero-badge { animation: heroFadeUp .7s cubic-bezier(.22,1,.36,1) .2s both; }
        .hero-h1    { animation: heroFadeUp .8s cubic-bezier(.22,1,.36,1) .35s both; }
        .hero-sub   { animation: heroFadeUp .7s cubic-bezier(.22,1,.36,1) .5s both; }
        .hero-btns  { animation: heroFadeUp .7s cubic-bezier(.22,1,.36,1) .62s both; }
        .hero-trust { animation: heroFadeUp .7s cubic-bezier(.22,1,.36,1) .74s both; }
        .carousel-wrap { animation: fadeIn 1s .4s both; }

        .nav-link { position:relative; font-size:14px; font-weight:500; color:#475569; text-decoration:none; transition:color .2s; }
        .nav-link::after { content:''; position:absolute; bottom:-4px; left:0; width:0; height:2px; background:${B}; transition:width .25s; border-radius:999px; }
        .nav-link:hover { color:${B}; }
        .nav-link:hover::after { width:100%; }

        .btn-primary {
          display:inline-flex; align-items:center; gap:8px;
          padding:13px 28px; border-radius:12px; border:none;
          background:${B}; color:#fff; font-size:15px; font-weight:700;
          font-family:'Outfit',sans-serif; text-decoration:none; cursor:pointer;
          box-shadow:0 4px 20px rgba(29,78,216,.3);
          transition:transform .2s, box-shadow .22s;
        }
        .btn-primary:hover { transform:translateY(-2px); box-shadow:0 10px 32px rgba(29,78,216,.42); }

        .btn-ghost {
          display:inline-flex; align-items:center; gap:8px;
          padding:12px 24px; border-radius:12px;
          border:1.5px solid #E2E8F0; background:#fff;
          color:#475569; font-size:15px; font-weight:600;
          font-family:'Outfit',sans-serif; text-decoration:none; cursor:pointer;
          transition:border-color .2s, color .2s, background .2s, transform .2s;
        }
        .btn-ghost:hover { border-color:${B}; color:${B}; background:#EFF6FF; transform:translateY(-1px); }
        @media(max-width:700px){ .nav-desktop{display:none!important;} }

        .hero-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          height: 100vh;
          min-height: 640px;
          padding-top: 64px;
        }
        @media(max-width:800px){
          .hero-section { grid-template-columns:1fr; grid-template-rows:55vh 45vh; height:auto; min-height:100svh; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', inset: '0 0 auto 0', zIndex: 200,
        background: scrolled ? 'rgba(255,255,255,0.96)' : 'transparent',
        backdropFilter: scrolled ? 'blur(18px)' : 'none',
        borderBottom: scrolled ? '1px solid #F0F4FF' : '1px solid transparent',
        boxShadow: scrolled ? '0 2px 20px rgba(29,78,216,.06)' : 'none',
        transition: 'all .4s',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <img src={IFOALogo} alt="IFOA" style={{ height: 34, objectFit: 'contain' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Management</span>
          </Link>
          <div className="nav-desktop" style={{ display: 'flex', gap: 32 }}>
            {[['Platform','#features'],['About','#about']].map(([l,h]) => (
              <a key={l} href={h} className="nav-link">{l}</a>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {user ? (
              <Link to="/dashboard" className="btn-primary" style={{ padding: '10px 22px', fontSize: 14 }}>
                {user.name?.split(' ')[0]} <ArrowRight size={14} />
              </Link>
            ) : (
              <>
                <Link to="/login"    className="btn-ghost"   style={{ padding: '9px 20px',  fontSize: 14 }}>Sign in</Link>
                <Link to="/register" className="btn-primary" style={{ padding: '10px 22px', fontSize: 14 }}>Get access</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero-section" style={{ background: '#FFFFFF', position: 'relative', overflow: 'hidden' }}>
        {/* Subtle background gradient */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, #ffffff 0%, #F8FAFF 100%)',
          pointerEvents: 'none',
        }} />
        
        {/* Decorative elements */}
        <div style={{
          position: 'absolute', top: -100, right: -100, width: 300, height: 300,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(29,78,216,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -50, left: '50%', width: 400, height: 400,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(29,78,216,0.05) 0%, transparent 70%)',
          pointerEvents: 'none', transform: 'translateX(-50%)',
        }} />

        <div style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: 'clamp(60px,8vw,120px) clamp(32px,5vw,80px)',
          position: 'relative', zIndex: 10,
          maxWidth: 900,
        }}>
          {/* Badge */}
          <div className="hero-badge" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8,
            background: '#EFF6FF', border: `1px solid ${B}25`,
            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: B, width: 'fit-content', marginBottom: 32,
          }}>
            Streamlined Operations
          </div>

          {/* Main Heading */}
          <h1 className="hero-h1" style={{
            fontSize: 'clamp(44px,5.5vw,72px)', fontWeight: 900, lineHeight: 1.1,
            letterSpacing: '-0.03em', marginBottom: 20, color: '#0F172A',
          }}>
            One Platform.<br />
            <span style={{ color: B }}>Every Operation.</span>
          </h1>

          {/* Subheading */}
          <p className="hero-sub" style={{
            fontSize: 'clamp(16px,1.5vw,18px)', color: '#64748B', lineHeight: 1.8,
            maxWidth: 520, marginBottom: 48, fontWeight: 400,
          }}>
            Streamline projects, tasks, sprints, leaves and analytics — purpose-built for the IFOA team.
          </p>

          {/* CTA Buttons */}
          <div className="hero-btns" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 56 }}>
            <Link to={user ? '/dashboard' : '/register'} className="btn-primary" style={{
              padding: '16px 36px', fontSize: 16, fontWeight: 600,
              boxShadow: `0 12px 40px ${B}25`,
            }}>
              {user ? 'Go to Dashboard' : 'Get Started'} <ArrowRight size={18} />
            </Link>
            {!user && (
              <Link to="/login" className="btn-ghost" style={{
                padding: '15px 32px', fontSize: 16, fontWeight: 600,
              }}>
                Sign in
              </Link>
            )}
          </div>

          {/* Trust Indicators */}
          <div className="hero-trust" style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
            {TRUST.map(({ icon: Icon, label }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 13, color: '#64748B', fontWeight: 500,
                opacity: 0.9,
              }}>
                <Icon size={16} color={B} strokeWidth={1.8} />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Carousel Section */}
        <div className="carousel-wrap" style={{
          position: 'relative', alignSelf: 'stretch', overflow: 'hidden',
          background: 'linear-gradient(135deg, #0A0F1E 0%, #1a2234 100%)',
          minHeight: 500,
        }}>
          <HeroCarousel />
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <div style={{ background: '#0F172A', padding: '32px 40px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0 }}>
        {[
          { num: '6+',   label: 'Core Modules'  },
          { num: '100%', label: 'Team Coverage'  },
          { num: 'Live', label: 'Real-time Sync' },
          { num: 'RBAC', label: 'Secure Access'  },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center', padding: '12px 0', borderRight: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>{s.num}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── FEATURES ── */}
      <section id="features" style={{ background: '#FFFFFF', paddingTop: 100, paddingBottom: 100, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 100% 0%,rgba(29,78,216,0.03) 0%,transparent 60%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 40px', position: 'relative', zIndex: 1 }}>
          <Reveal style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: B, marginBottom: 14 }}>
              <span style={{ width: 24, height: 3, borderRadius: 999, background: B, display: 'inline-block' }} />
              Core Platform
            </div>
            <h2 style={{ fontSize: 'clamp(30px,3.5vw,48px)', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.025em', lineHeight: 1.15, marginBottom: 16 }}>
              Powerful Tools. Seamless Integration.
            </h2>
            <p style={{ fontSize: 16, color: '#64748B', maxWidth: 500, margin: '0 auto', lineHeight: 1.7 }}>
              Every tool your team needs to plan, execute, and report — tightly integrated and always in sync.
            </p>
          </Reveal>
        </div>

        {/* ── STRIP (compact, management content) ── */}
        <div>
          <FeatureStrip />
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="about" style={{ background: '#F8FAFF', padding: '120px 40px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 0% 100%,rgba(29,78,216,0.05) 0%,transparent 70%)', pointerEvents: 'none' }} />
        
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 100, alignItems: 'center', position: 'relative', zIndex: 1 }}>
          {/* Image Gallery with Modern Cards */}
          <Reveal>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Main image card */}
              <div style={{
                gridColumn: '1/-1',
                borderRadius: 24,
                overflow: 'hidden',
                aspectRatio: '16/7',
                position: 'relative',
                group: 'hover',
              }}>
                <img
                  src={HeroImg}
                  alt="IFOA Operations"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'transform .6s cubic-bezier(.22,1,.36,1)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(135deg,rgba(29,78,216,0.25) 0%,rgba(29,78,216,0.08) 100%)',
                  transition: 'opacity .4s',
                }} />
                <div style={{
                  position: 'absolute',
                  bottom: 24,
                  left: 24,
                  background: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(12px)',
                  borderRadius: 12,
                  padding: '12px 18px',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#0F172A',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 8px 32px rgba(29,78,216,0.15)',
                }}>
                  <Plane size={16} color={B} />
                  IFOA Aviation Operations
                </div>
              </div>

              {/* Secondary image card 1 */}
              <div style={{
                borderRadius: 20,
                overflow: 'hidden',
                aspectRatio: '4/3',
                position: 'relative',
              }}>
                <img
                  src={HeroSection}
                  alt="Platform Dashboard"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'transform .6s cubic-bezier(.22,1,.36,1)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg,transparent 40%,rgba(29,78,216,0.3) 100%)',
                }} />
                <div style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  background: 'rgba(29,78,216,0.9)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: 10,
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#fff',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  boxShadow: '0 8px 24px rgba(29,78,216,0.2)',
                }}>
                  <Monitor size={12} />
                  Dashboard
                </div>
              </div>

              {/* Secondary image card 2 */}
              <div style={{
                borderRadius: 20,
                overflow: 'hidden',
                aspectRatio: '4/3',
                position: 'relative',
              }}>
                <img
                  src={TeamImg}
                  alt="Team Collaboration"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: 0.95,
                    transition: 'transform .6s cubic-bezier(.22,1,.36,1)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(135deg,rgba(29,78,216,0.4) 0%,transparent 60%)',
                }} />
                <div style={{
                  position: 'absolute',
                  bottom: 14,
                  left: 14,
                  background: 'rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(12px)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#fff',
                  letterSpacing: '0.06em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  border: '1px solid rgba(255,255,255,0.2)',
                }}>
                  <Users size={14} />
                  Team Collaboration
                </div>
              </div>
            </div>
          </Reveal>

          {/* Content Section */}
          <div>
            <Reveal>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: B,
                marginBottom: 16,
              }}>
                <span style={{
                  width: 24,
                  height: 3,
                  borderRadius: 999,
                  background: B,
                  display: 'inline-block',
                }} />
                About the Platform
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <h2 style={{
                fontSize: 'clamp(32px,3.5vw,48px)',
                fontWeight: 900,
                color: '#0F172A',
                lineHeight: 1.2,
                marginBottom: 24,
                letterSpacing: '-0.02em',
              }}>
                Built for the IFOA Management Team
              </h2>
            </Reveal>

            <Reveal delay={0.2}>
              <p style={{
                fontSize: 16,
                color: '#64748B',
                lineHeight: 1.8,
                marginBottom: 40,
              }}>
                An internal operations platform designed specifically for IFOA India. Manage aviation projects, coordinate your team, track tasks and monitor performance — all from one secure, unified interface.
              </p>
            </Reveal>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { icon: FolderKanban, text: 'Manage projects from planning to deployment' },
                { icon: CalendarDays, text: 'Integrated leave & attendance management' },
                { icon: Zap, text: 'Agile sprint boards with velocity tracking' },
                { icon: Megaphone, text: 'Broadcast announcements across the team' },
              ].map(({ icon: Icon, text }, i) => (
                <Reveal key={text} delay={0.3 + i * 0.08}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      padding: '14px 16px',
                      borderRadius: 12,
                      background: '#ffffff',
                      border: '1.5px solid rgba(29,78,216,0.08)',
                      transition: 'all .3s cubic-bezier(.22,1,.36,1)',
                      cursor: 'default',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(29,78,216,0.06) 0%, rgba(29,78,216,0.02) 100%)';
                      e.currentTarget.style.borderColor = B + '28';
                      e.currentTarget.style.transform = 'translateX(6px)';
                      e.currentTarget.style.boxShadow = '0 12px 32px rgba(29,78,216,0.12)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = '#ffffff';
                      e.currentTarget.style.borderColor = 'rgba(29,78,216,0.08)';
                      e.currentTarget.style.transform = 'translateX(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: `linear-gradient(135deg,${B}15,${B}08)`,
                      border: `1.5px solid ${B}22`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all .3s cubic-bezier(.22,1,.36,1)',
                    }} id={`icon-${i}`}>
                      <Icon size={18} color={B} strokeWidth={1.8} />
                    </div>
                    <span style={{
                      fontSize: 15,
                      color: '#475569',
                      lineHeight: 1.6,
                      fontWeight: 500,
                    }}>
                      {text}
                    </span>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: '#0F172A', padding: '100px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {[400,650,900].map((size,i) => (
          <div key={i} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: size, height: size, borderRadius: '50%', border: '1px solid rgba(29,78,216,0.12)', pointerEvents: 'none' }} />
        ))}
        <div style={{ position: 'relative', zIndex: 10, maxWidth: 640, margin: '0 auto' }}>
          <Reveal>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#60A5FA', marginBottom: 20 }}>
              <span style={{ width: 20, height: 2, borderRadius: 999, background: '#60A5FA', display: 'inline-block' }} />
              Ready to Fly?
            </div>
            <h2 style={{ fontSize: 'clamp(32px,4vw,52px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.025em', lineHeight: 1.15, marginBottom: 20 }}>
              Join Your Team on the Platform
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, marginBottom: 44 }}>
              IFOA Management is exclusively for internal team members. Sign in or register with your IFOA credentials.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to={user ? '/dashboard' : '/register'} className="btn-primary" style={{ padding: '15px 34px', fontSize: 15 }}>
                {user ? 'Go to Dashboard' : 'Create Account'} <ArrowRight size={16} />
              </Link>
              {!user && (
                <Link to="/login" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '14px 30px', borderRadius: 12,
                  border: '1.5px solid rgba(255,255,255,0.15)',
                  background: 'transparent', color: 'rgba(255,255,255,0.8)',
                  fontSize: 15, fontWeight: 600, fontFamily: "'Outfit',sans-serif",
                  textDecoration: 'none', cursor: 'pointer',
                }}>Sign in</Link>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#08101E', padding: '60px 40px 32px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 52 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                <img src={IFOAWhite} alt="IFOA" style={{ height: 28, objectFit: 'contain', opacity: 0.45, filter: 'brightness(0) invert(1)' }} />
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Management</span>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.22)', lineHeight: 1.7 }}>Internal operations platform for IFOA India team members.</p>
            </div>
            {['Platform','Access','Info'].map((col,ci) => {
              const links = [
                [['Features','#features'],['About','#about']],
                [['Sign In','/login'],['Register','/register']],
                [['Privacy','#'],['Terms','#']],
              ][ci];
              return (
                <div key={col}>
                  <h4 style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.75)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{col}</h4>
                  <ul style={{ listStyle: 'none' }}>
                    {links.map(([label,href]) => (
                      <li key={label} style={{ marginBottom: 10 }}>
                        {href.startsWith('/') ? (
                          <Link to={href} style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)', textDecoration: 'none', fontWeight: 500 }}
                            onMouseEnter={e=>e.target.style.color='rgba(255,255,255,0.7)'}
                            onMouseLeave={e=>e.target.style.color='rgba(255,255,255,0.28)'}
                          >{label}</Link>
                        ) : (
                          <a href={href} style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)', textDecoration: 'none', fontWeight: 500 }}
                            onMouseEnter={e=>e.target.style.color='rgba(255,255,255,0.7)'}
                            onMouseLeave={e=>e.target.style.color='rgba(255,255,255,0.28)'}
                          >{label}</a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.18)' }}>© {new Date().getFullYear()} IFOA India. All rights reserved.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.2)', fontWeight: 600 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 8px rgba(34,197,94,.5)', display: 'inline-block' }} />
              All Systems Operational
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

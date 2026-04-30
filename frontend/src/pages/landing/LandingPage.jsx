import { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FolderKanban, CheckSquare, Zap, CalendarDays,
  Megaphone, BarChart3, ArrowRight,
  Radio, ShieldCheck, Lock,
  Shield, Clock, Users, TrendingUp,
  Database, Activity, GitBranch, Bell, FileText, Target, UserCheck, Layers,
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
          background: hov ? bg : '#FFFFFF',
          border: `1.5px solid ${hov ? color + '38' : 'rgba(15,23,42,0.07)'}`,
          borderRadius: 20, padding: '32px 28px 28px',
          position: 'relative', overflow: 'hidden',
          transition: 'all .35s cubic-bezier(.22,1,.36,1)',
          transform: hov ? 'translateY(-6px)' : 'translateY(0)',
          boxShadow: hov ? `0 20px 50px ${color}18` : '0 2px 8px rgba(15,23,42,0.04)',
          cursor: 'default', display: 'flex', flexDirection: 'column', minHeight: 240,
        }}
      >
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg,${color},${color}00)`,
          transform: `scaleX(${hov ? 1 : 0.25})`, transformOrigin: 'left',
          transition: 'transform .4s cubic-bezier(.22,1,.36,1)',
          borderRadius: '20px 20px 0 0',
        }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: `linear-gradient(135deg,${color}18,${color}08)`,
            border: `1.5px solid ${color}20`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform .3s',
            transform: hov ? 'scale(1.1) rotate(-4deg)' : 'scale(1)',
          }}>
            <Icon size={24} color={color} strokeWidth={1.75} />
          </div>
          <span style={{
            padding: '4px 11px', borderRadius: 999, background: bg, color,
            fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', border: `1px solid ${color}22`,
          }}>{tag}</span>
        </div>
        <h3 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 800, color: '#1A1F36' }}>{title}</h3>
        <p style={{ margin: 0, fontSize: 13.5, color: '#64748B', lineHeight: 1.65, flex: 1 }}>{desc}</p>
        <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 8, paddingTop: 16, borderTop: `1px solid ${color}15` }}>
          <span style={{ fontSize: 18, fontWeight: 900, color, letterSpacing: '-0.02em' }}>{stat}</span>
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

        .feature-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; }
        @media(max-width:960px){ .feature-grid{grid-template-columns:repeat(2,1fr);} }
        @media(max-width:600px){ .feature-grid{grid-template-columns:1fr;} }
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
            {[['Platform','#features'],['About','#about'],['Team','#team']].map(([l,h]) => (
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
      <section className="hero-section" style={{ background: '#FFFFFF', position: 'relative' }}>
        <div style={{
          position: 'absolute', inset: '0 50% 0 0',
          backgroundImage: 'radial-gradient(rgba(29,78,216,0.055) 1px,transparent 1px)',
          backgroundSize: '28px 28px', pointerEvents: 'none',
        }} />

        <div style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: 'clamp(40px,6vw,100px) clamp(32px,5vw,80px)',
          position: 'relative', zIndex: 10,
        }}>
          <div className="hero-badge" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '7px 16px', borderRadius: 999,
            background: 'rgba(29,78,216,0.07)', border: '1px solid rgba(29,78,216,0.18)',
            fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: B, width: 'fit-content', marginBottom: 28,
          }}>
            Internal Operations Platform
          </div>

          <h1 className="hero-h1" style={{
            fontSize: 'clamp(38px,4.5vw,64px)', fontWeight: 900, lineHeight: 1.12,
            letterSpacing: '-0.025em', marginBottom: 24, color: B,
          }}>
            One Platform.<br />
            <span style={{ color: '#0F172A' }}>Every Operation.</span>
          </h1>

          <p className="hero-sub" style={{ fontSize: 17, color: '#64748B', lineHeight: 1.75, maxWidth: 460, marginBottom: 40 }}>
            Streamline projects, tasks, sprints, leaves and analytics — purpose-built for the IFOA team.
          </p>

          <div className="hero-btns" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 44 }}>
            <Link to={user ? '/dashboard' : '/register'} className="btn-primary" style={{ padding: '14px 30px', fontSize: 15 }}>
              {user ? 'Go to Dashboard' : 'Get Started'} <ArrowRight size={16} />
            </Link>
            {!user && <Link to="/login" className="btn-ghost" style={{ padding: '13px 26px', fontSize: 15 }}>Sign in</Link>}
          </div>

          <div className="hero-trust" style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
            {/* eslint-disable-next-line no-unused-vars */}
            {TRUST.map(({ icon: Icon, label }) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748B', fontWeight: 600 }}>
                <Icon size={13} color={B} /> {label}
              </span>
            ))}
          </div>
        </div>

        <div className="carousel-wrap" style={{ position: 'relative', alignSelf: 'stretch', overflow: 'hidden', background: '#0A0F1E' }}>
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
              Six Modules. One Unified System.
            </h2>
            <p style={{ fontSize: 16, color: '#64748B', maxWidth: 500, margin: '0 auto', lineHeight: 1.7 }}>
              Every tool your team needs to plan, execute, and report — tightly integrated and always in sync.
            </p>
          </Reveal>
        </div>

        {/* ── STRIP (compact, management content) ── */}
        <div style={{ marginBottom: 56 }}>
          <FeatureStrip />
        </div>

        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 40px', position: 'relative', zIndex: 1 }}>
          <div className="feature-grid">
            {FEATURES.map((f, i) => (
              <FeatureCard key={f.title} {...f} delay={i * 0.07} />
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="about" style={{ background: '#F8FAFF', padding: '100px 40px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <Reveal>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1/-1', borderRadius: 20, overflow: 'hidden', aspectRatio: '16/7', position: 'relative' }}>
                <img src={HeroImg} alt="IFOA Operations" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(29,78,216,0.3),transparent)' }} />
                <div style={{ position: 'absolute', bottom: 16, left: 16, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 700, color: '#0F172A' }}>✈️ IFOA Aviation Operations</div>
              </div>
              <div style={{ borderRadius: 20, overflow: 'hidden', aspectRatio: '4/3', position: 'relative' }}>
                <img src={HeroSection} alt="Platform" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(29,78,216,0.15)' }} />
              </div>
              <div style={{ borderRadius: 20, overflow: 'hidden', aspectRatio: '4/3', position: 'relative', background: '#0F172A' }}>
                <img src={TeamImg} alt="Team" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
                <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.05em' }}>👥 Our Team</div>
              </div>
            </div>
          </Reveal>

          <div>
            <Reveal>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: B, marginBottom: 14 }}>
                <span style={{ width: 24, height: 3, borderRadius: 999, background: B, display: 'inline-block' }} />
                About the Platform
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 style={{ fontSize: 'clamp(30px,3vw,44px)', fontWeight: 900, color: '#0F172A', lineHeight: 1.15, marginBottom: 20, letterSpacing: '-0.02em' }}>
                Built for the IFOA Management Team
              </h2>
            </Reveal>
            <Reveal delay={0.2}>
              <p style={{ fontSize: 15.5, color: '#64748B', lineHeight: 1.75, marginBottom: 32 }}>
                An internal operations platform designed specifically for IFOA India. Manage aviation projects, coordinate your team, track tasks and monitor performance — all from one secure, unified interface.
              </p>
            </Reveal>
            {[
              'Manage projects from planning to deployment',
              'Integrated leave & attendance management',
              'Agile sprint boards with velocity tracking',
              'Broadcast announcements across the team',
            ].map((item, i) => (
              <Reveal key={item} delay={0.25 + i * 0.08}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: `${B}15`, border: `1.5px solid ${B}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke={B} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <span style={{ fontSize: 14.5, color: '#475569', lineHeight: 1.55, fontWeight: 500 }}>{item}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          TEAM — reduced padding, image fully visible
      ══════════════════════════════════════════════ */}
      <section id="team" style={{ background: '#F0F5FF', padding: '40px 40px 48px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <Reveal style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: B, marginBottom: 14 }}>
              <span style={{ width: 24, height: 3, borderRadius: 999, background: B, display: 'inline-block' }} />
              Our People
            </div>
            <h2 style={{ fontSize: 'clamp(28px,3.5vw,42px)', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
              The Team Behind the Platform
            </h2>
          </Reveal>

          <Reveal delay={0.1}>
            <div style={{
              borderRadius: 24, overflow: 'hidden', position: 'relative',
              boxShadow: '0 20px 60px rgba(15,23,42,0.1)',
              maxWidth: 1120,
              margin: '0 auto',
              aspectRatio: '16 / 8.4',
            }}>
              <img
                src={TeamImg}
                alt="IFOA Team"
                style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,transparent 65%,rgba(10,15,40,0.5) 100%)' }} />
              <div style={{ position: 'absolute', bottom: 28, left: 36, color: '#fff' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>IFOA India</div>
                <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.01em' }}>Professionals in Aviation Excellence</div>
              </div>
            </div>
          </Reveal>
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
                [['Features','#features'],['About','#about'],['Team','#team']],
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

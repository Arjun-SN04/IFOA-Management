import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowRight, Shield, Zap, Lock, Users, BarChart2 } from 'lucide-react';
import IFOALogo from '../../assets/IFOA_INDIA.png';

const C = {
  blue:   '#2563EB',
  navy:   '#1E3A8A',
  ink:    '#0F172A',
  mid:    '#64748B',
  dim:    '#94A3B8',
  border: 'rgba(37,99,235,0.12)',
  white:  '#FFFFFF',
};

const Cloud = ({ style }) => (
  <svg viewBox="0 0 220 80" fill="none" style={style}>
    <ellipse cx="110" cy="58" rx="100" ry="26" fill="white" fillOpacity="0.72" />
    <ellipse cx="78"  cy="48" rx="58"  ry="34" fill="white" fillOpacity="0.68" />
    <ellipse cx="148" cy="50" rx="50"  ry="30" fill="white" fillOpacity="0.64" />
    <ellipse cx="110" cy="42" rx="42"  ry="26" fill="white" fillOpacity="0.58" />
  </svg>
);

// clouds: each drifts from off-screen left → off-screen right
const clouds = [
  { w: 340, top: '6%',  startLeft: '-18%', dur: '42s', delay: '0s'   },
  { w: 260, top: '18%', startLeft: '-12%', dur: '56s', delay: '-18s'  },
  { w: 210, top: '52%', startLeft: '-10%', dur: '38s', delay: '-8s'   },
  { w: 290, top: '65%', startLeft: '-15%', dur: '62s', delay: '-30s'  },
  { w: 170, top: '34%', startLeft: '-8%',  dur: '48s', delay: '-22s'  },
  { w: 150, top: '78%', startLeft: '-6%',  dur: '34s', delay: '-12s'  },
  { w: 200, top: '44%', startLeft: '-9%',  dur: '52s', delay: '-40s'  },
];

export default function LandingPage() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <div style={{
      height: '100vh', overflow: 'hidden', position: 'relative',
      background: 'linear-gradient(180deg, #EFF6FF 0%, #DBEAFE 55%, #BFDBFE 100%)',
      fontFamily: "'Inter', sans-serif", color: C.ink,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Cloud drifting: each cloud travels from its start (off left) all the way to off right */
        ${clouds.map((_, i) => `
          @keyframes cloudDrift${i} {
            0%   { transform: translateX(0); }
            100% { transform: translateX(120vw); }
          }
        `).join('')}

        .anim { opacity: 0; animation: fadeUp .6s ease forwards; }

        .btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 11px 26px; border-radius: 8px; border: none;
          background: ${C.blue};
          color: #fff; font-size: 14px; font-weight: 600; cursor: pointer;
          font-family: inherit;
          box-shadow: 0 4px 16px rgba(37,99,235,0.3);
          text-decoration: none; transition: transform .18s, box-shadow .18s, background .18s;
        }
        .btn-primary:hover { background: #1D4ED8; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(37,99,235,0.35); }

        .btn-ghost {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 22px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.8);
          background: rgba(255,255,255,0.6);
          backdrop-filter: blur(10px);
          color: ${C.navy}; font-size: 14px; font-weight: 600;
          cursor: pointer; font-family: inherit; text-decoration: none; transition: all .18s;
        }
        .btn-ghost:hover { background: rgba(255,255,255,0.9); border-color: white; }

        .pill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 12px; border-radius: 6px;
          background: rgba(255,255,255,0.6);
          border: 1px solid rgba(255,255,255,0.85);
          backdrop-filter: blur(8px);
          font-size: 12px; color: ${C.navy}; font-weight: 500;
        }

        .cloud-wrap {
          position: absolute;
          pointer-events: none;
          z-index: 1;
          filter: drop-shadow(0 4px 12px rgba(37,99,235,0.08));
          will-change: transform;
        }
      `}</style>

      {/* ── Moving Clouds ── */}
      {clouds.map((c, i) => (
        <div
          key={i}
          className="cloud-wrap"
          style={{
            top: c.top,
            left: c.startLeft,
            width: c.w,
            animation: `cloudDrift${i} ${c.dur} linear ${c.delay} infinite`,
          }}
        >
          <Cloud style={{ width: '100%', height: 'auto' }} />
        </div>
      ))}

      {/* NAV */}
      <nav style={{
        position: 'fixed', inset: '0 0 auto 0', zIndex: 200, height: 60,
        background: scrolled ? 'rgba(239,246,255,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? `1px solid ${C.border}` : '1px solid transparent',
        transition: 'background .3s, border-color .3s',
        display: 'flex', alignItems: 'center',
      }}>
        <div style={{ maxWidth: 1100, width: '100%', margin: '0 auto', padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <img src={IFOALogo} alt="IFOA" style={{ height: 28, objectFit: 'contain' }} />
            <div style={{ width: 1, height: 16, background: C.border, margin: '0 2px' }} />
          </Link>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {user ? (
              <Link to="/dashboard" className="btn-primary">Dashboard <ArrowRight size={14} /></Link>
            ) : (
              <>
                <Link to="/login"    className="btn-ghost">Sign in</Link>
                <Link to="/register" className="btn-primary">Get access <ArrowRight size={13} /></Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', zIndex: 10, paddingTop: 60,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: 640, padding: '0 24px' }}>

          {/* eyebrow */}
          <div className="anim" style={{ animationDelay: '0.05s', marginBottom: 18 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 14px', borderRadius: 999,
              background: 'rgba(255,255,255,0.65)',
              border: '1px solid rgba(255,255,255,0.9)',
              backdropFilter: 'blur(8px)',
              fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: C.navy,
            }}>
              Internal Portal
            </span>
          </div>

          {/* headline */}
          <h1 className="anim" style={{
            fontSize: 'clamp(34px, 5vw, 56px)', fontWeight: 800,
            lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 14,
            animationDelay: '0.12s', color: C.ink,
          }}>
            IFOA{' '}
            <span style={{ color: C.blue }}>Management</span>
          </h1>

          {/* subline */}
          <p className="anim" style={{
            fontSize: 15, color: C.mid, lineHeight: 1.72,
            maxWidth: 460, marginBottom: 32, fontWeight: 400,
            animationDelay: '0.2s',
          }}>
            Centralized platform for IFOA staff to manage projects, leaves, tasks, sprints, and reports — all in one place.
          </p>

          {/* divider */}
          <div className="anim" style={{ width: 32, height: 2, background: C.blue, borderRadius: 2, marginBottom: 28, opacity: 0.35, animationDelay: '0.26s' }} />

          {/* CTAs */}
          <div className="anim" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', animationDelay: '0.3s' }}>
            <Link to={user ? '/dashboard' : '/login'} className="btn-primary">
              {user ? 'Open Dashboard' : 'Sign In'} <ArrowRight size={15} />
            </Link>
            {!user && <Link to="/register" className="btn-ghost">Request Access</Link>}
          </div>

          {/* feature pills */}
          <div className="anim" style={{
            display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center',
            marginTop: 36, animationDelay: '0.38s',
          }}>
            {[
              { icon: Shield,    label: 'Role-based Access' },
              { icon: BarChart2, label: 'Reports & KPIs'    },
              { icon: Users,     label: 'Team Management'   },
              { icon: Zap,       label: 'Real-time Sync'    },
              { icon: Lock,      label: 'Secure'            },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="pill">
                <Icon size={11} color={C.blue} strokeWidth={2.5} />
                {label}
              </div>
            ))}
          </div>

        </div>
      </section>
    </div>
  );
}

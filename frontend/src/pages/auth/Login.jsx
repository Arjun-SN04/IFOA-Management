import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Clock, Shield, Zap, Users, AlertTriangle } from 'lucide-react';
import IFOAIndia from '../../assets/IFOA_INDIA.png';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [pendingApproval, setPendingApproval] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [focused, setFocused] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setPendingApproval(false);
    setLoading(true);
    try {
      await login(form);
      navigate('/dashboard');
    } catch (err) {
      const data = err.response?.data;
      if (data?.pending) setPendingApproval(true);
      else setError(data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        .login-root *, .login-root *::before, .login-root *::after {
          box-sizing: border-box; font-family: 'Outfit', sans-serif;
        }

        @keyframes loginSlideUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes loginSpin { to { transform: rotate(360deg); } }
        @keyframes bgShift {
          0%,100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }
        @keyframes fadeIn {
          from { opacity: 0; } to { opacity: 1; }
        }

        .login-card { animation: loginSlideUp 0.55s cubic-bezier(.22,1,.36,1) both; }

        .lf-input {
          width: 100%; padding: 14px 14px 14px 46px;
          border: 1.5px solid #E8ECF4; border-radius: 14px;
          font-size: 15px; font-family: 'Outfit', sans-serif;
          color: #1A1F36; background: #FAFBFF; outline: none;
          transition: border-color 0.22s, box-shadow 0.22s, background 0.22s;
        }
        .lf-input::placeholder { color: #BCC3D6; }
        .lf-input:focus {
          border-color: #1D4ED8; background: #fff;
          box-shadow: 0 0 0 4px rgba(29,78,216,0.11);
        }

        .lf-btn {
          width: 100%; padding: 15px; border-radius: 14px; border: none;
          background: linear-gradient(135deg, #1D4ED8 0%, #1D4ED8 50%, #1D4ED8 100%);
          color: #fff; font-size: 15px; font-family: 'Outfit', sans-serif; font-weight: 700;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: transform 0.2s, box-shadow 0.22s, opacity 0.2s;
          box-shadow: 0 6px 24px rgba(29,78,216,0.38);
          position: relative; overflow: hidden; letter-spacing: 0.02em;
        }
        .lf-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(29,78,216,0.46); }
        .lf-btn:active:not(:disabled) { transform: translateY(0); }
        .lf-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .lp-panel { background: #FFFFFF; }

        .eye-btn {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; color: #BCC3D6;
          padding: 3px; display: flex; align-items: center; border-radius: 6px;
          transition: color 0.18s, background 0.18s;
        }
        .eye-btn:hover { color: #1D4ED8; background: rgba(29,78,216,0.08); }

        /* left panel stat row */
        .lp-stat {
          display: flex; align-items: center; gap: 14px;
          padding: 16px 20px; border-radius: 16px;
          background: #F8FAFF;
          border: 1px solid #E2E8F0;
          animation: fadeIn 0.8s ease both;
        }
        .lp-stat-icon {
          width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }

        @media (min-width: 960px) { #login-left { display: flex !important; } }
      `}</style>

      <div className="login-root" style={{
        minHeight: '100vh',
        display: 'flex',
        background: 'linear-gradient(135deg, #EEF2FF 0%, #F0F4FF 50%, #E8EDFF 100%)',
      }}>

        {/* ── Left panel — fixed, professional, no floating cards ── */}
        <div id="login-left" className="lp-panel" style={{
          display: 'none',
          position: 'sticky',
          top: 0,
          height: '100vh',
          flex: '0 0 420px',
          overflow: 'hidden',
          padding: '0 44px',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 0,
        }}>
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: 48 }}>
            {/* Logo */}
            <Link to="/" style={{ display: 'inline-flex', width: 'fit-content' }}>
              <img src={IFOAIndia} alt="IFOA" style={{ height: 44, objectFit: 'contain' }} />
            </Link>

            {/* Tagline */}
            <div>
              <h2 style={{
                margin: '0 0 12px', fontSize: 26, fontWeight: 800,
                color: '#111827', letterSpacing: '-0.02em', lineHeight: 1.2,
              }}>
                Our operations.<br />One platform.
              </h2>
              <p style={{ margin: 0, fontSize: 14, color: '#475569', lineHeight: 1.75 }}>
                Manage projects, sprints, leaves and more — built exclusively for IFOA India.
              </p>
            </div>

            {/* Feature rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { icon: Shield, label: 'Role-based Access Control', sub: 'Admin · Manager · HR · Employee', color: '#818CF8', bg: 'rgba(99,102,241,0.18)' },
                { icon: Zap, label: 'Real-time Sync', sub: 'Live task and sprint updates', color: '#34D399', bg: 'rgba(52,211,153,0.15)' },
                { icon: Users, label: 'Team Collaboration', sub: 'Projects, sprints & leave in one place', color: '#60A5FA', bg: 'rgba(96,165,250,0.15)' },
              ].map(({ icon: Icon, label, sub, color, bg }, i) => (
                <div key={label} className="lp-stat" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="lp-stat-icon" style={{ background: bg }}>
                    <Icon size={18} color={color} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{label}</div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Divider + footer text */}
            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 24 }}>
              <p style={{ margin: 0, fontSize: 11, color: '#94A3B8', letterSpacing: '0.04em', lineHeight: 1.8 }}>
                IFOA Management Platform<br />
                Built exclusively for our organisation. Internal use only.
              </p>
            </div>
          </div>
        </div>

        {/* ── Right: Form ── */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 20px',
          background: '#FFFFFF',
          overflowY: 'auto',
        }}>
          <div className="login-card" style={{ width: '100%', maxWidth: 440 }}>

            {/* Logo — centered above card */}
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <h1 style={{
                margin: '0 0 8px', fontSize: 28, fontWeight: 800,
                color: '#1A1F36', letterSpacing: '-0.025em', lineHeight: 1.1,
              }}>Welcome back</h1>
              <p style={{ margin: 0, fontSize: 15, color: '#6B7280', fontWeight: 400 }}>
                Sign in to your IFOA account
              </p>
            </div>

            {/* Card */}
            <div style={{
              background: '#fff', borderRadius: 24, padding: '36px 32px',
              boxShadow: '0 10px 50px rgba(29,78,216,0.10), 0 2px 8px rgba(0,0,0,0.05)',
              border: '1px solid rgba(29,78,216,0.08)',
            }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {error && (
                  <div style={{
                    padding: '12px 16px', background: '#FFF1F2', border: '1px solid #FECDD3',
                    borderRadius: 12, fontSize: 14, color: '#E11D48', fontWeight: 500,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <AlertTriangle size={16} style={{ flexShrink: 0 }} /> {error}
                  </div>
                )}

                {pendingApproval && (
                  <div style={{
                    padding: '14px 16px', background: '#FFFBEB', border: '1px solid #FDE68A',
                    borderRadius: 14, display: 'flex', alignItems: 'flex-start', gap: 10,
                  }}>
                    <Clock size={15} style={{ color: '#D97706', flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#92400E' }}>Account Pending Approval</p>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#92400E', lineHeight: 1.6 }}>
                        An admin, manager, or HR will review and approve your account.
                      </p>
                    </div>
                  </div>
                )}

                {/* Email */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                    Email address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{
                      position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                      color: focused === 'email' ? '#1D4ED8' : '#BCC3D6', transition: 'color 0.2s',
                    }} />
                    <input
                      className="lf-input" type="email" required
                      value={form.email} onChange={set('email')}
                      onFocus={() => setFocused('email')} onBlur={() => setFocused('')}
                      placeholder="you@ifoa.com"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{
                      position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                      color: focused === 'pwd' ? '#1D4ED8' : '#BCC3D6', transition: 'color 0.2s',
                    }} />
                    <input
                      className="lf-input" type={showPwd ? 'text' : 'password'} required
                      value={form.password} onChange={set('password')}
                      onFocus={() => setFocused('pwd')} onBlur={() => setFocused('')}
                      placeholder="••••••••" style={{ paddingRight: 46 }}
                    />
                    <button type="button" className="eye-btn" onClick={() => setShowPwd(v => !v)} tabIndex={-1}>
                      {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button type="submit" disabled={loading} className="lf-btn" style={{ marginTop: 4 }}>
                  {loading ? (
                    <span style={{
                      width: 20, height: 20,
                      border: '2.5px solid rgba(255,255,255,0.35)', borderTopColor: '#fff',
                      borderRadius: '50%', animation: 'loginSpin 0.75s linear infinite',
                      display: 'inline-block',
                    }} />
                  ) : (
                    <>Sign in <ArrowRight size={16} /></>
                  )}
                </button>
              </form>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

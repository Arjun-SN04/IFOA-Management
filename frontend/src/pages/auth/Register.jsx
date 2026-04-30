import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../../api';
import {
  UserPlus, User, Briefcase, UserCog,
  Eye, EyeOff, Mail, Lock, UserCircle,
  Clock, CheckCircle2, ArrowRight, AlertTriangle,
  FolderKanban, CalendarDays, BarChart3,
} from 'lucide-react';
import IFOAIndia from '../../assets/IFOA_INDIA.png';

const ROLE_OPTIONS = [
  { value: 'employee', label: 'Employee', icon: User, color: '#1D4ED8', bg: '#EEF2FF', desc: 'Standard team member' },
  { value: 'manager', label: 'Manager', icon: Briefcase, color: '#7C3AED', bg: '#F5F3FF', desc: 'Team lead / supervisor' },
  { value: 'hr', label: 'HR', icon: UserCog, color: '#059669', bg: '#ECFDF5', desc: 'Human resources staff' },
];

const DEPARTMENTS = [
  'Operations', 'Training & Development', 'Finance & Accounts', 'Human Resources',
  'Information Technology', 'Safety & Compliance', 'Customer Relations', 'Ground Handling',
  'Air Traffic Management', 'Engineering & Maintenance', 'Administration',
  'Marketing & Communications', 'Legal & Regulatory', 'Procurement & Logistics',
];

const DESIGNATIONS = {
  employee: [
    'Flight Operations Officer', 'Ground Crew Member', 'Training Coordinator',
    'Customer Service Executive', 'Safety Inspector', 'Data Entry Operator',
    'Administrative Assistant', 'Finance Executive', 'IT Support Analyst',
    'Maintenance Technician', 'Dispatch Officer', 'Quality Assurance Officer',
    'Logistics Coordinator', 'Documentation Specialist',
  ],
  manager: [
    'Operations Manager', 'Training Manager', 'Finance Manager', 'HR Manager',
    'IT Manager', 'Safety Manager', 'Customer Relations Manager',
    'Ground Operations Manager', 'Project Manager', 'Department Head',
    'Team Lead', 'Senior Manager', 'Area Manager',
  ],
  hr: [
    'HR Executive', 'HR Business Partner', 'Talent Acquisition Specialist',
    'Learning & Development Specialist', 'Compensation & Benefits Analyst',
    'HR Coordinator', 'Employee Relations Officer', 'Payroll Specialist',
    'HR Operations Manager', 'Recruitment Consultant',
  ],
};

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'employee', department: '', designation: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(null);
  const [showPwd, setShowPwd] = useState(false);
  const [focused, setFocused] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.register(form);
      if (res.data?.pending) setRegistered({ name: form.name, email: form.email });
      else navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const setRole = (val) => setForm({ ...form, role: val, designation: '' });
  const selectedRole = ROLE_OPTIONS.find(r => r.value === form.role);
  const designationOptions = DESIGNATIONS[form.role] || [];

  /* ── Pending screen ── */
  if (registered) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
          .reg-root *, .reg-root *::before, .reg-root *::after { box-sizing: border-box; font-family: 'Outfit', sans-serif; }
          @keyframes regSlideUp { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes pendPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
          .pend-icon { animation: pendPulse 3s ease-in-out infinite; }
        `}</style>
        <div className="reg-root" style={{
          minHeight: '100vh', background: 'linear-gradient(135deg, #EEF2FF 0%, #F0F4FF 50%, #E8EDFF 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div style={{ width: '100%', maxWidth: 480, animation: 'regSlideUp 0.6s cubic-bezier(.22,1,.36,1) both' }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <Link to="/"><img src={IFOAIndia} alt="IFOA" style={{ height: 50, objectFit: 'contain' }} /></Link>
            </div>
            <div style={{
              background: '#fff', borderRadius: 26, padding: '44px 36px',
              boxShadow: '0 10px 50px rgba(29,78,216,0.10)', border: '1px solid rgba(29,78,216,0.08)', textAlign: 'center',
            }}>
              <div className="pend-icon" style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'linear-gradient(135deg, #FFF7ED, #FFEDD5)', border: '2px solid #FED7AA',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px',
              }}>
                <Clock size={32} style={{ color: '#EA580C' }} />
              </div>
              <h2 style={{ margin: '0 0 10px', fontSize: 24, fontWeight: 800, color: '#1A1F36', letterSpacing: '-0.02em' }}>
                Registration Submitted!
              </h2>
              <p style={{ margin: '0 0 24px', fontSize: 15, color: '#6B7280', lineHeight: 1.7 }}>
                Hi <strong style={{ color: '#1A1F36' }}>{registered.name}</strong>, your account is now{' '}
                <strong style={{ color: '#D97706' }}>pending approval</strong>.
              </p>
              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 16, padding: '18px 20px', marginBottom: 20, textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <Clock size={14} style={{ color: '#D97706', flexShrink: 0, marginTop: 3 }} />
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#92400E' }}>What happens next?</p>
                    <ul style={{ margin: '8px 0 0', padding: '0 0 0 16px', fontSize: 13, color: '#92400E', lineHeight: 1.9 }}>
                      <li>An admin, manager, or HR will review your account</li>
                      <li>You'll receive access once they approve</li>
                      <li>Login with your email &amp; password after approval</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, marginBottom: 28 }}>
                <CheckCircle2 size={14} style={{ color: '#059669', flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: 13, color: '#065F46' }}>Registered: <strong>{registered.email}</strong></p>
              </div>
              <Link to="/login" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px',
                background: 'linear-gradient(135deg, #1D4ED8, #1D4ED8)', color: '#fff',
                fontSize: 15, fontWeight: 700, borderRadius: 14, textDecoration: 'none',
                boxShadow: '0 6px 24px rgba(29,78,216,0.36)',
              }}>
                Go to Login <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  /* ── Main register form ── */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        .reg-root *, .reg-root *::before, .reg-root *::after { box-sizing: border-box; font-family: 'Outfit', sans-serif; }

        @keyframes regSlideUp { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes regSpin { to { transform: rotate(360deg); } }
        @keyframes bgShift {
          0%,100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .reg-card { animation: regSlideUp 0.55s cubic-bezier(.22,1,.36,1) both; }

        .rf-input {
          width: 100%; padding: 13px 13px 13px 42px;
          border: 1.5px solid #E8ECF4; border-radius: 12px;
          font-size: 14px; font-family: 'Outfit', sans-serif;
          color: #1A1F36; background: #FAFBFF; outline: none;
          transition: border-color 0.22s, box-shadow 0.22s, background 0.22s;
        }
        .rf-input::placeholder { color: #BCC3D6; }
        .rf-input:focus { border-color: #1D4ED8; background: #fff; box-shadow: 0 0 0 4px rgba(29,78,216,0.11); }

        .rf-select-wrap { position: relative; }
        .rf-select {
          width: 100%; padding: 12px 36px 12px 14px;
          border: 1.5px solid #E8ECF4; border-radius: 12px;
          font-size: 14px; font-family: 'Outfit', sans-serif;
          color: #1A1F36; background: #FAFBFF; outline: none;
          appearance: none; cursor: pointer;
          transition: border-color 0.22s, box-shadow 0.22s;
        }
        .rf-select:focus { border-color: #1D4ED8; background: #fff; box-shadow: 0 0 0 4px rgba(29,78,216,0.11); }
        .rf-select-wrap::after {
          content: ''; position: absolute; right: 13px; top: 50%; transform: translateY(-50%);
          width: 0; height: 0;
          border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 5px solid #94A3B8;
          pointer-events: none;
        }

        .role-card {
          flex: 1; min-width: 0;
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          padding: 14px 10px; border-radius: 14px;
          border: 1.5px solid #E8ECF4; background: #FAFBFF;
          cursor: pointer; text-align: center;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s, transform 0.18s;
        }
        .role-card:hover { transform: translateY(-2px); }

        .rf-btn {
          width: 100%; padding: 14px; border-radius: 14px; border: none;
          background: linear-gradient(135deg, #1D4ED8 0%, #1D4ED8 100%);
          color: #fff; font-size: 15px; font-family: 'Outfit', sans-serif; font-weight: 700;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: transform 0.2s, box-shadow 0.22s, opacity 0.2s;
          box-shadow: 0 6px 24px rgba(29,78,216,0.36); letter-spacing: 0.01em;
        }
        .rf-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(29,78,216,0.44); }
        .rf-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .eye-btn {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; color: #BCC3D6;
          padding: 3px; display: flex; align-items: center; border-radius: 6px;
          transition: color 0.18s, background 0.18s;
        }
        .eye-btn:hover { color: #1D4ED8; background: rgba(29,78,216,0.08); }

        .rp-panel { background: #FFFFFF; }

        .rp-stat {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 18px; border-radius: 14px;
          background: #F8FAFF; border: 1px solid #E2E8F0;
          animation: fadeIn 0.8s ease both;
        }
        .rp-stat-icon {
          width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }

        @media (min-width: 1000px) { #reg-left { display: flex !important; } }
      `}</style>

      <div className="reg-root" style={{
        minHeight: '100vh', display: 'flex',
        background: 'linear-gradient(135deg, #EEF2FF 0%, #F0F4FF 50%, #E8EDFF 100%)',
      }}>

        {/* ── Left panel — fixed, professional, colorful logo ── */}
        <div id="reg-left" className="rp-panel" style={{
          display: 'none',
          position: 'sticky',
          top: 0,
          height: '100vh',
          flex: '0 0 380px',
          overflow: 'hidden',
          padding: '0 40px',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 0,
        }}>
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: 40 }}>
            {/* Colorful logo — original colors (no filter) */}
            <Link to="/" style={{ display: 'inline-flex', width: 'fit-content' }}>
              <img src={IFOAIndia} alt="IFOA" style={{ height: 44, objectFit: 'contain' }} />
            </Link>

            {/* Tagline */}
            <div>
              <h2 style={{ margin: '0 0 10px', fontSize: 24, fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
                Join our team's<br />workspace.
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.75 }}>
                Create your IFOA account. An admin will review and approve your request before you can log in.
              </p>
            </div>

            {/* Feature rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: FolderKanban, label: 'Projects & Sprints', sub: 'Track work across the team', color: '#818CF8', bg: 'rgba(99,102,241,0.18)' },
                { icon: CalendarDays, label: 'Leave Management', sub: 'Apply & approve leave easily', color: '#34D399', bg: 'rgba(52,211,153,0.15)' },
                { icon: BarChart3, label: 'Reports & Analytics', sub: 'Live dashboards & exports', color: '#60A5FA', bg: 'rgba(96,165,250,0.15)' },
              ].map(({ icon: Icon, label, sub, color, bg }, i) => (
                <div key={label} className="rp-stat" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="rp-stat-icon" style={{ background: bg }}>
                    <Icon size={16} color={color} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>{label}</div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 22 }}>
              <p style={{ margin: 0, fontSize: 11, color: '#94A3B8', letterSpacing: '0.04em', lineHeight: 1.8 }}>
                IFOA Management Platform<br />
                Internal use only.
              </p>
            </div>
          </div>
        </div>

        {/* ── Right: Form (scrollable) ── */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'flex-start',
          justifyContent: 'center', padding: '40px 20px 56px',
          overflowY: 'auto',
        }}>
          <div className="reg-card" style={{ width: '100%', maxWidth: 520 }}>

            {/* Logo — only on right side when left panel is hidden (mobile), centered */}
            <div style={{ textAlign: 'center', marginBottom: 28 }} id="reg-mobile-logo">
              <Link to="/"><img src={IFOAIndia} alt="IFOA" style={{ height: 48, objectFit: 'contain' }} /></Link>
              <h1 style={{ margin: '14px 0 6px', fontSize: 26, fontWeight: 800, color: '#1A1F36', letterSpacing: '-0.025em' }}>
                Create your account
              </h1>
              <p style={{ margin: 0, fontSize: 14, color: '#6B7280' }}>
                Fill in your details — an admin will approve your request.
              </p>
            </div>

            {/* Hide logo header on desktop since left panel shows logo */}
            <style>{`
              @media (min-width: 1000px) { #reg-mobile-logo { display: none !important; } }
            `}</style>

            {/* Desktop: just title without logo (no duplication) */}
            <div id="reg-desktop-title" style={{ display: 'none', marginBottom: 28 }}>
              <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 800, color: '#1A1F36', letterSpacing: '-0.025em' }}>
                Create your account
              </h1>
              <p style={{ margin: 0, fontSize: 14, color: '#6B7280' }}>
                Fill in your details — an admin will approve your request.
              </p>
            </div>
            <style>{`
              @media (min-width: 1000px) { #reg-desktop-title { display: block !important; } }
            `}</style>

            {/* Form card */}
            <div style={{
              background: '#fff', borderRadius: 24, padding: '30px 28px',
              boxShadow: '0 10px 50px rgba(29,78,216,0.10), 0 2px 8px rgba(0,0,0,0.05)',
              border: '1px solid rgba(29,78,216,0.08)',
            }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                {error && (
                  <div style={{
                    padding: '12px 16px', background: '#FFF1F2', border: '1px solid #FECDD3',
                    borderRadius: 12, fontSize: 14, color: '#E11D48', fontWeight: 500,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <AlertTriangle size={16} style={{ flexShrink: 0 }} /> {error}
                  </div>
                )}

                {/* Approval notice */}
                <div style={{
                  padding: '11px 14px', background: '#FFFBEB', border: '1px solid #FDE68A',
                  borderRadius: 12, fontSize: 13, color: '#92400E',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <Clock size={13} style={{ flexShrink: 0 }} />
                  Account requires approval from HR, Admin, or Manager before you can log in.
                </div>

                {/* Name + Email */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 7 }}>Full Name</label>
                    <div style={{ position: 'relative' }}>
                      <UserCircle size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: focused === 'name' ? '#1D4ED8' : '#BCC3D6', transition: 'color 0.2s' }} />
                      <input className="rf-input" value={form.name} onChange={set('name')} onFocus={() => setFocused('name')} onBlur={() => setFocused('')} placeholder="John Doe" required />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 7 }}>Email</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: focused === 'email' ? '#1D4ED8' : '#BCC3D6', transition: 'color 0.2s' }} />
                      <input className="rf-input" type="email" value={form.email} onChange={set('email')} onFocus={() => setFocused('email')} onBlur={() => setFocused('')} placeholder="you@ifoa.com" required />
                    </div>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 7 }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: focused === 'pwd' ? '#1D4ED8' : '#BCC3D6', transition: 'color 0.2s' }} />
                    <input
                      className="rf-input" type={showPwd ? 'text' : 'password'}
                      value={form.password} onChange={set('password')}
                      onFocus={() => setFocused('pwd')} onBlur={() => setFocused('')}
                      placeholder="Minimum 6 characters" required minLength={6}
                      style={{ paddingRight: 42 }}
                    />
                    <button type="button" className="eye-btn" onClick={() => setShowPwd(v => !v)} tabIndex={-1}>
                      {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Role selector — column layout, properly contained */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Your Role</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {ROLE_OPTIONS.map(({ value, label, icon: Icon, color, bg, desc }) => {
                      const isSel = form.role === value;
                      return (
                        <button
                          key={value} type="button" className="role-card"
                          onClick={() => setRole(value)}
                          style={{
                            borderColor: isSel ? color : '#E8ECF4',
                            background: isSel ? bg : '#FAFBFF',
                            boxShadow: isSel ? `0 0 0 3px ${color}22` : 'none',
                          }}
                        >
                          <div style={{
                            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                            background: isSel ? color : '#F1F5F9',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'background 0.2s',
                          }}>
                            <Icon size={15} color={isSel ? '#fff' : '#94A3B8'} />
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: isSel ? color : '#374151', lineHeight: 1 }}>{label}</div>
                          <div style={{ fontSize: 10, color: '#94A3B8', lineHeight: 1.3, textAlign: 'center' }}>{desc}</div>
                          <div style={{
                            width: 14, height: 14, borderRadius: '50%',
                            border: `2px solid ${isSel ? color : '#D1D5DB'}`,
                            background: isSel ? color : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s',
                          }}>
                            {isSel && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff' }} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Additional info */}
                <div style={{ padding: '16px 18px', background: '#F8FAFF', border: '1.5px solid #E8ECF4', borderRadius: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Additional Information</span>
                    <span style={{ fontSize: 10, color: '#94A3B8', padding: '2px 8px', background: '#EEF2FF', borderRadius: 999 }}>Optional</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 7 }}>Department</label>
                      <div className="rf-select-wrap">
                        <select className="rf-select" value={form.department} onChange={set('department')}>
                          <option value="">Select department…</option>
                          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 7 }}>Designation</label>
                      <div className="rf-select-wrap">
                        <select className="rf-select" value={form.designation} onChange={set('designation')}>
                          <option value="">Select designation…</option>
                          {designationOptions.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <button type="submit" disabled={loading} className="rf-btn" style={{ marginTop: 4 }}>
                  {loading ? (
                    <span style={{ width: 20, height: 20, border: '2.5px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%', animation: 'regSpin 0.75s linear infinite', display: 'inline-block' }} />
                  ) : (
                    <><UserPlus size={16} /> Create {selectedRole?.label} Account</>
                  )}
                </button>
              </form>
            </div>

            <p style={{ textAlign: 'center', fontSize: 14, color: '#6B7280', marginTop: 22, fontWeight: 400 }}>
              Already have an account?{' '}
              <Link to="/login" style={{ fontWeight: 700, color: '#1D4ED8', textDecoration: 'none' }}>Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

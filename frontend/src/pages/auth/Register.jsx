import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../../api';
import { UserPlus, Briefcase, User, Clock, CheckCircle2 } from 'lucide-react';
import IFOAIndia from '../../assets/IFOA_INDIA.png';

const ROLE_OPTIONS = [
  {
    value: 'employee',
    label: 'Employee',
    icon: User,
    description: 'View & manage your assigned tasks',
    color: '#3B82F6',
    bg: '#EFF6FF',
  },
  {
    value: 'manager',
    label: 'Manager',
    icon: Briefcase,
    description: 'Create projects, manage teams & assign tasks',
    color: '#8B5CF6',
    bg: '#F5F3FF',
  },
];

export default function Register() {
  const LOGO_SHIFT_X_PX = -10;
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'employee',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // After successful registration show pending-approval screen
  const [registered, setRegistered] = useState(null); // { name, email }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.register(form);
      if (res.data?.pending) {
        // Show the pending-approval message instead of redirecting to login
        setRegistered({ name: form.name, email: form.email });
      } else {
        navigate('/login');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const setRole = (val) => setForm({ ...form, role: val });

  const fieldCls = 'w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-colors';

  const selectedRole = ROLE_OPTIONS.find(r => r.value === form.role);

  // ── Pending Approval Screen ───────────────────────────────────────────────
  if (registered) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ width: '100%', maxWidth: 480, textAlign: 'center' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', transform: `translateX(${LOGO_SHIFT_X_PX}px)` }}>
              <img src={IFOAIndia} alt="IFOA" style={{ height: 56, width: 'auto', objectFit: 'contain', margin: '0 auto' }} />
            </Link>
          </div>
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: 36, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FFF7ED', border: '2px solid #FED7AA', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Clock size={28} style={{ color: '#EA580C' }} />
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: '#0F172A' }}>
              Registration Submitted!
            </h2>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>
              Hi <strong>{registered.name}</strong>, your account has been created and is now <strong>pending approval</strong>.
            </p>
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '14px 16px', marginBottom: 20, textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <Clock size={15} style={{ color: '#D97706', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#92400E' }}>What happens next?</p>
                  <ul style={{ margin: '6px 0 0', padding: '0 0 0 14px', fontSize: 12, color: '#92400E', lineHeight: 1.7 }}>
                    <li>An admin, manager, or HR will review your registration</li>
                    <li>Once approved, you'll be able to log in with your credentials</li>
                    <li>You will receive a notification when approved</li>
                  </ul>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, marginBottom: 20 }}>
              <CheckCircle2 size={14} style={{ color: '#059669', flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: 12, color: '#475569' }}>Registered with: <strong>{registered.email}</strong></p>
            </div>
            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 24px', background: '#3B82F6', color: '#fff', fontSize: 13, fontWeight: 700, borderRadius: 10, textDecoration: 'none' }}>
              Go to Login
            </Link>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', width: '100%', transform: `translateX(${LOGO_SHIFT_X_PX}px)` }}>
            <img src={IFOAIndia} alt="IFOA" style={{ height: 56, width: 'auto', objectFit: 'contain', margin: '0 auto' }} />
          </Link>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '8px 0 4px', letterSpacing: '-0.01em' }}>
            Create your account
          </h1>
          <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
            Fill in your details to get started — an admin will review and approve your account.
          </p>
        </div>

        {/* Card */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: 28, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {error && (
              <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, fontSize: 13, color: '#DC2626' }}>
                {error}
              </div>
            )}

            {/* Approval notice */}
            <div style={{ padding: '10px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, fontSize: 12, color: '#92400E', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={13} style={{ flexShrink: 0 }} />
              Your account will require approval from admin, manager, or HR before you can log in.
            </div>

            {/* Name + Email */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Full Name</label>
                <input className={fieldCls} value={form.name} onChange={set('name')} placeholder="John Doe" required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email</label>
                <input type="email" className={fieldCls} value={form.email} onChange={set('email')} placeholder="you@company.com" required />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Password</label>
              <input type="password" className={fieldCls} value={form.password} onChange={set('password')} placeholder="Minimum 6 characters" required minLength={6} />
            </div>

            {/* Role Selection — Card-based */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 10 }}>
                Select Your Role
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ROLE_OPTIONS.map(({ value, label, icon: Icon, description, color, bg }) => {
                  const isSelected = form.role === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRole(value)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 14px',
                        borderRadius: 10,
                        border: `1.5px solid ${isSelected ? color : '#E2E8F0'}`,
                        background: isSelected ? bg : '#FAFAFA',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s',
                        width: '100%',
                      }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: isSelected ? color : '#E5E7EB',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, transition: 'all 0.15s',
                      }}>
                        <Icon size={16} color={isSelected ? '#fff' : '#6B7280'} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: isSelected ? color : '#374151' }}>
                          {label}
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: '#6B7280', marginTop: 1 }}>
                          {description}
                        </p>
                      </div>
                      <div style={{
                        width: 16, height: 16, borderRadius: '50%',
                        border: `2px solid ${isSelected ? color : '#D1D5DB'}`,
                        background: isSelected ? color : 'transparent',
                        flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isSelected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '11px 20px',
              background: selectedRole?.color || '#3B82F6',
              color: '#fff', fontSize: 14, fontWeight: 700,
              border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1, transition: 'all 0.2s',
              fontFamily: 'inherit',
            }}>
              {loading ? (
                <span style={{ width: 16, height: 16, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
              ) : (
                <>
                  <UserPlus size={15} />
                  Create {selectedRole?.label} Account
                </>
              )}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#64748B', marginTop: 16 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ fontWeight: 600, color: '#3B82F6', textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

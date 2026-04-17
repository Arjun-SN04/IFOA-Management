import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../../api';
import { UserPlus, ShieldCheck, Briefcase, User } from 'lucide-react';
import IFOAWhite from '../../assets/IFOA_white.png';

const ROLE_OPTIONS = [
  {
    value: 'employee',
    label: 'User',
    icon: User,
    description: 'View & manage your assigned tasks',
    color: '#3B82F6',
    bg: '#EFF6FF',
  },
  {
    value: 'manager',
    label: 'Management',
    icon: Briefcase,
    description: 'Create projects, manage teams & assign tasks',
    color: '#8B5CF6',
    bg: '#F5F3FF',
  },
  {
    value: 'admin',
    label: 'Admin',
    icon: ShieldCheck,
    description: 'Full system control & user management',
    color: '#EF4444',
    bg: '#FEF2F2',
  },
];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    department: '', designation: '', role: 'employee',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authAPI.register(form);
      navigate('/login');
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

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
            <img src={IFOAWhite} alt="IFOA" style={{ height: 64, width: 'auto', objectFit: 'contain' }} />
          </Link>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '8px 0 4px', letterSpacing: '-0.01em' }}>
            Create your account
          </h1>
          <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
            Fill in your details to get started
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

            {/* Department + Designation */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Department</label>
                <select className={fieldCls} value={form.department} onChange={set('department')}>
                  <option value="">Select</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Design">Design</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Sales">Sales</option>
                  <option value="HR">HR</option>
                  <option value="Finance">Finance</option>
                  <option value="Operations">Operations</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Designation</label>
                <input className={fieldCls} value={form.designation} onChange={set('designation')} placeholder="e.g. Developer" />
              </div>
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

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogIn, Clock } from 'lucide-react';
import IFOAIndia from '../../assets/IFOA_INDIA.png';

export default function Login() {
  const LOGO_SHIFT_X_PX = -10;
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [pendingApproval, setPendingApproval] = useState(false);
  const [loading, setLoading] = useState(false);

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
      if (data?.pending) {
        // Account exists but not yet approved
        setPendingApproval(true);
      } else {
        setError(data?.message || 'Invalid credentials');
      }
    } finally {
      setLoading(false);
    }
  };

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fadeInUp">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" style={{ transform: `translateX(${LOGO_SHIFT_X_PX}px)` }} className="inline-flex items-center justify-center mx-auto mb-4 no-underline">
            <div className="px-2 rounded-xl flex items-center justify-center">
              <img src={IFOAIndia} alt="IFOA" className="h-14 w-auto object-contain mx-auto" />
            </div>
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Welcome back</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to your account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Pending approval notice */}
          {pendingApproval && (
            <div style={{ padding: '12px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <Clock size={15} style={{ color: '#D97706', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#92400E' }}>Account Pending Approval</p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
                  Your account is awaiting approval from an admin, manager, or HR. You'll be able to log in once approved.
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input
              type="email" required value={form.email} onChange={set('email')}
              placeholder="you@company.com"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
            <input
              type="password" required value={form.password} onChange={set('password')}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-colors"
            />
          </div>

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-700 text-white text-sm font-medium rounded-lg
              hover:bg-blue-800 disabled:opacity-50 transition-colors cursor-pointer">
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Sign in
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-blue-700 hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  );
}

import { X, Inbox, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { useEffect } from 'react';

// ─── Button ───────────────────────────────────────────────────────────────────
export function Button({
  children, onClick, type = 'button', variant = 'primary',
  size = 'md', disabled = false, className = '', loading = false
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
  const variants = {
    primary:   'bg-blue-700 text-white hover:bg-blue-800 focus:ring-blue-400 shadow-sm',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 focus:ring-slate-300 shadow-sm',
    danger:    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm',
    ghost:     'text-slate-600 hover:bg-slate-100 focus:ring-slate-300',
    success:   'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 shadow-sm',
    warning:   'bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-400 shadow-sm',
  }
  const sizes = {
    xs: 'px-2.5 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>
      {loading && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  )
}

// ─── Input ────────────────────────────────────────────────────────────────────
export function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      <input
        className={`w-full px-3.5 py-2.5 text-sm rounded-lg border transition-colors duration-150
          ${error ? 'border-red-400 focus:ring-red-300' : 'border-slate-200 focus:ring-slate-300'}
          bg-white text-slate-900 placeholder:text-slate-400
          focus:outline-none focus:ring-2 focus:border-transparent ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── Select ───────────────────────────────────────────────────────────────────
export function Select({ label, error, children, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      <select
        className={`w-full px-3.5 py-2.5 text-sm rounded-lg border transition-colors duration-150
          ${error ? 'border-red-400 focus:ring-red-300' : 'border-slate-200 focus:ring-slate-300'}
          bg-white text-slate-900 focus:outline-none focus:ring-2 focus:border-transparent ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── Textarea ─────────────────────────────────────────────────────────────────
export function Textarea({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      <textarea
        rows={3}
        className={`w-full px-3.5 py-2.5 text-sm rounded-lg border resize-none transition-colors duration-150
          ${error ? 'border-red-400 focus:ring-red-300' : 'border-slate-200 focus:ring-slate-300'}
          bg-white text-slate-900 placeholder:text-slate-400
          focus:outline-none focus:ring-2 focus:border-transparent ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, className = '', onClick }) {
  return (
    <div onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200 ${onClick ? 'cursor-pointer hover:shadow-md hover:border-slate-300 transition-all duration-200' : ''} ${className}`}>
      {children}
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${sizes[size]} max-h-[90vh] overflow-y-auto scrollbar-thin animate-scaleIn`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────
export function Badge({ children, variant = 'default', className = '' }) {
  const colors = {
    default: { dot: '#94a3b8', text: '#64748b' },
    primary: { dot: '#2563eb', text: '#2563eb' },
    success: { dot: '#10b981', text: '#059669' },
    warning: { dot: '#f59e0b', text: '#d97706' },
    danger:  { dot: '#ef4444', text: '#dc2626' },
    info:    { dot: '#0ea5e9', text: '#0284c7' },
    purple:  { dot: '#8b5cf6', text: '#7c3aed' },
  }
  const c = colors[variant] || colors.default;
  return (
    <span className={`text-xs font-semibold ${className}`} style={{ color: c.text }}>
      {children}
    </span>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
export function Avatar({ name = '', src, size = 'md', className = '' }) {
  const sizes = { xs: 'w-6 h-6 text-[10px]', sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-lg' }
  const colors = ['bg-slate-700','bg-zinc-700','bg-stone-700','bg-neutral-700','bg-gray-700','bg-slate-600','bg-zinc-600','bg-stone-600']
  const color = colors[(name.charCodeAt(0) || 0) % colors.length]
  if (src) return <img src={src} alt={name} className={`${sizes[size]} rounded-full object-cover ${className}`} />
  return (
    <div className={`${sizes[size]} ${color} rounded-full flex items-center justify-center text-white font-semibold shrink-0 ${className}`}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div className={`${sizes[size]} border-[3px] border-blue-100 border-t-blue-700 rounded-full animate-spin ${className}`} />
  )
}

// ─── Empty ────────────────────────────────────────────────────────────────────
export function Empty({ icon: Icon = Inbox, title = 'Nothing here', description = '', action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fadeInUp">
      <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
        {typeof Icon === 'function' ? <Icon className="w-6 h-6 text-slate-400" /> : <Inbox className="w-6 h-6 text-slate-400" />}
      </div>
      <h3 className="text-base font-semibold text-slate-700 mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-400 mb-4 max-w-xs">{description}</p>}
      {action}
    </div>
  )
}

// ─── Alert ────────────────────────────────────────────────────────────────────
export function Alert({ children, variant = 'error' }) {
  const config = {
    error:   { cls: 'bg-red-50 border-red-200 text-red-700', Icon: AlertCircle },
    success: { cls: 'bg-emerald-50 border-emerald-200 text-emerald-700', Icon: CheckCircle },
    warning: { cls: 'bg-amber-50 border-amber-200 text-amber-700', Icon: AlertTriangle },
    info:    { cls: 'bg-sky-50 border-sky-200 text-sky-700', Icon: Info },
  }
  const { cls, Icon } = config[variant] || config.error
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium ${cls}`}>
      <Icon className="w-4 h-4 shrink-0" />
      {children}
    </div>
  )
}

// ─── PageHeader ───────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col items-center justify-center mb-8 space-y-3">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-slate-900 transition-all duration-300 hover:text-blue-600 hover:scale-105 cursor-default">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-2 hover:text-slate-600 transition-colors duration-300">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 mt-4">{actions}</div>}
    </div>
  )
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, icon: Icon, trend, color = 'slate' }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
          {trend && <p className="text-xs text-slate-400 mt-1">{trend}</p>}
        </div>
        {Icon && (
          <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center">
            <Icon className="w-5 h-5 text-slate-600" />
          </div>
        )}
      </div>
    </Card>
  )
}

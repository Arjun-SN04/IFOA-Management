export default function Badge({ label, type = 'default' }) {
  const colorMap = {
    todo: '#6b7280', in_progress: '#3b82f6', in_review: '#f59e0b',
    done: '#10b981', blocked: '#ef4444', default: '#6b7280',
    high: '#ef4444', medium: '#f59e0b', low: '#10b981',
    pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444',
    active: '#3b82f6', completed: '#10b981', planning: '#8b5cf6',
  };
  const color = colorMap[type] || colorMap.default;
  return (
    <span className="badge-pill" style={{ background: color + '22', color, border: `1px solid ${color}55` }}>
      {label}
    </span>
  );
}

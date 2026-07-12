export default function Badge({ label, type = 'default' }) {
  const colorMap = {
    todo: '#6b7280', in_progress: '#3b82f6', in_review: '#f59e0b',
    done: '#10b981', blocked: '#ef4444', default: '#6b7280',
    high: '#ef4444', medium: '#d97706', low: '#16a34a',
    pending: '#d97706', approved: '#10b981', rejected: '#ef4444',
    active: '#3b82f6', completed: '#10b981', planning: '#8b5cf6',
  };
  const color = colorMap[type] || colorMap.default;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color }}>
      {label}
    </span>
  );
}

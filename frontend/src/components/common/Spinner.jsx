export default function Spinner({ size = 'md', center = false }) {
  const cls = `spinner spinner-${size} ${center ? 'spinner-center' : ''}`;
  return <div className={cls}><div className="spin-inner"></div></div>;
}

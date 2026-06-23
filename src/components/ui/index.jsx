// Attendant UI primitives — dark theme matching attendant app design

export function Card({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: '#1a1f2e', border: '1px solid #2a2f42',
      borderRadius: 14, ...style,
    }}>
      {children}
    </div>
  );
}

export function Btn({ children, variant = 'primary', loading, onClick, style = {}, disabled }) {
  const variants = {
    primary:   { background: '#2563eb', color: '#fff' },
    secondary: { background: '#1a1f2e', color: '#94a3b8', border: '1px solid #2a2f42' },
    danger:    { background: '#dc2626', color: '#fff' },
    success:   { background: '#16a34a', color: '#fff' },
    ghost:     { background: 'transparent', color: '#64748b' },
  };
  const isDisabled = disabled || loading;
  return (
    <button disabled={isDisabled} onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontWeight: 600, fontSize: 13, padding: '9px 18px', borderRadius: 10,
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      opacity: isDisabled ? 0.55 : 1,
      border: 'none', fontFamily: 'inherit',
      ...(variants[variant] || variants.primary),
      ...style,
    }}>
      {loading && (
        <span style={{ width: 12, height: 12, border: '2px solid currentColor',
          borderTopColor: 'transparent', borderRadius: '50%',
          display: 'inline-block', animation: 'spin .8s linear infinite' }} />
      )}
      {children}
    </button>
  );
}

export function Badge({ label, bg = '#1e3a5f', color = '#60a5fa', style = {} }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px',
      borderRadius: 20, background: bg, color, ...style }}>
      {label}
    </span>
  );
}

export function Spinner({ size = 20 }) {
  return (
    <span style={{ width: size, height: size, border: '2px solid #2a2f42',
      borderTopColor: '#3b82f6', borderRadius: '50%', display: 'inline-block',
      animation: 'spin .8s linear infinite' }} />
  );
}

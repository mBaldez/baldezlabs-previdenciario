export function Button({ children, variant = 'primary', onClick, disabled, type = 'button', style }) {
  const styles = {
    primary: {
      background: 'var(--gold)', color: 'var(--navy)',
      border: 'none', padding: '8px 16px', fontWeight: 'bold',
      cursor: disabled ? 'not-allowed' : 'pointer', borderRadius: '4px',
      fontFamily: 'Georgia, serif', fontSize: '14px', opacity: disabled ? 0.6 : 1,
    },
    secondary: {
      background: 'transparent', color: 'var(--gold)',
      border: '2px solid var(--gold)', padding: '8px 16px',
      cursor: disabled ? 'not-allowed' : 'pointer', borderRadius: '4px',
      fontFamily: 'Georgia, serif', fontSize: '14px', opacity: disabled ? 0.6 : 1,
    },
    danger: {
      background: '#c0392b', color: 'var(--white)',
      border: 'none', padding: '8px 16px',
      cursor: disabled ? 'not-allowed' : 'pointer', borderRadius: '4px',
      fontFamily: 'Georgia, serif', fontSize: '14px', opacity: disabled ? 0.6 : 1,
    },
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{ ...styles[variant], ...style }}
    >
      {children}
    </button>
  )
}

export function Modal({ aberto, titulo, onFechar, children }) {
  if (!aberto) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'white', borderRadius: '8px',
        width: '90%', maxWidth: '480px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        overflow: 'hidden',
      }}>
        <div style={{
          background: 'var(--navy)', color: 'white',
          padding: '16px 20px', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h3 style={{ color: 'white', fontSize: '16px', margin: 0 }}>{titulo}</h3>
          <button
            onClick={onFechar}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '18px' }}
          >&#x2715;</button>
        </div>
        <div style={{ padding: '20px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

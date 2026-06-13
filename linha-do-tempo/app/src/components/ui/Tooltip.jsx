import { useState } from 'react'

export function Tooltip({ texto, children }) {
  const [visivel, setVisivel] = useState(false)

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span
        onMouseEnter={() => setVisivel(true)}
        onMouseLeave={() => setVisivel(false)}
        style={{ cursor: 'help' }}
      >
        {children || <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '16px', height: '16px', borderRadius: '50%',
          background: 'var(--gold)', color: 'var(--navy)',
          fontSize: '11px', fontWeight: 'bold', cursor: 'help',
        }}>i</span>}
      </span>
      {visivel && (
        <div style={{
          position: 'absolute', bottom: '100%', left: '50%',
          transform: 'translateX(-50%)', marginBottom: '8px',
          background: 'var(--navy)', color: 'white', borderRadius: '4px',
          padding: '8px 12px', fontSize: '12px', lineHeight: '1.4',
          width: '260px', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          zIndex: 1000, border: '1px solid var(--gold)',
        }}>
          {texto}
        </div>
      )}
    </span>
  )
}

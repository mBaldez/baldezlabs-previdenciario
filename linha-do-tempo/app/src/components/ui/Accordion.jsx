import { useState } from 'react'

export function Accordion({ items }) {
  const [aberto, setAberto] = useState(null)

  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <button
            onClick={() => setAberto(aberto === i ? null : i)}
            style={{
              width: '100%', textAlign: 'left', background: 'none', border: 'none',
              padding: '12px 16px', cursor: 'pointer', display: 'flex',
              alignItems: 'center', gap: '10px',
              color: aberto === i ? 'var(--gold)' : 'rgba(255,255,255,0.8)',
              fontFamily: 'Georgia, serif', fontSize: '14px', fontWeight: 'bold',
            }}
          >
            <span style={{
              width: '24px', height: '24px', borderRadius: '50%',
              background: aberto === i ? 'var(--gold)' : 'rgba(255,255,255,0.2)',
              color: aberto === i ? 'var(--navy)' : 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 'bold', flexShrink: 0,
            }}>
              {i + 1}
            </span>
            {item.titulo}
            <span style={{ marginLeft: 'auto' }}>{aberto === i ? '\u25B2' : '\u25BC'}</span>
          </button>
          {aberto === i && (
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.05)' }}>
              {item.conteudo}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

import { Accordion } from '../ui/Accordion'

export function Sidebar({ secoes }) {
  return (
    <aside style={{
      width: '320px',
      flexShrink: 0,
      background: 'var(--navy)',
      overflowY: 'auto',
      borderRight: '1px solid rgba(255,255,255,0.1)',
    }}>
      <div style={{
        padding: '16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <span style={{
          color: 'var(--gold)', fontFamily: 'Georgia, serif',
          fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          Dados da Timeline
        </span>
      </div>
      <Accordion items={secoes} />
    </aside>
  )
}

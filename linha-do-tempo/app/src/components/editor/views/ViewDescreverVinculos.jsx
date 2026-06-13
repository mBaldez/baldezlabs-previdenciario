import { useState } from 'react'
import { Button } from '../../ui/Button'

export function ViewDescreverVinculos({ timeline, onSalvar }) {
  const [texto, setTexto] = useState(timeline?.descricao_vinculos || '')
  const [salvando, setSalvando] = useState(false)

  async function handleSalvar() {
    setSalvando(true)
    await onSalvar({ descricao_vinculos: texto })
    setSalvando(false)
  }

  return (
    <div>
      <h3 style={{ fontSize: '15px', marginBottom: '12px', color: '#0B1F3A' }}>
        Descrição dos Vínculos Urbanos
      </h3>
      <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
        Descreva os vínculos urbanos para uso na peça jurídica.
      </p>
      <textarea
        value={texto}
        onChange={e => setTexto(e.target.value)}
        rows={10}
        style={{
          width: '100%', resize: 'vertical',
          padding: '10px', fontFamily: 'Georgia, serif',
          fontSize: '14px', border: '1px solid #dee2e6',
          borderRadius: '4px', color: '#333',
        }}
        placeholder="Nenhum vínculo descrito ainda..."
      />
      <div style={{ marginTop: '12px' }}>
        <Button onClick={handleSalvar} disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar descrição'}
        </Button>
      </div>
    </div>
  )
}

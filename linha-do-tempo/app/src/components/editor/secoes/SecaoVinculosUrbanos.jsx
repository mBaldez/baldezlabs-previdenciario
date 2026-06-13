import { useState } from 'react'
import { MonthYearPicker } from '../../ui/MonthYearPicker'
import { Button } from '../../ui/Button'
import { Modal } from '../../ui/Modal'

const FORM_VAZIO = { origem: '', inicio_mes: 1, inicio_ano: 2015, fim_mes: 12, fim_ano: 2016 }

export function SecaoVinculosUrbanos({ vinculos, onAdicionar, onRemover }) {
  const [form, setForm] = useState(FORM_VAZIO)
  const [modalCnis, setModalCnis] = useState(false)
  const [arquivoCnis, setArquivoCnis] = useState(null)

  async function handleAdicionar(e) {
    e.preventDefault()
    if (!form.origem.trim()) return
    await onAdicionar(form)
    setForm(FORM_VAZIO)
  }

  function handleUploadCnis() {
    if (!arquivoCnis) return
    // Parser CNIS será implementado na Task 13
    console.log('CNIS upload — Task 13:', arquivoCnis.name)
    alert('Parser CNIS será implementado na Task 13.')
    setModalCnis(false)
    setArquivoCnis(null)
  }

  const labelStyle = { color: 'rgba(255,255,255,0.8)', fontSize: '13px', display: 'block', marginBottom: '4px' }

  return (
    <div>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '12px', fontStyle: 'italic' }}>
        Defina um período para adicionar um Vínculo Urbano.
      </p>

      <form onSubmit={handleAdicionar}>
        <div style={{ marginBottom: '10px' }}>
          <label style={labelStyle}>Origem do Vínculo</label>
          <input
            value={form.origem}
            onChange={e => setForm(f => ({ ...f, origem: e.target.value }))}
            placeholder="Ex.: Empresa X, Benefício Y"
            style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', padding: '6px', width: '100%' }}
          />
        </div>

        <MonthYearPicker
          label={<span style={labelStyle}>Data de Início</span>}
          mes={form.inicio_mes} ano={form.inicio_ano}
          onChange={(mes, ano) => setForm(f => ({ ...f, inicio_mes: mes, inicio_ano: ano }))}
        />
        <MonthYearPicker
          label={<span style={labelStyle}>Data de Fim</span>}
          mes={form.fim_mes} ano={form.fim_ano}
          onChange={(mes, ano) => setForm(f => ({ ...f, fim_mes: mes, fim_ano: ano }))}
        />

        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <Button type="submit" style={{ flex: 1, fontSize: '13px', padding: '6px' }}>
            Adicionar Vínculo
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setModalCnis(true)}
            style={{ fontSize: '13px', padding: '6px 10px' }}
          >
            Carregar CNIS
          </Button>
        </div>
      </form>

      {/* Lista */}
      <div style={{ marginTop: '12px' }}>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
          Vínculos Cadastrados:
        </span>
        {vinculos.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginTop: '4px' }}>
            Nenhum Vínculo Urbano
          </p>
        ) : vinculos.map(v => (
          <div key={v.id} style={{
            background: 'rgba(255,255,255,0.1)', borderRadius: '4px',
            padding: '6px 10px', marginTop: '6px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderLeft: '3px solid #3498db',
          }}>
            <div>
              <div style={{ color: 'white', fontSize: '13px' }}>{v.origem}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>
                {String(v.inicio_mes).padStart(2,'0')}/{v.inicio_ano} → {String(v.fim_mes).padStart(2,'0')}/{v.fim_ano}
              </div>
            </div>
            <button onClick={() => onRemover(v.id)} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontWeight: 'bold', fontSize: '18px' }}>×</button>
          </div>
        ))}
      </div>

      {/* Modal CNIS */}
      <Modal aberto={modalCnis} titulo="Adicionando Vínculo Urbano" onFechar={() => { setModalCnis(false); setArquivoCnis(null) }}>
        <p style={{ marginBottom: '16px', color: '#666' }}>
          Selecione o PDF do CNIS que deseja carregar no sistema.
        </p>
        <input
          type="file"
          accept=".pdf"
          onChange={e => setArquivoCnis(e.target.files[0] || null)}
          style={{ marginBottom: '20px' }}
        />
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={() => { setModalCnis(false); setArquivoCnis(null) }}>
            Cancelar
          </Button>
          <Button onClick={handleUploadCnis} disabled={!arquivoCnis}>
            Salvar
          </Button>
        </div>
      </Modal>
    </div>
  )
}

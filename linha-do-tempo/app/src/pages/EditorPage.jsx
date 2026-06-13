import { useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useTimelineEditor } from '../hooks/useTimeline'
import { useAutosave } from '../hooks/useAutosave'
import { EditorToolbar } from '../components/editor/EditorToolbar'
import { Sidebar } from '../components/editor/Sidebar'

export function EditorPage() {
  const { id } = useParams()
  const { timeline, carregando, atualizar } = useTimelineEditor(id)
  const [salvando, setSalvando] = useState(false)
  const [viewAtiva, setViewAtiva] = useState('timeline')
  const [modeloVisual, setModeloVisual] = useState('horizontal')

  // Autosave ao mudar modeloVisual
  const salvarModelo = useCallback(async (modelo) => {
    if (!timeline) return
    setSalvando(true)
    try { await atualizar({ modelo_visual: modelo }) }
    catch (e) { console.error('Erro ao salvar:', e) }
    finally { setSalvando(false) }
  }, [timeline, atualizar])

  useAutosave(modeloVisual, salvarModelo)

  function handleExportar() {
    // Sera implementado na Task 12
    alert('Export sera implementado na Task 12.')
  }

  if (carregando) return (
    <div style={{
      minHeight: '100vh', background: 'var(--navy)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--gold)', fontFamily: 'Georgia, serif', fontSize: '18px',
    }}>
      Carregando...
    </div>
  )

  if (!timeline) return (
    <div style={{ padding: '40px' }}>
      <p>Timeline nao encontrada.</p>
    </div>
  )

  // Secoes do sidebar (placeholders -- serao preenchidas na Task 8)
  const secoes = [
    { titulo: 'Exercicio da Atividade Rural', conteudo: <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Em construcao (Task 8)</p> },
    { titulo: 'Vinculos Urbanos', conteudo: <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Em construcao (Task 8)</p> },
    { titulo: 'Provas de Retorno', conteudo: <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Em construcao (Task 8)</p> },
    { titulo: 'Instrumentos Ratificadores', conteudo: <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Em construcao (Task 8)</p> },
    { titulo: 'Beneficio por Incapacidade', conteudo: <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Em construcao (Task 8)</p> },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Toolbar fixa no topo */}
      <EditorToolbar
        nomeCliente={timeline.nome_cliente}
        salvando={salvando}
        viewAtiva={viewAtiva}
        onChangeView={setViewAtiva}
        modeloVisual={modeloVisual}
        onChangeModelo={(m) => {
          setModeloVisual(m)
        }}
        onExportar={handleExportar}
      />

      {/* Corpo: sidebar + area principal */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar secoes={secoes} />

        {/* Area principal */}
        <main style={{
          flex: 1, overflowY: 'auto',
          padding: '24px', background: 'var(--gray-light)',
        }}>
          <div style={{
            background: 'white', borderRadius: '8px',
            padding: '24px', minHeight: '400px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}>
            <p style={{ color: '#999', fontStyle: 'italic' }}>
              View: <strong>{viewAtiva}</strong> — Visualizacoes serao implementadas nas Tasks 9-11.
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useTimelineEditor } from '../hooks/useTimeline'
import { useAutosave } from '../hooks/useAutosave'
import { supabase } from '../lib/supabase'
import { EditorToolbar } from '../components/editor/EditorToolbar'
import { Sidebar } from '../components/editor/Sidebar'
import { SecaoAtividadeRural } from '../components/editor/secoes/SecaoAtividadeRural'
import { SecaoVinculosUrbanos } from '../components/editor/secoes/SecaoVinculosUrbanos'
import { SecaoProvasRetorno } from '../components/editor/secoes/SecaoProvasRetorno'
import { SecaoIRs } from '../components/editor/secoes/SecaoIRs'
import { SecaoIncapacidade } from '../components/editor/secoes/SecaoIncapacidade'

export function EditorPage() {
  const { id } = useParams()
  const { timeline, carregando, atualizar } = useTimelineEditor(id)
  const [salvando, setSalvando] = useState(false)
  const [viewAtiva, setViewAtiva] = useState('timeline')
  const [modeloVisual, setModeloVisual] = useState('horizontal')

  // Estado das tabelas filhas
  const [vinculos, setVinculos] = useState([])
  const [provas, setProvas] = useState([])
  const [irs, setIrs] = useState([])
  const [incapacidades, setIncapacidades] = useState([])

  // Carregar dados filhos quando timeline carregada
  useEffect(() => {
    if (!id) return
    supabase.from('vinculos_urbanos').select('*').eq('timeline_id', id).order('inicio_ano').then(({ data }) => setVinculos(data || []))
    supabase.from('provas_retorno').select('*').eq('timeline_id', id).order('data_ano').then(({ data }) => setProvas(data || []))
    supabase.from('instrumentos_ratificadores').select('*').eq('timeline_id', id).order('data_ano').then(({ data }) => setIrs(data || []))
    supabase.from('beneficios_incapacidade').select('*').eq('timeline_id', id).order('inicio_ano').then(({ data }) => setIncapacidades(data || []))
  }, [id])

  // Funções CRUD para cada tabela filha
  async function adicionarVinculo(dados) {
    const { data, error } = await supabase.from('vinculos_urbanos').insert({ ...dados, timeline_id: id }).select().single()
    if (error) throw error
    setVinculos(prev => [...prev, data])
  }
  async function removerVinculo(vinculoId) {
    await supabase.from('vinculos_urbanos').delete().eq('id', vinculoId)
    setVinculos(prev => prev.filter(v => v.id !== vinculoId))
  }

  async function adicionarProva(dados) {
    const { data, error } = await supabase.from('provas_retorno').insert({ ...dados, timeline_id: id }).select().single()
    if (error) throw error
    setProvas(prev => [...prev, data])
  }
  async function removerProva(provaId) {
    await supabase.from('provas_retorno').delete().eq('id', provaId)
    setProvas(prev => prev.filter(p => p.id !== provaId))
  }

  async function adicionarIR(dados) {
    const { data, error } = await supabase.from('instrumentos_ratificadores').insert({ ...dados, timeline_id: id }).select().single()
    if (error) throw error
    setIrs(prev => [...prev, data])
  }
  async function removerIR(irId) {
    await supabase.from('instrumentos_ratificadores').delete().eq('id', irId)
    setIrs(prev => prev.filter(ir => ir.id !== irId))
  }

  async function adicionarIncapacidade(dados) {
    const { data, error } = await supabase.from('beneficios_incapacidade').insert({ ...dados, timeline_id: id }).select().single()
    if (error) throw error
    setIncapacidades(prev => [...prev, data])
  }
  async function removerIncapacidade(incId) {
    await supabase.from('beneficios_incapacidade').delete().eq('id', incId)
    setIncapacidades(prev => prev.filter(i => i.id !== incId))
  }

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

  // Secoes do sidebar
  const secoes = [
    {
      titulo: 'Exercício da Atividade Rural',
      conteudo: <SecaoAtividadeRural timeline={timeline} onAtualizar={async (campos) => { setSalvando(true); await atualizar(campos); setSalvando(false) }} />
    },
    {
      titulo: 'Vínculos Urbanos',
      conteudo: <SecaoVinculosUrbanos vinculos={vinculos} onAdicionar={adicionarVinculo} onRemover={removerVinculo} />
    },
    {
      titulo: 'Provas de Retorno',
      conteudo: <SecaoProvasRetorno provas={provas} onAdicionar={adicionarProva} onRemover={removerProva} />
    },
    {
      titulo: 'Instrumentos Ratificadores',
      conteudo: <SecaoIRs irs={irs} onAdicionar={adicionarIR} onRemover={removerIR} />
    },
    {
      titulo: 'Benefício por Incapacidade',
      conteudo: <SecaoIncapacidade incapacidades={incapacidades} onAdicionar={adicionarIncapacidade} onRemover={removerIncapacidade} />
    },
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

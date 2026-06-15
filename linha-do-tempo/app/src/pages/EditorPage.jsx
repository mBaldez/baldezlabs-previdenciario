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
import { ViewLinhaDoTempo } from '../components/editor/views/ViewLinhaDoTempo'
import { ViewDescreverIRs } from '../components/editor/views/ViewDescreverIRs'
import { ViewDescreverVinculos } from '../components/editor/views/ViewDescreverVinculos'
import { ViewRelatorio } from '../components/editor/views/ViewRelatorio'

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

  async function handleExportar() {
    try {
      const { default: html2canvas } = await import('html2canvas')
      const elemento = document.getElementById('area-timeline')
      if (!elemento) {
        alert('Nenhuma timeline visível para exportar. Selecione a view "Linha do Tempo".')
        return
      }
      const canvas = await html2canvas(elemento, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      })
      const url = canvas.toDataURL('image/png')
      const novaAba = window.open()
      novaAba.document.write(`
        <html><head><title>Linha do Tempo — ${timeline.nome_cliente}</title></head>
        <body style="margin:0;background:#f5f5f5;display:flex;flex-direction:column;align-items:center;padding:20px;font-family:Georgia,serif;">
          <p style="margin-bottom:12px;color:#555;">
            Você pode copiar a imagem abaixo ou
            <a href="${url}" download="linha-do-tempo-${timeline.nome_cliente.replace(/\s+/g, '-')}.png"
               style="color:#C9A84C;font-weight:bold;">fazer download clicando aqui</a>.
          </p>
          <img src="${url}" style="max-width:100%;box-shadow:0 4px 16px rgba(0,0,0,0.2);border-radius:4px;" />
        </body></html>
      `)
    } catch (err) {
      alert('Erro ao exportar: ' + err.message)
    }
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
      conteudo: <SecaoAtividadeRural
        timeline={timeline}
        onAtualizar={async (campos) => { setSalvando(true); await atualizar(campos); setSalvando(false) }}
        onGerar={() => setViewAtiva('timeline')}
      />
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
            padding: '20px', minHeight: '400px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}>
            {viewAtiva === 'timeline' && (
              <ViewLinhaDoTempo
                timeline={timeline}
                vinculos={vinculos}
                provas={provas}
                irs={irs}
                incapacidades={incapacidades}
                modeloVisual={modeloVisual}
              />
            )}
            {viewAtiva === 'irs' && (
              <ViewDescreverIRs
                timeline={timeline}
                onSalvar={async (campos) => { setSalvando(true); await atualizar(campos); setSalvando(false) }}
              />
            )}
            {viewAtiva === 'vinculos' && (
              <ViewDescreverVinculos
                timeline={timeline}
                onSalvar={async (campos) => { setSalvando(true); await atualizar(campos); setSalvando(false) }}
              />
            )}
            {viewAtiva === 'relatorio' && (
              <ViewRelatorio
                timeline={timeline}
                vinculos={vinculos}
                provas={provas}
                irs={irs}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

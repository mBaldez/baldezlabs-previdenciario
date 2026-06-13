import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useTimelines(userId) {
  const [timelines, setTimelines] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  const carregar = useCallback(async () => {
    if (!userId) return
    setCarregando(true)
    const { data, error } = await supabase
      .from('timelines')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setErro(error.message)
    else setTimelines(data || [])
    setCarregando(false)
  }, [userId])

  useEffect(() => { carregar() }, [carregar])

  async function criar(dados) {
    const { data, error } = await supabase
      .from('timelines')
      .insert({ ...dados, user_id: userId })
      .select()
      .single()
    if (error) throw error
    setTimelines(prev => [data, ...prev])
    return data
  }

  async function excluir(id) {
    const { error } = await supabase.from('timelines').delete().eq('id', id)
    if (error) throw error
    setTimelines(prev => prev.filter(t => t.id !== id))
  }

  return { timelines, carregando, erro, criar, excluir, recarregar: carregar }
}

export function useTimelineEditor(id) {
  const [timeline, setTimeline] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!id) return
    supabase.from('timelines').select('*').eq('id', id).single()
      .then(({ data }) => { setTimeline(data); setCarregando(false) })
  }, [id])

  async function atualizar(campos) {
    const { data, error } = await supabase
      .from('timelines')
      .update({ ...campos, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setTimeline(data)
    return data
  }

  return { timeline, carregando, atualizar, setTimeline }
}

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useTimelines(userId) {
  const [timelines, setTimelines] = useState([])
  const [carregando, setCarregando] = useState(!!userId)
  const [erro, setErro] = useState(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!userId) return
    let ativo = true
    supabase
      .from('timelines')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!ativo) return
        if (error) setErro(error.message)
        else setTimelines(data || [])
        setCarregando(false)
      })
    return () => { ativo = false }
  }, [userId, tick])

  const recarregar = () => {
    setCarregando(true)
    setTick(t => t + 1)
  }

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

  return { timelines, carregando, erro, criar, excluir, recarregar }
}

export function useTimelineEditor(id) {
  const [timeline, setTimeline] = useState(null)
  const [carregando, setCarregando] = useState(!!id)

  useEffect(() => {
    if (!id) return
    let ativo = true
    supabase
      .from('timelines')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (!ativo) return
        setTimeline(data)
        setCarregando(false)
      })
    return () => { ativo = false }
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

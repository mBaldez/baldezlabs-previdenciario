import { useEffect, useRef } from 'react'

/**
 * Chama saveFn com os dados atuais apos `delay` ms de inatividade.
 * Cancela o timer se os dados mudarem antes do prazo.
 */
export function useAutosave(data, saveFn, delay = 800) {
  const timerRef = useRef(null)
  const saveFnRef = useRef(saveFn)

  // Manter saveFn atualizado sem re-disparar o effect
  useEffect(() => { saveFnRef.current = saveFn }, [saveFn])

  useEffect(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      saveFnRef.current(data)
    }, delay)
    return () => clearTimeout(timerRef.current)
  }, [data, delay])
}

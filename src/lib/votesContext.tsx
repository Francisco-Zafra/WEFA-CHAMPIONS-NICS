import { createContext, useContext, useEffect, useState } from 'react'
import type { Vote } from '@/domain/votes'
import type { Collection } from './data'

export const VotesContext = createContext<Collection<Vote>>({ data: [], loading: true, error: null })

/** Todos los votos del MVP (colección pequeña; se suscribe una sola vez en App) */
export const useVoteData = () => useContext(VotesContext)

/** Reloj que se actualiza cada 30 s (para cierres de votación y cuentas atrás largas) */
export function useClock(everyMs = 30_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs)
    return () => clearInterval(t)
  }, [everyMs])
  return now
}

import { DEFAULT_TIME } from '@/domain/nextMatch'

export interface When {
  date: string
  time: string
  place: string
}

export const isoToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Valores iniciales: los del partido si los tiene; si no, hoy, 21:00 y `defaultPlace`
 * (el campo del último partido guardado en la base de datos).
 */
export function initialWhen(
  from?: { date?: string | null; time?: string | null; place?: string | null },
  defaultPlace?: string | null,
): When {
  return {
    date: from?.date || isoToday(),
    time: from?.time || DEFAULT_TIME,
    place: from?.place ?? defaultPlace ?? '',
  }
}

/** Para guardar en el partido (como la fecha): campo vacío → null */
export function whenToSave(w: When) {
  const place = w.place.trim()
  return { date: w.date, time: w.time || null, place: place || null }
}

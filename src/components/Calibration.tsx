import { useMemo, useState } from 'react'
import { CALIBRATION_MIN_GAMES, calibrate, type Calibration } from '@/domain/insights'
import { clampRating, clampStat } from '@/domain/rating'
import { STAT_KEYS, type Match, type Player, type Stats } from '@/domain/types'
import { updatePlayer } from '@/lib/data'
import { useToast } from './Toast'

const pct = (v: number) => `${Math.round(v * 100)} %`
const KEY = 'wefa:calibration-skip'

function loadSkipped(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

/**
 * Sugerencias de media según los resultados (solo admin). «Ahora no» las esconde hasta que se
 * cierre el navegador; la sugerencia es para esa media: si cambia, vuelve a salir
 */
export function CalibrationList({ matches, players }: { matches: Match[]; players: Player[] }) {
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  const [skipped, setSkipped] = useState(loadSkipped)
  const rows = useMemo(() => calibrate(matches, players), [matches, players])
  const byId = new Map(players.map((p) => [p.id, p]))
  const keyOf = (r: Calibration) => `${r.id}:${r.rating}:${r.delta}`
  const suggestions = rows.filter((r) => r.delta !== 0 && !skipped.has(keyOf(r)))
  const fitting = rows.filter((r) => r.delta === 0 && r.played >= CALIBRATION_MIN_GAMES).length

  function skip(r: Calibration) {
    const next = new Set(skipped).add(keyOf(r))
    setSkipped(next)
    try {
      sessionStorage.setItem(KEY, JSON.stringify([...next]))
    } catch {
      // Si no se puede guardar, solo dura mientras esté abierta la página
    }
  }

  async function apply(r: Calibration) {
    const p = byId.get(r.id)
    if (!p) return
    const rating = clampRating(p.rating + r.delta)
    // Las stats son decorativas: se mueven igual para que la carta siga cuadrando con la media
    const stats = Object.fromEntries(STAT_KEYS.map((k) => [k, clampStat(p.stats[k] + r.delta)])) as Stats
    setBusy(r.id)
    try {
      await updatePlayer(p.id, { rating, stats })
      toast(`Media de ${p.name}: ${p.rating} → ${rating}`)
    } catch {
      toast('No se pudo guardar', 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col">
      <p className="small text-xs">
        Lo esperado por su media frente a lo que ha ganado. Solo con diferencia clara y al menos{' '}
        {CALIBRATION_MIN_GAMES} partidos con su media actual.
      </p>
      {suggestions.map((r) => {
        const up = r.delta > 0
        return (
          <div key={r.id} className="cal">
            <span className="n">{r.name}</span>
            <span className={`chg ${up ? 'up' : 'down'}`}>
              {r.rating} → {r.rating + r.delta}
            </span>
            <span className="why">
              Gana el {pct(r.actual)}; se esperaba un {pct(r.expected)}. {r.played} partidos ({r.won}V{' '}
              {r.drawn}E {r.lost}D).
            </span>
            <div className="col-span-2 flex gap-2">
              <button
                className="btn btn--primary btn--sm flex-1"
                type="button"
                disabled={busy !== null}
                onClick={() => void apply(r)}
              >
                {busy === r.id ? (
                  <span className="spinner" />
                ) : (
                  `${up ? 'Subir' : 'Bajar'} a ${r.rating + r.delta}`
                )}
              </button>
              <button className="btn btn--ghost btn--sm" type="button" onClick={() => skip(r)}>
                Ahora no
              </button>
            </div>
          </div>
        )
      })}
      <p className="note pt-3">
        {rows.length === 0
          ? 'Aún no hay partidos con resultado y equipos.'
          : suggestions.length === 0
            ? 'Todos rinden según su media.'
            : fitting > 0
              ? `Los otros ${fitting} jugadores rinden según su media.`
              : ''}{' '}
        Los espectadores no ven este apartado.
      </p>
    </div>
  )
}

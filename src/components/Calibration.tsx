import { ArrowDown, ArrowUp, Check, ChevronRight, Scale } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CALIBRATION_MIN_GAMES, calibrate, type Calibration } from '@/domain/insights'
import { clampRating, clampStat } from '@/domain/rating'
import { STAT_KEYS, type Match, type Player, type Stats } from '@/domain/types'
import { cx } from '@/lib/cx'
import { updatePlayer } from '@/lib/data'
import { PlayerAvatar } from './PlayerAvatar'
import { Sheet } from './Sheet'
import { useToast } from './Toast'

const pct = (v: number) => `${Math.round(v * 100)} %`

/** Acceso (solo admin) a las sugerencias de media según los resultados */
export function CalibrationButton({ matches, players }: { matches: Match[]; players: Player[] }) {
  const [open, setOpen] = useState(false)
  const rows = useMemo(() => calibrate(matches, players), [matches, players])
  const suggestions = rows.filter((r) => r.delta !== 0).length
  return (
    <>
      <button
        className="glass flex w-full items-center gap-3 px-4 py-3 text-left text-[var(--ink)]"
        type="button"
        onClick={() => setOpen(true)}
      >
        <Scale className="size-5 shrink-0 text-[var(--club)]" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Calibrar medias</span>
          <span className="small block text-xs">
            {suggestions > 0
              ? `${suggestions} ${suggestions === 1 ? 'jugador rinde' : 'jugadores rinden'} distinto a su media`
              : 'Compara cada media con los resultados'}
          </span>
        </span>
        {suggestions > 0 && (
          <span className="pill pill--on h-7 cursor-default px-2.5 text-xs">{suggestions}</span>
        )}
        <ChevronRight className="size-4 shrink-0 text-[var(--muted)]" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} eyebrow="Plantilla" title="Calibrar medias">
        <CalibrationList rows={rows} players={players} />
      </Sheet>
    </>
  )
}

function CalibrationList({ rows, players }: { rows: Calibration[]; players: Player[] }) {
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  const byId = new Map(players.map((p) => [p.id, p]))

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
    <div className="flex flex-col gap-3">
      <p className="small text-sm">
        Compara lo que gana cada jugador con lo esperado por las medias de sus equipos. Solo cuentan los
        partidos jugados con su media actual: si la cambias, la cuenta vuelve a empezar. Hace falta un mínimo
        de {CALIBRATION_MIN_GAMES} partidos.
      </p>
      {rows.length === 0 ? (
        <p className="small text-sm">Aún no hay partidos con resultado y equipos.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => {
            const p = byId.get(r.id)
            const up = r.delta > 0
            return (
              <li key={r.id} className="panel flex items-center gap-3 px-3 py-2.5">
                <PlayerAvatar player={p ?? { name: r.name }} className="size-9 shrink-0 text-sm" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-[var(--ink)]">{r.name}</div>
                  <div className="small text-[11px]">
                    {r.won}V {r.drawn}E {r.lost}D · rinde {pct(r.actual)} (esperado {pct(r.expected)})
                  </div>
                </div>
                {r.delta !== 0 ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={cx(
                        'flex items-center gap-0.5 text-sm font-bold tabular-nums',
                        up ? 'text-[var(--ok)]' : 'text-[#FF8A96]',
                      )}
                    >
                      {up ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}
                      {r.rating} → {r.rating + r.delta}
                    </span>
                    <button
                      className="btn btn--glass btn--sm"
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void apply(r)}
                    >
                      {busy === r.id ? <span className="spinner" /> : 'Aplicar'}
                    </button>
                  </div>
                ) : r.played < CALIBRATION_MIN_GAMES ? (
                  <span className="small shrink-0 text-[11px]">
                    {r.played}/{CALIBRATION_MIN_GAMES} partidos
                  </span>
                ) : (
                  <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--muted)]">
                    <Check className="size-3.5" /> Encaja
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

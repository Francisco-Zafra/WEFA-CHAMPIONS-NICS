import { X } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Kit } from '@/components/Kit'
import { useToast } from '@/components/Toast'
import { Crest } from '@/components/ui'
import { getClub } from '@/domain/clubs'
import { emptyGoals, tallyGoals, tallyWarning } from '@/domain/goals'
import { isPlayed } from '@/domain/standings'
import type { Match, MatchGoals, Player } from '@/domain/types'
import { cx } from '@/lib/cx'
import { setMatchGoals } from '@/lib/data'

type Side = 'A' | 'B'

function GoalRow({
  name,
  value,
  own,
  onChange,
}: {
  name: string
  value: number
  own?: boolean
  onChange: (v: number) => void
}) {
  return (
    <div className={cx('grow', value > 0 && 'grow--on', own && 'grow--own')}>
      <span className="n">{name}</span>
      <div className="gctl" role="group" aria-label={`Goles de ${name}`}>
        <button
          className="gbtn"
          type="button"
          aria-label={`Quitar gol a ${name}`}
          disabled={value === 0}
          onClick={() => onChange(value - 1)}
        >
          −
        </button>
        <output className="gval" aria-live="polite">
          {value}
        </output>
        <button
          className="gbtn gbtn--plus"
          type="button"
          aria-label={`Sumar gol a ${name}`}
          onClick={() => onChange(value + 1)}
        >
          +
        </button>
      </div>
    </div>
  )
}

/** Apuntar quién marcó cada gol (solo admin). Se puede guardar a medias */
export function GoalsEditor({ m, players }: { m: Match; players: Player[] }) {
  const toast = useToast()
  const navigate = useNavigate()
  const [goals, setGoals] = useState<MatchGoals>(() => structuredClone(m.goals ?? emptyGoals()))
  const [side, setSide] = useState<Side>('A')
  const [busy, setBusy] = useState(false)
  const back = `/historial/${m.id}?tab=goles`

  if (!isPlayed(m))
    return (
      <div className="flex flex-col gap-3">
        <p className="body-text">Apunta primero el resultado del partido.</p>
        <Link className="btn btn--glass self-start" to={`/historial/${m.id}?tab=ajustes`}>
          Ir a ajustes
        </Link>
      </div>
    )

  const names = new Map(players.map((p) => [p.id, p.name]))
  const t = tallyGoals(m, goals)
  const club = (s: Side) => getClub(s === 'A' ? m.clubA : m.clubB)
  const team = side === 'A' ? m.teamA : m.teamB
  const warnings = (['A', 'B'] as const)
    .map((s) => tallyWarning(t[s], club(s).short))
    .filter((w): w is string => !!w)

  const setPlayer = (id: string, v: number) =>
    setGoals((g) => {
      const byPlayer = { ...g.byPlayer }
      if (v > 0) byPlayer[id] = v
      else delete byPlayer[id]
      return { ...g, byPlayer }
    })
  const setOwn = (v: number) => setGoals((g) => (side === 'A' ? { ...g, ownA: v } : { ...g, ownB: v }))

  async function save() {
    setBusy(true)
    try {
      // Solo goles de quien jugó el partido
      const ids = new Set([...m.teamA, ...m.teamB].map((p) => p.id))
      const byPlayer = Object.fromEntries(
        Object.entries(goals.byPlayer).filter(([id, n]) => ids.has(id) && n > 0),
      )
      await setMatchGoals(m.id, { ...goals, byPlayer })
      toast(
        t.ok ? 'Goleadores guardados' : 'Guardado lo apuntado. Aún no cuadra con el marcador',
        t.ok ? 'success' : 'info',
      )
      navigate(back, { replace: true })
    } catch {
      toast('No se pudo guardar', 'error')
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-2.5 pb-48">
      <div className="flex items-center justify-between">
        <Link className="btn btn--ghost btn--sm pl-1" to={back}>
          <X /> Cerrar
        </Link>
        {m.cup && <span className="cuptag">{`${m.cup.name} · ${m.cup.label}`.toUpperCase()}</span>}
      </div>
      <h1 className="h-display h-l">Apuntar goleadores</h1>
      <div
        className="flex items-center justify-between gap-2.5 border-b border-[var(--line)] pb-3"
        aria-label={`Marcador ${m.scoreA} a ${m.scoreB}`}
      >
        <span className="flex min-w-0 items-center gap-2 text-sm font-bold">
          <Crest club={m.clubA} size={30} />
          <span className="truncate">{club('A').short}</span>
        </span>
        <span className="h-display text-[34px] leading-none">
          {m.scoreA}–{m.scoreB}
        </span>
        <span className="flex min-w-0 items-center justify-end gap-2 text-sm font-bold">
          <span className="truncate">{club('B').short}</span>
          <Crest club={m.clubB} size={30} />
        </span>
      </div>

      <div className="flex border-b border-[var(--line)]" role="tablist" aria-label="Equipo">
        {(['A', 'B'] as const).map((s) => (
          <button
            key={s}
            className={cx('subtab flex-1 justify-center', s === 'A' ? 'ta' : 'tb')}
            style={side === s ? { borderBottomColor: 'var(--team)' } : undefined}
            type="button"
            role="tab"
            aria-selected={side === s}
            onClick={() => setSide(s)}
          >
            <Kit side={s} className="size-3.5" />
            {club(s).short}
            <span
              className="text-[11px] font-bold"
              style={{ color: t[s].missing === 0 ? 'var(--win)' : '#FFE3A6' }}
            >
              {t[s].recorded} de {t[s].score}
            </span>
          </button>
        ))}
      </div>

      <div className={side === 'A' ? 'ta' : 'tb'} role="tabpanel">
        {team.map((p) => (
          <GoalRow
            key={p.id}
            name={names.get(p.id) ?? p.name}
            value={goals.byPlayer[p.id] ?? 0}
            onChange={(v) => setPlayer(p.id, v)}
          />
        ))}
        <GoalRow
          name="En propia puerta"
          own
          value={side === 'A' ? goals.ownA : goals.ownB}
          onChange={setOwn}
        />
        <p className="note pt-2">
          «En propia puerta»: goles para {club(side).short} que metió un rival en su portería.
        </p>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col gap-2.5 px-[18px] pt-7 pb-6 lg:left-[248px]"
        style={{ background: 'linear-gradient(180deg, rgba(5,10,24,0), #050A18 30%)' }}
      >
        <div className="mx-auto flex w-full max-w-[560px] flex-col gap-2.5">
          {warnings.map((w) => (
            <p key={w} className="gmsg" role="status">
              {w}
            </p>
          ))}
          {warnings.length === 0 && (
            <p className="gmsg gmsg--ok" role="status">
              Todo cuadra con el marcador
            </p>
          )}
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <button className="btn btn--ghost" type="button" disabled={busy} onClick={() => void save()}>
              Guardar lo apuntado
            </button>
            <button
              className="btn btn--primary h-[52px]"
              type="button"
              disabled={busy || !t.ok}
              onClick={() => void save()}
            >
              {busy && <span className="spinner" />}
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

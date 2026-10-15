import { ArrowLeftRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { getClub } from '@/domain/clubs'
import { headToHead } from '@/domain/insights'
import { isPlayed, type Outcome } from '@/domain/standings'
import type { Match, Player } from '@/domain/types'
import { cx } from '@/lib/cx'

const FORM: Record<Outcome, { c: string; t: string }> = {
  W: { c: 'w', t: 'V' },
  D: { c: 'd', t: 'E' },
  L: { c: 'l', t: 'D' },
}

/** Colores de cada lado (marca WEFA y un azul que contrasta) */
const COLOR_A = '#9b7bff'
const COLOR_B = '#5ab4ff'

const dayMonth = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

/** Cara a cara entre dos jugadores: cómo les va juntos y enfrentados */
export function PlayerDuel({ matches, players }: { matches: Match[]; players: Player[] }) {
  // Jugadores con algún partido jugado, de más a menos partidos
  const options = useMemo(() => {
    const count = new Map<string, { name: string; n: number }>()
    for (const m of matches.filter(isPlayed))
      for (const p of [...m.teamA, ...m.teamB]) {
        const c = count.get(p.id) ?? { name: p.name, n: 0 }
        c.n++
        count.set(p.id, c)
      }
    const names = new Map(players.map((p) => [p.id, p.name]))
    return [...count]
      .map(([id, c]) => ({ id, name: names.get(id) ?? c.name, n: c.n }))
      .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, 'es'))
  }, [matches, players])

  const [pick, setPick] = useState<[string | null, string | null]>([null, null])
  const a = pick[0] ?? options[0]?.id ?? null
  const b = pick[1] ?? options.find((o) => o.id !== a)?.id ?? null
  const h = useMemo(() => (a && b ? headToHead(matches, a, b) : null), [matches, a, b])

  if (options.length < 2) return null

  const byId = new Map(players.map((p) => [p.id, p]))
  const nameOf = (id: string) => options.find((o) => o.id === id)?.name ?? id
  const sorted = [...options].sort((x, y) => x.name.localeCompare(y.name, 'es'))
  const select = (side: 0 | 1, value: string, label: string) => (
    <select
      className="select h-11 min-w-0 flex-1 text-sm"
      aria-label={label}
      value={value}
      onChange={(e) =>
        setPick((p) => (side === 0 ? [e.target.value, p[1] ?? b] : [p[0] ?? a, e.target.value]))
      }
    >
      {sorted.map((o) => (
        <option key={o.id} value={o.id} disabled={o.id === (side === 0 ? b : a)}>
          {o.name}
        </option>
      ))}
    </select>
  )

  return (
    <section className="glass flex flex-col gap-3.5 p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="h-display h-m">Jugador contra jugador</h2>
        <span className="small text-xs">Amistosos y copa</span>
      </div>
      <div className="flex items-center gap-2">
        {select(0, a!, 'Primer jugador')}
        <button
          className="btn btn--glass btn--icon size-11 shrink-0"
          type="button"
          aria-label="Intercambiar jugadores"
          onClick={() => setPick([b, a])}
        >
          <ArrowLeftRight />
        </button>
        {select(1, b!, 'Segundo jugador')}
      </div>

      {h && a && b && (
        <>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <Who id={a} name={nameOf(a)} player={byId.get(a)} />
            <span className="h-display num text-3xl">
              <span style={{ color: COLOR_A }}>{h.against.winsA}</span>
              <span className="text-[var(--muted)]"> – </span>
              <span style={{ color: COLOR_B }}>{h.against.winsB}</span>
            </span>
            <Who id={b} name={nameOf(b)} player={byId.get(b)} right />
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className="panel flex flex-col gap-2 px-3.5 py-3">
              <span className="eyebrow text-[10px]">Enfrentados</span>
              {h.against.played === 0 ? (
                <span className="small text-xs">Nunca se han enfrentado.</span>
              ) : (
                <>
                  <div className="vs-bar" aria-hidden>
                    <div style={{ flex: Math.max(h.against.winsA, 0.2), background: COLOR_A }} />
                    <div style={{ flex: Math.max(h.against.drawn, 0.0001), background: '#8d97b5' }} />
                    <div style={{ flex: Math.max(h.against.winsB, 0.2), background: COLOR_B }} />
                  </div>
                  <span className="small text-xs">
                    {h.against.played} {h.against.played === 1 ? 'partido' : 'partidos'} · {h.against.drawn}{' '}
                    {h.against.drawn === 1 ? 'empate' : 'empates'}
                    {h.against.winsA !== h.against.winsB &&
                      ` · domina ${h.against.winsA > h.against.winsB ? nameOf(a) : nameOf(b)}`}
                  </span>
                </>
              )}
            </div>
            <div className="panel flex flex-col gap-2 px-3.5 py-3">
              <span className="eyebrow text-[10px]">Juntos</span>
              {h.together.played === 0 ? (
                <span className="small text-xs">Nunca han jugado en el mismo equipo.</span>
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="h-display num neon text-[28px] leading-none">
                      {Math.round((h.together.won / h.together.played) * 100)} %
                    </span>
                    <span className="small text-xs">de victorias</span>
                  </div>
                  <span className="small text-xs">
                    {h.together.won}V {h.together.drawn}E {h.together.lost}D en {h.together.played}{' '}
                    {h.together.played === 1 ? 'partido' : 'partidos'}
                  </span>
                </>
              )}
            </div>
          </div>

          {h.games.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {h.games.slice(0, 5).map((g) => {
                const m = g.match
                return (
                  <li key={m.id} className="flex items-center gap-2 text-xs">
                    <span className="form">
                      <i className={FORM[g.outcome].c}>{FORM[g.outcome].t}</i>
                    </span>
                    <span className="small w-12 shrink-0">{dayMonth(m.date)}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold text-[var(--ink-2)]">
                      {getClub(m.clubA).short} {m.scoreA}–{m.scoreB} {getClub(m.clubB).short}
                      {m.cup && <span className="small font-normal"> · {m.cup.label}</span>}
                    </span>
                    <span
                      className={cx('pill h-6 cursor-default px-2 text-[10px]', g.together && 'pill--on')}
                    >
                      {g.together ? 'Juntos' : 'Rivales'}
                    </span>
                  </li>
                )
              })}
              <li className="small text-[11px]">Resultado desde el punto de vista de {nameOf(a)}.</li>
            </ul>
          )}
        </>
      )}
    </section>
  )
}

function Who({ id, name, player, right }: { id: string; name: string; player?: Player; right?: boolean }) {
  return (
    <Link
      to={`/jugador/${id}`}
      className={cx(
        'flex min-w-0 items-center gap-2 text-[var(--ink)] no-underline',
        right && 'flex-row-reverse text-right',
      )}
    >
      <PlayerAvatar player={player ?? { name }} className="size-10 shrink-0 text-sm" />
      <span className="h-display truncate text-xl">{name}</span>
    </Link>
  )
}

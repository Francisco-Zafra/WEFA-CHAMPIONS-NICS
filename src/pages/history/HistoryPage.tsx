import { BarChart3, Shuffle } from 'lucide-react'
import { useMemo } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Kit } from '@/components/Kit'
import { EmptyCards, ErrorState } from '@/components/States'
import { Crest } from '@/components/ui'
import { getClub } from '@/domain/clubs'
import type { Cup } from '@/domain/cup'
import { topScorerLabel } from '@/domain/goals'
import { isPlayed, resultFor } from '@/domain/standings'
import type { Match, Player } from '@/domain/types'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { useAuth } from '@/lib/auth'
import { cx } from '@/lib/cx'
import type { Collection } from '@/lib/data'
import { GoalsEditor } from './GoalsEditor'
import { MatchDetail } from './MatchDetail'

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]
const SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const DAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const dayMonth = (iso: string) => `${Number(iso.slice(8, 10))} ${SHORT[Number(iso.slice(5, 7)) - 1]}`
const withDay = (iso: string) => `${DAYS[new Date(`${iso}T12:00:00`).getDay()]} ${dayMonth(iso)}`

/** «Octubre», o «Octubre 2025» si no es de este año */
function monthLabel(iso: string) {
  const name = MONTHS[Number(iso.slice(5, 7)) - 1]!
  const label = name[0]!.toUpperCase() + name.slice(1)
  return iso.slice(0, 4) === String(new Date().getFullYear()) ? label : `${label} ${iso.slice(0, 4)}`
}

/** Próximos primero; después los jugados, por meses, del más reciente al más antiguo */
function groupMatches(matches: Match[]) {
  const pending = matches
    .filter((m) => !isPlayed(m))
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
  const groups: { label: string; items: Match[] }[] = pending.length
    ? [{ label: 'Próximos', items: pending }]
    : []
  for (const m of matches.filter(isPlayed)) {
    const label = m.date ? monthLabel(m.date) : 'Sin fecha'
    const last = groups[groups.length - 1]
    if (last && last.label === label && last.label !== 'Próximos') last.items.push(m)
    else groups.push({ label, items: [m] })
  }
  return groups
}

function MatchRow({
  m,
  names,
  selected,
  kits,
}: {
  m: Match
  names: Map<string, string>
  selected?: boolean
  /** Etiqueta «Rojo» / «Azul» bajo cada club (móvil) */
  kits: boolean
}) {
  const played = isPlayed(m)
  const lose = (side: 'A' | 'B') => played && resultFor(m, side) === 'L'
  const pens = played && m.scoreA === m.scoreB && !!m.winner
  const top = played ? topScorerLabel(m, names) : null
  const side = (s: 'A' | 'B') => {
    const club = getClub(s === 'A' ? m.clubA : m.clubB)
    return (
      <div className={cx('mside', lose(s) && 'mside--lose', s === 'B' && 'flex-row-reverse text-right')}>
        <Crest club={club.id} size={34} />
        <span className={cx('flex min-w-0 flex-col gap-0.5', s === 'B' && 'items-end')}>
          <span className="nm">{club.name}</span>
          {kits && (
            <span className={cx('mside__kit', s === 'B' && 'flex-row-reverse')}>
              <Kit side={s} className="size-3" />
              {s === 'A' ? 'Rojo' : 'Azul'}
            </span>
          )}
        </span>
      </div>
    )
  }
  return (
    <Link
      className={cx('mrow', selected && 'mrow--sel')}
      to={`/historial/${m.id}`}
      aria-current={selected ? 'true' : undefined}
      aria-label={`${getClub(m.clubA).name} contra ${getClub(m.clubB).name}, ${played ? `${m.scoreA} a ${m.scoreB}` : 'pendiente'}, ${m.date ? dayMonth(m.date) : 'sin fecha'}${m.cup ? `, ${m.cup.name} · ${m.cup.label}` : ''}`}
    >
      {side('A')}
      <div className="mscore">
        {played ? (
          <b>
            {m.scoreA}–{m.scoreB}
          </b>
        ) : (
          <span className="pend">Pendiente</span>
        )}
        {pens && <span className="pen">penaltis</span>}
      </div>
      {side('B')}
      <div className="mmeta">
        <span className="flex min-w-0 items-center gap-1.5">
          {m.date ? (played ? dayMonth(m.date) : withDay(m.date)) : ''}
          {m.cup && <span className="cuptag truncate">{`${m.cup.name} · ${m.cup.label}`}</span>}
        </span>
        {played &&
          (top ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 text-[var(--ink-2)]">
              <span className="ball" aria-hidden />
              {top}
            </span>
          ) : (
            <span className="shrink-0 text-[var(--dim)]">Sin goleadores</span>
          ))}
      </div>
    </Link>
  )
}

export function HistoryPage({
  matches,
  players,
  cups,
  defaultPlace,
}: {
  /** Amistosos y cruces de copa, jugados y por jugar, con el MVP resuelto */
  matches: Collection<Match>
  players: Collection<Player>
  cups: Cup[]
  defaultPlace: string | null
}) {
  const { id, mode } = useParams()
  const { isAdmin } = useAuth()
  const desktop = useIsDesktop()
  const location = useLocation()
  const navigate = useNavigate()
  const preset = location.state as { ids?: string[]; title?: string } | null
  const names = useMemo(() => new Map(players.data.map((p) => [p.id, p.name])), [players.data])
  const presetIds = preset?.ids
  const list = useMemo(() => {
    const ids = presetIds && new Set(presetIds)
    return ids ? matches.data.filter((m) => ids.has(m.id)) : matches.data
  }, [matches.data, presetIds])

  if (matches.loading)
    return (
      <div className="flex flex-col gap-2.5" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skel h-[70px] rounded-[18px]" />
        ))}
      </div>
    )
  if (matches.error)
    return (
      <ErrorState title="Se ha ido la luz del estadio">
        No hemos podido cargar los partidos. Revisa tu conexión e inténtalo de nuevo; lo que ya tenías
        guardado no se ha perdido.
      </ErrorState>
    )

  const current = id ? matches.data.find((m) => m.id === id) : undefined
  if (id && !current) return <Navigate to="/historial" replace />
  if (current && mode === 'goles')
    return isAdmin ? (
      <GoalsEditor m={current} players={players.data} />
    ) : (
      <Navigate to={`/historial/${current.id}`} replace />
    )
  if (mode) return <Navigate to={`/historial/${id}`} replace />

  const detail = (m: Match) => (
    <MatchDetail
      key={m.id}
      m={m}
      players={players.data}
      cups={cups}
      defaultPlace={defaultPlace}
      desktop={desktop}
    />
  )
  // Móvil: la ficha ocupa la pantalla
  if (current && !desktop) return detail(current)

  const playedCount = matches.data.filter(isPlayed).length
  const pendingCount = matches.data.length - playedCount
  const selected = desktop ? (current ?? list.find(isPlayed) ?? list[0]) : undefined

  const header = (
    <>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Amistosos y copa</p>
          <h1 className={cx('h-display mt-1', desktop ? 'text-[56px]' : 'h-xl')}>Historial</h1>
        </div>
        {!desktop && (
          <Link className="btn btn--glass btn--sm h-10" to="/estadisticas">
            <BarChart3 /> Estadísticas
          </Link>
        )}
      </div>
      <p className="small text-[13px]">
        <strong className="text-[var(--ink)]">{playedCount}</strong> jugados
        {pendingCount > 0 && (
          <>
            {' '}
            · <strong className="text-[var(--ink)]">{pendingCount}</strong> pendientes
          </>
        )}
      </p>
      {preset?.ids && (
        <div className="flex items-center gap-2">
          <span className="fchip">
            {preset.title ?? 'Partidos elegidos'} · {list.length}
            <button
              type="button"
              aria-label="Ver todos los partidos"
              onClick={() => navigate('/historial', { replace: true })}
            >
              ✕
            </button>
          </span>
        </div>
      )}
    </>
  )

  if (matches.data.length === 0)
    return (
      <div className="flex flex-col gap-3">
        {header}
        <EmptyCards
          title="Aún no hay partidos"
          action={
            isAdmin && (
              <Link className="btn btn--primary mt-1.5 h-[52px]" to="/sorteo">
                <Shuffle /> Hacer un sorteo
              </Link>
            )
          }
        >
          Sortea equipos y pulsa «Guardar partido» en la pizarra para empezar a escribir la historia.
        </EmptyCards>
      </div>
    )

  const listEl = (
    <div className="flex flex-col">
      {groupMatches(list).map((g) => (
        <div key={g.label} className="flex flex-col">
          <p className="grp">{g.label}</p>
          {g.items.map((m) => (
            <MatchRow key={m.id} m={m} names={names} selected={selected?.id === m.id} kits={!desktop} />
          ))}
        </div>
      ))}
    </div>
  )

  if (desktop)
    return (
      <div className="flex items-start gap-6">
        <section className="flex w-[440px] shrink-0 flex-col gap-2.5">
          {header}
          {listEl}
        </section>
        <div className="sticky top-6 min-w-0 flex-1">{selected && detail(selected)}</div>
      </div>
    )

  return (
    <div className="flex flex-col gap-2.5">
      {header}
      {listEl}
    </div>
  )
}

import {
  CalendarCheck,
  Flame,
  Handshake,
  Percent,
  Skull,
  Star,
  Target,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { EmptyCards } from '@/components/States'
import { getClub } from '@/domain/clubs'
import {
  DUO_MIN_GAMES,
  WIN_RATE_MIN_GAMES,
  drawQuality,
  records,
  type DuoRecord,
  type MatchRecord,
  type PlayerRecord,
} from '@/domain/insights'
import { fmt } from '@/domain/rating'
import type { Match, Player } from '@/domain/types'
import { cx } from '@/lib/cx'

/** Nombres que se muestran en un récord empatado */
const MAX_NAMES = 3

const dayMonth = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

export function RecordsView({ matches, players }: { matches: Match[]; players: Player[] }) {
  const quality = useMemo(() => drawQuality(matches), [matches])
  const rec = useMemo(() => records(matches, players), [matches, players])
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players])

  if (quality.played === 0 && !rec.biggestWin && !rec.mostGoals)
    return (
      <EmptyCards title="Sin récords todavía">
        Cuando haya partidos con resultado aparecerán aquí las goleadas, las rachas y las parejas.
      </EmptyCards>
    )

  const names = (r: PlayerRecord) => (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {r.ids.slice(0, MAX_NAMES).map((id, i) => (
        <PlayerLink key={id} id={id} name={r.names[i]!} player={byId.get(id)} />
      ))}
      {r.ids.length > MAX_NAMES && <span className="small text-xs">y {r.ids.length - MAX_NAMES} más</span>}
    </span>
  )

  const matchLine = (r: MatchRecord) => {
    const m = r.match
    const aWins = m.scoreA >= m.scoreB
    const [w, l] = aWins ? [m.clubA, m.clubB] : [m.clubB, m.clubA]
    const [gw, gl] = aWins ? [m.scoreA, m.scoreB] : [m.scoreB, m.scoreA]
    return (
      <span>
        {getClub(w).short} {gw}–{gl} {getClub(l).short} · {dayMonth(m.date)}
        {m.cup && ` · ${m.cup.name}`}
      </span>
    )
  }

  const duo = (d: DuoRecord) => (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <PlayerLink id={d.ids[0]} name={d.names[0]} player={byId.get(d.ids[0])} />
      <span className="text-[var(--muted)]">+</span>
      <PlayerLink id={d.ids[1]} name={d.names[1]} player={byId.get(d.ids[1])} />
    </span>
  )

  const cards: {
    key: string
    icon: LucideIcon
    tone?: 'ok' | 'gold' | 'bad'
    title: string
    value: ReactNode
    who: ReactNode
    detail?: ReactNode
  }[] = []
  if (rec.biggestWin)
    cards.push({
      key: 'win',
      icon: Zap,
      title: 'Mayor goleada',
      value: `+${rec.biggestWin.value}`,
      who: matchLine(rec.biggestWin),
    })
  if (rec.mostGoals)
    cards.push({
      key: 'goals',
      icon: Target,
      title: 'Más goles en un partido',
      value: rec.mostGoals.value,
      who: matchLine(rec.mostGoals),
    })
  if (rec.bestStreak)
    cards.push({
      key: 'streak',
      icon: Flame,
      tone: 'ok',
      title: 'Mejor racha',
      value: rec.bestStreak.value,
      who: names(rec.bestStreak),
      detail: 'victorias seguidas',
    })
  if (rec.mostMvps)
    cards.push({
      key: 'mvp',
      icon: Star,
      tone: 'gold',
      title: 'Rey del MVP',
      value: rec.mostMvps.value,
      who: names(rec.mostMvps),
      detail: rec.mostMvps.value === 1 ? 'MVP' : 'MVPs',
    })
  if (rec.bestWinRate)
    cards.push({
      key: 'rate',
      icon: Percent,
      tone: 'ok',
      title: 'Mejor % de victorias',
      value: `${rec.bestWinRate.value} %`,
      who: names(rec.bestWinRate),
      detail: rec.bestWinRate.detail ?? `mín. ${WIN_RATE_MIN_GAMES} partidos`,
    })
  if (rec.mostPlayed)
    cards.push({
      key: 'played',
      icon: CalendarCheck,
      title: 'El fijo',
      value: rec.mostPlayed.value,
      who: names(rec.mostPlayed),
      detail: 'partidos jugados',
    })
  if (rec.bestDuo)
    cards.push({
      key: 'duo',
      icon: Handshake,
      tone: 'ok',
      title: 'Pareja invencible',
      value: `${Math.round(rec.bestDuo.winRate * 100)} %`,
      who: duo(rec.bestDuo),
      detail: `${rec.bestDuo.won}V ${rec.bestDuo.drawn}E ${rec.bestDuo.lost}D juntos`,
    })
  if (rec.worstDuo)
    cards.push({
      key: 'jinx',
      icon: Skull,
      tone: 'bad',
      title: 'Pareja gafe',
      value: `${Math.round(rec.worstDuo.winRate * 100)} %`,
      who: duo(rec.worstDuo),
      detail: `${rec.worstDuo.won}V ${rec.worstDuo.drawn}E ${rec.worstDuo.lost}D juntos`,
    })

  return (
    <div className="flex flex-col gap-5">
      {quality.played > 0 && <QualityPanel q={quality} />}

      <section className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <h2 className="h-display h-m">Récords</h2>
          <span className="small text-xs">Amistosos y copa</span>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {cards.map((c) => (
            <article key={c.key} className="glass flex items-start gap-3 p-3.5">
              <span
                className={cx(
                  'grid size-10 shrink-0 place-items-center rounded-xl bg-white/5',
                  c.tone === 'ok' && 'text-[var(--ok)]',
                  c.tone === 'gold' && 'text-[var(--warn)]',
                  c.tone === 'bad' && 'text-[#FF8A96]',
                  !c.tone && 'text-[var(--club)]',
                )}
              >
                <c.icon className="size-5" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="eyebrow text-[10px]">{c.title}</span>
                <div className="flex items-baseline gap-2">
                  <span className="h-display num text-[32px] leading-none">{c.value}</span>
                  {c.detail && <span className="small text-xs">{c.detail}</span>}
                </div>
                <div className="text-sm font-semibold text-[var(--ink-2)]">{c.who}</div>
              </div>
            </article>
          ))}
        </div>
        <p className="small text-[11px]">
          Parejas: al menos {DUO_MIN_GAMES} partidos juntos. Con empate en un récord salen todos los
          empatados.
        </p>
      </section>
    </div>
  )
}

function PlayerLink({ id, name, player }: { id: string; name: string; player?: Player }) {
  return (
    <Link to={`/jugador/${id}`} className="inline-flex items-center gap-1.5 text-[var(--ink)] no-underline">
      <PlayerAvatar player={player ?? { name }} className="size-6 text-[10px]" />
      {player?.name ?? name}
    </Link>
  )
}

function QualityPanel({ q }: { q: ReturnType<typeof drawQuality> }) {
  const closePct = Math.round((q.close / q.played) * 100)
  const favPct = q.decided ? Math.round((q.favoriteWon / q.decided) * 100) : null
  const verdict =
    q.played < 3
      ? {
          tone: 'muted',
          text: `Con ${q.played} ${q.played === 1 ? 'partido' : 'partidos'} aún es pronto para sacar conclusiones.`,
        }
      : closePct >= 50
        ? { tone: 'ok', text: 'Los sorteos están saliendo igualados.' }
        : {
            tone: 'warn',
            text: 'Muchos partidos se deciden por 2 goles o más: puede que alguna media no encaje con lo que se ve en el campo.',
          }
  return (
    <section className="glass flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="h-display h-m">¿Funciona el sorteo?</h2>
        <span className="small text-xs">
          {q.played} {q.played === 1 ? 'partido' : 'partidos'} con equipos
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label="Igualados" value={`${closePct} %`} hint="por 0 o 1 gol" accent />
        <Stat label="Diferencia de goles" value={fmt(q.avgMargin)} hint="de media" />
        <Stat
          label="Gana el favorito"
          value={favPct === null ? '–' : `${favPct} %`}
          hint={q.decided ? `${q.favoriteWon} de ${q.decided}` : 'sin favoritos claros'}
        />
        <Stat label="Diferencia de medias" value={fmt(q.avgGap)} hint="al sortear" />
      </div>
      <p
        className={cx(
          'text-sm font-semibold',
          verdict.tone === 'ok' && 'text-[var(--ok)]',
          verdict.tone === 'warn' && 'text-[var(--warn)]',
          verdict.tone === 'muted' && 'text-[var(--muted)]',
        )}
      >
        {verdict.text}
      </p>
      <p className="small text-[11px]">
        Favorito: el equipo que salió con al menos 0,5 puntos más de media. Si casi siempre gana el favorito,
        conviene bajar la tolerancia; si gana cualquiera, el sorteo está haciendo su trabajo.
      </p>
    </section>
  )
}

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: ReactNode
  hint?: string
  accent?: boolean
}) {
  return (
    <div className="panel flex flex-col gap-1 px-3.5 py-3">
      <span className="eyebrow text-[10px] leading-tight">{label}</span>
      <span className={cx('h-display num text-[30px] leading-none', accent && 'neon')}>{value}</span>
      {hint && <span className="small text-[11px]">{hint}</span>}
    </div>
  )
}

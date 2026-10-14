import { CalendarClock, Clock, Crown, MapPin, Pencil, Share2, Shuffle } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MatchWhenFields } from '@/components/MatchWhen'
import { initialWhen, whenToSave } from '@/lib/when'
import { PlayerCard } from '@/components/PlayerCard'
import { ShareCard } from '@/components/ShareCard'
import { Sheet } from '@/components/Sheet'
import { EmptyCards } from '@/components/States'
import { useToast } from '@/components/Toast'
import { CrestGhost } from '@/components/ui'
import type { Cup } from '@/domain/cup'
import { getClub } from '@/domain/clubs'
import { captainFirst } from '@/domain/formation'
import { countdown, lastDuel, nextMatch, type UpcomingMatch } from '@/domain/nextMatch'
import { averageRating, balancePct, fmt, initials } from '@/domain/rating'
import { tieLabel } from '@/domain/cup'
import type { Club, Match, Player } from '@/domain/types'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { useAuth } from '@/lib/auth'
import { cx } from '@/lib/cx'
import { updateCup, updateMatch, type Collection } from '@/lib/data'
import { useDraw } from '@/lib/draw'
import { exportShareImage } from '@/lib/share'
import { drawFromUpcoming, redrawUpcoming, teamPlayers } from '@/lib/upcomingDraw'

const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
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
const pad = (n: number) => String(n).padStart(2, '0')
const longDate = (d: Date) => `${DAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`
const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

/** Reloj que avanza cada segundo (para la cuenta atrás) */
function useNow() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

export function HomePage({
  players,
  matches,
  cups,
}: {
  players: Collection<Player>
  matches: Collection<Match>
  cups: Collection<Cup>
}) {
  const now = useNow()
  // El próximo partido se recalcula cada minuto (no hace falta cada segundo)
  const minute = Math.floor(now / 60000)
  const next = useMemo(
    () => nextMatch(matches.data, cups.data, new Date(minute * 60000)),
    [matches.data, cups.data, minute],
  )

  if (matches.loading || cups.loading)
    return <div className="skel h-[400px] rounded-[30px]" aria-busy="true" />

  if (!next)
    return (
      <EmptyCards
        title="No hay partido a la vista"
        action={
          <Link className="btn btn--primary mt-1.5 h-[52px]" to="/sorteo">
            <Shuffle /> Hacer un sorteo
          </Link>
        }
      >
        Cuando guardéis un partido (o los equipos de un cruce de copa) aparecerá aquí con su cuenta atrás.
      </EmptyCards>
    )

  return <Upcoming up={next} now={now} players={players.data} matches={matches.data} cups={cups.data} />
}

function Upcoming({
  up,
  now,
  players,
  matches,
  cups,
}: {
  up: UpcomingMatch
  now: number
  players: Player[]
  matches: Match[]
  cups: Cup[]
}) {
  const { isAdmin } = useAuth()
  const { config, setDraw, setRevealing } = useDraw()
  const toast = useToast()
  const navigate = useNavigate()
  const desktop = useIsDesktop()
  const shareRef = useRef<HTMLDivElement>(null)
  const [sharing, setSharing] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const a = getClub(up.clubA)
  const b = getClub(up.clubB)
  const teamA = useMemo(() => teamPlayers(up.teamA, players), [up.teamA, players])
  const teamB = useMemo(() => teamPlayers(up.teamB, players), [up.teamB, players])
  const ratingA = averageRating(teamA)
  const ratingB = averageRating(teamB)
  const diff = Math.abs(ratingA - ratingB)
  const capName = (id: string | null) => [...teamA, ...teamB].find((p) => p.id === id)?.name
  const duel = lastDuel(matches, cups, up.clubA, up.clubB)
  const cd = countdown(up.kickoff, now)
  const stale = cd.started && now - up.kickoff.getTime() > 3 * 60 * 60 * 1000
  const status = stale
    ? 'Falta apuntar el resultado'
    : cd.started
      ? '¡Se está jugando!'
      : `${teamA.length + teamB.length} convocados · equipos cerrados`
  const eyebrow = up.kind === 'cup' ? `${up.cupName} · ${tieLabel(up.tie!)}` : 'Próximo partido'
  const vars = {
    '--ca': a.primary,
    '--ca-deep': a.deep,
    '--cb': b.primary,
    '--cb-deep': b.deep,
  } as CSSProperties

  function openPizarra() {
    setDraw(drawFromUpcoming(up, players, config.tolerance))
    navigate('/pizarra')
  }

  function redo() {
    const out = redrawUpcoming(up, players, config)
    if (!out.ok) return toast(out.error, 'error')
    setDraw(out.draw)
    setRevealing(true)
  }

  async function share() {
    if (!shareRef.current) return
    setSharing(true)
    try {
      const how = await exportShareImage(shareRef.current, `wefa-${a.id}-vs-${b.id}.png`)
      if (how === 'downloaded') toast('Imagen descargada')
    } catch {
      toast('No se pudo generar la imagen', 'error')
    } finally {
      setSharing(false)
    }
  }

  const teamName = (club: Club, rating: number, captain: string | null, align: 'left' | 'right') => (
    <div style={{ textAlign: align }} className="min-w-0">
      <div
        className="h-display text-[28px] lg:text-[64px]"
        style={{ color: club.primary, textShadow: `0 0 24px ${club.primary}b3` }}
      >
        {club.name}
      </div>
      <div className="text-xs font-semibold text-white/85 lg:text-[15px]">
        {capName(captain) && (
          <>
            Capitán {capName(captain)}{' '}
            <Crown className="inline size-3.5 text-[#ffd34d]" fill="currentColor" /> ·{' '}
          </>
        )}
        media <strong>{fmt(rating)}</strong>
      </div>
    </div>
  )

  const crests = (
    <>
      <span className={`crest crest--${a.id} home-crest home-crest--a`} aria-hidden />
      <span className="home-vs" aria-label="contra">
        VS
      </span>
      <span className={`crest crest--${b.id} home-crest home-crest--b`} aria-hidden />
    </>
  )

  return (
    <div className="flex flex-col gap-4 lg:gap-6" style={vars}>
      {/* HERO */}
      <section className="home-hero -mx-1.5 min-h-[400px] lg:mx-0 lg:min-h-[440px]">
        <div className="home-split" aria-hidden>
          <div className="l" />
          <div className="r" />
          <div className="seam" />
        </div>
        <CrestGhost
          club={a.id}
          style={{
            width: desktop ? 520 : 300,
            height: desktop ? 520 : 300,
            left: desktop ? -160 : -110,
            top: 40,
            opacity: 0.22,
          }}
        />
        <CrestGhost
          club={b.id}
          style={{
            width: desktop ? 520 : 300,
            height: desktop ? 520 : 300,
            right: desktop ? -160 : -110,
            top: 60,
            opacity: 0.22,
          }}
        />
        <div className="relative flex flex-col items-center px-[18px] pt-[22px] pb-5 lg:px-10 lg:pt-[30px] lg:pb-9">
          <p
            className="eyebrow text-[12px] tracking-[.3em] text-white lg:text-sm"
            style={{ textShadow: '0 2px 10px rgba(0,0,0,.6)' }}
          >
            {eyebrow}
          </p>
          <h1
            className="h-display mt-1.5 text-[30px] lg:text-[44px]"
            style={{ textShadow: '0 2px 12px rgba(0,0,0,.6)' }}
          >
            {longDate(up.kickoff)}
            {desktop && ` · ${pad(up.kickoff.getHours())}:${pad(up.kickoff.getMinutes())} h`}
          </h1>
          {desktop ? (
            <div className="mt-7 grid w-full grid-cols-[minmax(0,1fr)_auto_auto_auto_minmax(0,1fr)] items-center gap-7">
              {teamName(a, ratingA, up.captainA, 'right')}
              {crests}
              {teamName(b, ratingB, up.captainB, 'left')}
            </div>
          ) : (
            <>
              <div className="mt-7 flex items-center gap-1.5">{crests}</div>
              <div className="mt-[22px] grid w-full grid-cols-2 gap-3">
                {teamName(a, ratingA, up.captainA, 'left')}
                {teamName(b, ratingB, up.captainB, 'right')}
              </div>
            </>
          )}
        </div>
      </section>

      {/* CUENTA ATRÁS + INFO + EQUILIBRIO + ACCIONES */}
      <section className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-stretch lg:gap-5">
        <div className="flex flex-col gap-2.5 lg:flex-[2_1_420px]">
          <div className="flex items-baseline justify-between px-1">
            <p className="eyebrow">Saque inicial en</p>
            <span className="small text-xs">{status}</span>
          </div>
          <div
            className="home-cd"
            role="timer"
            aria-label={`Faltan ${cd.days} días, ${cd.hours} horas y ${cd.minutes} minutos`}
          >
            <div>
              <b>{pad(cd.days)}</b>
              <span>días</span>
            </div>
            <div>
              <b>{pad(cd.hours)}</b>
              <span>horas</span>
            </div>
            <div>
              <b>{pad(cd.minutes)}</b>
              <span>min</span>
            </div>
            <div>
              <b className="neon">{pad(cd.seconds)}</b>
              <span>seg</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="home-info">
              <Clock />
              <div>
                <div className="small text-[11px]">Hora</div>
                <div className="text-[15px] font-bold">
                  {up.time
                    ? `${up.time} h`
                    : `${pad(up.kickoff.getHours())}:${pad(up.kickoff.getMinutes())} h`}
                </div>
              </div>
            </div>
            <div className="home-info">
              <MapPin />
              <div className="min-w-0">
                <div className="small text-[11px]">Campo</div>
                <div className="truncate text-[15px] font-bold">{up.place ?? 'Por definir'}</div>
              </div>
            </div>
          </div>
          {isAdmin && (
            <button
              className="btn btn--ghost btn--sm self-start"
              type="button"
              onClick={() => setEditOpen(true)}
            >
              <Pencil /> Cambiar fecha, hora o campo
            </button>
          )}
        </div>

        <section className="glass flex flex-col gap-2 px-4 py-3.5 lg:flex-[1_1_260px] lg:justify-center lg:rounded-[18px]">
          <div className="flex items-center justify-between">
            <span className="label">Equilibrio del sorteo</span>
            <span className="text-[13px] font-bold text-[var(--ok)]">
              {balancePct(diff)} % · Δ {fmt(diff)}
            </span>
          </div>
          <div className="vs-bar" aria-hidden>
            <div
              style={{
                flex: ratingA,
                background: `linear-gradient(90deg, ${a.deep}, ${a.primary})`,
                boxShadow: `0 0 12px ${a.primary}99`,
              }}
            />
            <div
              style={{
                flex: ratingB,
                background: `linear-gradient(90deg, ${b.primary}, ${b.deep})`,
                boxShadow: `0 0 12px ${b.primary}99`,
              }}
            />
          </div>
          <div className="small flex justify-between gap-2 text-xs">
            {duel ? (
              <>
                <span>
                  Último duelo:{' '}
                  <strong className="text-[var(--ink)]">
                    {duel.goalsA === duel.goalsB
                      ? `Empate ${duel.goalsA}–${duel.goalsB}`
                      : `${(duel.goalsA > duel.goalsB ? a : b).short} ${Math.max(duel.goalsA, duel.goalsB)}–${Math.min(duel.goalsA, duel.goalsB)}`}
                  </strong>
                </span>
                <span>{shortDate(duel.date)}</span>
              </>
            ) : (
              <span>
                Primer duelo entre {a.short} y {b.short}
              </span>
            )}
          </div>
        </section>

        <div className="flex flex-col gap-2.5 lg:flex-[1_1_220px] lg:justify-end">
          <button
            className="btn btn--hero h-[66px] text-[32px] lg:h-[72px]"
            type="button"
            onClick={openPizarra}
          >
            Ver pizarra
          </button>
          <div className="grid grid-cols-2 gap-2.5">
            <button className="btn btn--glass" type="button" onClick={() => void share()} disabled={sharing}>
              {sharing ? <span className="spinner" /> : <Share2 />} Compartir
            </button>
            <button className="btn btn--glass" type="button" onClick={redo}>
              <Shuffle /> {desktop ? 'Rehacer' : 'Rehacer sorteo'}
            </button>
          </div>
        </div>
      </section>

      {/* ALINEACIONES */}
      {desktop ? (
        <>
          <TeamCards club={a} players={teamA} captain={up.captainA} rating={ratingA} />
          <TeamCards club={b} players={teamB} captain={up.captainB} rating={ratingB} />
        </>
      ) : (
        <section className="flex flex-col gap-3 pt-1">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="h-display h-m">Alineaciones</h2>
            <span className="small">
              {teamA.length} contra {teamB.length}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Roster club={a} players={teamA} captain={up.captainA} />
            <Roster club={b} players={teamB} captain={up.captainB} />
          </div>
        </section>
      )}

      {/* Lienzo oculto para exportar la imagen */}
      <div aria-hidden className="pointer-events-none fixed top-0 -left-[9999px]">
        <ShareCard
          ref={shareRef}
          teamA={{ club: up.clubA, players: teamA, captain: up.captainA }}
          teamB={{ club: up.clubB, players: teamB, captain: up.captainB }}
          ratingA={ratingA}
          ratingB={ratingB}
          date={shortDate(up.date)}
        />
      </div>

      <EditWhenSheet open={editOpen} onClose={() => setEditOpen(false)} up={up} cups={cups} />
    </div>
  )
}

function Roster({ club, players, captain }: { club: Club; players: Player[]; captain: string | null }) {
  const sorted = captainFirst(
    [...players].sort((x, y) => y.rating - x.rating),
    captain,
  )
  return (
    <div className={`club-${club.id} flex flex-col gap-1.5`}>
      {sorted.map((p) => (
        <div key={p.id} className={cx('rrow', p.id === captain && 'rrow--cap')}>
          <span className="d">{initials(p.name)}</span>
          <span className="n">{p.name}</span>
          {p.id === captain && (
            <Crown className="size-3.5 shrink-0 text-[#ffd34d]" fill="currentColor" aria-label="Capitán" />
          )}
          <span className="m">{p.rating}</span>
        </div>
      ))}
    </div>
  )
}

function TeamCards({
  club,
  players,
  captain,
  rating,
}: {
  club: Club
  players: Player[]
  captain: string | null
  rating: number
}) {
  const sorted = captainFirst(
    [...players].sort((x, y) => y.rating - x.rating),
    captain,
  )
  return (
    <section className={`club-${club.id} home-team`}>
      <div className="flex items-center gap-3">
        <span className={`crest crest--${club.id}`} style={{ width: 40, height: 40 }} aria-hidden />
        <h2 className="h-display h-m flex-1">{club.name} · alineación</h2>
        <span className="h-display neon text-[30px]">{fmt(rating)}</span>
      </div>
      <div className="flex flex-wrap gap-[18px]">
        {sorted.map((p) => (
          <div key={p.id} className="relative">
            {p.id === captain && (
              <Crown
                className="absolute -top-1.5 -right-1 z-[3] size-7 text-[#ffd34d] drop-shadow-[0_3px_6px_rgba(0,0,0,.6)]"
                fill="currentColor"
                aria-label="Capitán"
              />
            )}
            <PlayerCard player={p} size={9.4} />
          </div>
        ))}
      </div>
    </section>
  )
}

function EditWhenSheet({
  open,
  onClose,
  up,
  cups,
}: {
  open: boolean
  onClose: () => void
  up: UpcomingMatch
  cups: Cup[]
}) {
  return (
    <Sheet open={open} onClose={onClose} eyebrow="Próximo partido" title="Fecha, hora y campo">
      {open && <EditWhenForm up={up} cups={cups} onDone={onClose} />}
    </Sheet>
  )
}

function EditWhenForm({ up, cups, onDone }: { up: UpcomingMatch; cups: Cup[]; onDone: () => void }) {
  const toast = useToast()
  const [when, setWhen] = useState(() => initialWhen(up))
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    try {
      const data = whenToSave(when)
      if (up.kind === 'match' && up.matchId) await updateMatch(up.matchId, data)
      else {
        const cup = cups.find((c) => c.id === up.cupId)
        if (!cup || up.tie === undefined) throw new Error('copa')
        await updateCup(cup.id, { ties: cup.ties.map((t, i) => (i === up.tie ? { ...t, ...data } : t)) })
      }
      toast('Partido actualizado')
      onDone()
    } catch {
      toast('No se pudo guardar', 'error')
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <MatchWhenFields value={when} onChange={setWhen} />
      <button
        className="btn btn--primary h-[52px]"
        type="button"
        disabled={busy || !when.date}
        onClick={() => void save()}
      >
        {busy ? <span className="spinner" /> : <CalendarClock />} Guardar
      </button>
    </div>
  )
}

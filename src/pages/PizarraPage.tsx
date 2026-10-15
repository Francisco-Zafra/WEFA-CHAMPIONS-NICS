import {
  AlertTriangle,
  ArrowLeftRight,
  Ban,
  Check,
  Crown,
  Link2,
  Pencil,
  Save,
  Settings2,
  Share2,
  Shuffle,
  Trophy,
  Undo2,
  X,
} from 'lucide-react'
import { LayoutGroup, motion } from 'motion/react'
import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Radar, RadarLegend, StatRows } from '@/components/Comparison'
import { Pitch } from '@/components/Pitch'
import { Kit } from '@/components/Kit'
import { ShareCard } from '@/components/ShareCard'
import { MatchWhenFields } from '@/components/MatchWhen'
import { initialWhen, whenToSave } from '@/lib/when'
import { Sheet } from '@/components/Sheet'
import { EmptyCards } from '@/components/States'
import { useToast } from '@/components/Toast'
import { Banner, Crest } from '@/components/ui'
import { rebalance, type TeamSummary } from '@/domain/balance'
import { getClub } from '@/domain/clubs'
import { participants, roundOf, tieLabel, type Cup } from '@/domain/cup'
import { balancePct, fmt, statScale } from '@/domain/rating'
import type { Club, Player } from '@/domain/types'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { useAuth } from '@/lib/auth'
import { useDrawHistory } from '@/lib/drawHistory'
import { createMatch, updateCup, updateMatch, type Collection } from '@/lib/data'
import { useDraw, type Draw } from '@/lib/draw'
import { runDraw } from '@/lib/runDraw'
import { exportShareImage } from '@/lib/share'

const shortDate = (ms: number) =>
  new Date(ms).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })

export function PizarraPage({
  players,
  cups,
  defaultPlace,
}: {
  players: Collection<Player>
  cups: Collection<Cup>
  /** Campo del último partido guardado */
  defaultPlace: string | null
}) {
  const { draw, config, setDraw, setRevealing } = useDraw()
  const { isAdmin } = useAuth()
  const pairs = useDrawHistory()
  const toast = useToast()
  const desktop = useIsDesktop()
  const shareRef = useRef<HTMLDivElement>(null)
  const [sharing, setSharing] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

  if (!draw)
    return (
      <EmptyCards
        title="Aún no hay alineaciones"
        action={
          isAdmin && (
            <Link className="btn btn--primary mt-1.5 h-[52px]" to="/sorteo">
              <Shuffle /> Ir al sorteo
            </Link>
          )
        }
      >
        {isAdmin
          ? 'Haz un sorteo y aquí aparecerá la pizarra con los dos equipos, la comparativa y la imagen para compartir.'
          : 'Cuando el admin haga el sorteo, aquí aparecerá la pizarra con los dos equipos.'}
      </EmptyCards>
    )

  const { result } = draw
  const a = getClub(draw.clubA)
  const b = getClub(draw.clubB)
  const teamA = { club: draw.clubA, players: result.teamA.players, captain: draw.captainA }
  const teamB = { club: draw.clubB, players: result.teamB.players, captain: draw.captainB }
  const pct = balancePct(result.ratingDiff)
  const vs = `${result.teamA.players.length} contra ${result.teamB.players.length}`
  const edited = !!draw.original
  const sideOf = (id: string) => (result.teamA.players.some((p) => p.id === id) ? 'A' : 'B')
  const findPlayer = (id: string) =>
    [...result.teamA.players, ...result.teamB.players].find((p) => p.id === id)!

  /** Aplica un cambio manual y recalcula todo al momento */
  function applyEdit(nextA: Player[], nextB: Player[], capA: string | null, capB: string | null) {
    if (!draw) return
    setDraw({
      ...draw,
      result: rebalance(nextA, nextB, draw.tolerance, draw.result),
      // Un capitán que cambia de equipo deja de serlo
      captainA: capA && nextA.some((p) => p.id === capA) ? capA : null,
      captainB: capB && nextB.some((p) => p.id === capB) ? capB : null,
      original: draw.original ?? { result: draw.result, captainA: draw.captainA, captainB: draw.captainB },
    })
  }

  function swap(x: string, y: string) {
    const px = findPlayer(x)!
    const py = findPlayer(y)!
    const sub = (p: Player) => (p.id === x ? py : p.id === y ? px : p)
    applyEdit(result.teamA.players.map(sub), result.teamB.players.map(sub), draw!.captainA, draw!.captainB)
    setSelected(null)
  }

  function moveToOther(id: string) {
    const fromA = sideOf(id) === 'A'
    const from = fromA ? result.teamA.players : result.teamB.players
    if (from.length <= 1) return toast('Un equipo no puede quedarse sin jugadores', 'error')
    const p = findPlayer(id)!
    const nextA = fromA ? result.teamA.players.filter((x) => x.id !== id) : [...result.teamA.players, p]
    const nextB = fromA ? [...result.teamB.players, p] : result.teamB.players.filter((x) => x.id !== id)
    applyEdit(nextA, nextB, draw!.captainA, draw!.captainB)
    setSelected(null)
  }

  function toggleCaptain(id: string) {
    const isA = sideOf(id) === 'A'
    const current = isA ? draw!.captainA : draw!.captainB
    const next = current === id ? null : id
    applyEdit(
      result.teamA.players,
      result.teamB.players,
      isA ? next : draw!.captainA,
      isA ? draw!.captainB : next,
    )
    setSelected(null)
  }

  function onSelect(id: string) {
    if (!selected) setSelected(id)
    else if (selected === id) setSelected(null)
    else if (sideOf(selected) === sideOf(id)) setSelected(id)
    else swap(selected, id)
  }

  function undo() {
    if (!draw?.original) return
    setDraw({ ...draw, ...draw.original, original: undefined })
    setSelected(null)
    toast('Vuelta al sorteo original', 'info')
  }

  function redraw() {
    if (!draw) return
    // Repite este mismo partido: sus clubes, capitanes y tolerancia (amistoso o copa)
    const out = runDraw(
      players.data,
      {
        ...config,
        clubA: draw.clubA,
        clubB: draw.clubB,
        captainA: draw.captainA,
        captainB: draw.captainB,
        tolerance: draw.tolerance,
      },
      draw.cup,
      undefined,
      pairs,
    )
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

  const adjustButton = (
    <button
      className={`btn ${editing ? 'btn--primary' : 'btn--glass'} col-span-2`}
      type="button"
      aria-pressed={editing}
      onClick={() => {
        setEditing((v) => !v)
        setSelected(null)
      }}
    >
      <ArrowLeftRight /> {editing ? 'Terminar ajustes' : 'Ajustar equipos'}
    </button>
  )

  const actions = (
    <>
      {isAdmin && (
        <button
          className="btn btn--primary h-[54px] lg:order-last lg:h-12"
          type="button"
          onClick={() => setSaveOpen(true)}
        >
          {draw.cup ? <Trophy /> : <Save />}{' '}
          {draw.cup ? 'Guardar en la copa' : draw.savedMatchId ? 'Actualizar partido' : 'Guardar partido'}
        </button>
      )}
      <div className="grid grid-cols-2 gap-2.5 lg:flex">
        <button
          className={`btn btn--glass ${isAdmin ? '' : 'col-span-2'}`}
          type="button"
          onClick={() => void share()}
          disabled={sharing}
        >
          {sharing ? <span className="spinner" /> : <Share2 />} Compartir imagen
        </button>
        {isAdmin ? (
          <>
            <button className="btn btn--glass" type="button" onClick={redraw}>
              <Shuffle /> Volver a sortear
            </button>
            {!desktop && adjustButton}
          </>
        ) : null}
      </div>
    </>
  )

  const [scaleLo, scaleHi] = statScale(result.teamA.stats, result.teamB.stats)
  const nameOf = (id: string) => findPlayer(id)?.name ?? '¿?'
  const findCaptain = (id: string | null) => (id ? findPlayer(id) : undefined)
  const rules = [
    ...(draw.rules?.together ?? []).map(([x, y]) => ({
      apart: false,
      text: `${nameOf(x)} y ${nameOf(y)}, juntos`,
    })),
    ...(draw.rules?.apart ?? []).map(([x, y]) => ({
      apart: true,
      text: `${nameOf(x)} y ${nameOf(y)}, separados`,
    })),
  ]

  const banner = (club: Club, side: 'A' | 'B', rating: number) => (
    <div className={`club-banner club-${club.id} lg:h-[52px]`}>
      <Crest club={club.id} size={desktop ? 34 : 32} />
      <span className="h-display h-s">{club.name}</span>
      <Kit side={side} className="size-[18px]" />
      <span className="flex-1" />
      <span className="h-display neon num text-[26px] lg:text-[28px]">{fmt(rating)}</span>
    </div>
  )

  return (
    <div className={`flex flex-col gap-3 lg:gap-6 ${editing ? 'pb-36' : ''}`}>
      {/* Cabecera */}
      {desktop ? (
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <p className="eyebrow">
              {draw.cup ? `Copa · ${draw.cup.cupName} · ${roundOf(draw.cup.tie).name}` : 'Amistoso'} ·{' '}
              {shortDate(draw.at)} · {vs}
            </p>
            <h1 className="h-display mt-2 text-[50px]">
              {a.name} <span className="text-[var(--muted)]">vs</span> {b.name}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2.5">{actions}</div>
        </header>
      ) : (
        <header className="flex flex-col items-center gap-1.5 text-center">
          <p className="eyebrow">
            {draw.cup
              ? `Copa · ${draw.cup.cupName} · ${tieLabel(draw.cup.tie)}`
              : `Amistoso · ${shortDate(draw.at)}`}
          </p>
          <div className="flex items-center gap-3">
            <Crest club={a.id} size={52} />
            <h1 className="h-display text-[34px]">
              {a.short} <span className="text-[var(--muted)]">vs</span> {b.short}
            </h1>
            <Crest club={b.id} size={52} />
          </div>
        </header>
      )}

      {edited && (
        <div className="flex flex-wrap items-center justify-center gap-2.5 lg:justify-start">
          <span className="pill pill--on h-8 cursor-default">
            <Pencil className="size-3.5" /> Editado a mano
          </span>
          <button className="btn btn--ghost btn--sm" type="button" onClick={undo}>
            <Undo2 /> Deshacer cambios
          </button>
        </div>
      )}

      {!result.withinTolerance && (
        <Banner tone="warn" icon={<AlertTriangle />}>
          {edited || draw.fromSaved
            ? `La diferencia entre equipos supera la tolerancia de ±${fmt(draw.tolerance)}.`
            : `Ninguna combinación cumple la tolerancia de ±${fmt(draw.tolerance)}: esta es la más igualada posible.`}
        </Banner>
      )}

      {desktop ? (
        <div className="flex items-stretch gap-6">
          {/* Columna izquierda: campo */}
          <motion.section
            key={draw.seed}
            className="panel flex w-[440px] shrink-0 flex-col gap-3 p-4"
            aria-label="Alineaciones"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {banner(a, 'A', result.teamA.rating)}
            <LayoutGroup>
              <Pitch
                teamA={teamA}
                teamB={teamB}
                height={600}
                edit={editing && isAdmin ? { selected, onSelect } : undefined}
              />
            </LayoutGroup>
            {banner(b, 'B', result.teamB.rating)}
            {isAdmin && adjustButton}
          </motion.section>

          {/* Columna derecha: tres filas que suman la altura del campo */}
          <div className="grid min-w-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] gap-5">
            <div className="grid grid-cols-3 gap-4">
              <TeamKpi club={a} side="A" rating={result.teamA.rating} />
              <div className="panel kpi items-center text-center">
                <span className="eyebrow">Diferencia</span>
                <div
                  className="h-display num text-[64px]"
                  style={{
                    color: result.withinTolerance ? 'var(--ok)' : 'var(--warn)',
                    textShadow: '0 0 20px rgba(59,227,160,.45)',
                  }}
                >
                  {fmt(result.ratingDiff)}
                </div>
                <div className="flex w-full flex-col gap-1.5">
                  <div className="meter">
                    <div className="meter__fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span
                    className="text-[11px] font-bold"
                    style={{ color: result.withinTolerance ? 'var(--ok)' : 'var(--warn)' }}
                  >
                    Equilibrio {pct} % · tolerancia ±{fmt(draw.tolerance)}
                  </span>
                </div>
              </div>
              <TeamKpi club={b} side="B" rating={result.teamB.rating} right />
            </div>

            <section
              className="panel flex flex-col gap-3.5 px-6 py-[22px]"
              aria-label="Comparativa de stats medias"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="h-display h-m">Stats medias</h2>
                <RadarLegend clubA={a} clubB={b} />
              </div>
              <div className="grid flex-1 grid-cols-2 items-center gap-7">
                <div className="mx-auto w-full max-w-[320px]">
                  <Radar a={result.teamA} b={result.teamB} clubA={a} clubB={b} bare />
                </div>
                <div className="flex flex-col gap-4">
                  <StatRows a={result.teamA} b={result.teamB} clubA={a} clubB={b} />
                  <p className="small text-[11px]">
                    Radar y barras en escala {scaleLo}–{scaleHi}.
                  </p>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-2 gap-4">
              <section className="panel flex flex-col gap-3 px-5 py-[18px]">
                <p className="eyebrow">Reglas del sorteo</p>
                {rules.length === 0 ? (
                  <p className="li">Sin reglas: reparto libre.</p>
                ) : (
                  rules.map((r, i) => (
                    <div key={i} className="li">
                      {r.apart ? (
                        <Ban className="text-[#ff8a96]" aria-label="Separados" />
                      ) : (
                        <Link2 className="text-[var(--ok)]" aria-label="Juntos" />
                      )}
                      {r.text}
                    </div>
                  ))
                )}
                <p className="small mt-auto text-[11px]">
                  {edited
                    ? 'Equipos ajustados a mano a partir del sorteo.'
                    : draw.fromSaved
                      ? 'Equipos del partido guardado.'
                      : result.repeat !== undefined
                        ? 'Variedad aplicada: se evitan las parejas de las últimas alineaciones.'
                        : result.method === 'exhaustive'
                          ? `Analizadas todas las combinaciones: ${result.candidates} cumplen la tolerancia.`
                          : `Búsqueda inteligente: ${result.candidates} combinaciones óptimas encontradas.`}
                </p>
              </section>
              <section className="panel flex flex-col gap-3 px-5 py-[18px]">
                <p className="eyebrow">Capitanes</p>
                <CaptainLine club={a} player={findCaptain(draw.captainA)} />
                <CaptainLine club={b} player={findCaptain(draw.captainB)} />
              </section>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-start lg:gap-8">
          <motion.div
            key={draw.seed}
            className="flex flex-col gap-2.5 lg:max-w-[460px] lg:flex-[1_1_400px]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {banner(a, 'A', result.teamA.rating)}
            <LayoutGroup>
              <Pitch
                teamA={teamA}
                teamB={teamB}
                height={600}
                edit={editing && isAdmin ? { selected, onSelect } : undefined}
              />
            </LayoutGroup>
            {banner(b, 'B', result.teamB.rating)}
          </motion.div>

          <section className="glass mt-2 flex min-w-0 flex-col gap-3.5 px-4 py-[18px] lg:mt-0 lg:flex-[999_1_420px] lg:gap-[22px] lg:rounded-3xl lg:p-7">
            <div className="flex items-baseline justify-between lg:hidden">
              <h2 className="h-display h-m">Comparativa</h2>
              <span className="small">Media por stat</span>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center lg:gap-4">
              <TeamAvg club={a} side="A" rating={result.teamA.rating} />
              <div className="glass rounded-[14px] px-3 py-2 lg:rounded-[18px] lg:px-5 lg:py-3">
                <div className="eyebrow text-[10px] lg:text-[11px]">Diferencia</div>
                <div className="h-display num text-[30px] text-[var(--ok)] lg:text-5xl">
                  {fmt(result.ratingDiff)}
                </div>
              </div>
              <TeamAvg club={b} side="B" rating={result.teamB.rating} />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between gap-2">
                <span className="label">Equilibrio</span>
                <span
                  className="text-xs font-bold"
                  style={{ color: result.withinTolerance ? 'var(--ok)' : 'var(--warn)' }}
                >
                  {pct} % · {result.withinTolerance ? 'dentro' : 'fuera'} de la tolerancia ±
                  {fmt(draw.tolerance)}
                </span>
              </div>
              <div className="meter">
                <div className="meter__fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-7">
              <div className="min-w-[260px] flex-[1_1_280px]">
                <Radar a={result.teamA} b={result.teamB} clubA={a} clubB={b} />
              </div>
              <div className="min-w-[240px] flex-[1_1_260px]">
                <StatRows a={result.teamA} b={result.teamB} clubA={a} clubB={b} />
              </div>
            </div>
            <p className="small text-[11px]">
              {edited
                ? 'Equipos ajustados a mano a partir del sorteo.'
                : draw.fromSaved
                  ? 'Equipos del partido guardado.'
                  : result.method === 'exhaustive'
                    ? `Analizadas todas las combinaciones: ${result.candidates} cumplen la tolerancia.`
                    : `Búsqueda inteligente: ${result.candidates} combinaciones óptimas encontradas.`}
            </p>
          </section>
        </div>
      )}

      {!desktop && <div className="mt-1 flex flex-col gap-2.5">{actions}</div>}
      {isAdmin && (
        <Link className="btn btn--ghost btn--sm self-center" to="/sorteo">
          <Settings2 /> Ajustar sorteo
        </Link>
      )}

      {editing && isAdmin && (
        <div className="edit-bar">
          <div
            className="glass glass--club mx-auto flex max-w-2xl flex-col gap-2.5 rounded-[20px] p-3"
            style={{ background: 'rgba(10,20,48,.9)' }}
          >
            {selected ? (
              <>
                <p className="text-sm">
                  <strong>{findPlayer(selected)?.name}</strong>{' '}
                  <span className="text-[var(--muted)]">
                    · toca un jugador de {(sideOf(selected) === 'A' ? b : a).short} para intercambiarlos
                  </span>
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    className="btn btn--glass btn--sm h-11"
                    type="button"
                    onClick={() => moveToOther(selected)}
                  >
                    <ArrowLeftRight /> A {(sideOf(selected) === 'A' ? b : a).short}
                  </button>
                  <button
                    className="btn btn--glass btn--sm h-11"
                    type="button"
                    onClick={() => toggleCaptain(selected)}
                  >
                    <Crown />
                    {selected === draw.captainA || selected === draw.captainB ? 'Quitar cap.' : 'Capitán'}
                  </button>
                  <button
                    className="btn btn--ghost btn--sm h-11"
                    type="button"
                    onClick={() => setSelected(null)}
                  >
                    <X /> Cancelar
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <p className="small flex-1 text-[13px]">
                  Toca un jugador y luego otro del equipo rival para{' '}
                  <strong className="text-[var(--ink)]">intercambiarlos</strong>. Todo se recalcula al
                  momento.
                </p>
                <button
                  className="btn btn--primary btn--sm h-11"
                  type="button"
                  onClick={() => setEditing(false)}
                >
                  <Check /> Listo
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lienzo oculto para exportar la imagen */}
      <div aria-hidden className="pointer-events-none fixed top-0 -left-[9999px]">
        <ShareCard
          ref={shareRef}
          teamA={teamA}
          teamB={teamB}
          ratingA={result.teamA.rating}
          ratingB={result.teamB.rating}
          date={shortDate(draw.at)}
        />
      </div>

      <SaveMatchSheet
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        draw={draw}
        cups={cups.data}
        defaultPlace={defaultPlace}
      />
    </div>
  )
}

function TeamKpi({
  club,
  side,
  rating,
  right,
}: {
  club: Club
  side: 'A' | 'B'
  rating: number
  right?: boolean
}) {
  return (
    <div className={`panel kpi kpi--club club-${club.id} ${right ? 'items-end text-right' : ''}`}>
      <div className={`flex items-center gap-2.5 ${right ? 'flex-row-reverse' : ''}`}>
        <Crest club={club.id} size={36} />
        <span className="eyebrow">{club.name}</span>
        <Kit side={side} className="size-4" />
      </div>
      <div>
        <div className="h-display neon num text-[64px]">{fmt(rating)}</div>
        <div className="small text-xs">Media del equipo</div>
      </div>
    </div>
  )
}

function CaptainLine({ club, player }: { club: Club; player?: Player }) {
  return (
    <div className={`li club-${club.id}`}>
      <Crest club={club.id} size={22} style={{ borderRadius: 6 }} />
      <span className="flex-1 font-semibold text-[var(--ink)]">{player?.name ?? 'Sin capitán'}</span>
      {player && (
        <>
          <Crown className="text-[#ffd34d]" fill="currentColor" aria-label="Capitán" />
          <span className="neon font-[family-name:var(--display)] text-lg">{player.rating}</span>
        </>
      )}
    </div>
  )
}

function TeamAvg({ club, side, rating }: { club: Club; side: 'A' | 'B'; rating: number }) {
  return (
    <div className={`club-${club.id}`}>
      <div className="h-display neon num text-[44px] lg:text-[72px]">{fmt(rating)}</div>
      <div className="small flex items-center gap-1 text-[11px] lg:text-[13px]">
        <Kit side={side} className="size-3 lg:size-3.5" />
        <span className="hidden lg:inline">Media </span>
        {club.name}
      </div>
    </div>
  )
}

function SaveMatchSheet({
  open,
  onClose,
  draw,
  cups,
  defaultPlace,
}: {
  open: boolean
  onClose: () => void
  draw: Draw
  cups: Cup[]
  defaultPlace: string | null
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      eyebrow={draw.cup ? `${draw.cup.cupName} · ${tieLabel(draw.cup.tie)}` : 'Pizarra'}
      title={draw.cup ? 'Guardar en la copa' : draw.savedMatchId ? 'Actualizar partido' : 'Guardar partido'}
    >
      {open && <SaveMatchForm draw={draw} cups={cups} defaultPlace={defaultPlace} onClose={onClose} />}
    </Sheet>
  )
}

function SaveMatchForm({
  draw,
  cups,
  defaultPlace,
  onClose,
}: {
  draw: Draw
  cups: Cup[]
  defaultPlace: string | null
  onClose: () => void
}) {
  const toast = useToast()
  const navigate = useNavigate()
  const { clearCup } = useDraw()
  const [when, setWhen] = useState(() => initialWhen(draw.when, defaultPlace))
  const [busy, setBusy] = useState(false)
  const snapshot = (t: TeamSummary) => t.players.map((p) => ({ id: p.id, name: p.name, rating: p.rating }))
  const lineups = {
    captainA: draw.captainA,
    captainB: draw.captainB,
    teamA: snapshot(draw.result.teamA),
    teamB: snapshot(draw.result.teamB),
  }

  /** Partido de copa: los equipos se guardan en su cruce del cuadro */
  async function saveToCup(ref: NonNullable<Draw['cup']>) {
    const cup = cups.find((c) => c.id === ref.cupId)
    if (!cup) return toast('Esa copa ya no existe', 'error')
    const [a, b] = participants(cup, ref.tie)
    if (a !== draw.clubA || b !== draw.clubB)
      return toast('El cruce ha cambiado: vuelve a sortear desde la copa', 'error')
    if (cup.ties[ref.tie]!.winner) return toast('Ese cruce ya tiene resultado', 'error')
    const ties = cup.ties.map((t, i) => (i === ref.tie ? { ...t, ...whenToSave(when), ...lineups } : t))
    await updateCup(cup.id, { ties })
    toast('Equipos guardados en el cuadro. Apunta el resultado tras el partido')
    clearCup()
    onClose()
    navigate(`/copa/${cup.id}`)
  }

  async function save() {
    setBusy(true)
    try {
      if (draw.cup) return await saveToCup(draw.cup)
      if (draw.savedMatchId) {
        // Sorteo rehecho de un partido ya guardado: se actualiza, no se duplica
        await updateMatch(draw.savedMatchId, {
          ...whenToSave(when),
          clubA: draw.clubA,
          clubB: draw.clubB,
          ...lineups,
        })
        toast('Partido actualizado')
        onClose()
        navigate('/')
        return
      }
      await createMatch({
        ...whenToSave(when),
        clubA: draw.clubA,
        clubB: draw.clubB,
        ...lineups,
        scoreA: null,
        scoreB: null,
        mvp: null,
      })
      toast('Partido guardado. Ya aparece como próximo partido en Inicio')
      onClose()
      navigate('/')
    } catch {
      toast('No se pudo guardar el partido', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="small">
        {draw.cup
          ? 'Los equipos se guardan en el cruce del cuadro. El resultado lo apuntas en la copa después del partido.'
          : 'Se guardan los equipos tal cual. El marcador y el MVP los pones después del partido.'}
      </p>
      <MatchWhenFields value={when} onChange={setWhen} />
      <button
        className="btn btn--primary h-[52px]"
        type="button"
        onClick={() => void save()}
        disabled={busy || !when.date}
      >
        {busy ? <span className="spinner" /> : <Save />} {draw.savedMatchId ? 'Actualizar' : 'Guardar'}
      </button>
    </div>
  )
}

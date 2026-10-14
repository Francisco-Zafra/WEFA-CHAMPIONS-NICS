import { AlertTriangle, Save, Settings2, Share2, Shuffle } from 'lucide-react'
import { motion } from 'motion/react'
import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Radar, StatRows } from '@/components/Comparison'
import { Pitch } from '@/components/Pitch'
import { ShareCard } from '@/components/ShareCard'
import { Sheet } from '@/components/Sheet'
import { EmptyCards } from '@/components/States'
import { useToast } from '@/components/Toast'
import { Banner, Crest } from '@/components/ui'
import type { TeamSummary } from '@/domain/balance'
import { getClub } from '@/domain/clubs'
import { balancePct, fmt, overall } from '@/domain/rating'
import type { Club, Player } from '@/domain/types'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { useAuth } from '@/lib/auth'
import { createMatch, type Collection } from '@/lib/data'
import { useDraw, type Draw } from '@/lib/draw'
import { runDraw } from '@/lib/runDraw'
import { exportShareImage } from '@/lib/share'

const longDate = (ms: number) =>
  new Date(ms).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
const shortDate = (ms: number) =>
  new Date(ms).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })

export function PizarraPage({ players }: { players: Collection<Player> }) {
  const { draw, config, setDraw, setRevealing } = useDraw()
  const { isAdmin } = useAuth()
  const toast = useToast()
  const desktop = useIsDesktop()
  const shareRef = useRef<HTMLDivElement>(null)
  const [sharing, setSharing] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)

  if (!draw)
    return (
      <EmptyCards
        title="Aún no hay alineaciones"
        action={
          <Link className="btn btn--primary mt-1.5 h-[52px]" to="/sorteo">
            <Shuffle /> Ir al sorteo
          </Link>
        }
      >
        Haz un sorteo y aquí aparecerá la pizarra con los dos equipos, la comparativa y la imagen para
        compartir.
      </EmptyCards>
    )

  const { result } = draw
  const a = getClub(draw.clubA)
  const b = getClub(draw.clubB)
  const teamA = { club: draw.clubA, players: result.teamA.players, captain: draw.captainA }
  const teamB = { club: draw.clubB, players: result.teamB.players, captain: draw.captainB }
  const pct = balancePct(result.ratingDiff)
  const vs = `${result.teamA.players.length} contra ${result.teamB.players.length}`

  function redraw() {
    const out = runDraw(players.data, config)
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

  const actions = (
    <>
      {isAdmin && (
        <button
          className="btn btn--primary h-[54px] lg:order-last lg:h-12"
          type="button"
          onClick={() => setSaveOpen(true)}
        >
          <Save /> Guardar partido
        </button>
      )}
      <div className="grid grid-cols-2 gap-2.5 lg:flex">
        <button className="btn btn--glass" type="button" onClick={() => void share()} disabled={sharing}>
          {sharing ? <span className="spinner" /> : <Share2 />} Compartir imagen
        </button>
        <button className="btn btn--glass" type="button" onClick={redraw}>
          <Shuffle /> Volver a sortear
        </button>
      </div>
    </>
  )

  const banner = (club: Club, rating: number) => (
    <div className={`club-banner club-${club.id} lg:h-[52px]`}>
      <Crest club={club.id} size={desktop ? 34 : 32} />
      <span className="h-display h-s flex-1">{club.name}</span>
      <span className="h-display neon num text-[26px] lg:text-[28px]">{fmt(rating)}</span>
    </div>
  )

  return (
    <div className="flex flex-col gap-3 lg:gap-6">
      {/* Cabecera */}
      <header className="flex flex-col items-center gap-1.5 text-center lg:flex-row lg:flex-wrap lg:justify-between lg:gap-5 lg:text-left">
        <div className="flex flex-col items-center gap-1.5 lg:flex-row lg:gap-[18px]">
          <p className="eyebrow lg:hidden">Pizarra · {shortDate(draw.at)}</p>
          <div className="flex items-center gap-3 lg:gap-[18px]">
            <Crest club={a.id} size={desktop ? 76 : 52} />
            <div>
              <p className="eyebrow hidden lg:block">
                Pizarra · {longDate(draw.at)} · {vs}
              </p>
              <h1 className="h-display text-[34px] lg:mt-1.5 lg:text-[60px]">
                {desktop ? a.name : a.short} <span className="text-[var(--muted)]">vs</span>{' '}
                {desktop ? b.name : b.short}
              </h1>
            </div>
            <Crest club={b.id} size={desktop ? 76 : 52} />
          </div>
        </div>
        {desktop && <div className="flex flex-wrap gap-2.5">{actions}</div>}
      </header>

      {!result.withinTolerance && (
        <Banner tone="warn" icon={<AlertTriangle />}>
          Ninguna combinación cumple la tolerancia de ±{fmt(draw.tolerance)}: esta es la más igualada posible.
        </Banner>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-start lg:gap-8">
        <motion.div
          key={draw.seed}
          className="flex flex-col gap-2.5 lg:max-w-[460px] lg:flex-[1_1_400px]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {banner(a, result.teamA.rating)}
          <Pitch teamA={teamA} teamB={teamB} height={desktop ? 680 : 640} />
          {banner(b, result.teamB.rating)}
        </motion.div>

        <section className="glass mt-2 flex min-w-0 flex-col gap-3.5 px-4 py-[18px] lg:mt-0 lg:flex-[999_1_420px] lg:gap-[22px] lg:rounded-3xl lg:p-7">
          <div className="flex items-baseline justify-between lg:hidden">
            <h2 className="h-display h-m">Comparativa</h2>
            <span className="small">Media por stat</span>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center lg:gap-4">
            <TeamAvg club={a} rating={result.teamA.rating} />
            <div className="glass rounded-[14px] px-3 py-2 lg:rounded-[18px] lg:px-5 lg:py-3">
              <div className="eyebrow text-[10px] lg:text-[11px]">Diferencia</div>
              <div className="h-display num text-[30px] text-[var(--ok)] lg:text-5xl">
                {fmt(result.ratingDiff)}
              </div>
            </div>
            <TeamAvg club={b} rating={result.teamB.rating} />
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
            {result.method === 'exhaustive'
              ? `Analizadas todas las combinaciones: ${result.candidates} cumplen la tolerancia.`
              : `Búsqueda inteligente: ${result.candidates} combinaciones óptimas encontradas.`}
          </p>
        </section>
      </div>

      {!desktop && <div className="mt-1 flex flex-col gap-2.5">{actions}</div>}
      <Link className="btn btn--ghost btn--sm self-center" to="/sorteo">
        <Settings2 /> Ajustar sorteo
      </Link>

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

      <SaveMatchSheet open={saveOpen} onClose={() => setSaveOpen(false)} draw={draw} />
    </div>
  )
}

function TeamAvg({ club, rating }: { club: Club; rating: number }) {
  return (
    <div className={`club-${club.id}`}>
      <div className="h-display neon num text-[44px] lg:text-[72px]">{fmt(rating)}</div>
      <div className="small text-[11px] lg:text-[13px]">
        <span className="hidden lg:inline">Media </span>
        {club.name}
      </div>
    </div>
  )
}

const isoToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function SaveMatchSheet({ open, onClose, draw }: { open: boolean; onClose: () => void; draw: Draw }) {
  const toast = useToast()
  const navigate = useNavigate()
  const [date, setDate] = useState(isoToday)
  const [busy, setBusy] = useState(false)
  const snapshot = (t: TeamSummary) =>
    t.players.map((p) => ({ id: p.id, name: p.name, rating: overall(p.stats) }))

  async function save() {
    setBusy(true)
    try {
      await createMatch({
        date,
        clubA: draw.clubA,
        clubB: draw.clubB,
        captainA: draw.captainA,
        captainB: draw.captainB,
        teamA: snapshot(draw.result.teamA),
        teamB: snapshot(draw.result.teamB),
        scoreA: null,
        scoreB: null,
        mvp: null,
      })
      toast('Partido guardado. Apunta el resultado en Historial')
      onClose()
      navigate('/historial')
    } catch {
      toast('No se pudo guardar el partido', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} eyebrow="Pizarra" title="Guardar partido">
      <div className="flex flex-col gap-4">
        <p className="small">
          Se guardan los equipos tal cual. El marcador y el MVP los pones después del partido.
        </p>
        <div className="field">
          <label htmlFor="match-date">Fecha del partido</label>
          <input
            id="match-date"
            className="input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <button
          className="btn btn--primary h-[52px]"
          type="button"
          onClick={() => void save()}
          disabled={busy || !date}
        >
          {busy ? <span className="spinner" /> : <Save />} Guardar
        </button>
      </div>
    </Sheet>
  )
}

import { AlertTriangle, Clapperboard, Crown, Save, Settings2, Share2, Shuffle } from 'lucide-react'
import { motion } from 'motion/react'
import { useRef, useState } from 'react'
import { Pitch } from '@/components/Pitch'
import { Radar } from '@/components/Radar'
import { ShareCard } from '@/components/ShareCard'
import { Sheet } from '@/components/Sheet'
import { useToast } from '@/components/Toast'
import { Button, ClubBadge } from '@/components/ui'
import type { TeamSummary } from '@/domain/balance'
import { getClub } from '@/domain/clubs'
import { formationLabel } from '@/domain/formation'
import { overall } from '@/domain/rating'
import type { Club } from '@/domain/types'
import { useAuth } from '@/lib/auth'
import { createMatch } from '@/lib/data'
import { exportShareImage } from '@/lib/share'
import type { Draw } from '@/lib/draw'

function balanceLabel(diff: number) {
  if (diff <= 0.25) return { text: 'Perfecto', color: 'text-win' }
  if (diff <= 0.75) return { text: 'Muy igualado', color: 'text-win' }
  if (diff <= 1.5) return { text: 'Igualado', color: 'text-gold' }
  return { text: 'Descompensado', color: 'text-loss' }
}

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function DrawResult({
  draw,
  onRedraw,
  onReplay,
  onEdit,
  onSaved,
}: {
  draw: Draw
  onRedraw: () => void
  onReplay: () => void
  onEdit: () => void
  onSaved: () => void
}) {
  const { isAdmin } = useAuth()
  const toast = useToast()
  const shareRef = useRef<HTMLDivElement>(null)
  const [sharing, setSharing] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const { result } = draw
  const clubA = getClub(draw.clubA)
  const clubB = getClub(draw.clubB)
  const balance = balanceLabel(result.ratingDiff)
  const teamA = {
    club: draw.clubA,
    players: result.teamA.players,
    captain: draw.captainA,
    rating: result.teamA.rating,
  }
  const teamB = {
    club: draw.clubB,
    players: result.teamB.players,
    captain: draw.captainB,
    rating: result.teamB.rating,
  }

  async function share() {
    if (!shareRef.current) return
    setSharing(true)
    try {
      const how = await exportShareImage(shareRef.current, `wefa-${clubA.id}-vs-${clubB.id}.png`)
      if (how === 'downloaded') toast('Imagen descargada')
    } catch {
      toast('No se pudo generar la imagen', 'error')
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* Marcador */}
      <motion.section
        className="panel overflow-hidden"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          backgroundImage: `linear-gradient(90deg, ${clubA.primary}22, transparent 40%, transparent 60%, ${clubB.primary}22)`,
        }}
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 p-4 sm:p-6">
          <TeamHead club={clubA} rating={result.teamA.rating} />
          <div className="flex flex-col items-center">
            <span className="display text-4xl text-white/60">VS</span>
            <span className="label mt-1">Δ media</span>
            <span className={`display text-3xl tabular-nums ${balance.color}`}>
              {result.ratingDiff.toFixed(2)}
            </span>
            <span className={`text-xs font-bold ${balance.color}`}>{balance.text}</span>
          </div>
          <TeamHead club={clubB} rating={result.teamB.rating} right />
        </div>
        {!result.withinTolerance && (
          <p className="bg-gold/10 text-gold flex items-center gap-2 px-4 py-2 text-sm font-semibold">
            <AlertTriangle className="size-4 shrink-0" />
            Ninguna combinación cumple la tolerancia: esta es la más igualada posible.
          </p>
        )}
      </motion.section>

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={onRedraw}>
          <Shuffle className="size-4" /> Otro sorteo
        </Button>
        <Button onClick={() => void share()} disabled={sharing}>
          <Share2 className="size-4" /> {sharing ? 'Generando…' : 'Compartir imagen'}
        </Button>
        <Button onClick={onReplay}>
          <Clapperboard className="size-4" /> Ceremonia
        </Button>
        <Button onClick={onEdit}>
          <Settings2 className="size-4" /> Ajustes
        </Button>
        {isAdmin && (
          <Button variant="gold" onClick={() => setSaveOpen(true)}>
            <Save className="size-4" /> Guardar partido
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,26rem)_1fr]">
        <motion.div
          key={draw.seed}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-auto w-full max-w-md"
        >
          <Pitch teamA={teamA} teamB={teamB} />
        </motion.div>

        <div className="flex flex-col gap-4">
          <section className="panel p-4">
            <h3 className="display mb-2 text-2xl">Comparativa</h3>
            <div className="grid items-center gap-4 sm:grid-cols-[14rem_1fr]">
              <Radar
                a={result.teamA.stats}
                b={result.teamB.stats}
                colorA={clubA.primary}
                colorB={clubB.primary}
                className="mx-auto w-56"
              />
              <StatBars a={result.teamA} b={result.teamB} colorA={clubA.primary} colorB={clubB.primary} />
            </div>
          </section>
          <div className="grid gap-4 sm:grid-cols-2">
            <Roster club={clubA} team={result.teamA} captain={draw.captainA} />
            <Roster club={clubB} team={result.teamB} captain={draw.captainB} />
          </div>
          <p className="text-muted text-xs">
            {result.method === 'exhaustive'
              ? `Analizadas todas las combinaciones: ${result.candidates} cumplen la tolerancia.`
              : `Búsqueda inteligente: ${result.candidates} combinaciones óptimas encontradas.`}
          </p>
        </div>
      </div>

      {/* Lienzo oculto para exportar la imagen */}
      <div aria-hidden className="pointer-events-none fixed top-0 -left-[9999px]">
        <ShareCard
          ref={shareRef}
          teamA={teamA}
          teamB={teamB}
          date={new Date().toLocaleDateString('es-ES', { dateStyle: 'long' })}
        />
      </div>

      <SaveMatchSheet open={saveOpen} onClose={() => setSaveOpen(false)} draw={draw} onSaved={onSaved} />
    </div>
  )
}

function TeamHead({ club, rating, right }: { club: Club; rating: number; right?: boolean }) {
  return (
    <div
      className={`flex min-w-0 flex-col items-center gap-2 text-center sm:flex-row sm:gap-3 sm:text-left ${right ? 'sm:flex-row-reverse sm:text-right' : ''}`}
    >
      <ClubBadge club={club.id} className="w-16 sm:w-20" />
      <div className="min-w-0">
        <p className="display text-2xl leading-none sm:truncate sm:text-4xl" style={{ color: club.primary }}>
          {club.name}
        </p>
        <p className="text-muted text-sm">
          Media <span className="text-ink font-bold tabular-nums">{rating.toFixed(2)}</span>
        </p>
      </div>
    </div>
  )
}

function StatBars({
  a,
  b,
  colorA,
  colorB,
}: {
  a: TeamSummary
  b: TeamSummary
  colorA: string
  colorB: string
}) {
  const rows = [
    ['Ritmo', 'rit'],
    ['Tiro', 'tir'],
    ['Pase', 'pas'],
    ['Regate', 'reg'],
    ['Defensa', 'def'],
    ['Físico', 'fis'],
  ] as const
  return (
    <div className="flex flex-col gap-2">
      {rows.map(([label, k]) => {
        const va = a.stats[k]
        const vb = b.stats[k]
        const share = va / (va + vb || 1)
        return (
          <div key={k}>
            <div className="mb-0.5 flex justify-between text-xs font-bold tabular-nums">
              <span style={{ color: colorA }}>{va.toFixed(1)}</span>
              <span className="text-muted">{label}</span>
              <span style={{ color: colorB }}>{vb.toFixed(1)}</span>
            </div>
            <div className="flex h-1.5 overflow-hidden rounded-full bg-white/5">
              <div style={{ width: `${share * 100}%`, background: colorA }} />
              <div className="flex-1" style={{ background: colorB }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Roster({ club, team, captain }: { club: Club; team: TeamSummary; captain: string | null }) {
  return (
    <section className="panel overflow-hidden">
      <header
        className="flex items-center justify-between px-4 py-2.5"
        style={{ background: `${club.primary}22` }}
      >
        <span className="display text-2xl" style={{ color: club.primary }}>
          {club.emoji} {club.name}
        </span>
        <span className="text-muted text-xs font-bold">{formationLabel(team.players)}</span>
      </header>
      <ul className="divide-line divide-y">
        {team.players.map((p) => (
          <li key={p.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <span className="flex items-center gap-1.5 font-semibold">
              {p.id === captain && <Crown className="text-gold size-4" />}
              {p.name}
            </span>
            <span className="font-bold tabular-nums">{overall(p.stats).toFixed(1)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function SaveMatchSheet({
  open,
  onClose,
  draw,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  draw: Draw
  onSaved: () => void
}) {
  const toast = useToast()
  const [date, setDate] = useState(today)
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
      onSaved()
    } catch {
      toast('No se pudo guardar el partido', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Guardar partido">
      <div className="flex flex-col gap-4 pt-2">
        <p className="text-muted text-sm">
          Se guardan los equipos tal cual. El marcador y el MVP los puedes poner después del partido.
        </p>
        <label className="flex flex-col gap-1.5">
          <span className="label">Fecha del partido</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border-line focus:border-accent h-12 rounded-xl border bg-white/5 px-4 outline-none"
          />
        </label>
        <Button variant="gold" onClick={() => void save()} disabled={busy || !date}>
          <Save className="size-4" /> Guardar
        </Button>
      </div>
    </Sheet>
  )
}

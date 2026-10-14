import { ChevronRight, Plus, Trophy } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sheet } from '@/components/Sheet'
import { EmptyCards, ErrorState } from '@/components/States'
import { useToast } from '@/components/Toast'
import { Crest, PageHeader } from '@/components/ui'
import { getClub } from '@/domain/clubs'
import {
  champion,
  cupStatus,
  newCup,
  nextPending,
  participants,
  playedTies,
  runnerUp,
  TIE_COUNT,
  tieLabel,
  titles,
  type Cup,
} from '@/domain/cup'
import { createRng, randomSeed } from '@/domain/rng'
import { useAuth } from '@/lib/auth'
import { createCup, type Collection } from '@/lib/data'

export function CupPage({ cups }: { cups: Collection<Cup> }) {
  const { isAdmin } = useAuth()
  const [creating, setCreating] = useState(false)
  const active = cups.data.filter((c) => cupStatus(c) !== 'finished')
  const finished = cups.data.filter((c) => cupStatus(c) === 'finished')

  const newButton = isAdmin && (
    <button className="btn btn--primary btn--sm h-11" type="button" onClick={() => setCreating(true)}>
      <Plus strokeWidth={2.4} /> Nueva copa
    </button>
  )

  let content
  if (cups.loading)
    content = (
      <div className="flex flex-col gap-2.5" aria-busy="true">
        {[0, 1].map((i) => (
          <div key={i} className="skel h-[120px] rounded-[20px]" />
        ))}
      </div>
    )
  else if (cups.error)
    content = (
      <ErrorState title="Se ha ido la luz del estadio">
        No hemos podido cargar las copas. Revisa tu conexión e inténtalo de nuevo.
      </ErrorState>
    )
  else if (cups.data.length === 0)
    content = (
      <EmptyCards
        title="Aún no hay copas"
        action={
          isAdmin && (
            <button
              className="btn btn--primary mt-1.5 h-[52px]"
              type="button"
              onClick={() => setCreating(true)}
            >
              <Plus /> Crear la primera copa
            </button>
          )
        }
      >
        Una copa es un cuadro eliminatorio de los 8 clubes: cuartos, semis y final, jornada a jornada.
      </EmptyCards>
    )
  else
    content = (
      <>
        {active.length > 0 && (
          <section className="flex flex-col gap-2.5">
            <h2 className="h-display h-m">En juego</h2>
            {active.map((c) => (
              <ActiveCup key={c.id} cup={c} />
            ))}
          </section>
        )}
        {finished.length > 0 && <Palmares cups={finished} />}
      </>
    )

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <PageHeader eyebrow="Eliminatorias de 8 clubes" title="Copa" right={newButton} />
      {content}
      <NewCupSheet open={creating} onClose={() => setCreating(false)} count={cups.data.length} />
    </div>
  )
}

function ActiveCup({ cup }: { cup: Cup }) {
  const played = playedTies(cup)
  const next = nextPending(cup)
  const pair = next !== null ? participants(cup, next) : null
  return (
    <Link
      to={`/copa/${cup.id}`}
      className="glass glass--club flex flex-col gap-3 p-4 text-[var(--ink)] no-underline"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">{played === 0 ? 'Cuadro sorteado' : `${played} de ${TIE_COUNT} partidos`}</p>
          <h3 className="h-display h-l mt-1 truncate">{cup.name}</h3>
        </div>
        <ChevronRight className="size-6 shrink-0 text-[var(--muted)]" />
      </div>
      <div className="meter">
        <div className="meter__fill" style={{ width: `${(played / TIE_COUNT) * 100}%` }} />
      </div>
      {pair && pair[0] && pair[1] && (
        <div className="flex items-center gap-2.5">
          <span className="eyebrow text-[10px]">Próximo · {tieLabel(next!)}</span>
          <span className="flex-1" />
          <Crest club={pair[0]} size={28} style={{ borderRadius: 8 }} />
          <span className="text-[13px] font-semibold">{getClub(pair[0]).short}</span>
          <span className="small">vs</span>
          <span className="text-[13px] font-semibold">{getClub(pair[1]).short}</span>
          <Crest club={pair[1]} size={28} style={{ borderRadius: 8 }} />
        </div>
      )}
    </Link>
  )
}

function Palmares({ cups }: { cups: Cup[] }) {
  const ranking = [...titles(cups).entries()].sort((a, b) => b[1] - a[1])
  return (
    <section className="flex flex-col gap-3">
      <h2 className="h-display h-m">Palmarés</h2>
      <div className="glass flex flex-wrap gap-4 p-4">
        {ranking.map(([club, n]) => (
          <div key={club} className={`club-${club} flex items-center gap-2.5`}>
            <Crest club={club} size={44} />
            <div>
              <div className="h-display neon text-3xl">
                {n} <Trophy className="inline size-5 align-[-2px]" />
              </div>
              <div className="small text-xs">{getClub(club).name}</div>
            </div>
          </div>
        ))}
      </div>
      {cups.map((c) => {
        const win = champion(c)!
        const second = runnerUp(c)
        const final = c.ties[6]!
        return (
          <Link
            key={c.id}
            to={`/copa/${c.id}`}
            className={`match club-${win} no-underline`}
            aria-label={`${c.name}: campeón ${getClub(win).name}`}
          >
            <div className="side">
              <Crest club={win} size={40} />
              <span className="flex flex-col">
                <span className="text-[11px] font-semibold tracking-widest text-[var(--club)] uppercase">
                  Campeón
                </span>
                <span className="truncate">{getClub(win).name}</span>
              </span>
            </div>
            <div className="score">
              <b className="num">
                {final.scoreA} – {final.scoreB}
              </b>
              <span className="small max-w-[110px] truncate text-[11px]">{c.name}</span>
            </div>
            <div className="side lose flex-row-reverse text-right">
              {second && <Crest club={second} size={32} />}
              <span>{second ? getClub(second).name : ''}</span>
            </div>
          </Link>
        )
      })}
    </section>
  )
}

function NewCupSheet({ open, onClose, count }: { open: boolean; onClose: () => void; count: number }) {
  return (
    <Sheet open={open} onClose={onClose} eyebrow="Copa" title="Nueva copa">
      {open && <NewCupForm onDone={onClose} count={count} />}
    </Sheet>
  )
}

function NewCupForm({ onDone, count }: { onDone: () => void; count: number }) {
  const toast = useToast()
  const navigate = useNavigate()
  const [name, setName] = useState(`Copa NICS ${count + 1}`)
  const [busy, setBusy] = useState(false)

  async function create() {
    setBusy(true)
    try {
      const id = await createCup(newCup(name.trim(), createRng(randomSeed())))
      toast('¡Cuadro sorteado!')
      onDone()
      navigate(`/copa/${id}`)
    } catch {
      toast('No se pudo crear la copa', 'error')
      setBusy(false)
    }
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        void create()
      }}
    >
      <p className="small">
        Se sortea el cuadro con los 8 clubes. Los equipos de cada cruce se sortean el día del partido, desde
        el propio cuadro.
      </p>
      <div className="field">
        <label htmlFor="cup-name">Nombre</label>
        <input
          id="cup-name"
          className="input"
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>
      <button className="btn btn--primary h-[52px]" type="submit" disabled={busy || !name.trim()}>
        {busy && <span className="spinner" />}
        Sortear cuadro
      </button>
    </form>
  )
}

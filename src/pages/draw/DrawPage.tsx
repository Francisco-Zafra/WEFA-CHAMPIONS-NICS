import { AnimatePresence } from 'motion/react'
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/Toast'
import { EmptyState, SectionTitle, Spinner } from '@/components/ui'
import { balanceTeams, type BalanceError } from '@/domain/balance'
import { randomSeed } from '@/domain/rng'
import type { Player } from '@/domain/types'
import type { Collection } from '@/lib/data'
import { useDraw } from '@/lib/draw'
import { DrawResult } from './DrawResult'
import { DrawSetup } from './DrawSetup'
import { Reveal } from './Reveal'

const ERRORS: Record<BalanceError, string> = {
  'not-enough-players': 'Necesitas al menos 2 convocados.',
  'invalid-size': 'Tamaños de equipo imposibles.',
  'impossible-constraints': 'Capitanes y reglas se contradicen: no hay forma de cumplirlas todas.',
}

export function DrawPage({ players }: { players: Collection<Player> }) {
  const { config, draw, setDraw } = useDraw()
  const toast = useToast()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [revealing, setRevealing] = useState(false)

  const selection = players.data.filter((p) => config.overrides[p.id] ?? p.active)

  function run(withCeremony: boolean) {
    const n = selection.length
    const sizeA = n % 2 === 0 ? n / 2 : config.extraTo === 'A' ? Math.ceil(n / 2) : Math.floor(n / 2)
    const inSelection = (id: string | null) => (id && selection.some((p) => p.id === id) ? id : null)
    const captainA = inSelection(config.captainA)
    const captainB = inSelection(config.captainB)
    const seed = randomSeed()
    const outcome = balanceTeams({
      players: selection,
      sizeA,
      captainA,
      captainB,
      together: config.together,
      apart: config.apart,
      tolerance: config.tolerance,
      seed,
    })
    if (!outcome.ok) {
      toast(ERRORS[outcome.error], 'error')
      return
    }
    setDraw({ result: outcome.result, clubA: config.clubA, clubB: config.clubB, captainA, captainB, seed })
    setEditing(false)
    setRevealing(withCeremony)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const endReveal = useCallback(() => setRevealing(false), [])

  if (players.loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner className="size-10" />
      </div>
    )

  if (players.data.length < 2)
    return (
      <>
        <SectionTitle kicker="Jornada" title="Sorteo" />
        <EmptyState icon="🧑‍🤝‍🧑" title="Faltan jugadores">
          Necesitas al menos 2 jugadores en la plantilla para sortear equipos.
        </EmptyState>
      </>
    )

  const showResult = draw && !editing

  return (
    <div>
      <SectionTitle
        kicker={showResult ? 'Equipos de la jornada' : 'Jornada'}
        title={showResult ? 'Alineaciones' : 'Sorteo'}
      />
      {showResult ? (
        <DrawResult
          draw={draw}
          onRedraw={() => run(false)}
          onReplay={() => setRevealing(true)}
          onEdit={() => setEditing(true)}
          onSaved={() => navigate('/historial')}
        />
      ) : (
        <DrawSetup players={players.data} selection={selection} onDraw={() => run(true)} />
      )}
      <AnimatePresence>
        {revealing && draw && <Reveal key={draw.seed} draw={draw} onDone={endReveal} />}
      </AnimatePresence>
    </div>
  )
}

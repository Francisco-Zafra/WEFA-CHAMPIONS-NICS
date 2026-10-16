import { clearResult, emptyTie, setResult, type Cup } from '@/domain/cup'
import type { ClubId, Match } from '@/domain/types'
import type { Vote } from '@/domain/votes'
import { deleteMatch, deleteVotesOf, saveCup, updateMatch } from './data'
import type { When } from './when'
import { whenToSave } from './when'

/** La copa (montada) de un partido de copa; error si ya no existe */
function cupOf(m: Match, cups: Cup[]): Cup {
  const cup = m.cup && cups.find((c) => c.id === m.cup!.id)
  if (!cup) throw new Error('Esa copa ya no existe')
  return cup
}

export class ScoreError extends Error {
  constructor(public code: 'need-winner' | 'invalid' | 'not-ready') {
    super(code)
  }
}

/**
 * Apunta o cambia el marcador. En copa pasa por el cuadro (con empate hace falta quién gana los
 * penaltis, y si cambia quién pasa se borran las rondas siguientes). Abre la votación del MVP
 */
export async function saveScore(
  m: Match,
  cups: Cup[],
  score: { scoreA: number; scoreB: number; winner?: ClubId | null },
) {
  const resultAt = m.resultAt ?? Date.now()
  if (!m.cup) return updateMatch(m.id, { scoreA: score.scoreA, scoreB: score.scoreB, resultAt })
  const cup = cupOf(m, cups)
  const out = setResult(cup, m.cup.tie, { ...score, date: m.date })
  if (!out.ok)
    throw new ScoreError(
      out.error === 'need-winner' ? 'need-winner' : out.error === 'not-ready' ? 'not-ready' : 'invalid',
    )
  out.ties[m.cup.tie] = { ...out.ties[m.cup.tie]!, resultAt }
  return saveCup(cup, { ties: out.ties })
}

/** Fecha, hora y campo */
export async function saveWhen(m: Match, cups: Cup[], when: When) {
  if (!m.cup) return updateMatch(m.id, whenToSave(when))
  const cup = cupOf(m, cups)
  const tie = m.cup.tie
  return saveCup(cup, { ties: cup.ties.map((t, i) => (i === tie ? { ...t, ...whenToSave(when) } : t)) })
}

/**
 * Borra el partido y sus votos. En copa, el cruce vuelve a estar por jugar (sin equipos) y se
 * borra lo que dependía de él
 */
export async function removeMatch(m: Match, cups: Cup[], votes: Vote[]) {
  if (!m.cup) {
    await deleteMatch(m.id)
    const ids = votes.filter((v) => v.matchId === m.id).map((v) => v.id)
    if (ids.length) await deleteVotesOf(ids).catch(() => undefined)
    return
  }
  const cup = cupOf(m, cups)
  const ties = clearResult(cup, m.cup.tie)
  ties[m.cup.tie] = emptyTie()
  return saveCup(cup, { ties })
}

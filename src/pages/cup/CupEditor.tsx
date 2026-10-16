import { AlertTriangle, ArrowDown, ArrowLeftRight, ArrowUp, RotateCcw, Save, Shuffle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Kit } from '@/components/Kit'
import { Sheet } from '@/components/Sheet'
import { useToast } from '@/components/Toast'
import { Crest } from '@/components/ui'
import { getClub } from '@/domain/clubs'
import { drawSeeds, reseed, tieLabel, type Cup } from '@/domain/cup'
import { createRng, randomSeed } from '@/domain/rng'
import type { ClubId } from '@/domain/types'
import { cx } from '@/lib/cx'
import { saveCup } from '@/lib/data'

/** Editar una copa: nombre, orden de los clubes y de los cruces de cuartos */
export function CupEditor({ cup, open, onClose }: { cup: Cup; open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} eyebrow={cup.name} title="Editar copa">
      {open && <EditorForm cup={cup} onDone={onClose} />}
    </Sheet>
  )
}

function EditorForm({ cup, onDone }: { cup: Cup; onDone: () => void }) {
  const toast = useToast()
  const [name, setName] = useState(cup.name)
  const [seeds, setSeeds] = useState<ClubId[]>(cup.seeds)
  /** Hueco seleccionado (0–7) para intercambiarlo con el siguiente que se toque */
  const [picked, setPicked] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  const result = useMemo(() => reseed(cup, seeds), [cup, seeds])
  const changed = name.trim() !== cup.name || seeds.some((s, i) => s !== cup.seeds[i])
  const validName = name.trim().length > 0 && name.trim().length <= 40

  const swap = (i: number, j: number) =>
    setSeeds((s) => {
      const out = [...s]
      ;[out[i], out[j]] = [out[j]!, out[i]!]
      return out
    })

  function tap(slot: number) {
    if (picked === null) setPicked(slot)
    else {
      if (picked !== slot) swap(picked, slot)
      setPicked(null)
    }
  }

  /** Cambia de sitio dos cruces de cuartos enteros */
  function moveTie(tie: number, to: number) {
    setSeeds((s) => {
      const out = [...s]
      ;[out[tie * 2], out[to * 2]] = [s[to * 2]!, s[tie * 2]!]
      ;[out[tie * 2 + 1], out[to * 2 + 1]] = [s[to * 2 + 1]!, s[tie * 2 + 1]!]
      return out
    })
    setPicked(null)
  }

  async function save() {
    setBusy(true)
    try {
      await saveCup(cup, { name: name.trim(), seeds, ties: result.ties })
      toast('Copa actualizada')
      onDone()
    } catch {
      toast('No se pudo guardar', 'error')
      setBusy(false)
    }
  }

  const lost = [
    result.lostResults > 0 &&
      `${result.lostResults} ${result.lostResults === 1 ? 'resultado' : 'resultados'}`,
    result.lostTeams > 0 &&
      `los equipos sorteados de ${result.lostTeams} ${result.lostTeams === 1 ? 'cruce' : 'cruces'}`,
  ].filter(Boolean)

  return (
    <div className="flex flex-col gap-4">
      <div className="field">
        <label htmlFor="cup-name">Nombre</label>
        <input
          id="cup-name"
          className="input"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="label">Cuadro</span>
          <div className="flex gap-1.5">
            <button
              className="btn btn--ghost btn--sm"
              type="button"
              onClick={() => {
                setSeeds(drawSeeds(createRng(randomSeed())))
                setPicked(null)
              }}
            >
              <Shuffle /> Al azar
            </button>
            <button
              className="btn btn--ghost btn--sm"
              type="button"
              disabled={seeds.every((s, i) => s === cup.seeds[i])}
              onClick={() => {
                setSeeds(cup.seeds)
                setPicked(null)
              }}
            >
              <RotateCcw /> Deshacer
            </button>
          </div>
        </div>
        <p className="small text-xs">
          Toca un club y luego otro para intercambiarlos. Las flechas mueven el cruce entero y{' '}
          <ArrowLeftRight className="inline size-3" /> cambia quién juega de rojo y quién de azul.
        </p>
      </div>

      {[0, 1].map((semi) => (
        <section key={semi} className="flex flex-col gap-2">
          <span className="eyebrow text-[10px]">
            {semi === 0 ? 'Cuartos 1 y 2 → Semis 1' : 'Cuartos 3 y 4 → Semis 2'}
          </span>
          {[semi * 2, semi * 2 + 1].map((tie) => {
            const t = result.ties[tie]!
            return (
              <div key={tie} className="panel flex flex-col gap-2 p-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="eyebrow flex-1 text-[10px]">{tieLabel(tie)}</span>
                  {t.winner ? (
                    <span className="small text-[11px]">
                      Jugado · {t.scoreA}–{t.scoreB}
                    </span>
                  ) : t.teamA.length > 0 ? (
                    <span className="text-[11px] font-semibold text-[var(--ok)]">Equipos listos</span>
                  ) : null}
                  <button
                    className="btn btn--glass btn--icon size-8"
                    type="button"
                    aria-label={`Subir ${tieLabel(tie)}`}
                    disabled={tie === 0}
                    onClick={() => moveTie(tie, tie - 1)}
                  >
                    <ArrowUp className="size-4" />
                  </button>
                  <button
                    className="btn btn--glass btn--icon size-8"
                    type="button"
                    aria-label={`Bajar ${tieLabel(tie)}`}
                    disabled={tie === 3}
                    onClick={() => moveTie(tie, tie + 1)}
                  >
                    <ArrowDown className="size-4" />
                  </button>
                  <button
                    className="btn btn--glass btn--icon size-8"
                    type="button"
                    aria-label={`Dar la vuelta a ${tieLabel(tie)}`}
                    onClick={() => {
                      swap(tie * 2, tie * 2 + 1)
                      setPicked(null)
                    }}
                  >
                    <ArrowLeftRight className="size-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {([0, 1] as const).map((k) => {
                    const slot = tie * 2 + k
                    const club = seeds[slot]!
                    return (
                      <button
                        key={k}
                        type="button"
                        aria-pressed={picked === slot}
                        aria-label={`${getClub(club).name}${picked === slot ? ', seleccionado' : ''}`}
                        className={cx(
                          `club-${club} flex min-w-0 items-center gap-2 rounded-xl border px-2 py-1.5 text-left transition`,
                          picked === slot
                            ? 'border-[var(--club)] bg-[color-mix(in_oklab,var(--club)_24%,transparent)] ring-2 ring-[var(--club)]'
                            : 'border-[var(--line)] bg-white/[.03] hover:bg-white/[.06]',
                          picked !== null && picked !== slot && 'border-dashed',
                        )}
                        onClick={() => tap(slot)}
                      >
                        <Crest club={club} size={28} style={{ borderRadius: 8 }} />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--ink)]">
                          {getClub(club).short}
                        </span>
                        <Kit side={k === 0 ? 'A' : 'B'} className="size-3.5" />
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </section>
      ))}

      {lost.length > 0 && (
        <div className="banner banner--warn">
          <AlertTriangle />
          <span>
            Al guardar se {result.lostResults === 1 && result.lostTeams === 0 ? 'perderá' : 'perderán'}{' '}
            {lost.join(' y ')}: esos cruces ya no enfrentan a los mismos clubes. Los partidos que siguen igual
            conservan su resultado.
          </span>
        </div>
      )}

      <button
        className="btn btn--primary h-[52px]"
        type="button"
        disabled={busy || !changed || !validName}
        onClick={() => void save()}
      >
        {busy ? <span className="spinner" /> : <Save />} Guardar cambios
      </button>
    </div>
  )
}

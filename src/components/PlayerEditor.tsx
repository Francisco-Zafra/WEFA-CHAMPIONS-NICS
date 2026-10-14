import { Equal, Minus, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { clampRating, clampStat, tier, TIER_LABELS } from '@/domain/rating'
import { STAT_KEYS, STAT_LABELS, type Player, type PlayerInput, type Stats } from '@/domain/types'
import { createPlayer, deletePlayer, updatePlayer } from '@/lib/data'
import { PlayerCard } from './PlayerCard'
import { Sheet } from './Sheet'
import { useToast } from './Toast'
import { Switch } from './ui'

const DEFAULT_STATS: Stats = { rit: 75, tir: 75, pas: 75, reg: 75, def: 75, fis: 75 }

/** Hoja inferior (móvil). `player === null` → alta nueva */
export function PlayerEditorSheet({
  player,
  open,
  onClose,
}: {
  player: Player | null
  open: boolean
  onClose: () => void
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      eyebrow="Plantilla"
      title={player ? 'Editar jugador' : 'Nuevo fichaje'}
    >
      {open && <PlayerEditorForm key={player?.id ?? 'new'} player={player} onDone={onClose} />}
    </Sheet>
  )
}

/** Panel lateral (escritorio) */
export function PlayerEditorPanel({ player, onClose }: { player: Player | null; onClose: () => void }) {
  return (
    <aside
      className="glass glass--club sticky top-8 flex w-[340px] shrink-0 flex-col gap-4 self-start rounded-3xl p-6"
      aria-label={player ? 'Editar jugador' : 'Nuevo fichaje'}
    >
      <div className="flex items-center justify-between">
        <p className="eyebrow">{player ? 'Editar jugador' : 'Nuevo fichaje'}</p>
        <button
          className="btn btn--ghost btn--icon"
          type="button"
          aria-label="Cerrar panel"
          onClick={onClose}
        >
          <X />
        </button>
      </div>
      <PlayerEditorForm key={player?.id ?? 'new'} player={player} onDone={onClose} panel />
    </aside>
  )
}

function PlayerEditorForm({
  player,
  onDone,
  panel,
}: {
  player: Player | null
  onDone: () => void
  panel?: boolean
}) {
  const toast = useToast()
  const [form, setForm] = useState<PlayerInput>(
    player
      ? { name: player.name, rating: player.rating, stats: player.stats, active: player.active }
      : { name: '', rating: 75, stats: DEFAULT_STATS, active: true },
  )
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const name = form.name.trim()
  const rating = form.rating
  const t = tier(rating)
  const setRating = (v: number) => setForm((f) => ({ ...f, rating: clampRating(v) }))
  const setStat = (k: keyof Stats, v: number) =>
    setForm((f) => ({ ...f, stats: { ...f.stats, [k]: clampStat(v) } }))

  async function save() {
    if (!name) return
    setBusy(true)
    try {
      const data = { ...form, name }
      if (player) await updatePlayer(player.id, data)
      else await createPlayer(data)
      toast(player ? 'Jugador actualizado' : `¡${name} fichado! Media ${rating}`)
      onDone()
    } catch {
      toast('No se pudo guardar', 'error')
      setBusy(false)
    }
  }

  async function remove() {
    if (!player) return
    setBusy(true)
    try {
      await deletePlayer(player.id)
      toast(`${player.name} ha sido dado de baja`, 'info')
      onDone()
    } catch {
      toast('No se pudo eliminar', 'error')
      setBusy(false)
    }
  }

  return (
    <form
      className="flex flex-col"
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      {panel ? (
        <div className="flex justify-center">
          <PlayerCard player={{ ...form, name: name || 'Nombre' }} size={13} />
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <PlayerCard player={{ ...form, name: name || 'Nombre' }} size={11} />
          <div className="flex min-w-0 flex-col gap-2">
            <p className="eyebrow">Media</p>
            <div className="h-display neon num text-[76px]">{rating}</div>
            <span className={`tag tag--${t} self-start`}>CARTA {TIER_LABELS[t].toUpperCase()}</span>
            <p className="small text-xs">Oro desde 85 · Plata desde 75. La carta cambia en directo.</p>
          </div>
        </div>
      )}

      <div className="field mt-4">
        <label htmlFor="ed-name">Nombre</label>
        <input
          id="ed-name"
          className="input"
          type="text"
          maxLength={40}
          autoFocus={!player}
          placeholder="Ej. Guti"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </div>

      <div className="field mt-4">
        <label htmlFor="ed-rating">Media · la que cuenta para los equipos</label>
        <div className="flex items-center gap-2">
          <button
            className="btn btn--glass btn--icon size-12"
            type="button"
            aria-label="Bajar media"
            onClick={() => setRating(rating - 1)}
          >
            <Minus />
          </button>
          <input
            id="ed-rating"
            className="input h-display num h-12 w-20 text-center text-3xl"
            inputMode="numeric"
            value={rating}
            onChange={(e) => {
              const n = Number(e.target.value)
              if (e.target.value !== '' && Number.isFinite(n)) setRating(n)
            }}
          />
          <button
            className="btn btn--glass btn--icon size-12"
            type="button"
            aria-label="Subir media"
            onClick={() => setRating(rating + 1)}
          >
            <Plus />
          </button>
          <div className="range flex-1 grid-cols-1">
            <input
              type="range"
              min={1}
              max={99}
              value={rating}
              aria-label="Media"
              onChange={(e) => setRating(Number(e.target.value))}
              style={{ ['--v' as string]: `${(((rating - 1) / 98) * 100).toFixed(1)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <p className="eyebrow">Atributos · solo decoración</p>
        <button
          className="btn btn--ghost btn--sm h-9"
          type="button"
          onClick={() =>
            setForm((f) => ({
              ...f,
              stats: Object.fromEntries(STAT_KEYS.map((k) => [k, f.rating])) as Stats,
            }))
          }
        >
          <Equal /> Igualar a la media
        </button>
      </div>
      <div className="mt-1 flex flex-col gap-0.5">
        {STAT_KEYS.map((k) => {
          const v = form.stats[k]
          return (
            <div key={k} className="range">
              <label className="range__k" htmlFor={`ed-${k}`}>
                {STAT_LABELS[k]}
              </label>
              <input
                id={`ed-${k}`}
                type="range"
                min={1}
                max={99}
                value={v}
                onChange={(e) => setStat(k, Number(e.target.value))}
                style={{ ['--v' as string]: `${(((v - 1) / 98) * 100).toFixed(1)}%` }}
              />
              <span className="range__v num">{v}</span>
            </div>
          )
        })}
      </div>

      <div className="mt-2">
        <Switch
          checked={form.active}
          onChange={(active) => setForm((f) => ({ ...f, active }))}
          label="Convocado para el próximo sorteo"
        />
      </div>

      <div className="mt-3 flex gap-2.5">
        {player &&
          (confirmDelete ? (
            <button
              className="btn btn--danger h-[52px]"
              type="button"
              disabled={busy}
              onClick={() => void remove()}
            >
              ¿Seguro? Eliminar
            </button>
          ) : (
            <button
              className="btn btn--danger btn--icon size-[52px]"
              type="button"
              aria-label="Eliminar jugador"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 />
            </button>
          ))}
        <button className="btn btn--primary h-[52px] flex-1" type="submit" disabled={!name || busy}>
          {busy && <span className="spinner" />}
          {player ? 'Guardar cambios' : 'Fichar jugador'}
        </button>
      </div>
    </form>
  )
}

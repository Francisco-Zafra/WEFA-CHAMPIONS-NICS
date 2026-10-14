import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { clampStat, overall } from '@/domain/rating'
import { STAT_KEYS, STAT_NAMES, type Player, type PlayerInput, type Stats } from '@/domain/types'
import { createPlayer, deletePlayer, updatePlayer } from '@/lib/data'
import { PlayerCard } from './PlayerCard'
import { Sheet } from './Sheet'
import { useToast } from './Toast'
import { Button, Toggle } from './ui'

const DEFAULT_STATS: Stats = { rit: 75, tir: 75, pas: 75, reg: 75, def: 75, fis: 75 }

/** `player === null` → alta nueva */
export function PlayerEditor({
  player,
  open,
  onClose,
}: {
  player: Player | null
  open: boolean
  onClose: () => void
}) {
  return (
    <Sheet open={open} onClose={onClose} title={player ? 'Editar jugador' : 'Nuevo fichaje'}>
      {/* key: reinicia el formulario al cambiar de jugador */}
      {open && <EditorForm key={player?.id ?? 'new'} player={player} onDone={onClose} />}
    </Sheet>
  )
}

function EditorForm({ player, onDone }: { player: Player | null; onDone: () => void }) {
  const toast = useToast()
  const [form, setForm] = useState<PlayerInput>(
    player
      ? { name: player.name, stats: player.stats, active: player.active }
      : { name: '', stats: DEFAULT_STATS, active: true },
  )
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const setStat = (k: keyof Stats, v: number) =>
    setForm((f) => ({ ...f, stats: { ...f.stats, [k]: clampStat(v) } }))
  const name = form.name.trim()

  async function save() {
    if (!name) return
    setBusy(true)
    try {
      const data = { ...form, name }
      if (player) await updatePlayer(player.id, data)
      else await createPlayer(data)
      toast(player ? 'Jugador actualizado' : `¡${name} fichado! Media ${overall(form.stats).toFixed(1)}`)
      onDone()
    } catch {
      toast('No se pudo guardar', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!player) return
    setBusy(true)
    try {
      await deletePlayer(player.id)
      toast(`${player.name} ha sido dado de baja`)
      onDone()
    } catch {
      toast('No se pudo eliminar', 'error')
      setBusy(false)
    }
  }

  return (
    <form
      className="flex flex-col gap-5 pt-2"
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      <div className="mx-auto w-52">
        <PlayerCard player={{ ...form, name: name || 'Nombre' }} />
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="label">Nombre</span>
        <input
          autoFocus={!player}
          maxLength={40}
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Ej. Guti"
          className="border-line focus:border-accent h-12 rounded-xl border bg-white/5 px-4 text-lg font-semibold outline-none"
        />
      </label>

      <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        {STAT_KEYS.map((k) => (
          <label key={k} className="flex flex-col gap-1">
            <span className="flex items-center justify-between">
              <span className="label">{STAT_NAMES[k]}</span>
              <input
                type="number"
                min={0}
                max={99}
                value={form.stats[k]}
                onChange={(e) => setStat(k, Number(e.target.value))}
                className="w-14 rounded-lg bg-white/5 px-2 py-0.5 text-right font-bold tabular-nums outline-none"
                aria-label={`${STAT_NAMES[k]} (número)`}
              />
            </span>
            <input
              type="range"
              min={0}
              max={99}
              value={form.stats[k]}
              onChange={(e) => setStat(k, Number(e.target.value))}
              aria-label={STAT_NAMES[k]}
            />
          </label>
        ))}
      </div>

      <div className="border-line flex items-center justify-between rounded-xl border bg-white/5 px-4 py-3">
        <div>
          <p className="font-semibold">Convocado</p>
          <p className="text-muted text-xs">Entra por defecto en el próximo sorteo</p>
        </div>
        <Toggle
          label="Convocado"
          checked={form.active}
          onChange={(active) => setForm((f) => ({ ...f, active }))}
        />
      </div>

      <div className="flex gap-2">
        {player &&
          (confirmDelete ? (
            <Button variant="danger" disabled={busy} onClick={() => void remove()}>
              ¿Seguro? Eliminar
            </Button>
          ) : (
            <Button variant="danger" onClick={() => setConfirmDelete(true)} aria-label="Eliminar jugador">
              <Trash2 className="size-4" />
            </Button>
          ))}
        <Button type="submit" variant="primary" className="flex-1" disabled={!name || busy}>
          {player ? 'Guardar cambios' : 'Fichar jugador'}
        </Button>
      </div>
    </form>
  )
}

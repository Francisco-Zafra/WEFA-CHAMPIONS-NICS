import { ChevronLeft, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EmptyCards } from '@/components/States'
import { useToast } from '@/components/Toast'
import { getClub } from '@/domain/clubs'
import { champion, cupStatus, playedTies, TIE_COUNT, type Cup } from '@/domain/cup'
import type { Player } from '@/domain/types'
import { useStartCupDraw } from '@/hooks/useStartCupDraw'
import { useAuth } from '@/lib/auth'
import { deleteCup, type Collection } from '@/lib/data'
import { Bracket } from './Bracket'
import { CupEditor } from './CupEditor'
import { TieSheet } from './TieSheet'

export function CupDetailPage({ cups, players }: { cups: Collection<Cup>; players: Player[] }) {
  const { id } = useParams()
  const { isAdmin } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const startDraw = useStartCupDraw()
  const [open, setOpen] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editing, setEditing] = useState(false)
  const cup = cups.data.find((c) => c.id === id)

  if (cups.loading) return <div className="skel h-[400px] rounded-[20px]" aria-busy="true" />
  if (!cup)
    return (
      <EmptyCards
        title="Copa no encontrada"
        action={
          <Link className="btn btn--primary mt-1.5 h-[52px]" to="/copa">
            Ver copas
          </Link>
        }
      >
        Puede que se haya borrado.
      </EmptyCards>
    )

  const status = cupStatus(cup)
  const win = champion(cup)
  const played = playedTies(cup)

  async function remove() {
    try {
      await deleteCup(cup!)
      toast('Copa eliminada', 'info')
      navigate('/copa')
    } catch {
      toast('No se pudo eliminar', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Link className="btn btn--glass btn--icon" to="/copa" aria-label="Volver a copas">
            <ChevronLeft />
          </Link>
          <div className="min-w-0">
            <p className="eyebrow">
              {status === 'finished'
                ? `Campeón · ${getClub(win!).name}`
                : status === 'draft'
                  ? 'Cuadro sorteado · sin partidos'
                  : `En juego · ${played} de ${TIE_COUNT} partidos`}
            </p>
            <h1 className="h-display h-xl mt-1 truncate lg:text-[64px]">{cup.name}</h1>
          </div>
        </div>
        {isAdmin && (
          <button className="btn btn--glass" type="button" onClick={() => setEditing(true)}>
            <Pencil /> Editar copa
          </button>
        )}
      </div>

      <div className="meter">
        <div className="meter__fill" style={{ width: `${(played / TIE_COUNT) * 100}%` }} />
      </div>

      <Bracket cup={cup} onOpen={setOpen} onDraw={isAdmin ? (tie) => startDraw(cup, tie) : undefined} />

      {isAdmin && (
        <div className="flex justify-center pt-4">
          {confirmDelete ? (
            <button className="btn btn--danger" type="button" onClick={() => void remove()}>
              ¿Seguro? Se borrará la copa entera
            </button>
          ) : (
            <button className="btn btn--ghost btn--sm" type="button" onClick={() => setConfirmDelete(true)}>
              <Trash2 /> Eliminar copa
            </button>
          )}
        </div>
      )}

      {isAdmin && <CupEditor cup={cup} open={editing} onClose={() => setEditing(false)} />}

      <TieSheet
        cup={cup}
        tie={open}
        players={players}
        onClose={() => setOpen(null)}
        onDraw={
          isAdmin
            ? (tie) => {
                setOpen(null)
                startDraw(cup, tie)
              }
            : undefined
        }
      />
    </div>
  )
}

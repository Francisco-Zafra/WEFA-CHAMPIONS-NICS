import { useNavigate } from 'react-router-dom'
import { participants, type Cup } from '@/domain/cup'
import { useDraw } from '@/lib/draw'

/** Abre el sorteo en modo copa con los dos clubes del cruce fijados (el amistoso no se toca) */
export function useStartCupDraw() {
  const { startCup } = useDraw()
  const navigate = useNavigate()
  return (cup: Cup, tie: number) => {
    const [a, b] = participants(cup, tie)
    if (!a || !b) return
    startCup({ cupId: cup.id, cupName: cup.name, tie, clubA: a, clubB: b })
    navigate('/sorteo')
  }
}

import { useNavigate } from 'react-router-dom'
import { participants, type Cup } from '@/domain/cup'
import { useDraw } from '@/lib/draw'

/** Abre el sorteo de siempre con los dos clubes del cruce ya fijados */
export function useStartCupDraw() {
  const { setConfig, setCupTie, setStep } = useDraw()
  const navigate = useNavigate()
  return (cup: Cup, tie: number) => {
    const [a, b] = participants(cup, tie)
    if (!a || !b) return
    setConfig((c) => ({ ...c, clubA: a, clubB: b, captainA: null, captainB: null }))
    setCupTie({ cupId: cup.id, cupName: cup.name, tie })
    setStep(1)
    navigate('/sorteo')
  }
}

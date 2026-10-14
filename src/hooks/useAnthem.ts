import { useCallback, useEffect, useRef, useState } from 'react'
import { anthemUrl } from '@/domain/clubs'
import type { ClubId } from '@/domain/types'

const MUTE_KEY = 'wefa:muted'
const VOLUME = 0.8

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

/** Reproduce himnos con fundido. Debe arrancarse tras un gesto del usuario (autoplay). */
export function useAnthem() {
  const audio = useRef<HTMLAudioElement | null>(null)
  const fade = useRef<number | null>(null)
  const [muted, setMutedState] = useState(readMuted)

  const clearFade = () => {
    if (fade.current !== null) window.clearInterval(fade.current)
    fade.current = null
  }

  const stop = useCallback(() => {
    clearFade()
    audio.current?.pause()
    audio.current = null
  }, [])

  const fadeOut = useCallback((ms = 1200) => {
    const el = audio.current
    if (!el) return
    clearFade()
    const step = el.volume / (ms / 50)
    fade.current = window.setInterval(() => {
      if (el.volume - step <= 0) {
        clearFade()
        el.pause()
        if (audio.current === el) audio.current = null
      } else el.volume -= step
    }, 50)
  }, [])

  const play = useCallback(
    (club: ClubId) => {
      stop()
      const el = new Audio(anthemUrl(club))
      el.volume = VOLUME
      el.muted = readMuted()
      audio.current = el
      el.play().catch(() => {
        /* el navegador puede bloquear el audio: no pasa nada */
      })
    },
    [stop],
  )

  const setMuted = useCallback((value: boolean) => {
    setMutedState(value)
    if (audio.current) audio.current.muted = value
    try {
      localStorage.setItem(MUTE_KEY, value ? '1' : '0')
    } catch {
      /* almacenamiento no disponible */
    }
  }, [])

  useEffect(() => stop, [stop])

  return { play, fadeOut, stop, muted, setMuted }
}

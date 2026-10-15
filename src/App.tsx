import { AnimatePresence } from 'motion/react'
import { useCallback, useMemo } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { ScrollToTop } from '@/components/ScrollToTop'
import { ToastProvider } from '@/components/Toast'
import { AuthProvider, useAuth } from '@/lib/auth'
import { lastCaptains } from '@/domain/captains'
import { lastPlace } from '@/domain/nextMatch'
import { pairHistory } from '@/domain/variety'
import { DrawHistoryContext } from '@/lib/drawHistory'
import { useCups, useMatches, usePlayers, useVotes } from '@/lib/data'
import { withResolvedMvp } from '@/domain/votes'
import { VotesContext, useClock } from '@/lib/votesContext'
import { DrawProvider, useDraw } from '@/lib/draw'
import { wasWelcomed } from '@/lib/welcome'
import { CupDetailPage } from '@/pages/cup/CupDetailPage'
import { CupPage } from '@/pages/cup/CupPage'
import { DrawPage } from '@/pages/draw/DrawPage'
import { Reveal } from '@/pages/draw/Reveal'
import { HistoryPage } from '@/pages/HistoryPage'
import { HomePage } from '@/pages/HomePage'
import { PlayerProfilePage } from '@/pages/PlayerProfilePage'
import { PizarraPage } from '@/pages/PizarraPage'
import { SquadPage } from '@/pages/SquadPage'
import { WelcomePage } from '@/pages/WelcomePage'

function Routed() {
  const players = usePlayers()
  const matches = useMatches()
  const cups = useCups()
  const votes = useVotes()
  const clock = useClock()
  // Partidos con el MVP salido de la votación (para historial y fichas)
  const resolvedMatches = useMemo(
    () => ({ ...matches, data: withResolvedMvp(matches.data, votes.data, clock) }),
    [matches, votes.data, clock],
  )
  const defaultPlace = useMemo(() => lastPlace(matches.data, cups.data), [matches.data, cups.data])
  const pairs = useMemo(() => pairHistory(matches.data, cups.data), [matches.data, cups.data])
  const captainDefaults = useMemo(() => lastCaptains(matches.data, cups.data), [matches.data, cups.data])
  const { user, ready } = useAuth()
  const { draw, revealing, setRevealing } = useDraw()
  const navigate = useNavigate()
  const location = useLocation()

  const endReveal = useCallback(() => {
    setRevealing(false)
    navigate('/pizarra')
  }, [setRevealing, navigate])

  // Primera visita sin sesión: pantalla de bienvenida
  if (ready && (!user || user.isAnonymous) && !wasWelcomed() && location.pathname !== '/bienvenida')
    return <Navigate to="/bienvenida" replace />

  return (
    <VotesContext.Provider value={votes}>
      <DrawHistoryContext.Provider value={pairs}>
        <ScrollToTop />
        <Routes>
          <Route path="/bienvenida" element={<WelcomePage />} />
          <Route
            path="*"
            element={
              <Layout>
                <Routes>
                  <Route path="/" element={<HomePage players={players} matches={matches} cups={cups} />} />
                  <Route path="/plantilla" element={<SquadPage players={players} />} />
                  <Route
                    path="/sorteo"
                    element={<DrawPage players={players} captainDefaults={captainDefaults} />}
                  />
                  <Route
                    path="/pizarra"
                    element={<PizarraPage players={players} cups={cups} defaultPlace={defaultPlace} />}
                  />
                  <Route path="/copa" element={<CupPage cups={cups} />} />
                  <Route path="/copa/:id" element={<CupDetailPage cups={cups} />} />
                  <Route
                    path="/historial"
                    element={<HistoryPage matches={resolvedMatches} players={players} />}
                  />
                  <Route
                    path="/jugador/:id"
                    element={<PlayerProfilePage players={players} matches={resolvedMatches} />}
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            }
          />
        </Routes>
        <AnimatePresence>
          {revealing && draw && <Reveal key={draw.seed} draw={draw} onDone={endReveal} />}
        </AnimatePresence>
      </DrawHistoryContext.Provider>
    </VotesContext.Provider>
  )
}

// HashRouter: GitHub Pages no sabe reescribir rutas a index.html
export function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <ToastProvider>
          <DrawProvider>
            <Routed />
          </DrawProvider>
        </ToastProvider>
      </AuthProvider>
    </HashRouter>
  )
}

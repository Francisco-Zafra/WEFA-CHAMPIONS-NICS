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
import { cupMatches, joinTies } from '@/domain/cup'
import { VotesContext, useClock } from '@/lib/votesContext'
import { DrawProvider, useDraw } from '@/lib/draw'
import { wasWelcomed } from '@/lib/welcome'
import { CupDetailPage } from '@/pages/cup/CupDetailPage'
import { CupPage } from '@/pages/cup/CupPage'
import { DrawPage } from '@/pages/draw/DrawPage'
import { Reveal } from '@/pages/draw/Reveal'
import { HistoryPage } from '@/pages/history/HistoryPage'
import { HomePage } from '@/pages/HomePage'
import { PlayerProfilePage } from '@/pages/PlayerProfilePage'
import { PizarraPage } from '@/pages/PizarraPage'
import { SquadPage } from '@/pages/SquadPage'
import { WelcomePage } from '@/pages/WelcomePage'

function Routed() {
  const players = usePlayers()
  const allMatches = useMatches()
  const rawCups = useCups()
  const votes = useVotes()
  const clock = useClock()
  // En la BD, cada partido (amistoso o de copa) es un documento de `matches`. Aquí se separan:
  // los amistosos por un lado y las copas montadas con sus partidos por otro
  const matches = useMemo(
    () => ({ ...allMatches, data: allMatches.data.filter((m) => !m.cupRef) }),
    [allMatches],
  )
  const cups = useMemo(
    () => ({
      ...rawCups,
      loading: rawCups.loading || allMatches.loading,
      error: rawCups.error ?? allMatches.error,
      data: rawCups.data.map((c) => joinTies(c, allMatches.data)),
    }),
    [rawCups, allMatches],
  )
  // Con el MVP salido de la votación: amistosos y cruces de copa (jugados y por jugar con equipos)
  const resolvedMatches = useMemo(
    () => ({ ...matches, data: withResolvedMvp(matches.data, votes.data, clock) }),
    [matches, votes.data, clock],
  )
  const resolvedCupMatches = useMemo(
    () => withResolvedMvp(cupMatches(cups.data, { pending: true }), votes.data, clock),
    [cups.data, votes.data, clock],
  )
  // Para estadísticas, fichas y duelos: amistosos + cruces de copa jugados
  const statsMatches = useMemo(
    () => ({
      ...resolvedMatches,
      loading: resolvedMatches.loading || cups.loading,
      data: [...resolvedMatches.data, ...resolvedCupMatches.filter((m) => m.winner)],
    }),
    [resolvedMatches, resolvedCupMatches, cups.loading],
  )
  // Lista del historial: amistosos + cruces de copa
  const historyMatches = useMemo(
    () => ({
      ...resolvedMatches,
      loading: resolvedMatches.loading || cups.loading,
      error: resolvedMatches.error ?? cups.error,
      data: [...resolvedMatches.data, ...resolvedCupMatches].sort(
        (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt,
      ),
    }),
    [resolvedMatches, resolvedCupMatches, cups.loading, cups.error],
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
                  <Route
                    path="/"
                    element={
                      <HomePage players={players} matches={matches} cups={cups} voting={statsMatches.data} />
                    }
                  />
                  <Route path="/plantilla" element={<SquadPage players={players} matches={statsMatches} />} />
                  <Route
                    path="/sorteo"
                    element={<DrawPage players={players} captainDefaults={captainDefaults} />}
                  />
                  <Route
                    path="/pizarra"
                    element={<PizarraPage players={players} cups={cups} defaultPlace={defaultPlace} />}
                  />
                  <Route path="/copa" element={<CupPage cups={cups} />} />
                  <Route path="/copa/:id" element={<CupDetailPage cups={cups} players={players.data} />} />
                  <Route
                    path="/historial"
                    element={
                      <HistoryPage
                        matches={historyMatches}
                        stats={statsMatches}
                        players={players}
                        cups={cups.data}
                      />
                    }
                  />
                  <Route
                    path="/jugador/:id"
                    element={<PlayerProfilePage players={players} matches={statsMatches} />}
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

import { AnimatePresence } from 'motion/react'
import { useCallback, useMemo } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { ScrollToTop } from '@/components/ScrollToTop'
import { ToastProvider } from '@/components/Toast'
import { AuthProvider, useAuth } from '@/lib/auth'
import { lastCaptains } from '@/domain/captains'
import { useCups, useMatches, usePlayers } from '@/lib/data'
import { DrawProvider, useDraw } from '@/lib/draw'
import { wasWelcomed } from '@/lib/welcome'
import { CupDetailPage } from '@/pages/cup/CupDetailPage'
import { CupPage } from '@/pages/cup/CupPage'
import { DrawPage } from '@/pages/draw/DrawPage'
import { Reveal } from '@/pages/draw/Reveal'
import { HistoryPage } from '@/pages/HistoryPage'
import { PizarraPage } from '@/pages/PizarraPage'
import { SquadPage } from '@/pages/SquadPage'
import { WelcomePage } from '@/pages/WelcomePage'

function Routed() {
  const players = usePlayers()
  const matches = useMatches()
  const cups = useCups()
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
  if (ready && !user && !wasWelcomed() && location.pathname !== '/bienvenida')
    return <Navigate to="/bienvenida" replace />

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/bienvenida" element={<WelcomePage />} />
        <Route
          path="*"
          element={
            <Layout>
              <Routes>
                <Route path="/" element={<SquadPage players={players} />} />
                <Route
                  path="/sorteo"
                  element={<DrawPage players={players} captainDefaults={captainDefaults} />}
                />
                <Route path="/pizarra" element={<PizarraPage players={players} cups={cups} />} />
                <Route path="/copa" element={<CupPage cups={cups} />} />
                <Route path="/copa/:id" element={<CupDetailPage cups={cups} />} />
                <Route path="/historial" element={<HistoryPage matches={matches} players={players} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
      <AnimatePresence>
        {revealing && draw && <Reveal key={draw.seed} draw={draw} onDone={endReveal} />}
      </AnimatePresence>
    </>
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

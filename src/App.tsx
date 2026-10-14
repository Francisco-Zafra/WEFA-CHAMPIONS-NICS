import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { ToastProvider } from '@/components/Toast'
import { AuthProvider } from '@/lib/auth'
import { useMatches, usePlayers } from '@/lib/data'
import { DrawProvider } from '@/lib/draw'
import { DrawPage } from '@/pages/draw/DrawPage'
import { HistoryPage } from '@/pages/HistoryPage'
import { SquadPage } from '@/pages/SquadPage'

function Routed() {
  const players = usePlayers()
  const matches = useMatches()
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<SquadPage players={players} />} />
        <Route path="/sorteo" element={<DrawPage players={players} />} />
        <Route path="/historial" element={<HistoryPage matches={matches} players={players} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
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

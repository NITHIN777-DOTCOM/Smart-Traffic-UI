import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Header } from './components/Header'
import { ModeProvider } from './data/ModeProvider'
import { ControlPage } from './pages/ControlPage'
import { JunctionPage } from './pages/JunctionPage'

// Recharts is heavy; load it only when the dashboard is opened.
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))

export function App() {
  return (
    <ModeProvider>
      <Header />
      <Routes>
        <Route path="/" element={<ControlPage />} />
        <Route path="/junction" element={<JunctionPage />} />
        <Route
          path="/dashboard"
          element={
            <Suspense fallback={<main className="page muted">Loading dashboard…</main>}>
              <DashboardPage />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ModeProvider>
  )
}

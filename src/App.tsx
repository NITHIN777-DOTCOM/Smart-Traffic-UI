import { Navigate, Route, Routes } from 'react-router-dom'
import { Header } from './components/Header'
import { ModeProvider } from './data/ModeProvider'
import { ControlPage } from './pages/ControlPage'
import { DashboardPage } from './pages/DashboardPage'
import { JunctionPage } from './pages/JunctionPage'

export function App() {
  return (
    <ModeProvider>
      <Header />
      <Routes>
        <Route path="/" element={<ControlPage />} />
        <Route path="/junction" element={<JunctionPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ModeProvider>
  )
}

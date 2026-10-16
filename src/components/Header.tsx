import { NavLink } from 'react-router-dom'
import { useEvidence, useStatus } from '../data/hooks'
import { Logo } from './Logo'

const NAV = [
  { to: '/', label: 'Control' },
  { to: '/junction', label: 'Live Junction' },
  { to: '/dashboard', label: 'Dashboard' },
]

export function Header() {
  const { data: status, error } = useStatus()
  const { data: evidence } = useEvidence()
  const online = !error && status?.piOnline
  const label = status?.placeholder
    ? 'No device · recorded replay'
    : status || error
      ? online
        ? 'Pi online'
        : 'Pi offline'
      : 'Connecting…'
  const provisional = evidence?.runInfo.provisional

  return (
    <header className="app-header">
      <div className="brand">
        <Logo />
        <span>Smart Traffic</span>
      </div>
      <nav aria-label="Main" className="nav">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end className={({ isActive }) => `nav-pill${isActive ? ' active' : ''}`}>
            {n.label}
          </NavLink>
        ))}
      </nav>
      <div className="header-status">
        {provisional && (
          <span className="provisional-badge" title={`Model ${evidence?.runInfo.modelFile}: reward ${evidence?.runInfo.rewardLabel}`}>
            {evidence?.runInfo.provisionalLabel ?? 'Provisional — old-reward model'}
          </span>
        )}
        <span className="status-chip" role="status">
          <span
            className={`dot ${status?.placeholder ? 'dot-muted' : online ? 'dot-green' : status || error ? 'dot-red' : 'dot-muted'}`}
          />
          {label}
        </span>
      </div>
    </header>
  )
}

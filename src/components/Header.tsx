import { NavLink } from 'react-router-dom'
import { useStatus } from '../data/hooks'
import { Logo } from './Logo'

const NAV = [
  { to: '/', label: 'Control' },
  { to: '/junction', label: 'Live Junction' },
  { to: '/dashboard', label: 'Dashboard' },
]

export function Header() {
  const { data: status, error } = useStatus()
  const online = !error && status?.piOnline
  const label = status || error ? (online ? 'Pi online' : 'Pi offline') : 'Connecting…'

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
      <span className="status-chip" role="status">
        <span className={`dot ${online ? 'dot-green' : status || error ? 'dot-red' : 'dot-muted'}`} />
        {label}
      </span>
    </header>
  )
}

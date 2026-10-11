import React from 'react';
import { useTraffic } from '../../services/TrafficContext';
import { Sun, Moon, Radio, ShieldCheck, Activity, Cpu } from 'lucide-react';

export const Header: React.FC = () => {
  const { device, theme, toggleTheme, state } = useTraffic();

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">
          {/* Traffic Signal Inspired Mark */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="4" fill="currentColor" fillOpacity="0.2" />
            <circle cx="12" cy="7" r="2.5" fill="#e74c3c" stroke="none" />
            <circle cx="12" cy="12" r="2.5" fill="#f1c40f" stroke="none" />
            <circle cx="12" cy="17" r="2.5" fill="#38d39f" stroke="none" />
          </svg>
        </span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Smart Traffic Control
          </span>
          <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 500 }}>
            PPO Edge Operations Center
          </span>
        </div>
      </div>

      <div className="topbar-center">
        {device ? (
          <div className="connection-pill">
            <span className={`pulse-dot ${device.isSimulated ? 'simulated' : 'online'}`} />
            <span>
              {device.isSimulated ? 'Simulated Link:' : 'Wi-Fi Link:'} <strong style={{ color: 'var(--text)' }}>{device.ipAddress}:{device.port}</strong>
            </span>
            <span style={{ color: 'var(--border-strong)' }}>|</span>
            <span style={{ color: 'var(--muted)', fontSize: '11px' }}>
              {device.intersectionName}
            </span>
            {state && (
              <span className={`badge ${state.mode === 'ppo_autonomous' ? 'teal' : state.mode === 'emergency_hold' ? 'red' : 'yellow'}`} style={{ padding: '2px 8px', fontSize: '10px' }}>
                {state.mode.replace('_', ' ').toUpperCase()}
              </span>
            )}
          </div>
        ) : (
          <div className="connection-pill">
            <span className="pulse-dot offline" />
            <span style={{ color: 'var(--muted)' }}>No Edge Device Connected</span>
          </div>
        )}
      </div>

      <div className="header-actions">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '6px' }}>
          <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 500 }}>
            Duty Officer
          </span>
          <span style={{ fontSize: '12px', fontWeight: 600 }}>
            Insp. K. Raman
          </span>
        </div>

        <button 
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className="icon-button"
          onClick={toggleTheme}
          title="Toggle Dark / Light Theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button className="avatar" title="Traffic Operations Operator AM-04">
          TO
        </button>
      </div>
    </header>
  );
};

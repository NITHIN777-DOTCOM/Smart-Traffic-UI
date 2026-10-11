import React, { useState } from 'react';
import { useTraffic } from '../services/TrafficContext';
import { Settings, ShieldCheck, Terminal, Server, Save, Check } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { theme, toggleTheme } = useTraffic();
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Operational Configurations</p>
          <h1>System Configuration & Parameters</h1>
          <p className="subtitle">
            Edge PPO hyperparameters, safety governor thresholds, systemd service units, and hardware transport coordinates.
          </p>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1.2fr) minmax(300px, 1fr)', gap: '24px' }}>
        
        {/* Signal & Governor Configs */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">PPO & Safety Governor Thresholds</h2>
              <p className="card-subtitle">Values synchronized with <code>configs/traffic.yaml</code> and <code>configs/safety.yaml</code></p>
            </div>
            <span className="badge teal">YAML BOUND</span>
          </div>

          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Minimum Green Duration (s)</label>
                <input type="number" className="form-input" defaultValue={15} readOnly />
              </div>
              <div className="form-group">
                <label className="form-label">Maximum Green Duration (s)</label>
                <input type="number" className="form-input" defaultValue={60} readOnly />
              </div>
              <div className="form-group">
                <label className="form-label">Yellow Clearance Duration (s)</label>
                <input type="number" className="form-input" defaultValue={3} readOnly />
              </div>
              <div className="form-group">
                <label className="form-label">All-Red Safety Clearance (s)</label>
                <input type="number" className="form-input" defaultValue={2} readOnly />
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '10px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 12px' }}>EdgeCaseGovernor Override Thresholds</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Wait Threshold Override (Norm)</label>
                  <input type="text" className="form-input" defaultValue="0.80 (~48 seconds)" readOnly />
                </div>
                <div className="form-group">
                  <label className="form-label">Near-Equal Density Epsilon</label>
                  <input type="text" className="form-input" defaultValue="0.02" readOnly />
                </div>
                <div className="form-group">
                  <label className="form-label">Empty Queue Threshold</label>
                  <input type="text" className="form-input" defaultValue="0.15" readOnly />
                </div>
                <div className="form-group">
                  <label className="form-label">Consecutive Green Rule</label>
                  <input type="text" className="form-input" defaultValue="Rule 4 Strict Group Gate" readOnly />
                </div>
              </div>
            </div>

            <button type="submit" className="primary-button" style={{ marginTop: '12px' }}>
              {saved ? <Check size={16} /> : <Save size={16} />}
              {saved ? 'Configurations Saved' : 'Save Parameters'}
            </button>
          </form>
        </div>

        {/* Systemd & Gateway Service */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="card">
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 10px' }}>
              Edge Systemd Service Status
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 14px' }}>
              Unit: <code>deploy/smart-traffic-demo.service</code>
            </p>

            <div 
              style={{ 
                fontFamily: 'var(--font-mono)', 
                fontSize: '11px', 
                background: 'var(--bg)', 
                padding: '12px', 
                borderRadius: '8px', 
                border: '1px solid var(--border)',
                lineHeight: 1.6
              }}
            >
              <div>[Unit] Description=Smart Traffic four-way edge demo</div>
              <div>User=pi</div>
              <div>WorkingDirectory=/opt/smart-traffic-ppo</div>
              <div>ExecStart=/opt/smart-traffic-ppo/scripts/demo_up.sh</div>
              <div>Restart=on-failure (RestartSec=5)</div>
              <div>MemoryMax=2500M</div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 10px' }}>
              Appearance & Theme
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 16px' }}>
              Currently using <strong>{theme.toUpperCase()}</strong> mode. Persisted in localStorage.
            </p>
            <button className="secondary-button" onClick={toggleTheme}>
              Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

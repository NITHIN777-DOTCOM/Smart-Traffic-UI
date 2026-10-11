import React from 'react';
import { useTraffic } from '../../services/TrafficContext';
import { 
  Wifi, 
  Sliders, 
  Cpu, 
  GitCommit, 
  AlertTriangle, 
  BarChart3, 
  Settings, 
  Activity, 
  ShieldCheck 
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activePage, setActivePage, alerts, device, state } = useTraffic();

  const unreadAlerts = alerts.filter(a => !a.acknowledged).length;

  const navItems = [
    { section: 'Operations', items: [
      { id: 'landing', label: 'Wi-Fi Connection', icon: Wifi },
      { id: 'control', label: 'Control Center', icon: Sliders },
      { id: 'devices', label: 'Connected Devices', icon: Cpu },
      { id: 'intersections', label: 'Intersections', icon: GitCommit },
      { id: 'alerts', label: 'Alerts & Events', icon: AlertTriangle, count: unreadAlerts }
    ]},
    { section: 'Analytics', items: [
      { id: 'analytics', label: 'Analytics Dashboard', icon: BarChart3 }
    ]}
  ];

  return (
    <aside className="sidebar">
      {navItems.map(group => (
        <div key={group.section} className="nav-section">
          <p className="nav-label">{group.section}</p>
          <div className="nav-stack">
            {group.items.map(item => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setActivePage(item.id)}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="nav-badge danger">{item.count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Edge Runtime Insight Card */}
      <div className="sidebar-status-card">
        <span className="status-icon">
          <ShieldCheck size={20} />
        </span>
        <div>
          <strong>PPO Edge Policy</strong>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
            {device?.modelArtifact ? 'ppo_normal_mlp_best.onnx' : 'Adaptive Simple Fallback'}
          </span>
          <span style={{ color: 'var(--accent-text)', marginTop: '2px' }}>
            {state?.governorIntervention ? 'Governor Active' : 'Optimal Policy'}
          </span>
        </div>
      </div>

      <button 
        className={`nav-item settings ${activePage === 'settings' ? 'active' : ''}`}
        onClick={() => setActivePage('settings')}
      >
        <Settings size={18} />
        <span>System Configuration</span>
      </button>
    </aside>
  );
};

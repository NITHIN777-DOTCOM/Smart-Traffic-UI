import React, { useState } from 'react';
import { useTraffic } from '../services/TrafficContext';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Layers, 
  Clock, 
  Car, 
  ShieldCheck, 
  Cpu, 
  Info,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  PPO_TRAINING_CURVES, 
  HOURLY_TRAFFIC_FLOW, 
  VEHICLE_CLASSIFICATION_DATA, 
  METRIC_CATALOG 
} from '../data/mockTelemetry';
import { MetricCategory, MetricDefinition } from '../types/traffic';

export const AnalyticsDashboardPage: React.FC = () => {
  const { state } = useTraffic();
  const [timeRange, setTimeRange] = useState<'15m' | '1h' | '24h' | 'training_history'>('24h');
  const [selectedCategory, setSelectedCategory] = useState<MetricCategory | 'all'>('all');

  const categories: { id: MetricCategory | 'all'; label: string }[] = [
    { id: 'all', label: 'All Domains (30+ Catalog)' },
    { id: 'traffic_flow', label: 'Traffic Flow (6)' },
    { id: 'congestion_queues', label: 'Congestion & Queues (6)' },
    { id: 'signal_efficiency', label: 'Signal Timing (5)' },
    { id: 'ppo_rl', label: 'PPO Reinforcement Learning (5)' },
    { id: 'perception_vision', label: 'Perception & Vision (5)' },
    { id: 'device_health', label: 'Device Health (5)' },
    { id: 'safety_incidents', label: 'Safety & Incidents (4)' },
    { id: 'environmental', label: 'Environmental Impact (4)' }
  ];

  const filteredMetrics = METRIC_CATALOG.filter((m: MetricDefinition) => {
    if (selectedCategory === 'all') return true;
    return m.category === selectedCategory;
  });

  return (
    <div>
      {/* Page Header */}
      <section className="page-heading">
        <div>
          <p className="eyebrow">Smart City Decision Support System</p>
          <h1>Traffic Analytics Dashboard</h1>
          <p className="subtitle">
            Longitudinal traffic dynamics, queue dissipation performance, PPO reinforcement learning convergence, and an extensible catalog for 30+ smart-city metrics.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {(['15m', '1h', '24h', 'training_history'] as const).map(t => (
            <button
              key={t}
              className={`secondary-button ${timeRange === t ? 'active' : ''}`}
              style={{
                textTransform: t === 'training_history' ? 'none' : 'uppercase',
                borderColor: timeRange === t ? 'var(--accent)' : 'var(--border)',
                background: timeRange === t ? 'var(--accent-soft)' : 'transparent',
                color: timeRange === t ? 'var(--accent-text)' : 'var(--text)',
                fontSize: '12px',
                padding: '0 12px',
                minHeight: '36px'
              }}
              onClick={() => setTimeRange(t)}
            >
              {t === 'training_history' ? 'PPO Checkpoints (3k Ep)' : t}
            </button>
          ))}
        </div>
      </section>

      {/* Top 4 KPI Summary Cards */}
      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-name">Average Intersection Throughput</span>
            <span className="badge green">24H ROLLING</span>
          </div>
          <div className="metric-value">495 <span className="metric-unit">veh/hr</span></div>
          <div className="metric-footer" style={{ color: 'var(--traffic-green)' }}>
            <TrendingUp size={14} /> +12.4% vs Fixed-Time Webster
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-name">Mean Approach Waiting Time</span>
            <span className="badge teal">AVERAGE</span>
          </div>
          <div className="metric-value">16.4 <span className="metric-unit">sec</span></div>
          <div className="metric-footer" style={{ color: 'var(--traffic-green)' }}>
            <ArrowDownRight size={14} /> -28.6% delay reduction
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-name">Mean PPO Episode Reward</span>
            <span className="badge green">CONVERGED</span>
          </div>
          <div className="metric-value">+36.8 <span className="metric-unit">pts</span></div>
          <div className="metric-footer" style={{ color: 'var(--muted)' }}>
            Trained on 131-dim state vector
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-name">Estimated Idle Emissions Saved</span>
            <span className="badge teal">ENVIRONMENTAL</span>
          </div>
          <div className="metric-value">142.6 <span className="metric-unit">kg CO₂/day</span></div>
          <div className="metric-footer" style={{ color: 'var(--traffic-green)' }}>
            58.4 Litres idle fuel conserved
          </div>
        </div>
      </div>

      {/* Chart Section 1: Hourly Traffic Flow & PPO Convergence */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1.4fr) minmax(300px, 1fr)', gap: '24px', marginBottom: '32px' }}>
        
        {/* 24-Hour Throughput & Wait Dynamic Curve */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Hourly Vehicle Throughput & Wait Latency</h2>
              <p className="card-subtitle">Correlation between volume arrival spikes and dynamic green adaptation</p>
            </div>
            <span className="badge teal">24H DIURNAL CYCLE</span>
          </div>

          {/* Custom SVG Line & Area Chart */}
          <div style={{ height: '240px', width: '100%', position: 'relative' }}>
            <svg viewBox="0 0 600 220" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              <defs>
                <linearGradient id="throughputGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6ba6a0" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#6ba6a0" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[40, 90, 140, 190].map(y => (
                <line key={y} x1="30" y1={y} x2="590" y2={y} stroke="var(--border)" strokeDasharray="4 4" />
              ))}

              {/* Throughput Area & Path */}
              {(() => {
                const maxVal = 600;
                const points = HOURLY_TRAFFIC_FLOW.map((pt, i: number) => {
                  const x = 40 + i * (540 / (HOURLY_TRAFFIC_FLOW.length - 1));
                  const y = 200 - (pt.throughput / maxVal) * 160;
                  return `${x},${y}`;
                });
                const dArea = `M 40,200 L ${points.join(' L ')} L 580,200 Z`;
                const dLine = `M ${points.join(' L ')}`;

                return (
                  <>
                    <path d={dArea} fill="url(#throughputGrad)" />
                    <path d={dLine} fill="none" stroke="#6ba6a0" strokeWidth="2.5" />
                    {HOURLY_TRAFFIC_FLOW.map((pt, i: number) => {
                      const x = 40 + i * (540 / (HOURLY_TRAFFIC_FLOW.length - 1));
                      const y = 200 - (pt.throughput / maxVal) * 160;
                      return (
                        <circle key={i} cx={x} cy={y} r="3.5" fill="#6ba6a0" stroke="var(--surface)" strokeWidth="1.5" />
                      );
                    })}
                  </>
                );
              })()}

              {/* X Axis Labels */}
              {HOURLY_TRAFFIC_FLOW.filter((_, i: number) => i % 2 === 0).map((pt, idx: number) => {
                const x = 40 + (idx * 2) * (540 / (HOURLY_TRAFFIC_FLOW.length - 1));
                return (
                  <text key={pt.hour} x={x} y="215" fontSize="10" fill="var(--muted)" textAnchor="middle" fontFamily="var(--font-mono)">
                    {pt.hour}
                  </text>
                );
              })}
            </svg>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '14px', fontSize: '12px' }}>
            <span style={{ color: 'var(--muted)' }}>
              Peak Congestion Window: <strong style={{ color: 'var(--text)' }}>17:30 – 19:00 (530 veh/hr)</strong>
            </span>
            <span style={{ color: 'var(--accent-text)' }}>
              Dynamic Green Extension: <strong>Up to 60s max_green</strong>
            </span>
          </div>
        </div>

        {/* PPO Reward & Policy Loss Convergence Curve */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">PPO RL Learning Convergence</h2>
              <p className="card-subtitle">Sourced from <code>training_normal_mlp_gov_final.csv</code> (3k Episodes)</p>
            </div>
            <span className="badge green">CONVERGED</span>
          </div>

          <div style={{ height: '240px', width: '100%' }}>
            <svg viewBox="0 0 400 220" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              {[40, 90, 140, 190].map(y => (
                <line key={y} x1="30" y1={y} x2="390" y2={y} stroke="var(--border)" strokeDasharray="4 4" />
              ))}

              {/* Reward Path */}
              {(() => {
                const points = PPO_TRAINING_CURVES.map((pt, i: number) => {
                  const x = 40 + i * (340 / (PPO_TRAINING_CURVES.length - 1));
                  const norm = (pt.reward - (-60)) / 100; // 0 to 1
                  const y = 190 - norm * 150;
                  return `${x},${y}`;
                });
                return (
                  <>
                    <path d={`M ${points.join(' L ')}`} fill="none" stroke="var(--traffic-green)" strokeWidth="2.5" />
                    {PPO_TRAINING_CURVES.map((pt, i: number) => {
                      const x = 40 + i * (340 / (PPO_TRAINING_CURVES.length - 1));
                      const norm = (pt.reward - (-60)) / 100;
                      const y = 190 - norm * 150;
                      return (
                        <circle key={i} cx={x} cy={y} r="3" fill="var(--traffic-green)" />
                      );
                    })}
                  </>
                );
              })()}

              {/* X Axis Labels */}
              {PPO_TRAINING_CURVES.filter((_, i: number) => i % 2 === 0).map((pt, idx: number) => {
                const x = 40 + (idx * 2) * (340 / (PPO_TRAINING_CURVES.length - 1));
                return (
                  <text key={pt.episode} x={x} y="215" fontSize="10" fill="var(--muted)" textAnchor="middle" fontFamily="var(--font-mono)">
                    {pt.episode}ep
                  </text>
                );
              })}
            </svg>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '14px', fontSize: '11px', color: 'var(--muted)' }}>
            <span>Initial: -58.2 pts</span>
            <span>Policy Loss: 0.008 (Stable)</span>
            <span style={{ color: 'var(--traffic-green)', fontWeight: 600 }}>Final: +36.8 pts</span>
          </div>
        </div>
      </div>

      {/* Chart Section 2: Vehicle Mix & Approach Queue Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        
        {/* Vehicle Classification Distribution */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Vehicle Classification Mix</h2>
              <p className="card-subtitle">Extracted from <code>basic_traffic_metrics.csv</code> YOLOv8 vehicle classes</p>
            </div>
            <span className="badge teal">YOLOv8 DETECTIONS</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {VEHICLE_CLASSIFICATION_DATA.map((vc) => (
              <div key={vc.type}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
                  <span style={{ fontWeight: 600 }}>{vc.type}</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>
                    <strong>{vc.count}</strong> ({vc.percentage}%)
                  </span>
                </div>
                <div style={{ height: '8px', borderRadius: '4px', background: 'var(--surface-raised)', overflow: 'hidden' }}>
                  <div style={{ width: `${vc.percentage}%`, height: '100%', background: vc.color, borderRadius: '4px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Approach Wait Time Comparison */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Approach Delay Breakdown</h2>
              <p className="card-subtitle">Per-approach mean waiting time (North, East, South, West)</p>
            </div>
            <span className="badge yellow">STARVATION GATE 48s</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { id: 'North', wait: state?.approaches.North.avgWaitingTime || 11.4, max: 48, aspect: state?.approaches.North.aspect },
              { id: 'East', wait: state?.approaches.East.avgWaitingTime || 28.5, max: 48, aspect: state?.approaches.East.aspect },
              { id: 'South', wait: state?.approaches.South.avgWaitingTime || 10.8, max: 48, aspect: state?.approaches.South.aspect },
              { id: 'West', wait: state?.approaches.West.avgWaitingTime || 25.1, max: 48, aspect: state?.approaches.West.aspect }
            ].map((app) => (
              <div key={app.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ width: '50px' }}>{app.id}</strong>
                    <span className={`badge ${app.aspect === 'green' ? 'green' : app.aspect === 'yellow' ? 'yellow' : 'red'}`} style={{ padding: '1px 6px', fontSize: '9px' }}>
                      {app.aspect?.toUpperCase()}
                    </span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>
                    {app.wait.toFixed(1)}s <span style={{ color: 'var(--muted)', fontSize: '11px' }}>/ 48s limit</span>
                  </span>
                </div>
                <div style={{ height: '8px', borderRadius: '4px', background: 'var(--surface-raised)', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: `${Math.min(100, (app.wait / app.max) * 100)}%`, 
                      height: '100%', 
                      background: app.wait > 40 ? 'var(--traffic-red)' : app.wait > 25 ? 'var(--amber)' : 'var(--traffic-green)',
                      borderRadius: '4px' 
                    }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 3: 30+ Metric Expansion Framework */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Extensible 30+ Smart Traffic Metric Framework</h2>
            <p className="card-subtitle">
              Comprehensive analytical architecture cataloging implemented, derived, and future planned metrics across 8 core smart-city domains.
            </p>
          </div>
          <span className="badge teal">{METRIC_CATALOG.length} METRICS DEFINED</span>
        </div>

        {/* Category Filter Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`secondary-button ${selectedCategory === cat.id ? 'active' : ''}`}
              style={{
                fontSize: '12px',
                padding: '6px 14px',
                minHeight: '34px',
                borderColor: selectedCategory === cat.id ? 'var(--accent)' : 'var(--border)',
                background: selectedCategory === cat.id ? 'var(--accent-soft)' : 'var(--surface-raised)',
                color: selectedCategory === cat.id ? 'var(--accent-text)' : 'var(--text)'
              }}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Metric Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
          {filteredMetrics.map((metric: MetricDefinition) => {
            const isImpl = metric.status === 'implemented';
            const isDerived = metric.status === 'derived';
            return (
              <div 
                key={metric.id}
                style={{
                  padding: '18px',
                  borderRadius: '12px',
                  background: 'var(--surface-raised)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>{metric.name}</h4>
                    <span 
                      className={`badge ${isImpl ? 'green' : isDerived ? 'teal' : 'gray'}`}
                      style={{ fontSize: '9px', padding: '1px 6px' }}
                    >
                      {metric.status.toUpperCase()}
                    </span>
                  </div>

                  <p style={{ margin: '0 0 12px', fontSize: '12px', color: 'var(--muted)', lineHeight: 1.4 }}>
                    {metric.description}
                  </p>
                </div>

                <div>
                  {metric.currentValue !== undefined ? (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                        {metric.currentValue}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{metric.unit}</span>
                      {metric.changeDelta !== undefined && (
                        <span style={{ fontSize: '11px', color: metric.changeDelta >= 0 ? 'var(--traffic-green)' : 'var(--amber)', marginLeft: 'auto' }}>
                          {metric.changeDelta >= 0 ? `+${metric.changeDelta}%` : `${metric.changeDelta}%`}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'var(--surface)', border: '1px dashed var(--border)', fontSize: '11px', color: 'var(--muted)', marginBottom: '8px' }}>
                      Planned in Digital Twin roadmap • Metric slot reserved
                    </div>
                  )}

                  <div style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                    <div><strong>Formula:</strong> {metric.formula}</div>
                    <div style={{ marginTop: '2px', color: 'var(--accent-text)' }}><strong>Source:</strong> {metric.sourceInRepo}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

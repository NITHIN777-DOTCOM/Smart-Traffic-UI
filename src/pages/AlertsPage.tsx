import React, { useState } from 'react';
import { useTraffic } from '../services/TrafficContext';
import { AlertTriangle, AlertCircle, Info, CheckCircle2, Filter } from 'lucide-react';
import { AlertEvent } from '../types/traffic';

export const AlertsPage: React.FC = () => {
  const { alerts, acknowledgeAlert } = useTraffic();
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  const filteredAlerts = alerts.filter((a: AlertEvent) => {
    if (severityFilter === 'all') return true;
    return a.severity === severityFilter;
  });

  return (
    <div>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Operational Safety Feed</p>
          <h1>Alerts & System Events</h1>
          <p className="subtitle">
            Real-time feed of safety governor overrides, emergency vehicle detections, sensor degradation notices, and hardware communication events.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['all', 'critical', 'warning', 'info'] as const).map(sev => (
            <button
              key={sev}
              className={`secondary-button ${severityFilter === sev ? 'active' : ''}`}
              style={{
                textTransform: 'capitalize',
                padding: '0 14px',
                minHeight: '36px',
                borderColor: severityFilter === sev ? 'var(--accent)' : 'var(--border)'
              }}
              onClick={() => setSeverityFilter(sev)}
            >
              {sev}
            </button>
          ))}
        </div>
      </section>

      <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredAlerts.map((alt: AlertEvent) => {
            const isCrit = alt.severity === 'critical';
            const isWarn = alt.severity === 'warning';
            return (
              <div
                key={alt.id}
                style={{
                  padding: '18px',
                  borderRadius: '12px',
                  border: '1px solid',
                  borderColor: isCrit ? 'var(--traffic-red)' : isWarn ? 'var(--amber)' : 'var(--border)',
                  background: isCrit ? 'var(--traffic-red-soft)' : isWarn ? 'var(--amber-soft)' : 'var(--surface-raised)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <span style={{ color: isCrit ? 'var(--traffic-red)' : isWarn ? 'var(--amber)' : 'var(--accent)', marginTop: '2px' }}>
                    {isCrit || isWarn ? <AlertTriangle size={20} /> : <Info size={20} />}
                  </span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <strong style={{ fontSize: '14px' }}>{alt.title}</strong>
                      <span className={`badge ${isCrit ? 'red' : isWarn ? 'yellow' : 'teal'}`} style={{ padding: '1px 6px', fontSize: '9px' }}>
                        {alt.severity.toUpperCase()}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                        Source: {alt.source}
                      </span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>
                      {alt.message}
                    </p>
                    <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--muted)' }}>
                      Timestamp: {new Date(alt.timestamp).toLocaleString()} • Intersection: {alt.intersectionId}
                    </div>
                  </div>
                </div>

                <div>
                  {alt.acknowledged ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--traffic-green)' }}>
                      <CheckCircle2 size={14} />
                      Acknowledged
                    </span>
                  ) : (
                    <button 
                      className="primary-button" 
                      style={{ minHeight: '32px', padding: '0 12px', fontSize: '11px' }}
                      onClick={() => acknowledgeAlert(alt.id)}
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filteredAlerts.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)' }}>
              No alerts match the selected filter criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

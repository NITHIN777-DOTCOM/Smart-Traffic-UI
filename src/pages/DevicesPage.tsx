import React from 'react';
import { useTraffic } from '../services/TrafficContext';
import { Cpu, Wifi, Activity, HardDrive, ShieldCheck, RefreshCw, Radio, CheckCircle2, Server } from 'lucide-react';
import { INITIAL_DISCOVERED_DEVICES } from '../data/mockTelemetry';
import { RaspberryPiDevice } from '../types/traffic';

export const DevicesPage: React.FC = () => {
  const { device } = useTraffic();

  return (
    <div>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Edge Computing Hardware Infrastructure</p>
          <h1>Connected Edge Devices</h1>
          <p className="subtitle">
            Diagnostics, resource utilization, and communication links for Raspberry Pi 5 edge nodes and ESP32 signal controller microcontrollers.
          </p>
        </div>
      </section>

      {/* Edge Node Inventory */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {INITIAL_DISCOVERED_DEVICES.map((d: RaspberryPiDevice) => {
          const isCurrent = device?.id === d.id;
          return (
            <div 
              key={d.id} 
              className="card"
              style={{
                borderColor: isCurrent ? 'var(--accent)' : 'var(--border)',
                background: isCurrent ? 'color-mix(in srgb, var(--accent-soft) 25%, var(--surface))' : 'var(--surface)'
              }}
            >
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span 
                    style={{ 
                      display: 'grid', 
                      width: '40px', 
                      height: '40px', 
                      placeItems: 'center', 
                      borderRadius: '10px',
                      background: isCurrent ? 'var(--accent)' : 'var(--surface-raised)',
                      color: isCurrent ? '#0f1b19' : 'var(--text)'
                    }}
                  >
                    <Cpu size={22} />
                  </span>
                  <div>
                    <h3 className="card-title" style={{ fontSize: '15px' }}>{d.name}</h3>
                    <p className="card-subtitle">{d.intersectionName}</p>
                  </div>
                </div>
                <span className={`badge ${isCurrent ? 'green' : 'gray'}`}>
                  {isCurrent ? 'ONLINE / ACTIVE' : 'STANDBY'}
                </span>
              </div>

              {/* Hardware metrics grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '18px' }}>
                <div style={{ padding: '10px', borderRadius: '8px', background: 'var(--surface-raised)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block' }}>SoC Temp</span>
                  <strong style={{ fontSize: '16px', fontFamily: 'var(--font-mono)' }}>{d.cpuTempC}°C</strong>
                </div>

                <div style={{ padding: '10px', borderRadius: '8px', background: 'var(--surface-raised)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block' }}>CPU Load</span>
                  <strong style={{ fontSize: '16px', fontFamily: 'var(--font-mono)' }}>{d.cpuLoadPct}%</strong>
                </div>

                <div style={{ padding: '10px', borderRadius: '8px', background: 'var(--surface-raised)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block' }}>RAM Load</span>
                  <strong style={{ fontSize: '16px', fontFamily: 'var(--font-mono)' }}>{d.memoryLoadPct}%</strong>
                </div>
              </div>

              {/* Network & Software Specs */}
              <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>Endpoint Coordinate:</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{d.ipAddress}:{d.port}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>Wi-Fi RSSI / Latency:</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{d.wifiRssiDbm} dBm ({d.networkLatencyMs}ms)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>Policy Model Export:</span>
                  <span style={{ color: 'var(--accent-text)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{d.modelArtifact}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>Service Unit:</span>
                  <span>smart-traffic-demo.service (Active)</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Hardware Rig Pinout & Transport Specification */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">ESP32 Traffic Signal Rig Specifications</h2>
            <p className="card-subtitle">Verified hardware mapping from <code>hardware/ESP32_WIFI_SETUP.md</code></p>
          </div>
          <span className="badge teal">VERIFIED PROTOCOL</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div style={{ padding: '16px', borderRadius: '10px', background: 'var(--surface-raised)', border: '1px solid var(--border)' }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 700 }}>Signal Head S1 (North-South Approach Pair)</h4>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', lineHeight: 1.8, color: 'var(--muted-strong)' }}>
              <li><strong>Pin 25:</strong> Red LED (Bit 0: <code>0x01</code>)</li>
              <li><strong>Pin 26:</strong> Green LED (Bit 1: <code>0x02</code>)</li>
              <li><strong>Pin 27:</strong> Blue / Yellow Combination (Bit 2: <code>0x04</code>)</li>
              <li>Active-LOW Common Anode Configuration</li>
            </ul>
          </div>

          <div style={{ padding: '16px', borderRadius: '10px', background: 'var(--surface-raised)', border: '1px solid var(--border)' }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 700 }}>Signal Head S2 (East-West Approach Pair)</h4>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', lineHeight: 1.8, color: 'var(--muted-strong)' }}>
              <li><strong>Pin 14:</strong> Red LED (Bit 3: <code>0x08</code>)</li>
              <li><strong>Pin 12:</strong> Green LED (Bit 4: <code>0x10</code>)</li>
              <li><strong>Pin 13:</strong> Blue / Yellow Combination (Bit 5: <code>0x20</code>)</li>
              <li>TCP Port 8888 Bitmask Protocol: 0–63 Range</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

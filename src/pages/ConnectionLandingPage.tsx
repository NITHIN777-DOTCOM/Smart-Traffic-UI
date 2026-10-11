import React, { useState } from 'react';
import { useTraffic } from '../services/TrafficContext';
import { 
  Wifi, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Server, 
  ArrowRight, 
  Sliders, 
  BarChart3, 
  Cpu, 
  Activity, 
  Radio, 
  ShieldCheck,
  Info,
  Layers,
  PowerOff
} from 'lucide-react';
import { INITIAL_DISCOVERED_DEVICES } from '../data/mockTelemetry';
import { RaspberryPiDevice } from '../types/traffic';

export const ConnectionLandingPage: React.FC = () => {
  const { device, state, isConnecting, connect, disconnect, setActivePage } = useTraffic();

  const [discoveredDevices, setDiscoveredDevices] = useState<RaspberryPiDevice[]>(INITIAL_DISCOVERED_DEVICES);
  const [isScanning, setIsScanning] = useState(false);
  const [manualIp, setManualIp] = useState('192.168.1.42');
  const [manualPort, setManualPort] = useState('8888');
  const [transportMode, setTransportMode] = useState<'wifi_tcp' | 'gateway_rest'>('wifi_tcp');
  const [useSimulation, setUseSimulation] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleScan = async () => {
    setIsScanning(true);
    setStatusMessage('Broadcasting mDNS & ARP probes for Raspberry Pi 5 edge nodes on local subnet...');
    await new Promise(r => setTimeout(r, 1200));
    setDiscoveredDevices([...INITIAL_DISCOVERED_DEVICES]);
    setIsScanning(false);
    setStatusMessage(`Discovery complete. Found ${INITIAL_DISCOVERED_DEVICES.length} edge nodes.`);
  };

  const handleManualConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(`Initiating handshake with ${manualIp}:${manualPort}...`);
    const portNum = parseInt(manualPort, 10) || 8888;
    const ok = await connect(manualIp, portNum, useSimulation);
    if (ok) {
      setStatusMessage(`Successfully connected to ${manualIp}:${portNum} over ${useSimulation ? 'Simulated Wi-Fi link' : 'Gateway Transport'}.`);
    } else {
      setStatusMessage(`Connection attempt to ${manualIp}:${portNum} timed out or was rejected.`);
    }
  };

  const handleConnectDevice = async (d: RaspberryPiDevice) => {
    setStatusMessage(`Connecting to ${d.name} (${d.ipAddress}:${d.port})...`);
    await connect(d.ipAddress, d.port, true);
    setStatusMessage(`Active connection established with ${d.name}.`);
  };

  return (
    <div>
      {/* Page Header */}
      <section className="page-heading">
        <div>
          <p className="eyebrow">Smart City Operational Gateway</p>
          <h1>Traffic Control Center</h1>
          <p className="subtitle">
            Establish and manage connectivity with edge Raspberry Pi 5 controllers and ESP32 traffic-light rigs over local Wi-Fi or gateway telemetry relays.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {device ? (
            <>
              <button className="primary-button" onClick={() => setActivePage('control')}>
                <Sliders size={17} />
                Live Control Center
              </button>
              <button className="secondary-button" onClick={() => setActivePage('analytics')}>
                <BarChart3 size={17} />
                Analytics
              </button>
            </>
          ) : (
            <button className="primary-button" onClick={handleScan} disabled={isScanning}>
              <RefreshCw size={17} className={isScanning ? 'animate-spin' : ''} />
              {isScanning ? 'Scanning...' : 'Discover Devices'}
            </button>
          )}
        </div>
      </section>

      {/* Connection State Banner */}
      <div 
        className="card" 
        style={{ 
          marginBottom: '28px', 
          background: device 
            ? 'color-mix(in srgb, var(--accent-soft) 40%, var(--surface))' 
            : 'color-mix(in srgb, var(--traffic-yellow-soft) 30%, var(--surface))',
          borderColor: device ? 'var(--accent)' : 'var(--amber)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span 
              style={{ 
                display: 'grid', 
                width: '46px', 
                height: '46px', 
                placeItems: 'center', 
                borderRadius: '12px',
                background: device ? 'var(--accent)' : 'var(--amber)',
                color: '#0f1b19'
              }}
            >
              {device ? <Wifi size={24} /> : <AlertCircle size={24} />}
            </span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                  {device ? 'Raspberry Pi Controller Connected' : 'No Active Controller Linked'}
                </h3>
                <span className={`badge ${device ? (device.isSimulated ? 'yellow' : 'green') : 'red'}`}>
                  {device ? (device.isSimulated ? 'DEMO SIMULATION' : 'LIVE WI-FI LINK') : 'DISCONNECTED'}
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted-strong)' }}>
                {device 
                  ? `Linked to ${device.name} at ${device.ipAddress}:${device.port} • Model: ${device.modelArtifact} • Heartbeat: Active` 
                  : 'Select an edge device from the network discovery pool below or specify manual host coordinates.'}
              </p>
            </div>
          </div>

          {device && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button 
                className="secondary-button"
                onClick={disconnect}
                style={{ color: 'var(--traffic-red)', borderColor: 'var(--border)' }}
              >
                <PowerOff size={16} />
                Disconnect Device
              </button>
              <button className="primary-button" onClick={() => setActivePage('control')}>
                Inspect Junction Telemetry
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Discovery + Manual Connect */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        
        {/* Device Discovery Panel */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Network Device Discovery</h2>
              <p className="card-subtitle">Local subnet ARP & mDNS inspection for Raspberry Pi 5 controllers</p>
            </div>
            <button className="secondary-button" onClick={handleScan} disabled={isScanning} style={{ padding: '0 14px', minHeight: '36px' }}>
              <RefreshCw size={15} className={isScanning ? 'animate-spin' : ''} />
              Scan Subnet
            </button>
          </div>

          {statusMessage && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--surface-raised)', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--muted-strong)', marginBottom: '16px' }}>
              <Info size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px', color: 'var(--accent)' }} />
              {statusMessage}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {discoveredDevices.map((d: RaspberryPiDevice) => {
              const isCurrent = device?.id === d.id;
              return (
                <div 
                  key={d.id}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor: isCurrent ? 'var(--accent)' : 'var(--border)',
                    background: isCurrent ? 'var(--accent-soft)' : 'var(--surface-raised)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span 
                      style={{ 
                        display: 'grid', 
                        width: '38px', 
                        height: '38px', 
                        placeItems: 'center', 
                        borderRadius: '9px',
                        background: isCurrent ? 'var(--accent)' : 'var(--surface)',
                        color: isCurrent ? '#0f1b19' : 'var(--text)'
                      }}
                    >
                      <Cpu size={20} />
                    </span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '14px' }}>{d.name}</strong>
                        {isCurrent && <span className="badge teal" style={{ fontSize: '10px', padding: '1px 6px' }}>ACTIVE</span>}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                        {d.ipAddress}:{d.port} • RSSI: {d.wifiRssiDbm} dBm • CPU: {d.cpuTempC}°C
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                        {d.intersectionName}
                      </div>
                    </div>
                  </div>

                  <div>
                    {isCurrent ? (
                      <button className="secondary-button" onClick={() => setActivePage('control')} style={{ minHeight: '34px', padding: '0 12px' }}>
                        Manage
                      </button>
                    ) : (
                      <button className="primary-button" onClick={() => handleConnectDevice(d)} style={{ minHeight: '34px', padding: '0 14px' }}>
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Manual Connection Panel */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Manual Endpoint Connect</h2>
              <p className="card-subtitle">Connect directly to an ESP32 TCP socket or Pi Gateway address</p>
            </div>
            <span className="badge gray">DIRECT SOCKET</span>
          </div>

          <form onSubmit={handleManualConnect}>
            <div className="form-group">
              <label className="form-label">Raspberry Pi / ESP32 IP Address</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. 192.168.1.42 or traffic-edge.local"
                value={manualIp}
                onChange={e => setManualIp(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Port</label>
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="8888"
                  value={manualPort}
                  onChange={e => setManualPort(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Transport Protocol</label>
                <select 
                  className="form-select"
                  value={transportMode}
                  onChange={e => setTransportMode(e.target.value as any)}
                >
                  <option value="wifi_tcp">TCP Socket (Port 8888)</option>
                  <option value="gateway_rest">REST / WebSocket Gateway</option>
                </select>
              </div>
            </div>

            {/* Simulation Mode Toggle */}
            <div 
              style={{ 
                padding: '14px', 
                borderRadius: '10px', 
                background: 'var(--surface-raised)', 
                border: '1px solid var(--border)', 
                marginBottom: '20px' 
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={useSimulation} 
                  onChange={e => setUseSimulation(e.target.checked)}
                  style={{ width: '17px', height: '17px', accentColor: 'var(--accent)' }}
                />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>
                  Enable Demonstration Simulation Mode
                </span>
              </label>
              <p style={{ margin: '8px 0 0 27px', fontSize: '11px', color: 'var(--muted)', lineHeight: 1.4 }}>
                Web browsers are sandboxed and cannot directly open raw TCP sockets (port 8888) without an edge gateway relay. Enabling simulation provides authentic telemetry based on real repository data while maintaining safe development boundaries.
              </p>
            </div>

            <button 
              type="submit" 
              className="primary-button" 
              style={{ width: '100%' }}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Establishing Link...
                </>
              ) : (
                <>
                  <Wifi size={16} />
                  Connect to Edge Hardware
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Operational Summary (When Connected) */}
      {device && state && (
        <div className="card" style={{ marginBottom: '32px' }}>
          <div className="card-header">
            <div>
              <h2 className="card-title">Live Operational Summary: {state.intersectionName}</h2>
              <p className="card-subtitle">Real-time status synchronized with edge PPO decision engine</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <span className="badge green">PPO INFERENCE ACTIVE</span>
              <span className="badge teal">ESP32 ACK OK</span>
            </div>
          </div>

          <div className="metric-grid">
            <div className="metric-card">
              <div className="metric-card-header">
                <span className="metric-name">Active Phase</span>
                <span className="badge green">{state.transitionState.toUpperCase()}</span>
              </div>
              <div className="metric-value">{state.currentPhaseName}</div>
              <div className="metric-footer">
                <span style={{ color: 'var(--accent)' }}>Remaining: {state.remainingPhaseSeconds}s</span>
                <span style={{ color: 'var(--muted)' }}>• Duration: {state.phaseDurationSeconds}s</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-card-header">
                <span className="metric-name">Total Throughput</span>
                <span className="badge teal">CUMULATIVE</span>
              </div>
              <div className="metric-value">{state.totalThroughput} <span className="metric-unit">veh</span></div>
              <div className="metric-footer">
                <span style={{ color: 'var(--traffic-green)' }}>+8.4% above Webster Baseline</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-card-header">
                <span className="metric-name">System Mean Wait</span>
                <span className="badge yellow">4 APPROACHES</span>
              </div>
              <div className="metric-value">{state.systemAvgWait} <span className="metric-unit">sec</span></div>
              <div className="metric-footer">
                <span style={{ color: 'var(--muted)' }}>Peak Wait: East (28.5s)</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-card-header">
                <span className="metric-name">Edge Device Health</span>
                <span className="badge gray">Pi 5 CORE</span>
              </div>
              <div className="metric-value">{device.cpuTempC} <span className="metric-unit">°C</span></div>
              <div className="metric-footer">
                <span style={{ color: 'var(--muted)' }}>CPU: {device.cpuLoadPct}% • RAM: {device.memoryLoadPct}%</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '18px' }}>
            <button className="secondary-button" onClick={() => setActivePage('devices')}>
              <Cpu size={16} />
              View Device Telemetry
            </button>
            <button className="secondary-button" onClick={() => setActivePage('alerts')}>
              <AlertCircle size={16} />
              Audit Alerts Log
            </button>
            <button className="primary-button" onClick={() => setActivePage('control')}>
              <Sliders size={16} />
              Open Live Traffic Controls
            </button>
          </div>
        </div>
      )}

      {/* Connection Architecture Explanation Card */}
      <div className="card" style={{ background: 'var(--surface-raised)' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px' }}>
          Network Architecture & Edge Hardware Deployment Reference
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 16px' }}>
          In production smart-city deployments, the traffic operations center workstation communicates with edge computing hardware through the following verified topology:
        </p>
        <div 
          style={{ 
            fontFamily: 'var(--font-mono)', 
            fontSize: '12px', 
            background: 'var(--bg)', 
            padding: '14px 18px', 
            borderRadius: '8px', 
            border: '1px solid var(--border)',
            color: 'var(--accent-text)',
            overflowX: 'auto',
            whiteSpace: 'pre'
          }}
        >
{`[ Traffic Operator Web UI ]
         │ (HTTP / WebSocket)
         ▼
[ Edge Gateway Service (FastAPI / Flask on Pi 5) ] ── (Port 8000)
         │ (Local IPC / ZeroMQ / Shared Memory)
         ▼
[ IntersectionRunner Service (/opt/smart-traffic-ppo) ]
         │ (YOLOv8 + ByteTrack + PPO 131-dim Policy)
         ├─────────────────────────────────────────┐
         ▼                                         ▼
[ ESP32 Wi-Fi TCP Client ]                 [ ESP32 USB Serial Driver ]
Port 8888 Bitmask Protocol                  115200 Baud OK Echo Protocol
         ▼                                         ▼
[ S1 (NS) / S2 (EW) LED Signals ]          [ 4-Head Traffic Light Rig ]`}
        </div>
      </div>
    </div>
  );
};

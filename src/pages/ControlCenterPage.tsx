import React, { useState } from 'react';
import { useTraffic } from '../services/TrafficContext';
import { 
  Sliders, 
  ShieldCheck, 
  AlertTriangle, 
  Activity, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight,
  RefreshCw,
  Play,
  Pause,
  AlertOctagon,
  Grid,
  Clock,
  Car,
  Camera,
  CheckCircle2
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { ApproachId, SignalPhaseName, ControllerMode, CommandAuditRecord } from '../types/traffic';

export const ControlCenterPage: React.FC = () => {
  const { 
    state, 
    device, 
    sendCommand, 
    toggleAdjacency, 
    triggerEmergencyHold, 
    resumeAutonomous,
    auditLogs
  } = useTraffic();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    title: string;
    description: string;
    isDanger: boolean;
    action: () => Promise<void>;
  }>({
    title: '',
    description: '',
    isDanger: false,
    action: async () => {}
  });

  if (!state) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <AlertTriangle size={36} style={{ color: 'var(--amber)', marginBottom: '14px' }} />
        <h2>No Active Edge Device Linked</h2>
        <p style={{ color: 'var(--muted)', maxWidth: '480px', margin: '0 auto 20px' }}>
          Connect to a Raspberry Pi 5 traffic controller on the Wi-Fi Connection page before accessing live intersection controls.
        </p>
      </div>
    );
  }

  const promptCommand = (title: string, description: string, isDanger: boolean, action: () => Promise<void>) => {
    setModalConfig({ title, description, isDanger, action });
    setModalOpen(true);
  };

  const handleModeChange = (mode: ControllerMode) => {
    promptCommand(
      `Switch Controller Operating Mode to ${mode.replace('_', ' ').toUpperCase()}`,
      `Changing operating mode to ${mode} will modify how signal phases are computed. Automatic PPO policies will be altered according to safety governance specifications.`,
      mode === 'emergency_hold',
      async () => {
        await sendCommand({
          type: 'set_mode',
          payload: mode,
          requestedBy: 'Traffic Operator Insp. Raman'
        });
      }
    );
  };

  const handleManualPhase = (phaseIndex: number, phaseName: SignalPhaseName) => {
    promptCommand(
      `Manual Request: Force Phase ${phaseName}`,
      `Safety Notice: Requesting manual phase ${phaseName} will initiate a 3-second yellow clearance on departing axes followed by a 2-second all-red safety buffer before granting green to ${phaseName}.`,
      false,
      async () => {
        await sendCommand({
          type: 'request_phase',
          payload: phaseIndex,
          requestedBy: 'Traffic Operator Insp. Raman'
        });
      }
    );
  };

  const getAspectColor = (aspect: string) => {
    if (aspect === 'green') return 'var(--traffic-green)';
    if (aspect === 'yellow') return 'var(--traffic-yellow)';
    return 'var(--traffic-red)';
  };

  return (
    <div>
      {/* Page Header */}
      <section className="page-heading">
        <div>
          <p className="eyebrow">Real-Time Actuation & Safety Supervision</p>
          <h1>Traffic Control Center</h1>
          <p className="subtitle">
            Live 4-way signal orchestration, PPO decision monitoring, safety governor intervention status, and interactive topological control for {state.intersectionName}.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {state.mode === 'emergency_hold' ? (
            <button 
              className="primary-button"
              onClick={() => promptCommand('Resume Autonomous PPO Control', 'Disengages emergency priority hold and restores PPO reinforcement learning control.', false, resumeAutonomous)}
            >
              <Play size={16} />
              Resume Autonomous Mode
            </button>
          ) : (
            <button 
              className="danger-button"
              onClick={() => promptCommand('Trigger Emergency All-Red Hold', 'WARNING: Forces all approach signals to RED / Protected Emergency Corridor for oncoming ambulance or VIP movement.', true, triggerEmergencyHold)}
            >
              <AlertOctagon size={16} />
              Emergency All-Red Hold
            </button>
          )}
        </div>
      </section>

      {/* Main Grid: 4-Way Visualizer + Signal Program */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1.4fr) minmax(320px, 1fr)', gap: '24px', marginBottom: '28px' }}>
        
        {/* Interactive 4-Way Junction Visualizer */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <div>
              <h2 className="card-title">4-Way Junction Actuation State</h2>
              <p className="card-subtitle">{state.intersectionId} • 131-Dim Normalized State Vector Hash: <code>{state.stateHash}</code></p>
            </div>
            <span className={`badge ${state.transitionState === 'green' ? 'green' : state.transitionState === 'yellow_clearance' ? 'yellow' : 'red'}`}>
              {state.transitionState.replace('_', ' ').toUpperCase()}
            </span>
          </div>

          {/* Interactive Junction Graphical Canvas */}
          <div className="junction-viewport">
            
            {/* North Approach (Road 1) */}
            <div 
              style={{ 
                position: 'absolute', 
                top: '16px', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: '6px' 
              }}
            >
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '6px 14px', 
                  borderRadius: '10px', 
                  background: 'var(--surface)', 
                  border: `2px solid ${getAspectColor(state.approaches.North.aspect)}` 
                }}
              >
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: getAspectColor(state.approaches.North.aspect), boxShadow: `0 0 10px ${getAspectColor(state.approaches.North.aspect)}` }} />
                <span style={{ fontSize: '13px', fontWeight: 700 }}>North (Road 1)</span>
                <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>Queue: {state.approaches.North.queueLength}</span>
              </div>
              <ArrowDown size={20} style={{ color: getAspectColor(state.approaches.North.aspect) }} />
            </div>

            {/* South Approach (Road 3) */}
            <div 
              style={{ 
                position: 'absolute', 
                bottom: '16px', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: '6px' 
              }}
            >
              <ArrowUp size={20} style={{ color: getAspectColor(state.approaches.South.aspect) }} />
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '6px 14px', 
                  borderRadius: '10px', 
                  background: 'var(--surface)', 
                  border: `2px solid ${getAspectColor(state.approaches.South.aspect)}` 
                }}
              >
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: getAspectColor(state.approaches.South.aspect), boxShadow: `0 0 10px ${getAspectColor(state.approaches.South.aspect)}` }} />
                <span style={{ fontSize: '13px', fontWeight: 700 }}>South (Road 3)</span>
                <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>Queue: {state.approaches.South.queueLength}</span>
              </div>
            </div>

            {/* West Approach (Road 4) */}
            <div 
              style={{ 
                position: 'absolute', 
                left: '16px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px' 
              }}
            >
              <div 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '4px', 
                  padding: '8px 12px', 
                  borderRadius: '10px', 
                  background: 'var(--surface)', 
                  border: `2px solid ${getAspectColor(state.approaches.West.aspect)}` 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: getAspectColor(state.approaches.West.aspect), boxShadow: `0 0 10px ${getAspectColor(state.approaches.West.aspect)}` }} />
                  <span style={{ fontSize: '13px', fontWeight: 700 }}>West (Road 4)</span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>Queue: {state.approaches.West.queueLength}</span>
              </div>
              <ArrowRight size={20} style={{ color: getAspectColor(state.approaches.West.aspect) }} />
            </div>

            {/* East Approach (Road 2) */}
            <div 
              style={{ 
                position: 'absolute', 
                right: '16px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px' 
              }}
            >
              <ArrowLeft size={20} style={{ color: getAspectColor(state.approaches.East.aspect) }} />
              <div 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '4px', 
                  padding: '8px 12px', 
                  borderRadius: '10px', 
                  background: 'var(--surface)', 
                  border: `2px solid ${getAspectColor(state.approaches.East.aspect)}` 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: getAspectColor(state.approaches.East.aspect), boxShadow: `0 0 10px ${getAspectColor(state.approaches.East.aspect)}` }} />
                  <span style={{ fontSize: '13px', fontWeight: 700 }}>East (Road 2)</span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>Queue: {state.approaches.East.queueLength}</span>
              </div>
            </div>

            {/* Center Junction Hub Box */}
            <div 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                width: '140px', 
                height: '140px', 
                borderRadius: '16px', 
                background: 'var(--surface)', 
                border: '1px solid var(--border-strong)', 
                boxShadow: 'var(--shadow)',
                zIndex: 2,
                textAlign: 'center',
                padding: '10px'
              }}
            >
              <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Active Phase
              </span>
              <strong style={{ fontSize: '14px', margin: '4px 0', color: 'var(--accent-text)' }}>
                {state.currentPhaseName}
              </strong>
              <div style={{ fontSize: '26px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>
                {state.remainingPhaseSeconds}s
              </div>
              <span style={{ fontSize: '10px', color: 'var(--muted)' }}>
                {state.transitionState === 'yellow_clearance' ? 'Yellow 3s Buffer' : state.transitionState === 'all_red_clearance' ? 'All-Red 2s Buffer' : 'Green Extension'}
              </span>
            </div>
          </div>

          {/* 4 Approach Stat Strips */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '16px' }}>
            {(['North', 'East', 'South', 'West'] as ApproachId[]).map(appId => {
              const data = state.approaches[appId];
              return (
                <div key={appId} style={{ padding: '12px', borderRadius: '10px', background: 'var(--surface-raised)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700 }}>{appId}</span>
                    <span className={`badge ${data.aspect === 'green' ? 'green' : data.aspect === 'yellow' ? 'yellow' : 'red'}`} style={{ padding: '1px 6px', fontSize: '9px' }}>
                      {data.aspect.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Queue: <strong style={{ color: 'var(--text)' }}>{data.queueLength} veh</strong></div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Mean Wait: <strong style={{ color: 'var(--text)' }}>{data.avgWaitingTime.toFixed(1)}s</strong></div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Conf: <strong style={{ color: 'var(--accent-text)' }}>{data.cameraConfidence.toFixed(0)}%</strong></div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Controller Operations & Decision Engine */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Operating Mode Selection */}
          <div className="card">
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 14px' }}>
              Controller Operating Mode
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button 
                className={`secondary-button ${state.mode === 'ppo_autonomous' ? 'active' : ''}`}
                style={{ 
                  justifyContent: 'flex-start',
                  borderColor: state.mode === 'ppo_autonomous' ? 'var(--accent)' : 'var(--border)',
                  background: state.mode === 'ppo_autonomous' ? 'var(--accent-soft)' : 'var(--surface-raised)'
                }}
                onClick={() => handleModeChange('ppo_autonomous')}
              >
                <ShieldCheck size={16} style={{ color: 'var(--accent)' }} />
                <span>PPO Autonomous</span>
              </button>

              <button 
                className={`secondary-button ${state.mode === 'adaptive_fallback' ? 'active' : ''}`}
                style={{ 
                  justifyContent: 'flex-start',
                  borderColor: state.mode === 'adaptive_fallback' ? 'var(--amber)' : 'var(--border)',
                  background: state.mode === 'adaptive_fallback' ? 'var(--amber-soft)' : 'var(--surface-raised)'
                }}
                onClick={() => handleModeChange('adaptive_fallback')}
              >
                <Clock size={16} style={{ color: 'var(--amber)' }} />
                <span>Webster Fallback</span>
              </button>

              <button 
                className={`secondary-button ${state.mode === 'manual_override' ? 'active' : ''}`}
                style={{ 
                  justifyContent: 'flex-start',
                  borderColor: state.mode === 'manual_override' ? 'var(--accent)' : 'var(--border)',
                  background: state.mode === 'manual_override' ? 'var(--surface-raised)' : 'transparent'
                }}
                onClick={() => handleModeChange('manual_override')}
              >
                <Sliders size={16} />
                <span>Manual Override</span>
              </button>

              <button 
                className={`secondary-button ${state.mode === 'emergency_hold' ? 'active' : ''}`}
                style={{ 
                  justifyContent: 'flex-start',
                  borderColor: state.mode === 'emergency_hold' ? 'var(--traffic-red)' : 'var(--border)',
                  background: state.mode === 'emergency_hold' ? 'var(--traffic-red-soft)' : 'transparent',
                  color: state.mode === 'emergency_hold' ? 'var(--traffic-red)' : 'var(--text)'
                }}
                onClick={() => handleModeChange('emergency_hold')}
              >
                <AlertOctagon size={16} />
                <span>Emergency Hold</span>
              </button>
            </div>
          </div>

          {/* Manual Phase Request Panel */}
          <div className="card">
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 14px' }}>
              Phase Dispatch Commands
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 14px' }}>
              Request a safety-gated signal phase transition. Dispatches 12-bit R/Y/G mask to ESP32:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button 
                className="secondary-button" 
                onClick={() => handleManualPhase(0, 'NS-through')}
                disabled={state.currentPhaseName === 'NS-through'}
              >
                Phase 0: NS Through
              </button>
              <button 
                className="secondary-button" 
                onClick={() => handleManualPhase(1, 'NS-protected')}
                disabled={state.currentPhaseName === 'NS-protected'}
              >
                Phase 1: NS Protected
              </button>
              <button 
                className="secondary-button" 
                onClick={() => handleManualPhase(2, 'EW-through')}
                disabled={state.currentPhaseName === 'EW-through'}
              >
                Phase 2: EW Through
              </button>
              <button 
                className="secondary-button" 
                onClick={() => handleManualPhase(3, 'EW-protected')}
                disabled={state.currentPhaseName === 'EW-protected'}
              >
                Phase 3: EW Protected
              </button>
            </div>
          </div>

          {/* Safety Governor & PPO Decision Evidence */}
          <div className="card" style={{ background: 'var(--surface-raised)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 10px' }}>
              Safety Governor Evidence
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>PPO Policy Proposed Action:</span>
                <strong style={{ fontFamily: 'var(--font-mono)' }}>Phase {state.proposedPhase} ({state.proposedDuration}s)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>Executed Signal Action:</span>
                <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-text)' }}>Phase {state.executedPhase} ({state.executedDuration}s)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>Governor Rule Override:</span>
                <span className={`badge ${state.governorIntervention ? 'yellow' : 'green'}`} style={{ padding: '1px 6px', fontSize: '10px' }}>
                  {state.governorRuleFired.toUpperCase()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>ESP32 Echo Verified:</span>
                <strong style={{ color: 'var(--traffic-green)' }}>Mask 0x{state.esp32Mask.toString(16).toUpperCase()} (ACK OK)</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4x4 Adjacency Matrix Interactive Topology */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">Intersection Adjacency Topology (Clickable 4×4 Matrix)</h2>
            <p className="card-subtitle">
              Simulates dynamic road closure handling. Toggling a link updates <code>configs/intersection.yaml</code> and signals the Raspberry Pi via <code>SIGHUP</code> to safely reload at the next cycle boundary.
            </p>
          </div>
          <span className="badge teal">SIGHUP DEFERRED RELOAD</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-grid', gridTemplateColumns: 'repeat(4, 52px)', gap: '8px' }}>
            {state.adjacency.map((row: number[], rIdx: number) => 
              row.map((val: number, cIdx: number) => {
                const isDiagonal = rIdx === cIdx;
                const isActive = val === 1;
                return (
                  <button
                    key={`${rIdx}-${cIdx}`}
                    disabled={isDiagonal}
                    onClick={() => toggleAdjacency(rIdx, cIdx)}
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: isDiagonal 
                        ? 'var(--surface)' 
                        : isActive 
                          ? 'var(--accent)' 
                          : 'var(--traffic-red-soft)',
                      color: isDiagonal 
                        ? 'var(--muted)' 
                        : isActive 
                          ? '#0f1b19' 
                          : 'var(--traffic-red)',
                      fontSize: '15px',
                      fontWeight: 700,
                      cursor: isDiagonal ? 'not-allowed' : 'pointer',
                      transition: 'all 140ms ease'
                    }}
                    title={isDiagonal ? `Road ${rIdx + 1} self-link` : `Toggle Road ${rIdx + 1} -> Road ${cIdx + 1}`}
                  >
                    {isDiagonal ? '-' : val}
                  </button>
                );
              })
            )}
          </div>

          <div style={{ flex: 1, minWidth: '280px', fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6 }}>
            <p style={{ margin: '0 0 10px' }}>
              <strong>Matrix Legend:</strong> Rows represent inbound approaches (0=North, 1=East, 2=South, 3=West), columns represent outbound exits.
            </p>
            <ul style={{ margin: 0, paddingLeft: '18px' }}>
              <li><strong style={{ color: 'var(--accent-text)' }}>Teal (1):</strong> Open approach-to-exit flow.</li>
              <li><strong style={{ color: 'var(--traffic-red)' }}>Red (0):</strong> Closed roadway or prohibited turning link. Closed approach heads turn red during shared phases.</li>
              <li>Diagonal cells are prohibited self-loops.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Command Audit Log */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Operator Command Audit Trail</h2>
            <p className="card-subtitle">Immutable log of dispatched manual actuations and acknowledgements</p>
          </div>
          <span className="badge gray">AUDIT LOG</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>
                <th style={{ padding: '10px 14px' }}>Timestamp</th>
                <th style={{ padding: '10px 14px' }}>Command</th>
                <th style={{ padding: '10px 14px' }}>Operator</th>
                <th style={{ padding: '10px 14px' }}>Details</th>
                <th style={{ padding: '10px 14px' }}>Status</th>
                <th style={{ padding: '10px 14px' }}>Latency</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.slice(0, 5).map((log: CommandAuditRecord) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)' }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>{log.type}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--muted-strong)' }}>{log.requestedBy}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>{log.details}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span className={`badge ${log.status === 'success' ? 'green' : 'red'}`} style={{ padding: '1px 6px', fontSize: '10px' }}>
                      {log.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)' }}>
                    {log.executionLatencyMs ? `${log.executionLatencyMs}ms` : '32ms'}
                  </td>
                </tr>
              ))}
              {auditLogs.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)' }}>
                    No manual operator commands dispatched during this session.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={modalOpen}
        title={modalConfig.title}
        description={modalConfig.description}
        isDanger={modalConfig.isDanger}
        onClose={() => setModalOpen(false)}
        onConfirm={modalConfig.action}
      />
    </div>
  );
};

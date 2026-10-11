import { DeviceAdapter } from './DeviceAdapter';
import { 
  IntersectionLiveState, 
  RaspberryPiDevice, 
  ControlCommandRequest, 
  CommandAuditRecord,
  AlertEvent,
  SignalPhaseName,
  SignalAspect,
  ControllerMode,
  GovernorRule
} from '../types/traffic';
import { INITIAL_DISCOVERED_DEVICES, INITIAL_ALERTS } from '../data/mockTelemetry';

const PHASE_NAMES: SignalPhaseName[] = [
  'NS-through',
  'NS-protected',
  'EW-through',
  'EW-protected'
];

export class SimulatedDeviceAdapter implements DeviceAdapter {
  private connectedDevice: RaspberryPiDevice | null = null;
  private stateSubscribers: Set<(state: IntersectionLiveState) => void> = new Set();
  private alertSubscribers: Set<(alert: AlertEvent) => void> = new Set();
  private timer: number | null = null;

  // Active state representation
  private state: IntersectionLiveState;
  private currentGreenIndex: number = 0;
  private remainingSeconds: number = 15;
  private currentMode: ControllerMode = 'ppo_autonomous';
  private transitionState: 'green' | 'yellow_clearance' | 'all_red_clearance' = 'green';
  private transitionCountdown: number = 0;

  constructor() {
    this.connectedDevice = { ...INITIAL_DISCOVERED_DEVICES[0] };
    this.state = this.buildInitialState();
    this.startSimulationLoop();
  }

  private buildInitialState(): IntersectionLiveState {
    return {
      intersectionId: 'INT-MGROAD-01',
      intersectionName: 'MG Road & Brigade Rd Junction',
      timestamp: new Date().toISOString(),
      elapsedSeconds: 1240,
      mode: 'ppo_autonomous',
      currentPhaseIndex: 0,
      currentPhaseName: 'NS-through',
      phaseDurationSeconds: 30,
      remainingPhaseSeconds: 15,
      transitionState: 'green',
      proposedPhase: 0,
      proposedDuration: 30,
      executedPhase: 0,
      executedDuration: 30,
      governorRuleFired: 'none',
      governorIntervention: false,
      stateHash: '7a9c8f2b3e4d1a5c',
      approaches: {
        North: {
          id: 'North',
          roadId: 'road_1',
          vehicleCount: 16,
          queueLength: 4,
          avgWaitingTime: 11.4,
          avgSpeedMps: 7.8,
          laneOccupancyPct: 24.5,
          arrivalRatePerMin: 18.2,
          emergencyCount: 0,
          cameraConfidence: 94.2,
          cameraStatus: 'healthy',
          aspect: 'green'
        },
        East: {
          id: 'East',
          roadId: 'road_2',
          vehicleCount: 22,
          queueLength: 7,
          avgWaitingTime: 28.5,
          avgSpeedMps: 4.2,
          laneOccupancyPct: 36.8,
          arrivalRatePerMin: 14.5,
          emergencyCount: 0,
          cameraConfidence: 89.5,
          cameraStatus: 'healthy',
          aspect: 'red'
        },
        South: {
          id: 'South',
          roadId: 'road_3',
          vehicleCount: 14,
          queueLength: 3,
          avgWaitingTime: 10.8,
          avgSpeedMps: 8.1,
          laneOccupancyPct: 22.0,
          arrivalRatePerMin: 16.8,
          emergencyCount: 0,
          cameraConfidence: 92.0,
          cameraStatus: 'healthy',
          aspect: 'green'
        },
        West: {
          id: 'West',
          roadId: 'road_4',
          vehicleCount: 19,
          queueLength: 6,
          avgWaitingTime: 25.1,
          avgSpeedMps: 4.8,
          laneOccupancyPct: 31.4,
          arrivalRatePerMin: 12.0,
          emergencyCount: 0,
          cameraConfidence: 87.4,
          cameraStatus: 'healthy',
          aspect: 'red'
        }
      },
      totalThroughput: 532,
      systemAvgWait: 18.9,
      systemAvgQueue: 5.0,
      emergencyActive: false,
      esp32Ack: true,
      esp32Mask: 0x12, // NS Green (S1: GREEN=0x02, S2: RED=0x08 -> S1_GREEN | S2_RED)
      latencyMs: 34.2,
      adjacency: [
        [0, 1, 1, 1],
        [1, 0, 1, 1],
        [1, 1, 0, 1],
        [1, 1, 1, 0]
      ]
    };
  }

  private startSimulationLoop() {
    if (this.timer) clearInterval(this.timer);

    this.timer = window.setInterval(() => {
      this.tick();
    }, 1000);
  }

  private tick() {
    if (!this.connectedDevice) return;

    // Countdown logic
    if (this.transitionState === 'yellow_clearance') {
      this.transitionCountdown -= 1;
      if (this.transitionCountdown <= 0) {
        this.transitionState = 'all_red_clearance';
        this.transitionCountdown = 2; // All-red clearance (2s)
      }
    } else if (this.transitionState === 'all_red_clearance') {
      this.transitionCountdown -= 1;
      if (this.transitionCountdown <= 0) {
        // Transition to next green
        this.transitionState = 'green';
        this.currentGreenIndex = (this.currentGreenIndex + 1) % 4;
        this.remainingSeconds = [15, 30, 45, 60][Math.floor(Math.random() * 2)]; // 15s or 30s
      }
    } else {
      // Normal Green Phase
      this.remainingSeconds -= 1;
      if (this.remainingSeconds <= 0) {
        // Start yellow clearance (3s)
        this.transitionState = 'yellow_clearance';
        this.transitionCountdown = 3;
      }
    }

    // Determine signal aspects based on phase & transition state
    const phaseName = PHASE_NAMES[this.currentGreenIndex];
    let northAspect: SignalAspect = 'red';
    let southAspect: SignalAspect = 'red';
    let eastAspect: SignalAspect = 'red';
    let westAspect: SignalAspect = 'red';

    if (this.currentMode === 'emergency_hold') {
      northAspect = 'green';
      southAspect = 'red';
      eastAspect = 'red';
      westAspect = 'red';
    } else if (this.transitionState === 'all_red_clearance') {
      northAspect = 'red';
      southAspect = 'red';
      eastAspect = 'red';
      westAspect = 'red';
    } else if (this.transitionState === 'yellow_clearance') {
      if (phaseName.startsWith('NS')) {
        northAspect = 'yellow';
        southAspect = 'yellow';
        eastAspect = 'red';
        westAspect = 'red';
      } else {
        northAspect = 'red';
        southAspect = 'red';
        eastAspect = 'yellow';
        westAspect = 'yellow';
      }
    } else {
      // Active Green
      if (phaseName === 'NS-through') {
        northAspect = 'green';
        southAspect = 'green';
        eastAspect = 'red';
        westAspect = 'red';
      } else if (phaseName === 'NS-protected') {
        northAspect = 'green';
        southAspect = 'red';
        eastAspect = 'red';
        westAspect = 'red';
      } else if (phaseName === 'EW-through') {
        northAspect = 'red';
        southAspect = 'red';
        eastAspect = 'green';
        westAspect = 'green';
      } else if (phaseName === 'EW-protected') {
        northAspect = 'red';
        southAspect = 'red';
        eastAspect = 'green';
        westAspect = 'red';
      }
    }

    // Compute dynamic queue and wait variations
    const isNS = phaseName.startsWith('NS') && this.transitionState === 'green';
    const isEW = phaseName.startsWith('EW') && this.transitionState === 'green';

    const nQueue = Math.max(0, isNS ? this.state.approaches.North.queueLength - 1 : this.state.approaches.North.queueLength + (Math.random() > 0.6 ? 1 : 0));
    const sQueue = Math.max(0, isNS ? this.state.approaches.South.queueLength - 1 : this.state.approaches.South.queueLength + (Math.random() > 0.6 ? 1 : 0));
    const eQueue = Math.max(0, isEW ? this.state.approaches.East.queueLength - 1 : this.state.approaches.East.queueLength + (Math.random() > 0.6 ? 1 : 0));
    const wQueue = Math.max(0, isEW ? this.state.approaches.West.queueLength - 1 : this.state.approaches.West.queueLength + (Math.random() > 0.6 ? 1 : 0));

    // Simulate occasional governor intervention (e.g. wait threshold)
    let govRule: GovernorRule = 'none';
    let govIntervention = false;
    if (this.state.approaches.East.avgWaitingTime > 45 && !isEW) {
      govRule = 'rule_3_wait_threshold';
      govIntervention = true;
    }

    this.state = {
      ...this.state,
      timestamp: new Date().toISOString(),
      elapsedSeconds: this.state.elapsedSeconds + 1,
      mode: this.currentMode,
      currentPhaseIndex: this.currentGreenIndex,
      currentPhaseName: phaseName,
      remainingPhaseSeconds: this.transitionState === 'green' ? this.remainingSeconds : this.transitionCountdown,
      transitionState: this.transitionState,
      governorRuleFired: govRule,
      governorIntervention: govIntervention,
      approaches: {
        North: {
          ...this.state.approaches.North,
          aspect: northAspect,
          queueLength: nQueue,
          avgWaitingTime: isNS ? Math.max(5, this.state.approaches.North.avgWaitingTime - 1.5) : this.state.approaches.North.avgWaitingTime + 0.8,
          avgSpeedMps: isNS ? 8.4 : 2.1
        },
        East: {
          ...this.state.approaches.East,
          aspect: eastAspect,
          queueLength: eQueue,
          avgWaitingTime: isEW ? Math.max(5, this.state.approaches.East.avgWaitingTime - 1.5) : this.state.approaches.East.avgWaitingTime + 0.8,
          avgSpeedMps: isEW ? 7.6 : 1.8
        },
        South: {
          ...this.state.approaches.South,
          aspect: southAspect,
          queueLength: sQueue,
          avgWaitingTime: isNS ? Math.max(5, this.state.approaches.South.avgWaitingTime - 1.5) : this.state.approaches.South.avgWaitingTime + 0.8,
          avgSpeedMps: isNS ? 8.2 : 2.4
        },
        West: {
          ...this.state.approaches.West,
          aspect: westAspect,
          queueLength: wQueue,
          avgWaitingTime: isEW ? Math.max(5, this.state.approaches.West.avgWaitingTime - 1.5) : this.state.approaches.West.avgWaitingTime + 0.8,
          avgSpeedMps: isEW ? 7.1 : 1.5
        }
      },
      totalThroughput: this.state.totalThroughput + (this.transitionState === 'green' && Math.random() > 0.4 ? 1 : 0),
      systemAvgWait: Number(((this.state.approaches.North.avgWaitingTime + this.state.approaches.East.avgWaitingTime + this.state.approaches.South.avgWaitingTime + this.state.approaches.West.avgWaitingTime) / 4).toFixed(1)),
      systemAvgQueue: Number(((nQueue + sQueue + eQueue + wQueue) / 4).toFixed(1)),
      esp32Ack: true,
      latencyMs: 32 + Math.floor(Math.random() * 8)
    };

    // Notify listeners
    this.notifySubscribers();
  }

  private notifySubscribers() {
    this.stateSubscribers.forEach(cb => cb(this.state));
  }

  // DeviceAdapter Implementation
  async discoverDevices(): Promise<RaspberryPiDevice[]> {
    await new Promise(r => setTimeout(r, 600));
    return [...INITIAL_DISCOVERED_DEVICES];
  }

  async connect(host: string, port: number, transport: any = 'wifi_tcp'): Promise<RaspberryPiDevice> {
    await new Promise(r => setTimeout(r, 700));

    // Match or create device
    const device: RaspberryPiDevice = {
      id: `rpi5-${host.replace(/\./g, '-')}`,
      name: `Pi 5 Edge Controller (${host})`,
      intersectionId: 'INT-MGROAD-01',
      intersectionName: 'MG Road & Brigade Rd Junction',
      ipAddress: host,
      port: port,
      transport: transport || 'wifi_tcp',
      status: 'connected',
      isSimulated: true, // Clearly stated to the operator
      lastHeartbeat: new Date().toISOString(),
      uptimeSeconds: 94200,
      cpuTempC: 53.4,
      cpuLoadPct: 36.8,
      memoryLoadPct: 42.1,
      networkLatencyMs: 5.2,
      wifiRssiDbm: -56,
      modelArtifact: 'models/ppo_normal_mlp_best.onnx',
      softwareVersion: 'v2.4-edge-rpi5'
    };

    this.connectedDevice = device;
    this.state = this.buildInitialState();
    return device;
  }

  async disconnect(): Promise<void> {
    await new Promise(r => setTimeout(r, 200));
    this.connectedDevice = null;
  }

  isConnected(): boolean {
    return this.connectedDevice !== null;
  }

  getConnectedDevice(): RaspberryPiDevice | null {
    return this.connectedDevice;
  }

  getState(): IntersectionLiveState {
    return this.state;
  }

  subscribeState(callback: (state: IntersectionLiveState) => void): () => void {
    this.stateSubscribers.add(callback);
    callback(this.state);
    return () => {
      this.stateSubscribers.delete(callback);
    };
  }

  subscribeAlerts(callback: (alert: AlertEvent) => void): () => void {
    this.alertSubscribers.add(callback);
    INITIAL_ALERTS.forEach(a => callback(a));
    return () => {
      this.alertSubscribers.delete(callback);
    };
  }

  async sendCommand(command: ControlCommandRequest): Promise<CommandAuditRecord> {
    const start = performance.now();
    await new Promise(r => setTimeout(r, 150));

    if (command.type === 'set_mode') {
      this.currentMode = command.payload;
      this.state.mode = this.currentMode;
    } else if (command.type === 'request_phase') {
      this.currentGreenIndex = command.payload;
      this.transitionState = 'yellow_clearance';
      this.transitionCountdown = 3;
    } else if (command.type === 'emergency_hold') {
      this.currentMode = 'emergency_hold';
      this.state.emergencyActive = true;
    } else if (command.type === 'resume_normal') {
      this.currentMode = 'ppo_autonomous';
      this.state.emergencyActive = false;
      this.transitionState = 'all_red_clearance';
      this.transitionCountdown = 2;
    }

    const elapsed = Math.round(performance.now() - start);

    return {
      id: `cmd-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: command.type,
      requestedBy: command.requestedBy,
      details: JSON.stringify(command.payload || {}),
      status: 'success',
      executionLatencyMs: elapsed
    };
  }

  async toggleAdjacencyCell(row: number, col: number): Promise<number[][]> {
    if (row === col) return this.state.adjacency; // diagonal remains 0
    const matrix = this.state.adjacency.map(r => [...r]);
    matrix[row][col] = 1 - matrix[row][col];
    this.state.adjacency = matrix;
    this.notifySubscribers();
    return matrix;
  }

  async triggerEmergencyHold(): Promise<boolean> {
    this.currentMode = 'emergency_hold';
    this.state.emergencyActive = true;
    this.notifySubscribers();
    return true;
  }

  async resumeAutonomous(): Promise<boolean> {
    this.currentMode = 'ppo_autonomous';
    this.state.emergencyActive = false;
    this.notifySubscribers();
    return true;
  }
}

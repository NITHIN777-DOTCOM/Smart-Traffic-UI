export type ApproachId = 'North' | 'East' | 'South' | 'West';

export type SignalPhaseName = 
  | 'NS-through'
  | 'NS-protected'
  | 'EW-through'
  | 'EW-protected';

export type SignalAspect = 'red' | 'yellow' | 'green';

export type TransitionState = 'green' | 'yellow_clearance' | 'all_red_clearance';

export type ControllerMode = 
  | 'ppo_autonomous'
  | 'adaptive_fallback'
  | 'manual_override'
  | 'emergency_hold';

export type GovernorRule = 
  | 'none'
  | 'rule_1_all_empty'
  | 'rule_2_near_equal'
  | 'rule_3_wait_threshold'
  | 'rule_4_no_consecutive_green';

export interface ApproachData {
  id: ApproachId;
  roadId: string;
  vehicleCount: number;
  queueLength: number; // vehicles
  avgWaitingTime: number; // seconds
  avgSpeedMps: number; // m/s
  laneOccupancyPct: number; // 0 - 100%
  arrivalRatePerMin: number;
  emergencyCount: number;
  cameraConfidence: number; // 0 - 100%
  cameraStatus: 'healthy' | 'degraded' | 'offline';
  aspect: SignalAspect;
}

export interface IntersectionLiveState {
  intersectionId: string;
  intersectionName: string;
  timestamp: string;
  elapsedSeconds: number;
  mode: ControllerMode;
  currentPhaseIndex: number;
  currentPhaseName: SignalPhaseName;
  phaseDurationSeconds: number;
  remainingPhaseSeconds: number;
  transitionState: TransitionState;
  
  // PPO & Governor decisions
  proposedPhase: number;
  proposedDuration: number;
  executedPhase: number;
  executedDuration: number;
  governorRuleFired: GovernorRule;
  governorIntervention: boolean;
  stateHash: string;

  // Approaches
  approaches: Record<ApproachId, ApproachData>;

  // Global telemetry
  totalThroughput: number; // vehicles cleared
  systemAvgWait: number; // seconds
  systemAvgQueue: number; // vehicles
  emergencyActive: boolean;
  esp32Ack: boolean;
  esp32Mask: number;
  latencyMs: number;
  
  // 4x4 Adjacency
  adjacency: number[][];
}

export type ConnectionTransport = 'wifi_tcp' | 'usb_serial' | 'gateway_rest' | 'simulated';

export type ConnectionStatus = 
  | 'disconnected'
  | 'discovering'
  | 'connecting'
  | 'connected'
  | 'simulated'
  | 'timeout'
  | 'error';

export interface RaspberryPiDevice {
  id: string;
  name: string;
  intersectionId: string;
  intersectionName: string;
  ipAddress: string;
  port: number;
  transport: ConnectionTransport;
  status: ConnectionStatus;
  isSimulated: boolean;
  lastHeartbeat: string;
  uptimeSeconds: number;
  cpuTempC: number;
  cpuLoadPct: number;
  memoryLoadPct: number;
  networkLatencyMs: number;
  wifiRssiDbm: number;
  modelArtifact: string;
  softwareVersion: string;
}

export interface AlertEvent {
  id: string;
  timestamp: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  source: string;
  intersectionId: string;
  acknowledged: boolean;
}

export interface ControlCommandRequest {
  type: 'set_mode' | 'request_phase' | 'emergency_hold' | 'resume_normal' | 'update_adjacency';
  payload?: any;
  requestedBy: string;
}

export interface CommandAuditRecord {
  id: string;
  timestamp: string;
  type: string;
  requestedBy: string;
  details: string;
  status: 'pending' | 'success' | 'failed' | 'rejected_safety';
  executionLatencyMs?: number;
}

export type MetricCategory = 
  | 'traffic_flow'
  | 'congestion_queues'
  | 'signal_efficiency'
  | 'ppo_rl'
  | 'perception_vision'
  | 'device_health'
  | 'safety_incidents'
  | 'environmental';

export interface MetricDefinition {
  id: string;
  name: string;
  category: MetricCategory;
  unit: string;
  description: string;
  formula: string;
  sourceInRepo: string;
  status: 'implemented' | 'planned' | 'derived';
  currentValue?: number | string;
  changeDelta?: number;
  sparkline?: number[];
}

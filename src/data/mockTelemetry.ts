import { RaspberryPiDevice, AlertEvent, MetricDefinition, SignalPhaseName } from '../types/traffic';

export const INITIAL_DISCOVERED_DEVICES: RaspberryPiDevice[] = [
  {
    id: 'rpi5-junction-01',
    name: 'Pi 5 - MG Road 4-Way Junction',
    intersectionId: 'INT-MGROAD-01',
    intersectionName: 'MG Road & Brigade Rd Junction',
    ipAddress: '192.168.1.42',
    port: 8888,
    transport: 'wifi_tcp',
    status: 'connected',
    isSimulated: true, // Clearly identified as demonstration / simulated until hardware is live
    lastHeartbeat: new Date().toISOString(),
    uptimeSeconds: 86420,
    cpuTempC: 54.2,
    cpuLoadPct: 38.5,
    memoryLoadPct: 44.1,
    networkLatencyMs: 4.8,
    wifiRssiDbm: -58,
    modelArtifact: 'models/ppo_normal_mlp_best.onnx (131-dim)',
    softwareVersion: 'v2.4-edge-rpi5'
  },
  {
    id: 'rpi5-junction-02',
    name: 'Pi 5 - Ring Road North Cross',
    intersectionId: 'INT-RING-04',
    intersectionName: 'Outer Ring Rd & 100ft Road',
    ipAddress: '192.168.1.108',
    port: 8888,
    transport: 'wifi_tcp',
    status: 'disconnected',
    isSimulated: true,
    lastHeartbeat: new Date(Date.now() - 3600000).toISOString(),
    uptimeSeconds: 12450,
    cpuTempC: 49.8,
    cpuLoadPct: 15.2,
    memoryLoadPct: 32.0,
    networkLatencyMs: 12.4,
    wifiRssiDbm: -72,
    modelArtifact: 'models/ppo_normal_mlp_best.onnx',
    softwareVersion: 'v2.4-edge-rpi5'
  },
  {
    id: 'rpi5-junction-03',
    name: 'Pi 5 - Tech Corridor East',
    intersectionId: 'INT-TECH-09',
    intersectionName: 'Whitefield Main St Corridor',
    ipAddress: '192.168.1.215',
    port: 8888,
    transport: 'wifi_tcp',
    status: 'disconnected',
    isSimulated: true,
    lastHeartbeat: new Date(Date.now() - 7200000).toISOString(),
    uptimeSeconds: 234100,
    cpuTempC: 52.1,
    cpuLoadPct: 41.0,
    memoryLoadPct: 46.5,
    networkLatencyMs: 8.1,
    wifiRssiDbm: -64,
    modelArtifact: 'models/ppo_normal_mlp_best.pth',
    softwareVersion: 'v2.4-edge-rpi5'
  }
];

export const INITIAL_ALERTS: AlertEvent[] = [
  {
    id: 'alt-001',
    timestamp: new Date(Date.now() - 120000).toISOString(),
    severity: 'warning',
    title: 'Governor Rule 3 Activated (Starvation Prevention)',
    message: 'East approach wait time reached 49.2s (threshold 48.0s). Governor overrode PPO policy to grant immediate protected green.',
    source: 'EdgeCaseGovernor',
    intersectionId: 'INT-MGROAD-01',
    acknowledged: false
  },
  {
    id: 'alt-002',
    timestamp: new Date(Date.now() - 480000).toISOString(),
    severity: 'info',
    title: 'Emergency Vehicle Priority Granted',
    message: 'Ambulance detected on North approach via YOLO classification. Emergency clearance green held for 18 seconds.',
    source: 'CameraBridge / ANPR',
    intersectionId: 'INT-MGROAD-01',
    acknowledged: true
  },
  {
    id: 'alt-003',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    severity: 'warning',
    title: 'Perception Feed Stride Warning',
    message: 'Camera West frame processing latency (92ms) approached control period limit (100ms). Perception stride scaled to 5.',
    source: 'IntersectionRunner',
    intersectionId: 'INT-MGROAD-01',
    acknowledged: true
  },
  {
    id: 'alt-004',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    severity: 'info',
    title: 'ESP32 Wi-Fi Transport Synchronized',
    message: 'Persistent socket connected on 192.168.1.42:8888. Verified bitmask echo acknowledgements active.',
    source: 'ESP32WiFiClient',
    intersectionId: 'INT-MGROAD-01',
    acknowledged: true
  }
];

// Historical PPO Training Metrics (from logs/training_normal_mlp_gov_final.csv)
export const PPO_TRAINING_CURVES = [
  { episode: 1, reward: -58.2, throughput: 240, avgWait: 0.45, avgQueue: 0.52, policyLoss: 0.082, valueLoss: 0.124 },
  { episode: 100, reward: -48.1, throughput: 285, avgWait: 0.39, avgQueue: 0.48, policyLoss: 0.065, valueLoss: 0.098 },
  { episode: 250, reward: -39.4, throughput: 310, avgWait: 0.35, avgQueue: 0.44, policyLoss: 0.048, valueLoss: 0.075 },
  { episode: 500, reward: -24.8, throughput: 365, avgWait: 0.28, avgQueue: 0.38, policyLoss: 0.034, valueLoss: 0.052 },
  { episode: 750, reward: -12.3, throughput: 420, avgWait: 0.22, avgQueue: 0.32, policyLoss: 0.025, valueLoss: 0.038 },
  { episode: 1000, reward: 5.4, throughput: 460, avgWait: 0.16, avgQueue: 0.28, policyLoss: 0.019, valueLoss: 0.029 },
  { episode: 1500, reward: 18.7, throughput: 495, avgWait: 0.11, avgQueue: 0.24, policyLoss: 0.014, valueLoss: 0.022 },
  { episode: 2000, reward: 28.5, throughput: 520, avgWait: 0.08, avgQueue: 0.21, policyLoss: 0.011, valueLoss: 0.017 },
  { episode: 2500, reward: 34.2, throughput: 535, avgWait: 0.07, avgQueue: 0.19, policyLoss: 0.009, valueLoss: 0.014 },
  { episode: 3000, reward: 36.8, throughput: 542, avgWait: 0.06, avgQueue: 0.18, policyLoss: 0.008, valueLoss: 0.012 }
];

// 24-hour Historical Traffic Dynamics
export const HOURLY_TRAFFIC_FLOW = [
  { hour: '00:00', throughput: 85, avgWaitSec: 12.1, queueVehicles: 3.2, ppoReward: 38.2 },
  { hour: '02:00', throughput: 45, avgWaitSec: 9.4, queueVehicles: 1.8, ppoReward: 39.5 },
  { hour: '04:00', throughput: 60, avgWaitSec: 10.2, queueVehicles: 2.1, ppoReward: 39.1 },
  { hour: '06:00', throughput: 190, avgWaitSec: 18.4, queueVehicles: 5.6, ppoReward: 34.8 },
  { hour: '08:00', throughput: 495, avgWaitSec: 32.8, queueVehicles: 14.2, ppoReward: 26.4 }, // Morning Peak
  { hour: '10:00', throughput: 420, avgWaitSec: 25.1, queueVehicles: 9.8, ppoReward: 30.1 },
  { hour: '12:00', throughput: 380, avgWaitSec: 22.4, queueVehicles: 8.2, ppoReward: 31.8 },
  { hour: '14:00', throughput: 395, avgWaitSec: 23.8, queueVehicles: 8.9, ppoReward: 31.2 },
  { hour: '16:00', throughput: 460, avgWaitSec: 28.6, queueVehicles: 11.5, ppoReward: 28.5 },
  { hour: '18:00', throughput: 530, avgWaitSec: 36.2, queueVehicles: 16.8, ppoReward: 22.9 }, // Evening Peak
  { hour: '20:00', throughput: 410, avgWaitSec: 24.5, queueVehicles: 9.1, ppoReward: 30.5 },
  { hour: '22:00', throughput: 220, avgWaitSec: 15.6, queueVehicles: 4.8, ppoReward: 36.2 }
];

// Vehicle classification counts (from basic_traffic_metrics.csv)
export const VEHICLE_CLASSIFICATION_DATA = [
  { type: 'Passenger Cars', count: 1840, percentage: 68.2, color: '#6ba6a0' },
  { type: 'Motorcycles / Bikes', count: 480, percentage: 17.8, color: '#38d39f' },
  { type: 'Auto Rickshaws', count: 215, percentage: 8.0, color: '#d9ad62' },
  { type: 'Buses & Heavy Transport', count: 125, percentage: 4.6, color: '#3498db' },
  { type: 'Emergency Vehicles', count: 38, percentage: 1.4, color: '#e74c3c' }
];

// Comprehensive 30+ Metric Expansion Framework
export const METRIC_CATALOG: MetricDefinition[] = [
  // 1. Traffic Flow & Volume
  {
    id: 'tf_throughput',
    name: 'Vehicle Throughput',
    category: 'traffic_flow',
    unit: 'veh / hr',
    description: 'Total count of vehicles successfully traversing the intersection per unit time.',
    formula: 'sum(departed_vehicles) / time_delta',
    sourceInRepo: 'logs/runner_decisions.csv -> throughput',
    status: 'implemented',
    currentValue: 532,
    changeDelta: 8.4,
    sparkline: [480, 495, 510, 525, 518, 532]
  },
  {
    id: 'tf_arrival_rate',
    name: 'Vehicle Arrival Rate',
    category: 'traffic_flow',
    unit: 'veh / min',
    description: 'Incoming flow rate measured across camera entry boundaries.',
    formula: 'new_vehicle_tracks / 60s',
    sourceInRepo: 'src/state/traffic_state.py -> vehicle_arrival_rate',
    status: 'implemented',
    currentValue: 34.2,
    changeDelta: 3.1,
    sparkline: [28, 30, 31, 33, 35, 34]
  },
  {
    id: 'tf_spatial_density',
    name: 'Spatial Traffic Density',
    category: 'traffic_flow',
    unit: 'veh / 100m',
    description: 'Vehicle density within approach bounding polygons.',
    formula: 'active_vehicles / approach_length_km',
    sourceInRepo: 'basic_traffic_metrics.csv -> traffic_density',
    status: 'implemented',
    currentValue: 18.6,
    changeDelta: -1.2,
    sparkline: [22, 21, 20, 19, 19, 18.6]
  },
  {
    id: 'tf_turn_ratio',
    name: 'Turning Movement Ratio',
    category: 'traffic_flow',
    unit: '%',
    description: 'Proportion of left-turning vs through vehicles per approach.',
    formula: 'left_turn_tracks / total_approach_tracks',
    sourceInRepo: 'turning_results.csv',
    status: 'derived',
    currentValue: '28.4% L / 71.6% T',
    sparkline: [26, 27, 27, 28, 29, 28.4]
  },
  {
    id: 'tf_flow_capacity',
    name: 'Volume-to-Capacity (V/C) Ratio',
    category: 'traffic_flow',
    unit: 'ratio',
    description: 'Operational saturation ratio relative to geometric saturation capacity.',
    formula: 'actual_flow / (saturation_flow * green_ratio)',
    sourceInRepo: 'Planned in DIGITAL_TWIN_FUTURE_DATASET_PLAN.md',
    status: 'planned'
  },
  {
    id: 'tf_platoon_dispersion',
    name: 'Platoon Dispersion Index',
    category: 'traffic_flow',
    unit: 'index',
    description: 'Measures vehicle bunching and headway coherence in arriving cohorts.',
    formula: 'variance(inter_vehicle_headway) / mean(headway)',
    sourceInRepo: 'Planned for Phase 9 Digital Twin',
    status: 'planned'
  },

  // 2. Congestion & Queues
  {
    id: 'cq_avg_queue',
    name: 'Average Queue Length',
    category: 'congestion_queues',
    unit: 'vehicles',
    description: 'Average count of stationary or crawling vehicles queued at red signals.',
    formula: 'mean(stationary_tracks_per_lane)',
    sourceInRepo: 'logs/runner_decisions.csv -> avg_queue',
    status: 'implemented',
    currentValue: 4.8,
    changeDelta: -14.2,
    sparkline: [8.2, 7.5, 6.4, 5.8, 5.1, 4.8]
  },
  {
    id: 'cq_max_queue',
    name: 'Peak Approach Queue Length',
    category: 'congestion_queues',
    unit: 'vehicles',
    description: 'Maximum queue observed on the most congested approach.',
    formula: 'max(approach_queues[N, E, S, W])',
    sourceInRepo: 'src/ppo/reward.py -> max_wait_penalty',
    status: 'implemented',
    currentValue: 12,
    changeDelta: -2,
    sparkline: [16, 15, 14, 13, 13, 12]
  },
  {
    id: 'cq_queue_clearance_rate',
    name: 'Queue Discharge Efficiency',
    category: 'congestion_queues',
    unit: 'veh / green-sec',
    description: 'Rate of queued vehicles successfully cleared during green phase.',
    formula: 'cleared_queue_vehicles / green_phase_duration',
    sourceInRepo: 'src/sumo_env/intersection_env.py',
    status: 'derived',
    currentValue: 0.88,
    sparkline: [0.75, 0.79, 0.82, 0.85, 0.86, 0.88]
  },
  {
    id: 'cq_lane_occupancy',
    name: 'Lane Area Occupancy',
    category: 'congestion_queues',
    unit: '%',
    description: 'Percentage of lane detection zone occupied by vehicle bounding boxes.',
    formula: 'occupied_pixel_area / total_detection_zone_area',
    sourceInRepo: 'basic_traffic_metrics.csv -> occupancy_ratio',
    status: 'implemented',
    currentValue: 24.5,
    changeDelta: -3.8,
    sparkline: [32, 29, 27, 26, 25, 24.5]
  },
  {
    id: 'cq_shockwave_velocity',
    name: 'Congestion Shockwave Velocity',
    category: 'congestion_queues',
    unit: 'm / s',
    description: 'Speed at which braking waves propagate backward from the intersection stop bar.',
    formula: 'delta_distance / delta_stop_time',
    sourceInRepo: 'src/perception/kinematics.py',
    status: 'planned'
  },
  {
    id: 'cq_gridlock_probability',
    name: 'Gridlock Warning Index',
    category: 'congestion_queues',
    unit: 'score (0-100)',
    description: 'Composite probability of multi-approach simultaneous deadlock.',
    formula: 'gridlock_penalty in src/ppo/reward.py:49',
    sourceInRepo: 'src/ppo/reward.py -> gridlock_weight',
    status: 'derived',
    currentValue: 6.2,
    sparkline: [15, 12, 10, 8, 7, 6.2]
  },

  // 3. Signal Timing & Efficiency
  {
    id: 'se_avg_wait_time',
    name: 'Average Vehicle Waiting Time',
    category: 'signal_efficiency',
    unit: 'seconds',
    description: 'Mean elapsed waiting time experienced by stopped vehicles.',
    formula: 'sum(vehicle_waiting_durations) / active_waiting_vehicles',
    sourceInRepo: 'logs/runner_decisions.csv -> avg_wait',
    status: 'implemented',
    currentValue: 14.8,
    changeDelta: -22.4,
    sparkline: [24.5, 21.2, 18.9, 16.4, 15.2, 14.8]
  },
  {
    id: 'se_phase_split_util',
    name: 'Green Split Utilization',
    category: 'signal_efficiency',
    unit: '%',
    description: 'Fraction of allocated green phase during which vehicles actually cross the stop bar.',
    formula: 'active_movement_time / allocated_green_time',
    sourceInRepo: 'src/deployment/signal_program.py',
    status: 'implemented',
    currentValue: 86.4,
    changeDelta: 5.2,
    sparkline: [78, 80, 82, 84, 85, 86.4]
  },
  {
    id: 'se_starvation_index',
    name: 'Max Phase Starvation Latency',
    category: 'signal_efficiency',
    unit: 'seconds',
    description: 'Longest time elapsed since any non-active approach received green.',
    formula: 'max(time_since_last_green) across approaches',
    sourceInRepo: 'configs/state_schema.json -> time_since_last_green',
    status: 'implemented',
    currentValue: 38.0,
    sparkline: [42, 45, 36, 40, 35, 38]
  },
  {
    id: 'se_cycle_failure_rate',
    name: 'Cycle Failure Rate',
    category: 'signal_efficiency',
    unit: '%',
    description: 'Percentage of cycles where queued vehicles fail to clear within one green allocation.',
    formula: 'residual_queue_cycles / total_cycles',
    sourceInRepo: 'SumoIntersectionEnv telemetry',
    status: 'planned'
  },
  {
    id: 'se_phase_switch_frequency',
    name: 'Phase Oscillation Penalty',
    category: 'signal_efficiency',
    unit: 'switches / hr',
    description: 'Frequency of phase transitions to verify anti-oscillation constraints.',
    formula: 'transitions_in_window in src/ppo/reward.py:28',
    sourceInRepo: 'src/ppo/reward.py -> switch_excess_weight',
    status: 'implemented',
    currentValue: 42,
    sparkline: [40, 44, 42, 41, 43, 42]
  },

  // 4. PPO / RL Performance
  {
    id: 'rl_episode_reward',
    name: 'Mean PPO Episode Reward',
    category: 'ppo_rl',
    unit: 'reward pts',
    description: 'Composite multi-objective scalar reward evaluating queue, wait, and throughput.',
    formula: 'Module 7 normalized weighted sum (reward.py)',
    sourceInRepo: 'logs/training_normal_mlp_gov_final.csv -> Reward',
    status: 'implemented',
    currentValue: 36.8,
    changeDelta: 12.1,
    sparkline: [-32, -18, 5, 22, 31, 36.8]
  },
  {
    id: 'rl_policy_loss',
    name: 'Actor Policy Loss',
    category: 'ppo_rl',
    unit: 'loss',
    description: 'PPO clipped surrogate objective policy loss during gradient steps.',
    formula: 'min(r_t * A_t, clip(r_t) * A_t)',
    sourceInRepo: 'logs/training_normal_mlp_gov_final.csv -> PolicyLoss',
    status: 'implemented',
    currentValue: 0.008,
    sparkline: [0.082, 0.048, 0.025, 0.014, 0.010, 0.008]
  },
  {
    id: 'rl_value_loss',
    name: 'Critic Value Loss',
    category: 'ppo_rl',
    unit: 'MSE',
    description: 'Mean squared error between value network predictions and empirical returns.',
    formula: 'MSE(V(s_t), G_t)',
    sourceInRepo: 'logs/training_normal_mlp_gov_final.csv -> ValueLoss',
    status: 'implemented',
    currentValue: 0.012,
    sparkline: [0.124, 0.075, 0.038, 0.022, 0.016, 0.012]
  },
  {
    id: 'rl_explained_variance',
    name: 'Critic Explained Variance',
    category: 'ppo_rl',
    unit: 'ratio',
    description: 'Proportion of return variance explained by critic baseline predictions.',
    formula: '1 - Var(y - y_pred) / Var(y)',
    sourceInRepo: 'logs/training_normal_mlp_gov_final.csv -> ExplainedVariance',
    status: 'implemented',
    currentValue: 0.94,
    sparkline: [0.42, 0.65, 0.81, 0.89, 0.92, 0.94]
  },
  {
    id: 'rl_governor_override_rate',
    name: 'Governor Override Rate',
    category: 'ppo_rl',
    unit: '%',
    description: 'Percentage of control decisions where EdgeCaseGovernor intervened over raw PPO.',
    formula: 'overridden_decisions / total_decisions',
    sourceInRepo: 'logs/runner_decisions.csv -> governor_rule',
    status: 'implemented',
    currentValue: 4.2,
    changeDelta: -1.8,
    sparkline: [9.1, 7.8, 6.2, 5.4, 4.6, 4.2]
  },

  // 5. Perception & Vision
  {
    id: 'pv_camera_confidence',
    name: 'YOLO Perception Confidence',
    category: 'perception_vision',
    unit: '%',
    description: 'Mean bounding box confidence score across active vehicle and lane detections.',
    formula: 'mean(detection_confidence)',
    sourceInRepo: 'basic_traffic_metrics.csv -> avg_confidence',
    status: 'implemented',
    currentValue: 88.7,
    changeDelta: 1.4,
    sparkline: [86.2, 87.0, 87.5, 88.1, 88.4, 88.7]
  },
  {
    id: 'pv_tracking_mota',
    name: 'ByteTrack Multi-Object Accuracy',
    category: 'perception_vision',
    unit: '%',
    description: 'Tracking continuity and trajectory integrity across camera frames.',
    formula: '1 - (FP + FN + ID_switches) / total_ground_truth',
    sourceInRepo: 'src/perception/tracker.py',
    status: 'derived',
    currentValue: 91.2,
    sparkline: [88, 89, 90, 90.5, 91, 91.2]
  },
  {
    id: 'pv_camera_fps',
    name: 'Edge Vision Inference Rate',
    category: 'perception_vision',
    unit: 'FPS',
    description: 'Effective processed frame rate after perception stride downsampling.',
    formula: 'processed_frames / elapsed_time',
    sourceInRepo: 'benchmark_camera_bridge.py',
    status: 'implemented',
    currentValue: 24.8,
    sparkline: [25, 24.5, 24.8, 25, 24.7, 24.8]
  },
  {
    id: 'pv_anpr_ocr_confidence',
    name: 'ANPR Plate Recognition Confidence',
    category: 'perception_vision',
    unit: '%',
    description: 'Confidence of OCR plate character parsing in violation pipeline.',
    formula: 'src/violations/db.py -> ocr_conf',
    sourceInRepo: 'src/violations/db.py',
    status: 'derived',
    currentValue: 93.4,
    sparkline: [91, 92, 92.5, 93, 93.1, 93.4]
  },
  {
    id: 'pv_occlusion_rate',
    name: 'Vehicle Occlusion Frequency',
    category: 'perception_vision',
    unit: '%',
    description: 'Percentage of vehicles partially obscured by larger vehicles (buses/trucks).',
    formula: 'IoU_overlap > 0.45 across bounding boxes',
    sourceInRepo: 'Planned in RESEARCH_PROMPT_PERCEPTION_ALTERNATIVES.md',
    status: 'planned'
  },

  // 6. Device Health & Reliability
  {
    id: 'dh_pi_cpu_temp',
    name: 'Raspberry Pi CPU Temperature',
    category: 'device_health',
    unit: '°C',
    description: 'Operating junction temperature of the BCM2712 Broadcom SoC.',
    formula: 'vcgencmd measure_temp',
    sourceInRepo: 'results/pi5_profile.csv',
    status: 'implemented',
    currentValue: 54.2,
    changeDelta: 1.1,
    sparkline: [51, 52, 53, 53.5, 54, 54.2]
  },
  {
    id: 'dh_inference_latency',
    name: 'Policy Inference Latency',
    category: 'device_health',
    unit: 'ms',
    description: 'Forward pass latency for ONNX policy runtime on CPU.',
    formula: 't_after_onnx - t_before_onnx',
    sourceInRepo: 'logs/runner_decisions.csv -> latency_ms',
    status: 'implemented',
    currentValue: 34.6,
    changeDelta: -2.3,
    sparkline: [42, 38, 36, 35, 35.2, 34.6]
  },
  {
    id: 'dh_esp32_ack_rate',
    name: 'ESP32 Command Echo Rate',
    category: 'device_health',
    unit: '%',
    description: 'Percentage of dispatched bitmask commands verified with OK echo.',
    formula: 'valid_echoes / dispatched_commands',
    sourceInRepo: 'src/deployment/esp32_client.py:99',
    status: 'implemented',
    currentValue: 99.8,
    sparkline: [99.5, 99.6, 99.7, 99.8, 99.8, 99.8]
  },
  {
    id: 'dh_wifi_signal_rssi',
    name: 'Wi-Fi Link Signal Strength',
    category: 'device_health',
    unit: 'dBm',
    description: 'Received signal strength indicator between Pi edge node and access point.',
    formula: '/proc/net/wireless RSSI',
    sourceInRepo: 'hardware/ESP32_WIFI_SETUP.md',
    status: 'implemented',
    currentValue: -58,
    sparkline: [-62, -60, -59, -58, -59, -58]
  },
  {
    id: 'dh_heartbeat_jitter',
    name: 'Control Loop Jitter',
    category: 'device_health',
    unit: 'ms',
    description: 'Standard deviation of 5.0-second control period timing loop.',
    formula: 'std_dev(delta_tick_timestamps - 5000ms)',
    sourceInRepo: 'src/deployment/intersection_runner.py:127',
    status: 'derived',
    currentValue: 3.4,
    sparkline: [4.2, 3.9, 3.8, 3.5, 3.4, 3.4]
  },

  // 7. Incident & Safety Analytics
  {
    id: 'sa_emergency_clear_time',
    name: 'Emergency Clearance Latency',
    category: 'safety_incidents',
    unit: 'seconds',
    description: 'Elapsed seconds from initial emergency vehicle detection to junction clearance.',
    formula: 't_exit - t_detected in src/ppo/reward.py:44',
    sourceInRepo: 'src/ppo/reward.py -> emergency_delay_weight',
    status: 'implemented',
    currentValue: 16.4,
    sparkline: [22, 19, 18, 17, 16.8, 16.4]
  },
  {
    id: 'sa_red_light_violations',
    name: 'Red Light Violations Caught',
    category: 'safety_incidents',
    unit: 'violations',
    description: 'Vehicle trajectories detected crossing stop bar during all-red or opposing green.',
    formula: 'src/violations/violation_detector.py',
    sourceInRepo: 'src/violations/db.py -> violations table',
    status: 'implemented',
    currentValue: 8,
    sparkline: [3, 4, 5, 6, 7, 8]
  },
  {
    id: 'sa_near_miss_decel',
    name: 'Abnormal Harsh Decelerations',
    category: 'safety_incidents',
    unit: 'events / hr',
    description: 'Kinematic tracking detection of harsh braking (> 4.5 m/s²).',
    formula: 'vehicle_acceleration < -4.5 in kinematics.py',
    sourceInRepo: 'src/perception/kinematics.py',
    status: 'derived',
    currentValue: 2,
    sparkline: [4, 3, 2, 3, 2, 2]
  },
  {
    id: 'sa_governor_fail_safe_count',
    name: 'Failsafe Fallback Interventions',
    category: 'safety_incidents',
    unit: 'events',
    description: 'Instances where Webster Adaptive Fallback replaced PPO due to camera dropout.',
    formula: 'src/deployment/intersection_runner.py:101',
    sourceInRepo: 'src/baselines/adaptive_simple.py',
    status: 'implemented',
    currentValue: 0,
    sparkline: [0, 0, 0, 0, 0, 0]
  },

  // 8. Environmental Impact
  {
    id: 'env_idle_emissions',
    name: 'Estimated Idling CO₂ Reductions',
    category: 'environmental',
    unit: 'kg CO₂ / day',
    description: 'Estimated carbon emissions prevented through reduced waiting and idling time.',
    formula: '(wait_baseline - wait_ppo) * idle_fuel_rate * co2_factor',
    sourceInRepo: 'Planned in DIGITAL_TWIN_FUTURE_DATASET_PLAN.md',
    status: 'derived',
    currentValue: 142.6,
    changeDelta: 18.2,
    sparkline: [110, 118, 126, 134, 138, 142.6]
  },
  {
    id: 'env_fuel_waste_prevented',
    name: 'Fuel Idling Waste Prevented',
    category: 'environmental',
    unit: 'litres / day',
    description: 'Estimated gasoline/diesel fuel conserved from reduced queue wait times.',
    formula: 'prevented_idle_seconds * 0.00035 L/s',
    sourceInRepo: 'Planned in DIGITAL_TWIN_FUTURE_DATASET_PLAN.md',
    status: 'derived',
    currentValue: 58.4,
    changeDelta: 14.5,
    sparkline: [45, 48, 52, 55, 57, 58.4]
  },
  {
    id: 'env_noise_index',
    name: 'Intersection Noise Stress Index',
    category: 'environmental',
    unit: 'dB(A) est',
    description: 'Estimated acoustic disturbance modeled from stop-and-go acceleration events.',
    formula: 'Planned Acoustic Model based on heavy vehicle acceleration',
    sourceInRepo: 'Planned for Phase 9 Digital Twin',
    status: 'planned'
  },
  {
    id: 'env_energy_penalty',
    name: 'Stop-and-Go Kinetic Energy Loss',
    category: 'environmental',
    unit: 'kWh',
    description: 'Cumulative kinetic energy dissipated through vehicle braking events.',
    formula: '0.5 * sum(m_veh * v_approach²)',
    sourceInRepo: 'src/perception/kinematics.py',
    status: 'planned'
  }
];

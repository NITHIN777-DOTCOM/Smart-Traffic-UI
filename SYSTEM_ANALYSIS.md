# System Analysis: Smart-Traffic-PPO Architecture & Capabilities

**Target Repository:** `C:\Users\Juju\Desktop\Smart-Traffic-PPO`  
**Inspected Branch:** `refined/aligned-reward-handover`  
**Repository Access Mode:** Read-Only Static Inspection  
**Date:** October 2026  

---

## 1. Executive Summary

The **Smart-Traffic-PPO** system is an edge-optimized, reinforcement-learning-driven intelligent traffic signal control and perception framework. It bridges computer vision (YOLO vehicle & lane detection with ByteTrack), kinematic tracking, analytical/SUMO traffic simulation, and Proximal Policy Optimization (PPO) reinforcement learning deployed on Raspberry Pi 5 edge compute hardware communicating with ESP32-based traffic light controllers.

This analysis provides the architectural foundation for the **Smart Traffic Control & Analytics Web Application** (`SmartTrafficControl`), defining what data, controls, metrics, and transports genuinely exist in the repository versus what must be mediated via an edge gateway adapter.

---

## 2. End-to-End System Architecture

```
[ Four-Way Road Feeds ]  (UA-DETRAC MP4s or Live Cameras: North, East, South, West)
           │
           ▼
[ Perception Pipeline ]  (CameraBridge: YOLOv8 / YOLO26 Vehicle & Lane Detectors + ByteTrack)
           │
           ▼
[ Feature Extraction ]   (Kinematics, LaneDirectionResolver, StateExtractor)
           │             -> Assembles 131-dimensional standardized state vector
           ▼
[ Decision Engine ]      (IntersectionRunner: PPO Checkpoint / ONNX Policy or AdaptiveFallback)
           │
           ▼
[ Safety Governor ]      (EdgeCaseGovernor: 4 deterministic safety/fairness override rules)
           │
           ▼
[ Signal Program ]       (SignalProgram: Safety transitions: Yellow (3s) -> All-Red (2s) -> Green)
           │
     ┌─────┴─────────────────────────────────┐
     ▼                                       ▼
[ USB Serial Link ]                   [ Wi-Fi TCP Socket ]
ESP32Client (115200 baud, 12-bit)      ESP32WiFiClient (Port 8888, 6-bit bitmask)
     ▼                                       ▼
[ Physical ESP32 Rig / LEDs ]          [ Physical ESP32 Rig / LEDs ]
```

---

## 3. Core Modules and Responsibilities

| Module Directory | Key Files | Primary Responsibilities |
|---|---|---|
| `src/perception/` | `camera_bridge.py`, `tracker.py`, `kinematics.py`, `state_extractor.py`, `lane_direction.py` | Multi-camera video ingestion, vehicle bounding box detection, ByteTrack object tracking, speed/acceleration calculation, spatial lane assignment, and per-approach feature calculation. |
| `src/state/` | `traffic_state.py`, `adjacency.py`, `temporal.py`, `weather.py`, `historical.py` | Assembles the canonical 131-dimensional traffic state representation according to `configs/state_schema.json`. |
| `src/ppo/` | `agent.py`, `networks.py`, `reward.py`, `checkpoint.py`, `normalization.py` | Actor-Critic neural networks, MultiDiscrete action selection (Phase index 0–3, Duration tier 0–3), observation and reward normalization, checkpoint persistence. |
| `src/safety/` | `edge_case_governor.py` | Deterministic supervisor that overrides PPO actions when safety, anti-starvation, or fairness rules trigger. |
| `src/sumo_env/` | `intersection_env.py`, `sumo_free_env.py`, `sumo_generator.py` | Analytical SUMO-free simulated environment and SUMO TraCI-based intersection environments for training and evaluation. |
| `src/deployment/` | `intersection_runner.py`, `signal_program.py`, `esp32_client.py`, `esp32_wifi_client.py`, `traffic_light_bridge.py`, `demo_dashboard.py` | Edge runtime orchestration on Raspberry Pi, hardware signal aspect management, serial and Wi-Fi bitmask dispatch. |
| `src/violations/` | `db.py`, `violation_detector.py`, `plate_matcher.py` | SQLite-backed vehicle violation logging, ANPR OCR fusion, provisional confidence gating. |

---

## 4. State Representation & Schema (131 Dimensions)

Defined in `configs/state_schema.json` (`demo_4way_v1`):

1. **Per-Approach Features (80 dims = 4 approaches × 20 features):**
   - Approaches: `North`, `East`, `South`, `West`.
   - Features: `vehicle_density`, `queue_length`, `avg_speed`, `avg_waiting_time`, `lane_occupancy`, `vehicle_arrival_rate`, `emergency_count`, `incoming_fraction`, `vehicle_type_light`, `vehicle_type_medium`, `vehicle_type_heavy`, `vehicle_acceleration_mean`, `trajectory_pattern`, `past_signal_state`, `time_since_last_green`, `lane_priority_index`, `intersection_connectivity`, `camera_confidence_score`, `incident_flag`, `emergency_override_status`.
2. **Current Signal Phase One-Hot (8 dims):** `phase_onehot.0` through `phase_onehot.7`.
3. **Remaining Phase Time (1 dim):** `remaining_phase_time` (normalized by `max_green` = 60s).
4. **Adjacency Matrix (16 dims):** 4×4 intersection connectivity matrix (`adjacency.0.0` to `adjacency.3.3`).
5. **Weather Conditions (10 dims):** `temperature`, `humidity`, `rainfall_intensity`, `fog_density`, `visibility_index`, `weather_impact_factor`, and 4 one-hot conditions (`clear`, `rain`, `fog`, `storm`).
6. **Temporal Indicators (6 dims):** `time_of_day_sin`, `time_of_day_cos`, `day_of_week_sin`, `day_of_week_cos`, `is_weekend`, `is_peak_hour`.
7. **Historical Rolling Context (10 dims):** Mean density, queue, and speed across 15m, 30m, and 60m windows, plus `historical_traffic_pattern`.

---

## 5. Decision Space & Edge Safety Governor

### Action Space: `MultiDiscrete([4, 4])`
- **Action 0 (Phase Selection):**
  - `0`: `NS-through` (North-South Through green)
  - `1`: `NS-protected` (North-South Left-turn / Protected green)
  - `2`: `EW-through` (East-West Through green)
  - `3`: `EW-protected` (East-West Left-turn / Protected green)
- **Action 1 (Green Duration):**
  - `0`: 15 seconds (`min_green`)
  - `1`: 30 seconds
  - `2`: 45 seconds
  - `3`: 60 seconds (`max_green`)

### EdgeCaseGovernor Deterministic Rules:
1. **Rule 1 (All Lanes Empty):** Triggers deterministic round-robin allocation (15s per approach).
2. **Rule 2 (Near-Equal Densities):** Tie-break prioritization based on emergency count, time since last green, then seeded draw.
3. **Rule 3 (Wait-Threshold Exceeded):** Prioritizes starving approaches when wait time exceeds threshold (0.8 normalized, ~48s) regardless of approach density.
4. **Rule 4 (No Consecutive Greens to Same Group):** Prevents starvation by forbidding back-to-back green phases to the same approach group (`NS` vs `EW`).

---

## 6. Hardware & Network Transport Analysis

### What Exists in Repository:
1. **ESP32 Wi-Fi Socket Protocol:**
   - Script: `src/deployment/esp32_wifi_client.py` and `scripts/test_esp32_connection.py`.
   - Firmware: `hardware/esp32_wifi_controller/esp32_wifi_controller.ino`.
   - Transport: Raw TCP Socket on port **8888**.
   - Payload: ASCII integer line `"<bitmask>\n"` where bitmask is 0–63 (6-bit: S1 R/G/B, S2 R/G/B).
2. **ESP32 USB Serial Protocol:**
   - Script: `src/deployment/esp32_client.py`.
   - Firmware: `firmware/esp32_4head_traffic/esp32_4head_traffic.ino`.
   - Transport: Serial over USB at 115200 baud.
   - Payload: 12-bit R/Y/G bitmask with strict `"OK <mask>"` echo verification.
3. **Raspberry Pi OS Systemd Service:**
   - File: `deploy/smart-traffic-demo.service`.
   - Path: Runs `/opt/smart-traffic-ppo/scripts/demo_up.sh` as user `pi`.
   - Configuration Reload: Reacts to `SIGHUP` to safely reload intersection adjacency at cycle boundaries.

### Critical Web Browser Networking Constraint:
A standard web browser running on an operator workstation **cannot** open raw TCP sockets (`socket.create_connection`) to IP `192.168.1.x:8888`, nor can it directly execute raw serial commands or probe local Wi-Fi SSIDs without an intermediate bridge.
**Architectural Solution:**
The web application includes an **Edge Gateway Adapter layer** (`DeviceAdapter` / `TrafficApiClient`). In development/demonstration mode, it provides high-fidelity simulated telemetry based on real repository logs. In deployment, it connects to a lightweight gateway service (FastAPI/Flask) running on the Raspberry Pi or operator machine that exposes REST and WebSocket endpoints for the underlying socket/serial transports.

---

## 7. Metrics Discovery and Catalog

### High-Value Initial Metrics (Directly derived from existing data):
1. **Vehicle Throughput (veh/step or veh/hr):** Sourced from `runner_decisions.csv` and `training_*.csv`. Measures clearance efficiency.
2. **Average Waiting Time (seconds):** Tracked per approach (`avg_wait` / `avg_waiting_time`).
3. **Average Queue Length (vehicles):** Sourced from detector spatial aggregation (`avg_queue` / `queue_length`).
4. **PPO Episode Reward:** Multi-objective composite reward measuring penalty reduction across episodes.
5. **Vehicle Classification Mix:** Proportions of Light (cars), Medium (buses/trucks), Heavy, Auto-rickshaws, and Emergency vehicles.
6. **Controller Inference Latency (ms):** Edge pipeline processing time per decision tick (typically 20–80 ms on Pi 5).
7. **Governor Intervention Rate (%):** Frequency with which `EdgeCaseGovernor` overrides the PPO agent.
8. **Camera Perception Confidence (%):** Mean bounding box and tracker detection score per camera approach.

### 30+ Metric Expansion Framework (Future / Extensible Catalog):
Categorized across 8 domains:
- **Traffic Flow & Volume (6):** Throughput, Inflow Rate, Outflow Rate, Turning Ratio, Flow-to-Capacity Ratio, Spatial Vehicle Density.
- **Congestion & Queues (6):** Mean Queue Length, Max Queue Length, Queue Clearance Rate, Lane Occupancy Ratio, Shockwave Propagation Speed, Gridlock Risk Index.
- **Signal Efficiency (5):** Phase Duration Distribution, Split Utilization, Cycle Failure Rate, Green Wave Coordination Score, Phase Switch Frequency.
- **PPO & RL Performance (5):** Mean Episode Reward, Value Loss, Policy Loss, Policy Entropy, KL Divergence.
- **Perception & Vision (5):** Detection Confidence Score, Tracking Continuity (MOTA), Occlusion Rate, Lane Boundary Drift, Frame Processing FPS.
- **Device Health & Hardware (5):** Pi CPU Temperature, Pi CPU/RAM Load, Wi-Fi RSSI/Signal Strength, ESP32 Ping Latency, Command Acknowledgement Echo Rate.
- **Safety & Incidents (4):** Emergency Vehicle Clearance Time, Red-Light Violations Detected, Near-Miss Deceleration Alerts, Governor Override Frequency.
- **Environmental Impact (4):** Estimated Idle Emissions (CO2), Fuel Waste from Idling, Noise Pollution Index, Stop-and-Go Energy Penalty.

---

## 8. Feature Classification Table

| Feature / Capability | Classification | Current State in Repository |
|---|---|---|
| 4-Camera Video Perception (YOLO + ByteTrack) | **Implemented** | Working in `src/perception/camera_bridge.py` |
| 131-Dimensional State Vector Assembly | **Implemented** | Working in `src/state/traffic_state.py` |
| PPO MultiDiscrete Model Inference | **Implemented** | Checkpoints in `models/`, ONNX runtime supported |
| Webster Adaptive Fallback Controller | **Implemented** | Working in `src/baselines/adaptive_simple.py` |
| Safety Governor (4 Override Rules) | **Implemented** | Working in `src/safety/edge_case_governor.py` |
| Physical Signal Program (R/Y/G transitions) | **Implemented** | Working in `src/deployment/signal_program.py` |
| ESP32 TCP Bitmask Socket Server/Client | **Implemented** | Raw TCP port 8888 in `esp32_wifi_client.py` & `.ino` |
| ESP32 USB Serial Driver | **Implemented** | 115200 baud driver in `esp32_client.py` |
| SQLite ANPR Violation Database | **Implemented** | Working schema in `src/violations/db.py` |
| Native HTTP / WebSocket API Server on Pi | **Missing / Planned** | Repo has systemd service and OpenCV UI, but no web server |
| In-Browser Wi-Fi Hardware Adapter Scan | **Browser Limitation** | Browsers cannot scan SSIDs; handled via Gateway / Manual IP |
| Multi-Intersection Fleet Telemetry | **Planned / Framework** | Single 4-way intersection in repo; UI provides multi-node routing |

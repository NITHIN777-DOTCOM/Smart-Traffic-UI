# Smart Traffic Control & Analytics Web Application

A professional, high-reliability web interface for smart-city traffic police and traffic engineers to connect to, monitor, and control reinforcement-learning-driven traffic signal systems powered by PPO, computer vision, and edge compute hardware (Raspberry Pi 5 + ESP32).

---

## 1. Key Features

- **Wi-Fi Connection Center:** Comprehensive landing page to discover, connect to, and manage links with Raspberry Pi 5 edge nodes and ESP32 traffic controllers. Supports TCP socket configurations, mDNS discovery, and simulated demonstration mode.
- **Live 4-Way Traffic Actuation:** Visual representation of North, East, South, and West approaches with live signal heads (R/Y/G), countdown timers, transition clearances (3s Yellow, 2s All-Red), vehicle queues, and mean waiting times.
- **PPO & Safety Supervision:** Displays PPO policy recommendations alongside real-time `EdgeCaseGovernor` overrides (Rule 1-4) enforcing safety, starvation prevention, and anti-oscillation constraints.
- **Interactive 4×4 Topology Grid:** Allows authorized operators to simulate dynamic road closures by toggling approach-to-exit connections with deferred `SIGHUP` reload simulation.
- **Analytics Dashboard & 30+ Metric Catalog:** Initial set of high-value metrics grounded in real repository logs (`runner_decisions.csv`, `training_normal_mlp_gov_final.csv`, `basic_traffic_metrics.csv`), plus an extensible catalog spanning 8 domains with 30+ metric placeholders, formulas, and data mappings.
- **Design System Inspired by Figma:** Dark-first charcoal aesthetic with teal accents, clean topbar and sidebar, accessible dark/light theme switching, and professional operational typography.

---

## 2. Directory Structure

```
SmartTrafficControl/
├── src/
│   ├── app/
│   ├── adapters/
│   │   ├── DeviceAdapter.ts             # Interface for edge hardware / simulation
│   │   ├── SimulatedDeviceAdapter.ts    # High-fidelity simulator modeled on repo logs
│   │   └── RealDeviceAdapter.ts         # Edge Gateway REST & WebSocket client
│   ├── components/
│   │   └── common/
│   │       ├── Header.tsx               # Topbar with brand, status pill, theme switch
│   │       ├── Sidebar.tsx              # Persistent operational navigation
│   │       └── Modal.tsx                # Safety-critical confirmation dialog
│   ├── data/
│   │   └── mockTelemetry.ts             # Preloaded training curves and 30+ metric catalog
│   ├── pages/
│   │   ├── ConnectionLandingPage.tsx    # Primary Wi-Fi connection hub
│   │   ├── ControlCenterPage.tsx        # Live 4-way signal actuator & control deck
│   │   ├── DevicesPage.tsx              # Raspberry Pi 5 & ESP32 hardware telemetry
│   │   ├── IntersectionsPage.tsx        # Approach cameras, lanes, and ROIs
│   │   ├── AlertsPage.tsx               # Operational safety alert feed
│   │   ├── AnalyticsDashboardPage.tsx   # Traffic metrics & 30+ metric framework
│   │   └── SettingsPage.tsx             # System parameters and service units
│   ├── services/
│   │   └── TrafficContext.tsx           # Global state, theme, and adapter management
│   ├── styles/
│   │   └── theme.css                    # Design tokens and responsive styles
│   ├── types/
│   │   └── traffic.ts                   # Domain types, state schema, and commands
│   ├── App.tsx                          # Root layout and router
│   └── main.tsx                         # Entry point
├── SYSTEM_ANALYSIS.md                   # Complete analysis of Smart-Traffic-PPO
├── INTEGRATION_GUIDE.md                 # Hardware protocols & gateway specification
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 3. Development and Build Instructions

### Prerequisites
- Node.js (v18+ or v24+)
- npm (v9+)

### Installation
From inside `C:\Users\Juju\Desktop\smart_traffic_light_Nithin\UI\SmartTrafficControl`:

```bash
npm install
```

### Running the Development Server
```bash
npm run dev
```
The application will launch at `http://localhost:5173`.

### Production Build
```bash
npm run build
```
Creates an optimized production bundle in `dist/`.

---

## 4. Hardware and Network Architecture

The application communicates with physical Raspberry Pi 5 hardware through an Edge Gateway service. See [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) for full protocol specifications, socket packet layouts, and gateway reference scripts.

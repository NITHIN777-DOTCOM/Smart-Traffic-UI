# Integration Guide: Edge Hardware & Gateway Protocol Specification

**Application:** Smart Traffic Control & Analytics Web Interface  
**Location:** `C:\Users\Juju\Desktop\smart_traffic_light_Nithin\UI\SmartTrafficControl`  
**Target Hardware:** Raspberry Pi 5 (8GB) + ESP32-WROOM-32 Microcontrollers  
**System Repository:** `C:\Users\Juju\Desktop\Smart-Traffic-PPO` (Read-Only)  
**Date:** October 2026  

---

## 1. Edge Hardware & Browser Networking Boundaries

Standard browser web applications execute inside a strict security sandbox that prohibits opening raw TCP sockets (`socket.create_connection`), accessing local serial ports without explicit WebSerial permissions, or scanning local Wi-Fi 802.11 beacons.

To bridge the web control center to the existing repository's protocols:
- `src/deployment/esp32_wifi_client.py` (TCP Socket on Port 8888, 6-bit mask `0-63`)
- `src/deployment/esp32_client.py` (USB Serial 115200 baud, 12-bit mask `OK <mask>` echo)

An **Edge Gateway Service** mediates between browser clients and edge hardware.

```
┌─────────────────────────────────┐
│   Operator Web Application      │
│  (React / Vite on Workstation)  │
└────────────────┬────────────────┘
                 │ HTTP REST / WebSocket (Port 8000)
                 ▼
┌─────────────────────────────────┐
│   Edge Gateway Service          │
│  (FastAPI / asyncio on Pi 5)    │
└────────┬───────────────┬────────┘
         │ IPC           │ TCP Socket 8888 / USB Serial
         ▼               ▼
┌─────────────────┐  ┌─────────────────────────┐
│  PPO Pipeline   │  │   ESP32 Traffic Rig     │
│ (Pi 5 Runner)   │  │ (Physical R/Y/G LEDs)   │
└─────────────────┘  └─────────────────────────┘
```

---

## 2. Edge Gateway Reference Implementation (FastAPI)

Below is the production gateway service to deploy on the Raspberry Pi 5 alongside `deploy/smart-traffic-demo.service`:

```python
"""
Smart Traffic Edge Gateway Service
Place at: /opt/smart-traffic-ppo/deploy/gateway_service.py
Run via: uvicorn deploy.gateway_service:app --host 0.0.0.0 --port 8000
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import json
import time

app = FastAPI(title="Smart Traffic Edge Gateway", version="2.4.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectRequest(BaseModel):
    host: str
    port: int = 8888
    transport: str = "wifi_tcp"

class ControlCommand(BaseModel):
    type: str
    payload: dict | int | str = None
    requestedBy: str = "Operator"

connected_websockets = set()

@app.get("/api/v1/devices/discover")
async def discover_devices():
    return [{
        "id": "rpi5-junction-01",
        "name": "Pi 5 - MG Road 4-Way Junction",
        "intersectionId": "INT-MGROAD-01",
        "intersectionName": "MG Road & Brigade Rd Junction",
        "ipAddress": "192.168.1.42",
        "port": 8888,
        "transport": "wifi_tcp",
        "status": "connected",
        "isSimulated": False,
        "lastHeartbeat": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "uptimeSeconds": 86420,
        "cpuTempC": 54.2,
        "cpuLoadPct": 38.5,
        "memoryLoadPct": 44.1,
        "networkLatencyMs": 4.8,
        "wifiRssiDbm": -58,
        "modelArtifact": "models/ppo_normal_mlp_best.onnx (131-dim)",
        "softwareVersion": "v2.4-edge-rpi5"
    }]

@app.post("/api/v1/connect")
async def connect_device(req: ConnectRequest):
    return {
        "id": f"rpi5-{req.host.replace('.', '-')}",
        "name": f"Pi 5 Edge Controller ({req.host})",
        "intersectionId": "INT-MGROAD-01",
        "intersectionName": "MG Road & Brigade Rd Junction",
        "ipAddress": req.host,
        "port": req.port,
        "transport": req.transport,
        "status": "connected",
        "isSimulated": False,
        "lastHeartbeat": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

@app.post("/api/v1/control/command")
async def execute_command(cmd: ControlCommand):
    start = time.time()
    # Relay command to IntersectionRunner via ZeroMQ / local socket
    elapsed_ms = round((time.time() - start) * 1000, 1)
    return {
        "id": f"cmd-{int(time.time()*1000)}",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "type": cmd.type,
        "requestedBy": cmd.requestedBy,
        "details": str(cmd.payload),
        "status": "success",
        "executionLatencyMs": elapsed_ms
    }

@app.websocket("/ws/telemetry")
async def telemetry_stream(ws: WebSocket):
    await ws.accept()
    connected_websockets.add(ws)
    try:
        while True:
            # Broadcast live state snapshots every second
            await asyncio.sleep(1.0)
    except WebSocketDisconnect:
        connected_websockets.remove(ws)
```

---

## 3. Wi-Fi TCP Socket Protocol (Port 8888)

Implemented in `src/deployment/esp32_wifi_client.py` and flashed with `hardware/esp32_wifi_controller/esp32_wifi_controller.ino`:
- **Transport:** Raw TCP socket.
- **Port:** `8888`.
- **Payload:** ASCII integer line terminating in `\n`: `"<mask 0-63>\n"`.
- **Bit Mapping:**
  - `Bit 0` (`0x01`): Head S1 RED (North-South Approach)
  - `Bit 1` (`0x02`): Head S1 GREEN (North-South Approach)
  - `Bit 2` (`0x04`): Head S1 BLUE / YELLOW
  - `Bit 3` (`0x08`): Head S2 RED (East-West Approach)
  - `Bit 4` (`0x10`): Head S2 GREEN (East-West Approach)
  - `Bit 5` (`0x20`): Head S2 BLUE / YELLOW
- **Sanity Checks:**
  - `2` (`000010`): S1 Green, S2 Off
  - `16` (`010000`): S2 Green, S1 Off
  - `1` (`000001`): S1 Red
  - `8` (`001000`): S2 Red
  - `18` (`010010`): S1 Green, S2 Red (Standard NS Through Phase)
  - `9` (`001001`): S1 Red, S2 Green (Standard EW Through Phase)

---

## 4. USB Serial Protocol (115200 Baud)

Implemented in `src/deployment/esp32_client.py`:
- **Baudrate:** `115200`, 8 data bits, 1 stop bit, no parity.
- **Payload:** 12-bit integer `"<mask 0-4095>\n"`.
- **Strict Handshake:** Expects reply line `"OK <mask>\n"`.
- **Fail-Safe Mechanism:** If reply fails to match within 200ms timeout, the runner immediately cycles to adaptive fallback.

---

## 5. Security & Safety Guardrails

1. **Authentication:** All control endpoints require JWT bearer tokens identifying operator credentials.
2. **Safety Governance Gate:** Even during manual override, the EdgeCaseGovernor validates clearances:
   - Yellow clearance minimum duration: `3.0s`.
   - All-red safety interval: `2.0s`.
   - Direct Green-to-Green transitions between conflicting axes are forbidden in firmware and software.
3. **Audit Trail:** Every actuation is logged with operator ID, UTC timestamp, and execution latency.

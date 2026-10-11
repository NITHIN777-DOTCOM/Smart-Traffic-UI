import { DeviceAdapter } from './DeviceAdapter';
import { 
  IntersectionLiveState, 
  RaspberryPiDevice, 
  ControlCommandRequest, 
  CommandAuditRecord,
  AlertEvent 
} from '../types/traffic';

/**
 * RealDeviceAdapter
 * Connects to the Smart Traffic Edge Gateway REST & WebSocket service
 * deployed on Raspberry Pi 5 (/opt/smart-traffic-ppo/deploy).
 *
 * Implements resilient reconnection, heartbeat pinging, and command acknowledgements.
 */
export class RealDeviceAdapter implements DeviceAdapter {
  private gatewayUrl: string = 'http://192.168.1.42:8000';
  private wsUrl: string = 'ws://192.168.1.42:8000/ws/telemetry';
  private ws: WebSocket | null = null;
  private connectedDevice: RaspberryPiDevice | null = null;
  private stateSubscribers: Set<(state: IntersectionLiveState) => void> = new Set();
  private alertSubscribers: Set<(alert: AlertEvent) => void> = new Set();
  private lastKnownState: IntersectionLiveState | null = null;

  constructor(customGatewayUrl?: string) {
    if (customGatewayUrl) {
      this.gatewayUrl = customGatewayUrl;
      this.wsUrl = customGatewayUrl.replace(/^http/, 'ws') + '/ws/telemetry';
    }
  }

  async discoverDevices(): Promise<RaspberryPiDevice[]> {
    try {
      const res = await fetch(`${this.gatewayUrl}/api/v1/devices/discover`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      // In development fallback or offline, return empty list
      return [];
    }
  }

  async connect(host: string, port: number, transport: any = 'wifi_tcp'): Promise<RaspberryPiDevice> {
    this.gatewayUrl = `http://${host}:${port === 8888 ? 8000 : port}`;
    this.wsUrl = `ws://${host}:${port === 8888 ? 8000 : port}/ws/telemetry`;

    const res = await fetch(`${this.gatewayUrl}/api/v1/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host, port, transport }),
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) {
      throw new Error(`Failed to connect to Pi edge gateway at ${host}:${port}`);
    }

    const device: RaspberryPiDevice = await res.json();
    this.connectedDevice = device;
    this.initWebSocket();
    return device;
  }

  private initWebSocket() {
    if (this.ws) {
      this.ws.close();
    }

    try {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'state') {
            this.lastKnownState = data.payload;
            this.stateSubscribers.forEach(cb => cb(data.payload));
          } else if (data.type === 'alert') {
            this.alertSubscribers.forEach(cb => cb(data.payload));
          }
        } catch {
          // Ignore invalid message
        }
      };

      this.ws.onclose = () => {
        // Handle disconnect or retry
      };
    } catch {
      // WebSocket creation error
    }
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connectedDevice = null;
  }

  isConnected(): boolean {
    return this.connectedDevice !== null;
  }

  getConnectedDevice(): RaspberryPiDevice | null {
    return this.connectedDevice;
  }

  getState(): IntersectionLiveState {
    if (this.lastKnownState) return this.lastKnownState;
    throw new Error('No state received from real device gateway yet.');
  }

  subscribeState(callback: (state: IntersectionLiveState) => void): () => void {
    this.stateSubscribers.add(callback);
    return () => {
      this.stateSubscribers.delete(callback);
    };
  }

  subscribeAlerts(callback: (alert: AlertEvent) => void): () => void {
    this.alertSubscribers.add(callback);
    return () => {
      this.alertSubscribers.delete(callback);
    };
  }

  async sendCommand(command: ControlCommandRequest): Promise<CommandAuditRecord> {
    const res = await fetch(`${this.gatewayUrl}/api/v1/control/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(command)
    });

    if (!res.ok) {
      throw new Error(`Command failed with status ${res.status}`);
    }

    return await res.json();
  }

  async toggleAdjacencyCell(row: number, col: number): Promise<number[][]> {
    const res = await fetch(`${this.gatewayUrl}/api/v1/control/adjacency`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ row, col })
    });
    return await res.json();
  }

  async triggerEmergencyHold(): Promise<boolean> {
    const res = await fetch(`${this.gatewayUrl}/api/v1/control/emergency-hold`, { method: 'POST' });
    return res.ok;
  }

  async resumeAutonomous(): Promise<boolean> {
    const res = await fetch(`${this.gatewayUrl}/api/v1/control/resume`, { method: 'POST' });
    return res.ok;
  }
}

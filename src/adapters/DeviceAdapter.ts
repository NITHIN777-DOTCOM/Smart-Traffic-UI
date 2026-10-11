import { 
  IntersectionLiveState, 
  RaspberryPiDevice, 
  ControlCommandRequest, 
  CommandAuditRecord,
  AlertEvent 
} from '../types/traffic';

export interface DeviceAdapter {
  // Discovery & Lifecycle
  discoverDevices(): Promise<RaspberryPiDevice[]>;
  connect(host: string, port: number, transport?: 'wifi_tcp' | 'usb_serial' | 'gateway_rest' | 'simulated'): Promise<RaspberryPiDevice>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getConnectedDevice(): RaspberryPiDevice | null;

  // Real-time State & Telemetry
  getState(): IntersectionLiveState;
  subscribeState(callback: (state: IntersectionLiveState) => void): () => void;
  subscribeAlerts(callback: (alert: AlertEvent) => void): () => void;

  // Control Commands
  sendCommand(command: ControlCommandRequest): Promise<CommandAuditRecord>;
  toggleAdjacencyCell(row: number, col: number): Promise<number[][]>;
  triggerEmergencyHold(): Promise<boolean>;
  resumeAutonomous(): Promise<boolean>;
}

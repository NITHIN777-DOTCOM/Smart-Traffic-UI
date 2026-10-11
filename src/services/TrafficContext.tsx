import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { 
  IntersectionLiveState, 
  RaspberryPiDevice, 
  AlertEvent, 
  CommandAuditRecord,
  ControlCommandRequest,
  ControllerMode
} from '../types/traffic';
import { DeviceAdapter } from '../adapters/DeviceAdapter';
import { SimulatedDeviceAdapter } from '../adapters/SimulatedDeviceAdapter';
import { RealDeviceAdapter } from '../adapters/RealDeviceAdapter';

interface TrafficContextType {
  device: RaspberryPiDevice | null;
  state: IntersectionLiveState | null;
  alerts: AlertEvent[];
  auditLogs: CommandAuditRecord[];
  isConnecting: boolean;
  theme: 'dark' | 'light';
  activePage: string;
  setActivePage: (page: string) => void;
  toggleTheme: () => void;
  connect: (host: string, port: number, simulate?: boolean) => Promise<boolean>;
  disconnect: () => Promise<void>;
  sendCommand: (req: ControlCommandRequest) => Promise<CommandAuditRecord>;
  toggleAdjacency: (row: number, col: number) => Promise<void>;
  triggerEmergencyHold: () => Promise<void>;
  resumeAutonomous: () => Promise<void>;
  acknowledgeAlert: (alertId: string) => void;
}

const TrafficContext = createContext<TrafficContextType | undefined>(undefined);

export const TrafficProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('traffic-theme') as 'dark' | 'light') || 'dark';
  });

  const [activePage, setActivePage] = useState<string>('landing');
  const [isConnecting, setIsConnecting] = useState(false);
  const [adapter, setAdapter] = useState<DeviceAdapter>(() => new SimulatedDeviceAdapter());
  const [device, setDevice] = useState<RaspberryPiDevice | null>(null);
  const [state, setState] = useState<IntersectionLiveState | null>(null);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [auditLogs, setAuditLogs] = useState<CommandAuditRecord[]>([]);

  // Apply Theme
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('traffic-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Subscribe to adapter state
  useEffect(() => {
    const unsubState = adapter.subscribeState((newState) => {
      setState(newState);
    });

    const unsubAlert = adapter.subscribeAlerts((newAlert) => {
      setAlerts(prev => [newAlert, ...prev.filter(a => a.id !== newAlert.id)]);
    });

    setDevice(adapter.getConnectedDevice());

    return () => {
      unsubState();
      unsubAlert();
    };
  }, [adapter]);

  const connect = async (host: string, port: number, simulate: boolean = true): Promise<boolean> => {
    setIsConnecting(true);
    try {
      let currentAdapter: DeviceAdapter;
      if (simulate) {
        currentAdapter = new SimulatedDeviceAdapter();
      } else {
        currentAdapter = new RealDeviceAdapter(`http://${host}:${port}`);
      }

      const connectedDev = await currentAdapter.connect(host, port);
      setAdapter(currentAdapter);
      setDevice(connectedDev);

      const audit: CommandAuditRecord = {
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'device_connected',
        requestedBy: 'Traffic Operator',
        details: `Established ${simulate ? 'simulated' : 'live'} link to ${host}:${port}`,
        status: 'success'
      };
      setAuditLogs(prev => [audit, ...prev]);
      return true;
    } catch (err: any) {
      const failedAudit: CommandAuditRecord = {
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'connection_failed',
        requestedBy: 'Traffic Operator',
        details: `Failed to connect to ${host}:${port}: ${err.message}`,
        status: 'failed'
      };
      setAuditLogs(prev => [failedAudit, ...prev]);
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    await adapter.disconnect();
    setDevice(null);
  };

  const sendCommand = async (req: ControlCommandRequest): Promise<CommandAuditRecord> => {
    const result = await adapter.sendCommand(req);
    setAuditLogs(prev => [result, ...prev]);
    return result;
  };

  const toggleAdjacency = async (row: number, col: number) => {
    await adapter.toggleAdjacencyCell(row, col);
    const audit: CommandAuditRecord = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'update_adjacency',
      requestedBy: 'Traffic Operator',
      details: `Toggled link between Road ${row + 1} and Road ${col + 1} (SIGHUP deferred reload)`,
      status: 'success'
    };
    setAuditLogs(prev => [audit, ...prev]);
  };

  const triggerEmergencyHold = async () => {
    await adapter.triggerEmergencyHold();
    const audit: CommandAuditRecord = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'emergency_hold',
      requestedBy: 'Traffic Operator',
      details: 'Forced emergency hold / corridor priority',
      status: 'success'
    };
    setAuditLogs(prev => [audit, ...prev]);
  };

  const resumeAutonomous = async () => {
    await adapter.resumeAutonomous();
    const audit: CommandAuditRecord = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'resume_autonomous',
      requestedBy: 'Traffic Operator',
      details: 'Resumed PPO autonomous signal control',
      status: 'success'
    };
    setAuditLogs(prev => [audit, ...prev]);
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
  };

  const value = useMemo(() => ({
    device,
    state,
    alerts,
    auditLogs,
    isConnecting,
    theme,
    activePage,
    setActivePage,
    toggleTheme,
    connect,
    disconnect,
    sendCommand,
    toggleAdjacency,
    triggerEmergencyHold,
    resumeAutonomous,
    acknowledgeAlert
  }), [device, state, alerts, auditLogs, isConnecting, theme, activePage]);

  return (
    <TrafficContext.Provider value={value}>
      {children}
    </TrafficContext.Provider>
  );
};

export const useTraffic = () => {
  const context = useContext(TrafficContext);
  if (!context) {
    throw new Error('useTraffic must be used within a TrafficProvider');
  }
  return context;
};

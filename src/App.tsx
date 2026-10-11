import React from 'react';
import { TrafficProvider, useTraffic } from './services/TrafficContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { ConnectionLandingPage } from './pages/ConnectionLandingPage';
import { ControlCenterPage } from './pages/ControlCenterPage';
import { DevicesPage } from './pages/DevicesPage';
import { IntersectionsPage } from './pages/IntersectionsPage';
import { AlertsPage } from './pages/AlertsPage';
import { AnalyticsDashboardPage } from './pages/AnalyticsDashboardPage';
import { SettingsPage } from './pages/SettingsPage';
import './styles/theme.css';

const MainLayout: React.FC = () => {
  const { activePage } = useTraffic();

  const renderActivePage = () => {
    switch (activePage) {
      case 'landing':
        return <ConnectionLandingPage />;
      case 'control':
        return <ControlCenterPage />;
      case 'devices':
        return <DevicesPage />;
      case 'intersections':
        return <IntersectionsPage />;
      case 'alerts':
        return <AlertsPage />;
      case 'analytics':
        return <AnalyticsDashboardPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <ConnectionLandingPage />;
    }
  };

  return (
    <div className="app-shell">
      <Header />
      <Sidebar />
      <main className="main-content">
        {renderActivePage()}
      </main>
    </div>
  );
};

export function App() {
  return (
    <TrafficProvider>
      <MainLayout />
    </TrafficProvider>
  );
}

export default App;

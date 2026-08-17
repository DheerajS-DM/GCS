import React, { useState } from 'react';
import { TelemetryProvider } from './context/TelemetryContext';
import { Navigation } from './components/Navigation';
import { CockpitView } from './components/CockpitView';
import { MpuGraphsView } from './components/MpuGraphsView';
import { TrajectoryView } from './components/TrajectoryView';
import { TerminalView } from './components/TerminalView';

export function App() {
  const [activeTab, setActiveTab] = useState('cockpit');

  const renderActiveView = () => {
    switch (activeTab) {
      case 'cockpit':
        return <CockpitView />;
      case 'mpu':
        return <MpuGraphsView />;
      case 'trajectory':
        return <TrajectoryView />;
      case 'terminal':
        return <TerminalView />;
      default:
        return <CockpitView />;
    }
  };

  return (
    <TelemetryProvider>
      <div className="gcs-layout-container">
        
        {/* Navigation Bar */}
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Active View */}
        <main id="main-content-view">
          {renderActiveView()}
        </main>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid #1e293b', paddingTop: '1.5rem', marginTop: '2rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#6b7280' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div>SAMMARD GROUND CONTROL STATION v2.0 // FLUID TELEMETRY CONSOLE</div>
            <div>WEBSOCKET SERVER: <span style={{ color: '#38bdf8' }}>ws://localhost:8766</span></div>
          </div>
        </footer>

      </div>
    </TelemetryProvider>
  );
}

export default App;

import React from 'react';
import { Rocket, Activity, BarChart2, Compass, Terminal, Wifi, WifiOff } from 'lucide-react';
import { useTelemetry } from '../context/TelemetryContext';

export const Navigation = ({ activeTab, setActiveTab }) => {
  const { isConnected, packetRateHz, currentFrame } = useTelemetry();

  const tabs = [
    { id: 'cockpit', label: 'Cockpit Overview', icon: Rocket },
    { id: 'mpu', label: 'Sensor Telemetry Plots', icon: BarChart2 },
    { id: 'trajectory', label: '3D Trajectory Vector', icon: Compass },
    { id: 'terminal', label: 'Live Console & Logs', icon: Terminal },
  ];

  return (
    <header className="glass-panel" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }} id="gcs-header">
      <div className="nav-header-bar">
        
        {/* Brand Section */}
        <div className="nav-brand-section">
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Rocket style={{ width: '22px', height: '22px', color: '#38bdf8' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.05em', color: '#f3f4f6', margin: 0 }}>
              SAMMARD GCS
            </h1>
            <p style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'var(--font-mono)', margin: 0, textTransform: 'uppercase' }}>
              Mock CanSat Console // 1Hz
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="nav-tabs-wrapper" id="desktop-nav">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                aria-label={`Switch to ${tab.label}`}
                onClick={() => setActiveTab(tab.id)}
                className={`nav-tab-btn ${isActive ? 'active' : ''}`}
              >
                <Icon style={{ width: '16px', height: '16px', color: isActive ? '#38bdf8' : '#6b7280' }} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Status Metrics */}
        <div className="nav-metrics-group">
          <div style={{ padding: '0.5rem 1rem', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #1e293b', fontWeight: 700 }}>
            STATE: <span style={{ color: currentFrame.state === 'DISCONNECTED' ? '#f87171' : '#38bdf8' }}>{currentFrame.state}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
            <Activity style={{ width: '16px', height: '16px', color: '#38bdf8' }} />
            <span style={{ color: '#38bdf8', fontWeight: 700 }}>{packetRateHz} Hz</span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: isConnected ? 'rgba(56, 189, 248, 0.4)' : 'rgba(248, 113, 113, 0.4)',
              backgroundColor: '#0f172a',
              color: isConnected ? '#38bdf8' : '#f87171',
              fontWeight: 700
            }}
          >
            {isConnected ? <Wifi style={{ width: '16px', height: '16px' }} /> : <WifiOff style={{ width: '16px', height: '16px' }} />}
            <span>{isConnected ? 'ONLINE' : 'OFFLINE'}</span>
          </div>
        </div>

      </div>
    </header>
  );
};
export default Navigation;

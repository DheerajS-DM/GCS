import React from 'react';
import TelemetryWidget from './TelemetryWidget';

export default function GPSPanel() {
  return (
    <TelemetryWidget title="GPS & Recovery Tracking">
      <div style={{ flexGrow: 1, border: '1px solid var(--border-green)', marginBottom: '15px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundImage: 'radial-gradient(circle, rgba(0,255,65,0.1) 10%, transparent 10%), radial-gradient(circle, rgba(0,255,65,0.1) 10%, transparent 10%)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 10px 10px' }}>
        {/* Placeholder for map */}
        <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '0.7rem', color: 'var(--text-dim)' }}>MAP OFFLINE</div>
        <div style={{ width: '10px', height: '10px', backgroundColor: 'var(--primary-green)', borderRadius: '50%', boxShadow: '0 0 10px var(--primary-green)' }}></div>
      </div>
      
      <div className="data-row">
        <span className="data-label">LATITUDE</span>
        <span className="data-value">32.9904 N</span>
      </div>
      <div className="data-row">
        <span className="data-label">LONGITUDE</span>
        <span className="data-value">106.9750 W</span>
      </div>
      <div className="data-row">
        <span className="data-label">DISTANCE FROM PAD</span>
        <span className="data-value">0 M</span>
      </div>
      <div className="data-row" style={{ marginTop: '10px', borderTop: '1px solid rgba(0,143,17,0.3)', paddingTop: '10px' }}>
        <span className="data-label">GPS LOCK</span>
        <span className="data-value" style={{ color: 'var(--primary-green)' }}>3D (12 SATS)</span>
      </div>
    </TelemetryWidget>
  );
}

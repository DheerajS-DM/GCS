import React from 'react';
import TelemetryWidget from './TelemetryWidget';

export default function VehicleHealthPanel() {
  return (
    <TelemetryWidget title="Vehicle Health">
      <div className="data-row">
        <span className="data-label">MAIN BATTERY</span>
        <span className="data-value">12.4 V</span>
      </div>
      <div className="data-row">
        <span className="data-label">BACKUP BATTERY</span>
        <span className="data-value warning">11.8 V</span>
      </div>
      <div className="data-row">
        <span className="data-label">AVIONICS TEMP</span>
        <span className="data-value">24.5 °C</span>
      </div>
      <div className="data-row">
        <span className="data-label">BARO PRESSURE</span>
        <span className="data-value">1013.2 hPa</span>
      </div>
      
      <div style={{ marginTop: '20px', borderTop: '1px solid rgba(0,143,17,0.3)', paddingTop: '15px' }}>
        <div className="widget-title" style={{ border: 'none', marginBottom: '10px' }}>DEPLOYMENT CONTINUITY</div>
        <div className="data-row">
          <span className="data-label">DROGUE CHARGE</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="data-value">READY</span>
            <div style={{ width: '12px', height: '12px', backgroundColor: 'var(--primary-green)', borderRadius: '50%', boxShadow: '0 0 5px var(--primary-green)' }}></div>
          </span>
        </div>
        <div className="data-row">
          <span className="data-label">MAIN CHARGE</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="data-value">READY</span>
            <div style={{ width: '12px', height: '12px', backgroundColor: 'var(--primary-green)', borderRadius: '50%', boxShadow: '0 0 5px var(--primary-green)' }}></div>
          </span>
        </div>
      </div>
    </TelemetryWidget>
  );
}

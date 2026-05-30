import React, { useState, useEffect } from 'react';
import TelemetryWidget from './TelemetryWidget';

export default function AltitudePanel() {
  // Simulate some live-ish data
  const [alt, setAlt] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setAlt(prev => (prev < 100 ? prev + Math.floor(Math.random() * 5) : prev));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <TelemetryWidget title="Altitude & Dynamics">
      <div className="data-row" style={{ flexDirection: 'column', alignItems: 'center', margin: '20px 0' }}>
        <div className="data-label" style={{ marginBottom: '5px' }}>CURRENT ALTITUDE (AGL)</div>
        <div className="data-value large">{alt.toLocaleString()} <span style={{ fontSize: '1rem' }}>FT</span></div>
      </div>
      
      <div className="data-row">
        <span className="data-label">TARGET APOGEE</span>
        <span className="data-value">10,000 FT</span>
      </div>
      <div className="data-row">
        <span className="data-label">PREDICTED APOGEE</span>
        <span className="data-value">10,042 FT</span>
      </div>
      <div className="data-row">
        <span className="data-label">CURRENT VELOCITY</span>
        <span className="data-value">0 FT/S</span>
      </div>
      <div className="data-row">
        <span className="data-label">MAX VELOCITY</span>
        <span className="data-value">0 FT/S</span>
      </div>
    </TelemetryWidget>
  );
}

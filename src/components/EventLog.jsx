import React, { useState, useEffect } from 'react';
import TelemetryWidget from './TelemetryWidget';

export default function EventLog() {
  const [logs, setLogs] = useState([
    { time: 'T-00:15:00', msg: 'GCS Initialized. Awaiting telemetry link.' },
    { time: 'T-00:14:55', msg: 'LINK ESTABLISHED. RSSI -45dBm.' },
    { time: 'T-00:14:50', msg: 'Avionics sync complete. All sensors nominal.' },
    { time: 'T-00:14:45', msg: 'GPS 3D lock acquired (12 satellites).' }
  ]);

  useEffect(() => {
    // Just a fun little effect to add some random log noise
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        setLogs(prev => [
          ...prev, 
          { 
            time: `T-00:14:${Math.floor(Math.random()*60).toString().padStart(2, '0')}`, 
            msg: `RX Packet [0x${Math.floor(Math.random()*16777215).toString(16).toUpperCase()}] OK` 
          }
        ].slice(-15)); // Keep last 15
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <TelemetryWidget title="Event Log & Comm Link" className="event-log-container">
      <div className="event-log-content">
        {logs.map((log, i) => (
          <div key={i} className="log-entry">
            <span className="log-time">[{log.time}]</span>
            <span>{log.msg}</span>
          </div>
        ))}
      </div>
      
      {/* Mock Command Buttons */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
        <button style={{ flex: 1, padding: '10px', backgroundColor: 'transparent', border: '1px solid var(--border-green)', color: 'var(--primary-green)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'bold' }}>
          REQUEST CALIBRATION
        </button>
        <button style={{ flex: 1, padding: '10px', backgroundColor: 'transparent', border: '1px solid var(--alert-red)', color: 'var(--alert-red)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'bold' }}>
          MANUAL ABORT
        </button>
      </div>
    </TelemetryWidget>
  );
}

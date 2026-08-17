import React from 'react';
import { Gauge, ArrowUpRight, Zap, Thermometer, RotateCcw, Battery } from 'lucide-react';
import { useTelemetry } from '../context/TelemetryContext';

export const GaugePanel = () => {
  const { currentFrame } = useTelemetry();

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', width: '100%' }} id="gauge-panel-grid">
      
      {/* Altitude */}
      <div className="glass-panel" id="gauge-altimeter">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#9ca3af', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.1em', color: '#d1d5db' }}>ALTITUDE</span>
          <ArrowUpRight style={{ width: '20px', height: '20px', color: '#38bdf8' }} />
        </div>
        <div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
            {currentFrame.altitude.toFixed(1)} <span style={{ fontSize: '1rem', color: '#9ca3af', fontWeight: 400 }}>m</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>GPS ALT: {currentFrame.gpsAlt.toFixed(1)}m</p>
        </div>
        <div style={{ width: '100%', backgroundColor: '#030712', height: '6px', borderRadius: '4px', overflow: 'hidden', marginTop: '1rem', border: '1px solid #1e293b' }}>
          <div
            style={{ backgroundColor: '#38bdf8', height: '100%', width: `${Math.min(100, (currentFrame.altitude / 1000) * 100)}%`, transition: 'width 0.3s ease' }}
          />
        </div>
      </div>

      {/* Barometric Pressure */}
      <div className="glass-panel" id="gauge-pressure">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#9ca3af', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.1em', color: '#d1d5db' }}>BARO PRESSURE</span>
          <Gauge style={{ width: '20px', height: '20px', color: '#60a5fa' }} />
        </div>
        <div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#60a5fa' }}>
            {currentFrame.pressure.toFixed(1)} <span style={{ fontSize: '1rem', color: '#9ca3af', fontWeight: 400 }}>kPa</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>AIR PRESSURE SENSOR</p>
        </div>
        <div style={{ width: '100%', backgroundColor: '#030712', height: '6px', borderRadius: '4px', overflow: 'hidden', marginTop: '1rem', border: '1px solid #1e293b' }}>
          <div
            style={{ backgroundColor: '#60a5fa', height: '100%', width: `${Math.min(100, (currentFrame.pressure / 110) * 100)}%`, transition: 'width 0.3s ease' }}
          />
        </div>
      </div>

      {/* Temperature */}
      <div className="glass-panel" id="gauge-temp">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#9ca3af', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.1em', color: '#d1d5db' }}>TEMPERATURE</span>
          <Thermometer style={{ width: '20px', height: '20px', color: '#f87171' }} />
        </div>
        <div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#f87171' }}>
            {currentFrame.temp.toFixed(1)} <span style={{ fontSize: '1rem', color: '#9ca3af', fontWeight: 400 }}>°C</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>PROBE INTERNAL TEMP</p>
        </div>
        <div style={{ width: '100%', backgroundColor: '#030712', height: '6px', borderRadius: '4px', overflow: 'hidden', marginTop: '1rem', border: '1px solid #1e293b' }}>
          <div
            style={{ backgroundColor: '#f87171', height: '100%', width: `${Math.min(100, (Math.max(0, currentFrame.temp + 10) / 60) * 100)}%`, transition: 'width 0.3s ease' }}
          />
        </div>
      </div>

      {/* Battery Voltage */}
      <div className="glass-panel" id="gauge-voltage">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#9ca3af', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.1em', color: '#d1d5db' }}>BATTERY</span>
          <Battery style={{ width: '20px', height: '20px', color: '#fb923c' }} />
        </div>
        <div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#fb923c' }}>
            {currentFrame.voltage.toFixed(2)} <span style={{ fontSize: '1rem', color: '#9ca3af', fontWeight: 400 }}>V</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>POWER BUS VOLTAGE</p>
        </div>
        <div style={{ width: '100%', backgroundColor: '#030712', height: '6px', borderRadius: '4px', overflow: 'hidden', marginTop: '1rem', border: '1px solid #1e293b' }}>
          <div
            style={{ backgroundColor: '#fb923c', height: '100%', width: `${Math.min(100, (currentFrame.voltage / 9.0) * 100)}%`, transition: 'width 0.3s ease' }}
          />
        </div>
      </div>

      {/* Auto-Gyro Rotation Rate */}
      <div className="glass-panel" id="gauge-autogyro">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#9ca3af', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.1em', color: '#d1d5db' }}>AUTO-GYRO</span>
          <RotateCcw style={{ width: '20px', height: '20px', color: '#34d399' }} />
        </div>
        <div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#34d399' }}>
            {currentFrame.autoGyroRate} <span style={{ fontSize: '1rem', color: '#9ca3af', fontWeight: 400 }}>°/s</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>DESCENT ROTATION RATE</p>
        </div>
        <div style={{ width: '100%', backgroundColor: '#030712', height: '6px', borderRadius: '4px', overflow: 'hidden', marginTop: '1rem', border: '1px solid #1e293b' }}>
          <div
            style={{ backgroundColor: '#34d399', height: '100%', width: `${Math.min(100, (currentFrame.autoGyroRate / 500) * 100)}%`, transition: 'width 0.3s ease' }}
          />
        </div>
      </div>

    </div>
  );
};

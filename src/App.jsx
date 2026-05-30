import React from 'react';
import Header from './components/Header';
import AltitudePanel from './components/AltitudePanel';
import GPSPanel from './components/GPSPanel';
import VehicleHealthPanel from './components/VehicleHealthPanel';
import EventLog from './components/EventLog';
import './App.css';

function App() {
  return (
    <div className="app-container">
      <Header />
      <AltitudePanel />
      <GPSPanel />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <VehicleHealthPanel />
        <EventLog />
      </div>
    </div>
  );
}

export default App;

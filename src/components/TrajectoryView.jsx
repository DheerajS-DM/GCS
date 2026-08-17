import React, { useState, Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, useGLTF } from '@react-three/drei';
import { Compass, RefreshCw, AlertCircle } from 'lucide-react';
import { useTelemetry } from '../context/TelemetryContext';
import * as THREE from 'three';

const TrajectoryRocket = ({ position, pitch, roll, yaw }) => {
  const { scene } = useGLTF('/rocket.glb');

  // Compute model dimensions and calculate scale factor to fit trajectory scene bounds (~1.2 units)
  const scale = useMemo(() => {
    if (!scene) return 1.0;
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    
    // Scale model to a small size (1.2 units) relative to the 3D trajectory grid
    return maxDim > 0 ? 1.2 / maxDim : 1.0;
  }, [scene]);

  // Center model pivot point
  const offsetPosition = useMemo(() => {
    if (!scene) return [0, 0, 0];
    const box = new THREE.Box3().setFromObject(scene);
    const center = new THREE.Vector3();
    box.getCenter(center);
    return [-center.x * scale, -center.y * scale, -center.z * scale];
  }, [scene, scale]);

  // Convert roll, pitch, yaw from degrees to radians
  const pitchRad = (pitch * Math.PI) / 180;
  const rollRad = (roll * Math.PI) / 180;
  const yawRad = (yaw * Math.PI) / 180;

  // Use clone so the same GLTF model can be rendered in both canvases simultaneously
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  return (
    <group position={position} rotation={[pitchRad, rollRad, yawRad]}>
      <primitive 
        object={clonedScene} 
        scale={scale}
        position={offsetPosition}
      />
    </group>
  );
};

const TrajectoryPath3D = ({ showBaro, showGPS, showVectors, historyBuffer }) => {
  const baroPoints = [];
  const gpsPoints = [];

  const count = historyBuffer.altitude.length;
  for (let i = 0; i < count; i++) {
    const altBaro = (historyBuffer.altitude[i] || 0) / 10;
    const altGPS = ((historyBuffer.gpsAlt[i] || 250) - 250) / 10; // offset MSL to relative altitude
    const pitch = (historyBuffer.pitch[i] || 0) * (Math.PI / 180);
    const yaw = (historyBuffer.yaw[i] || 0) * (Math.PI / 180);

    const xDist = (i * 0.15) * Math.sin(pitch) * Math.cos(yaw);
    const yDist = (i * 0.15) * Math.sin(pitch) * Math.sin(yaw);

    baroPoints.push([xDist, altBaro, yDist]);
    gpsPoints.push([xDist, altGPS, yDist]);
  }

  const currentPos = baroPoints.length > 0 ? baroPoints[baroPoints.length - 1] : [0, 0, 0];
  const latestPitch = historyBuffer.pitch[historyBuffer.pitch.length - 1] || 0;
  const latestRoll = historyBuffer.roll[historyBuffer.roll.length - 1] || 0;
  const latestYaw = historyBuffer.yaw[historyBuffer.yaw.length - 1] || 0;

  return (
    <group>
      {showBaro && baroPoints.length > 1 && (
        <Line points={baroPoints} color="#38bdf8" lineWidth={3} />
      )}

      {showGPS && gpsPoints.length > 1 && (
        <Line points={gpsPoints} color="#fb923c" lineWidth={2} dashed />
      )}

      {/* Render the 3D GLB model representing the rocket's current spatial position and orientation */}
      <TrajectoryRocket 
        position={currentPos} 
        pitch={latestPitch} 
        roll={latestRoll} 
        yaw={latestYaw} 
      />

      {/* Simple velocity direction vector line arrow instead of the raw sphere/cone */}
      {showVectors && baroPoints.length > 1 && (
        <Line 
          points={[currentPos, [currentPos[0], currentPos[1] + 1.5, currentPos[2]]]} 
          color="#60a5fa" 
          lineWidth={2} 
        />
      )}
    </group>
  );
};

export const TrajectoryView = () => {
  const { historyBuffer, sendCommand } = useTelemetry();

  const [showBaro, setShowBaro] = useState(true);
  const [showGPS, setShowGPS] = useState(true);
  const [showVectors, setShowVectors] = useState(true);

  return (
    <div className="space-y-6" id="trajectory-view-container">
      
      {/* Header & Layer Controls */}
      <div className="glass-panel p-6 flex flex-wrap items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-wider flex items-center gap-3">
            <Compass className="w-6 h-6 text-cyan-400" />
            3D FLIGHT TRAJECTORY VECTOR MAP
          </h2>
          <p className="text-sm text-slate-400 mt-1">Spatial 3D flight trajectory reconstruction (Altitude + IMU Dead Reckoning)</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          <button
            onClick={() => setShowBaro(!showBaro)}
            className={`px-4 py-2 rounded-lg border transition-all ${
              showBaro ? 'bg-slate-800 border-slate-700 text-cyan-400' : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            {showBaro ? '✓ BARO PATH' : '✕ BARO PATH'}
          </button>

          <button
            onClick={() => setShowGPS(!showGPS)}
            className={`px-4 py-2 rounded-lg border transition-all ${
              showGPS ? 'bg-slate-800 border-slate-700 text-orange-400' : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            {showGPS ? '✓ GPS PATH' : '✕ GPS PATH'}
          </button>

          <button
            onClick={() => setShowVectors(!showVectors)}
            className={`px-4 py-2 rounded-lg border transition-all ${
              showVectors ? 'bg-slate-800 border-slate-700 text-blue-400' : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            {showVectors ? '✓ VELOCITY VECTOR' : '✕ VELOCITY VECTOR'}
          </button>

          <button
            onClick={() => sendCommand('CMD,1000,CAL')}
            className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            CALIBRATE ALTITUDE
          </button>
        </div>
      </div>

      {/* Trajectory Drift Alert */}
      <div className="bg-slate-900 border border-slate-800 text-slate-300 p-4 rounded-xl text-xs flex items-center gap-3 font-mono">
        <AlertCircle className="w-5 h-5 text-orange-400 shrink-0" />
        <span>
          <strong>ESTIMATED TRAJECTORY:</strong> Relative altitude is barometric. X/Y path coordinates are estimated via pitch/yaw dead reckoning. Click "Calibrate Altitude" on launch pad.
        </span>
      </div>

      {/* 3D Canvas Area */}
      <div className="glass-panel p-4 h-[600px] relative overflow-hidden" id="trajectory-canvas-wrapper">
        <Canvas antialias="true">
          <ambientLight intensity={0.8} />
          <directionalLight position={[10, 20, 10]} intensity={1.2} />

          <Suspense fallback={null}>
            <TrajectoryPath3D
              showBaro={showBaro}
              showGPS={showGPS}
              showVectors={showVectors}
              historyBuffer={historyBuffer}
            />
          </Suspense>

          <OrbitControls makeDefault enableZoom={true} enablePan={true} />
          <gridHelper args={[60, 60, '#1e293b', '#0f172a']} position={[0, 0, 0]} />
        </Canvas>
      </div>

    </div>
  );
};
export default TrajectoryView;

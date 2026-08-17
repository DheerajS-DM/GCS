import React, { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useGLTF } from '@react-three/drei';
import { useTelemetry } from '../context/TelemetryContext';
import * as THREE from 'three';

const Rocket3DModel = () => {
  const groupRef = useRef();
  const { currentFrame } = useTelemetry();
  
  // Load custom GLTF model
  const { scene } = useGLTF('/rocket.glb');

  // Compute model dimensions and calculate scale factor to fit standard viewer bounds (~3.2 units)
  const scale = useMemo(() => {
    if (!scene) return 1.0;
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    
    // Scale model so that its largest dimension is exactly 3.2 units
    const scaleFactor = maxDim > 0 ? 3.2 / maxDim : 1.0;
    console.log(`[3D] Model size:`, size, `-> Auto-scale applied:`, scaleFactor);
    return scaleFactor;
  }, [scene]);

  // Calculate position offset to center the pivot point of the model exactly at [0, 0, 0]
  const position = useMemo(() => {
    if (!scene) return [0, 0, 0];
    const box = new THREE.Box3().setFromObject(scene);
    const center = new THREE.Vector3();
    box.getCenter(center);
    
    // Offset position relative to the parent group pivot point
    const offsetX = -center.x * scale;
    const offsetY = -center.y * scale;
    const offsetZ = -center.z * scale;
    console.log(`[3D] Model center:`, center, `-> Offset position:`, [offsetX, offsetY, offsetZ]);
    return [offsetX, offsetY, offsetZ];
  }, [scene, scale]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Map pitch, roll, yaw from degrees to radians
      // Pitch: rotation around X axis (tilts forward/backward)
      // Roll: rotation around Y axis (longitudinal roll)
      // Yaw: rotation around Z axis (tilts left/right)
      const targetPitch = (currentFrame.pitch * Math.PI) / 180;
      const targetRoll = (currentFrame.roll * Math.PI) / 180;
      const targetYaw = (currentFrame.yaw * Math.PI) / 180;

      // Smooth linear interpolation damping
      groupRef.current.rotation.x += (targetPitch - groupRef.current.rotation.x) * 0.06;
      groupRef.current.rotation.y += (targetRoll - groupRef.current.rotation.y) * 0.06;
      groupRef.current.rotation.z += (targetYaw - groupRef.current.rotation.z) * 0.06;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive 
        object={scene} 
        scale={scale}
        position={position}
      />
    </group>
  );
};

const LoadingPlaceholder = () => {
  const meshRef = useRef();
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.02;
    }
  });
  return (
    <mesh ref={meshRef}>
      <cylinderGeometry args={[0.35, 0.35, 3.2, 32]} />
      <meshStandardMaterial color="#38bdf8" wireframe transparent opacity={0.6} />
    </mesh>
  );
};

export const Attitude3D = () => {
  const { currentFrame } = useTelemetry();

  return (
    <div className="glass-panel p-6 flex flex-col justify-between h-full" id="attitude-3d-panel">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-mono font-bold text-slate-300 tracking-wider uppercase">
          3D ATTITUDE CONSOLE (P / R / Y)
        </h3>
        <div className="flex space-x-4 text-xs font-mono">
          <span className="text-slate-400">PITCH: <strong className="text-cyan-400">{currentFrame.pitch.toFixed(1)}°</strong></span>
          <span className="text-slate-400">ROLL: <strong className="text-orange-400">{currentFrame.roll.toFixed(1)}°</strong></span>
          <span className="text-slate-400">YAW: <strong className="text-cyan-400">{currentFrame.yaw.toFixed(1)}°</strong></span>
        </div>
      </div>

      <div className="w-full h-[400px] rounded-xl overflow-hidden bg-slate-950 border border-slate-800 relative">
        <Canvas antialias="true">
          <PerspectiveCamera makeDefault position={[0, 0, 5.0]} fov={50} />
          
          {/* High-fidelity lighting setup */}
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 8, 5]} intensity={1.5} color="#c0e2ff" />
          <directionalLight position={[-5, 4, -5]} intensity={1.0} color="#ffffff" />
          <pointLight position={[0, 2, 2]} intensity={0.6} />
          
          <Suspense fallback={<LoadingPlaceholder />}>
            <Rocket3DModel />
          </Suspense>
          
          <OrbitControls enableZoom={true} enablePan={false} maxPolarAngle={Math.PI / 1.3} minDistance={2.0} maxDistance={10.0} />
          <gridHelper args={[16, 16, '#1e293b', '#0f172a']} position={[0, -2.0, 0]} />
        </Canvas>
        
        {/* Navigation Helper */}
        <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-800 rounded px-2.5 py-1 text-[10px] font-mono text-slate-400">
          GLB Model: rocket.glb // Orbit Enabled
        </div>
      </div>
    </div>
  );
};
export default Attitude3D;

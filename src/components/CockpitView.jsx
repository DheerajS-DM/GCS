import React from 'react';
import { Attitude3D } from './Attitude3D';
import { GaugePanel } from './GaugePanel';
import { CommandPanel } from './CommandPanel';
import { CustomChart } from './CustomChart';
import { useTelemetry } from '../context/TelemetryContext';
import { FileSpreadsheet, ShieldAlert, Cpu, Compass, Navigation } from 'lucide-react';

export const CockpitView = () => {
  const { historyBuffer, currentFrame, exportSessionCSV } = useTelemetry();

  return (
    <div className="space-y-8" id="cockpit-view-container">
      {/* Flight Gauges */}
      <GaugePanel />

      {/* Main Grid Layout: 3D Attitude & Altitude Plot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* 3D Attitude Model (4 cols) */}
        <div className="lg:col-span-4">
          <Attitude3D />
        </div>

        {/* Real-time Altitude Plot (8 cols) */}
        <div className="lg:col-span-8">
          <CustomChart
            title="REAL-TIME ALTITUDE DATA (BAROMETRIC VS GPS)"
            labels={historyBuffer.timestamps}
            yAxisLabel="Meters (m)"
            height={400}
            datasets={[
              {
                label: 'Relative Baro Alt (m)',
                data: historyBuffer.altitude,
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.08)',
                fill: true
              },
              {
                label: 'GPS MSL Alt (m)',
                data: historyBuffer.gpsAlt,
                borderColor: '#fb923c',
                fill: false
              }
            ]}
          />
        </div>
      </div>

      {/* Real-Time Tabular Telemetry Dashboard */}
      <div className="glass-panel p-6" id="telemetry-dashboard-panel">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-mono font-bold text-slate-100 uppercase tracking-wider">
              TELEMETRY GRID (ALL 25 CONSTRAINED DATA POINTS)
            </h3>
          </div>
          
          <button
            onClick={exportSessionCSV}
            className="px-4 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-cyan-400 font-mono text-xs hover:border-cyan-500/50 hover:bg-cyan-950/20 transition-all flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            EXPORT csv LOG
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          
          {/* Mission Control Parameters */}
          <div className="bg-slate-950/50 border border-slate-900 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-mono font-bold text-slate-400 border-b border-slate-900 pb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              MISSION & COMMS
            </h4>
            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between"><span className="text-slate-500">TEAM ID:</span><span className="text-cyan-400 font-bold">{currentFrame.teamId}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">MISSION TIME:</span><span className="text-slate-300">{currentFrame.missionTime}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">PACKET TYPE:</span><span className="text-slate-300 font-bold">{currentFrame.packetType}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">PACKET COUNT:</span><span className="text-slate-300">{currentFrame.packetCount}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">OP MODE:</span><span className="text-slate-300">{currentFrame.mode === 'F' ? 'FLIGHT (F)' : 'SIMULATION (S)'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">STATE:</span><span className="text-emerald-400 font-bold">{currentFrame.state}</span></div>
            </div>
          </div>

          {/* Environmental Sensors */}
          <div className="bg-slate-950/50 border border-slate-900 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-mono font-bold text-slate-400 border-b border-slate-900 pb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              ATMOSPHERE & ELECTRICS
            </h4>
            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between"><span className="text-slate-500">BARO ALTITUDE:</span><span className="text-cyan-400">{currentFrame.altitude.toFixed(1)} m</span></div>
              <div className="flex justify-between"><span className="text-slate-500">TEMPERATURE:</span><span className="text-slate-300">{currentFrame.temp.toFixed(1)} °C</span></div>
              <div className="flex justify-between"><span className="text-slate-500">PRESSURE:</span><span className="text-slate-300">{currentFrame.pressure.toFixed(1)} kPa</span></div>
              <div className="flex justify-between"><span className="text-slate-500">VOLTAGE:</span><span className="text-slate-300">{currentFrame.voltage.toFixed(2)} V</span></div>
              <div className="flex justify-between"><span className="text-slate-500">AUTO-GYRO RATE:</span><span className="text-slate-300 font-bold">{currentFrame.autoGyroRate} °/s</span></div>
              <div className="flex justify-between"><span className="text-slate-500">VERT VELOCITY:</span><span className="text-orange-400 font-bold">{currentFrame.vsi.toFixed(1)} m/s</span></div>
            </div>
          </div>

          {/* IMU Inertial Sensors */}
          <div className="bg-slate-950/50 border border-slate-900 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-mono font-bold text-slate-400 border-b border-slate-900 pb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-400" />
              IMU & MAGNETOMETER
            </h4>
            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">GYRO (R/P/Y):</span>
                <span className="text-slate-300 font-bold">
                  {currentFrame.gyroR.toFixed(0)}/{currentFrame.gyroP.toFixed(0)}/{currentFrame.gyroY.toFixed(0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ACCEL (R/P/Y):</span>
                <span className="text-slate-300">
                  {currentFrame.accelR.toFixed(1)}/{currentFrame.accelP.toFixed(1)}/{currentFrame.accelY.toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">MAGNETO (X/Y/Z):</span>
                <span className="text-slate-300">
                  {currentFrame.magR.toFixed(2)}/{currentFrame.magP.toFixed(2)}/{currentFrame.magY.toFixed(2)} G
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">PITCH ANGLE:</span>
                <span className="text-cyan-400">{currentFrame.pitch.toFixed(1)}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ROLL ANGLE:</span>
                <span className="text-orange-400">{currentFrame.roll.toFixed(1)}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">YAW ANGLE:</span>
                <span className="text-slate-300">{currentFrame.yaw.toFixed(1)}°</span>
              </div>
            </div>
          </div>

          {/* GPS Receiver Status */}
          <div className="bg-slate-950/50 border border-slate-900 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-mono font-bold text-slate-400 border-b border-slate-900 pb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              GPS RECEIVER
            </h4>
            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between"><span className="text-slate-500">GPS TIME:</span><span className="text-slate-300">{currentFrame.gpsTime}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">GPS LATITUDE:</span><span className="text-slate-300">{currentFrame.gpsLat.toFixed(4)} °N</span></div>
              <div className="flex justify-between"><span className="text-slate-500">GPS LONGITUDE:</span><span className="text-slate-300">{currentFrame.gpsLon.toFixed(4)} °W</span></div>
              <div className="flex justify-between"><span className="text-slate-500">GPS ALTITUDE:</span><span className="text-cyan-400 font-bold">{currentFrame.gpsAlt.toFixed(1)} m</span></div>
              <div className="flex justify-between"><span className="text-slate-500">GPS SATELLITES:</span><span className="text-emerald-400 font-bold">{currentFrame.gpsSats} SATS</span></div>
              <div className="flex justify-between"><span className="text-slate-500">LAST CMD ECHO:</span><span className="text-purple-400 font-bold truncate max-w-[120px]">{currentFrame.cmdEcho}</span></div>
            </div>
          </div>

        </div>
      </div>

      {/* Command & Control Bar */}
      <CommandPanel />
    </div>
  );
};

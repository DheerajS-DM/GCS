import React from 'react';
import { CustomChart } from './CustomChart';
import { useTelemetry } from '../context/TelemetryContext';

export const MpuGraphsView = () => {
  const { historyBuffer } = useTelemetry();

  return (
    <div className="space-y-8" id="mpu-graphs-view-container">
      
      {/* Header */}
      <div className="glass-panel p-6">
        <h2 className="text-xl font-bold text-slate-100 tracking-wider">SENSOR TELEMETRY PLOTS</h2>
        <p className="text-sm text-slate-400 mt-1">Real-time plots for 3-axis Gyroscope, Accelerometer, Magnetometer, Auto-gyro, and Power metrics</p>
      </div>

      {/* Gyroscope rates */}
      <div className="space-y-4">
        <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest px-2">
          1. GYROSCOPE ANGULAR RATES (°/s)
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <CustomChart
            title="GYRO ROLL (GYRO_R)"
            labels={historyBuffer.timestamps}
            yAxisLabel="deg/s"
            height={260}
            datasets={[
              { label: 'Roll Rate', data: historyBuffer.gyroR, borderColor: '#38bdf8' }
            ]}
          />

          <CustomChart
            title="GYRO PITCH (GYRO_P)"
            labels={historyBuffer.timestamps}
            yAxisLabel="deg/s"
            height={260}
            datasets={[
              { label: 'Pitch Rate', data: historyBuffer.gyroP, borderColor: '#fb923c' }
            ]}
          />

          <CustomChart
            title="GYRO YAW (GYRO_Y)"
            labels={historyBuffer.timestamps}
            yAxisLabel="deg/s"
            height={260}
            datasets={[
              { label: 'Yaw Rate', data: historyBuffer.gyroY, borderColor: '#f87171' }
            ]}
          />
        </div>
      </div>

      {/* Accelerometer */}
      <div className="space-y-4">
        <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest px-2">
          2. ACCELEROMETER AXES (m/s²)
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <CustomChart
            title="ACCEL ROLL (ACCEL_R)"
            labels={historyBuffer.timestamps}
            yAxisLabel="m/s²"
            height={260}
            datasets={[
              { label: 'Accel X/Roll', data: historyBuffer.accelR, borderColor: '#38bdf8' }
            ]}
          />

          <CustomChart
            title="ACCEL PITCH (ACCEL_P)"
            labels={historyBuffer.timestamps}
            yAxisLabel="m/s²"
            height={260}
            datasets={[
              { label: 'Accel Y/Pitch', data: historyBuffer.accelP, borderColor: '#fb923c' }
            ]}
          />

          <CustomChart
            title="ACCEL YAW (ACCEL_Y)"
            labels={historyBuffer.timestamps}
            yAxisLabel="m/s²"
            height={260}
            datasets={[
              { label: 'Accel Z/Yaw', data: historyBuffer.accelY, borderColor: '#f87171' }
            ]}
          />
        </div>
      </div>

      {/* Magnetometer */}
      <div className="space-y-4">
        <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest px-2">
          3. MAGNETOMETER AXES (GAUSS)
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <CustomChart
            title="MAGNETO R (MAG_R)"
            labels={historyBuffer.timestamps}
            yAxisLabel="Gauss"
            height={260}
            datasets={[
              { label: 'Mag X', data: historyBuffer.magR, borderColor: '#38bdf8' }
            ]}
          />

          <CustomChart
            title="MAGNETO P (MAG_P)"
            labels={historyBuffer.timestamps}
            yAxisLabel="Gauss"
            height={260}
            datasets={[
              { label: 'Mag Y', data: historyBuffer.magP, borderColor: '#fb923c' }
            ]}
          />

          <CustomChart
            title="MAGNETO Y (MAG_Y)"
            labels={historyBuffer.timestamps}
            yAxisLabel="Gauss"
            height={260}
            datasets={[
              { label: 'Mag Z', data: historyBuffer.magY, borderColor: '#f87171' }
            ]}
          />
        </div>
      </div>

      {/* Auto-Gyro & Miscellaneous plots */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CustomChart
          title="AUTO-GYRO ROTATION SPEED"
          labels={historyBuffer.timestamps}
          yAxisLabel="deg/s"
          height={280}
          datasets={[
            { label: 'Auto-gyro rate', data: historyBuffer.autoGyroRate, borderColor: '#34d399', backgroundColor: 'rgba(52, 211, 153, 0.05)', fill: true }
          ]}
        />

        <CustomChart
          title="BATTERY VOLTAGE DECAY"
          labels={historyBuffer.timestamps}
          yAxisLabel="Volts (V)"
          height={280}
          datasets={[
            { label: 'Bus Voltage', data: historyBuffer.voltage, borderColor: '#fb923c', backgroundColor: 'rgba(251, 146, 60, 0.05)', fill: true }
          ]}
        />

        <CustomChart
          title="PROBE INTERNAL TEMP"
          labels={historyBuffer.timestamps}
          yAxisLabel="Celsius (°C)"
          height={280}
          datasets={[
            { label: 'Temp', data: historyBuffer.temp, borderColor: '#f87171', backgroundColor: 'rgba(248, 113, 113, 0.05)', fill: true }
          ]}
        />
      </div>

    </div>
  );
};

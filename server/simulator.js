import { WebSocketServer } from 'ws';

const PORT = process.env.WS_PORT || 8766;
const wss = new WebSocketServer({ port: PORT });

console.log(`[GCS SIMULATOR] 1Hz Telemetry Simulator running on ws://localhost:${PORT}`);

const TEAM_ID = '1000';
let flightTime = 0; // seconds
let packetCount = 0;
let mode = 'F'; // 'F' = Flight, 'S' = Simulation
let simEnabled = false;
let simActive = false;
let state = 'LAUNCH_PAD'; // LAUNCH_PAD, ASCENT, APOGEE, DESCENT, PROBE_RELEASE, LANDED
let lastCommandEcho = 'None';
let altitudeOffset = 0; // to support CAL (calibrate to zero)

// Physics variables
let baseAltitude = 0; // relative to launch pad
let velocity = 0;
let simulatedPressurePa = 101325; // default sea level pressure in Pascals
let temp = 25.0;
let gyroRoll = 0, gyroPitch = 0, gyroYaw = 0;
let accelRoll = 0, accelPitch = 0, accelYaw = 9.81; // m/s^2
let magX = 0.35, magY = 0.12, magZ = -0.42; // Gauss
let autoGyroRate = 0;
let gpsSats = 0;
let gpsAlt = 0;
let gpsLat = 12.9716;
let gpsLon = 77.5946;

// Track client connections
wss.on('connection', (ws) => {
  console.log('[GCS SIMULATOR] Client connected to simulator stream.');

  ws.on('message', (message) => {
    try {
      const command = message.toString().trim();
      console.log(`[GCS SIMULATOR] Received Command: ${command}`);

      // Commands are in CSV format: CMD,TEAM_ID,CMD_TYPE,ARGS...
      const parts = command.split(',');
      if (parts[0] !== 'CMD' || parts[1] !== TEAM_ID) {
        console.log(`[GCS SIMULATOR] Ignored command (invalid format or team ID): ${command}`);
        return;
      }

      const cmdType = parts[2];
      lastCommandEcho = command.replace(/,/g, ' '); // Clean for CMD_ECHO (no commas)

      if (cmdType === 'CX') {
        // CX - Telemetry On/Off Command: CMD,<TEAM_ID>,CX,<ON_OFF>
        const onOff = parts[3];
        console.log(`[GCS SIMULATOR] Telemetry CX command set to ${onOff}`);
      } else if (cmdType === 'ST') {
        // ST - Set Time: CMD,<TEAM_ID>,ST,<UTC_TIME>|GPS
        const timeVal = parts[3];
        console.log(`[GCS SIMULATOR] Time synchronized to: ${timeVal}`);
      } else if (cmdType === 'SIM') {
        // SIM - Simulation Mode Control Command: CMD,<TEAM_ID>,SIM,<MODE>
        const simMode = parts[3];
        if (simMode === 'ENABLE') {
          simEnabled = true;
          console.log('[GCS SIMULATOR] Simulation mode ENABLED.');
        } else if (simMode === 'ACTIVATE') {
          if (simEnabled) {
            simActive = true;
            mode = 'S';
            state = 'DESCENT'; // Simulation mode is used to simulate descent
            flightTime = 0;
            console.log('[GCS SIMULATOR] Simulation mode ACTIVATED.');
          } else {
            console.log('[GCS SIMULATOR] Cannot activate simulation mode: not enabled.');
            lastCommandEcho = 'SIM ACTIVATE FAILED (NOT ENABLED)';
          }
        } else if (simMode === 'DISABLE') {
          simEnabled = false;
          simActive = false;
          mode = 'F';
          state = 'LAUNCH_PAD';
          console.log('[GCS SIMULATOR] Simulation mode DISABLED.');
        }
      } else if (cmdType === 'SIMP') {
        // SIMP - Simulated Pressure Data: CMD,<TEAM_ID>,SIMP,<PRESSURE>
        if (simActive) {
          const pressPa = parseFloat(parts[3]);
          simulatedPressurePa = pressPa;
          
          // Calculate altitude based on simulated pressure in Pascals
          // standard formula: alt = 44330 * (1 - (p/101325)^0.1903)
          const calcAlt = 44330 * (1 - Math.pow(pressPa / 101325, 0.190284));
          baseAltitude = Math.max(0, calcAlt - altitudeOffset);
          console.log(`[GCS SIMULATOR] SIMP pressure received: ${pressPa} Pa -> Altitude: ${baseAltitude.toFixed(1)}m`);
        } else {
          console.log('[GCS SIMULATOR] SIMP command ignored: Simulation not active.');
        }
      } else if (cmdType === 'CAL') {
        // CAL - Calibrate Altitude to Zero: CMD,<TEAM_ID>,CAL
        // Calibrate current altitude to 0
        if (mode === 'S') {
          const calcAlt = 44330 * (1 - Math.pow(simulatedPressurePa / 101325, 0.190284));
          altitudeOffset = calcAlt;
        } else {
          altitudeOffset = baseAltitude;
        }
        baseAltitude = 0;
        console.log(`[GCS SIMULATOR] Calibrated altitude to zero. Offset: ${altitudeOffset.toFixed(1)}m`);
      }
    } catch (err) {
      console.error('[GCS SIMULATOR] Error handling command:', err.message);
    }
  });

  ws.on('close', () => {
    console.log('[GCS SIMULATOR] Client disconnected.');
  });
});

// Helper to format UTC time as hh:mm:ss
function getUTCTimeString() {
  const d = new Date();
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

// 1Hz Broadcast loop (1000ms interval)
setInterval(() => {
  if (wss.clients.size === 0) return;

  packetCount++;
  flightTime += 1.0;

  const missionTimeStr = getUTCTimeString();

  if (mode === 'F') {
    // Normal Flight Physics Simulation
    // 0-10s: LAUNCH_PAD
    // 10-25s: ASCENT (Rocket motor burn)
    // 25-28s: APOGEE & EJECTION
    // 28-60s: DESCENT (combined parachute, 20m/s)
    // 60-120s: PROBE_RELEASE (separated probe, 5m/s)
    // >120s: LANDED
    if (state === 'LAUNCH_PAD') {
      baseAltitude = 0;
      velocity = 0;
      accelRoll = 0; accelPitch = 0; accelYaw = 9.81;
      gyroRoll = 0.1 * Math.sin(flightTime);
      gyroPitch = 0.1 * Math.cos(flightTime);
      gyroYaw = 0.05 * Math.sin(flightTime);
      gpsSats = 6;
      gpsAlt = 250.0; // MSL altitude
      
      if (flightTime >= 10) {
        state = 'ASCENT';
        console.log('[GCS SIMULATOR] State transitioned to ASCENT (Launch!)');
      }
    } else if (state === 'ASCENT') {
      gpsSats = 9;
      // ~3G average launch acceleration
      const thrustAccel = 28.5 + (Math.random() - 0.5) * 4.0;
      accelYaw = thrustAccel;
      accelRoll = (Math.random() - 0.5) * 2.0;
      accelPitch = (Math.random() - 0.5) * 2.0;
      
      // Roll rate increases during ascent due to spin-stabilization fins
      gyroRoll = 360.0 + (Math.random() - 0.5) * 20.0; // high spin rate
      gyroPitch = 15.0 * Math.sin(flightTime);
      gyroYaw = 5.0 * Math.cos(flightTime);

      velocity += (thrustAccel - 9.81) * 1.0;
      baseAltitude += velocity * 1.0;
      gpsAlt = 250.0 + baseAltitude;

      if (flightTime >= 25) {
        state = 'APOGEE';
        console.log(`[GCS SIMULATOR] State transitioned to APOGEE at altitude ${baseAltitude.toFixed(1)}m`);
      }
    } else if (state === 'APOGEE') {
      accelYaw = -2.0; // momentarily weightless
      gyroRoll = 10.0;
      gyroPitch = 90.0; // horizontal orientation at tipping
      gyroYaw = 2.0;
      velocity = 0;
      gpsSats = 11;
      
      if (flightTime >= 28) {
        state = 'DESCENT';
        console.log('[GCS SIMULATOR] State transitioned to DESCENT. Container parachute deployed.');
      }
    } else if (state === 'DESCENT') {
      gpsSats = 12;
      // Descent velocity under container parachute must be 20 +/- 5 m/s (Requirement M4)
      // Let's use 20.0 m/s descent rate
      velocity = -20.0 + (Math.random() - 0.5) * 1.0;
      baseAltitude = Math.max(0, baseAltitude + velocity * 1.0);
      gpsAlt = 250.0 + baseAltitude;

      // Lower acceleration, slight pendulum motion
      accelYaw = 9.81 + (Math.random() - 0.5) * 0.5;
      accelRoll = 2.0 * Math.sin(flightTime * 0.5);
      accelPitch = 2.0 * Math.cos(flightTime * 0.5);
      
      gyroRoll = 12.0 * Math.sin(flightTime * 0.2); // Slow spin-stabilized camera
      gyroPitch = 5.0 * Math.cos(flightTime * 0.5);
      gyroYaw = 3.0 * Math.sin(flightTime * 0.5);

      // Separate at 75% of apogee altitude
      // Apogee altitude was around 1000m (since 15s ascent at avg velocity ~60m/s is around 900-1000m)
      // Let's say separation occurs when descending below 700m
      if (baseAltitude <= 700.0) {
        state = 'PROBE_RELEASE';
        console.log(`[GCS SIMULATOR] State transitioned to PROBE_RELEASE at altitude ${baseAltitude.toFixed(1)}m (75% apogee)`);
      }
    } else if (state === 'PROBE_RELEASE') {
      gpsSats = 12;
      // Descent velocity of separated probe must be 5 +/- 2 m/s (Requirement M5)
      // Let's use 5.2 m/s descent rate
      velocity = -5.2 + (Math.random() - 0.5) * 0.4;
      baseAltitude = Math.max(0, baseAltitude + velocity * 1.0);
      gpsAlt = 250.0 + baseAltitude;

      // Stable descent, minimal rotation
      accelYaw = 9.81;
      accelRoll = 0.2 * Math.sin(flightTime);
      accelPitch = 0.2 * Math.cos(flightTime);
      
      gyroRoll = 0.5 * Math.sin(flightTime);
      gyroPitch = 0.2 * Math.cos(flightTime);
      gyroYaw = 0.2 * Math.sin(flightTime);

      if (baseAltitude <= 0.1) {
        state = 'LANDED';
        baseAltitude = 0;
        velocity = 0;
        console.log('[GCS SIMULATOR] State transitioned to LANDED. Audio beacon activated.');
      }
    } else if (state === 'LANDED') {
      gpsSats = 10;
      baseAltitude = 0;
      velocity = 0;
      accelRoll = 0; accelPitch = 0; accelYaw = 9.81;
      gyroRoll = 0; gyroPitch = 0; gyroYaw = 0;
    }

    // Convert simulated altitude to pressure (kPa)
    // p = 101.325 * (1 - alt / 44330)^5.25588
    const altMSL = 250.0 + baseAltitude + altitudeOffset;
    simulatedPressurePa = 101325 * Math.pow(1 - altMSL / 44330, 5.25588);
  } else {
    // Simulation Mode
    // Altitude is determined by SIMP commands updating simulatedPressurePa
    // Let's add some slight noise to other sensors
    gpsSats = 8;
    gyroRoll = 10.0 * Math.sin(flightTime * 0.1);
    gyroPitch = 5.0 * Math.cos(flightTime * 0.1);
    gyroYaw = 2.0 * Math.sin(flightTime * 0.1);

    accelRoll = 0.5 * Math.sin(flightTime);
    accelPitch = 0.5 * Math.cos(flightTime);
    accelYaw = 9.81 + 0.2 * Math.sin(flightTime * 2);

    gpsAlt = 250.0 + baseAltitude;

    if (simActive) {
      if (baseAltitude <= 0.1 && flightTime > 10) {
        state = 'LANDED';
      }
    }
  }

  // Update other sensor fields
  temp = Number((24.5 - (baseAltitude / 150.0) + (Math.random() - 0.5) * 0.2).toFixed(1));
  const voltage = Number((8.4 - (packetCount * 0.001) + (Math.random() - 0.5) * 0.05).toFixed(1)); // degrading battery
  
  // Magnetometer simulation (slight oscillation with orientation)
  magX = Number((0.35 + 0.05 * Math.sin(flightTime * 0.2)).toFixed(3));
  magY = Number((0.12 + 0.03 * Math.cos(flightTime * 0.2)).toFixed(3));
  magZ = Number((-0.42 + 0.02 * Math.sin(flightTime * 0.1)).toFixed(3));

  // Auto-gyro rotation rate: High spin during ascent, low during descent
  if (state === 'ASCENT') {
    autoGyroRate = Math.round(360 + (Math.random() - 0.5) * 10);
  } else if (state === 'DESCENT') {
    autoGyroRate = Math.round(45 + (Math.random() - 0.5) * 5);
  } else if (state === 'PROBE_RELEASE') {
    autoGyroRate = Math.round(5 + (Math.random() - 0.5) * 2);
  } else {
    autoGyroRate = 0;
  }

  // GPS Coordinates walk
  if (state !== 'LAUNCH_PAD') {
    gpsLat += 0.00002;
    gpsLon += 0.00001;
  }

  // Calculate pressure in kPa (1 kPa = 1000 Pa)
  const pressureKPa = Number((simulatedPressurePa / 1000).toFixed(1));

  // Build raw ASCII comma-separated packet
  // Format: TEAM_ID, MISSION_TIME, PACKET_TYPE, PACKET_COUNT, MODE, STATE, ALTITUDE, TEMPERATURE, PRESSURE, VOLTAGE, GYRO_R, GYRO_P, GYRO_Y, ACCEL_R, ACCEL_P, ACCEL_Y, MAG_R, MAG_P, MAG_Y, AUTO_GYRO_ROTATION_RATE, GPS_TIME, GPS_ALTITUDE, GPS_LATITUDE, GPS_LONGITUDE, GPS_SATS, CMD_ECHO
  const telemetryPacket = [
    TEAM_ID,
    missionTimeStr,
    'P', // PACKET_TYPE
    packetCount,
    mode,
    state,
    Number(baseAltitude.toFixed(1)),
    temp,
    pressureKPa,
    voltage,
    Number(gyroRoll.toFixed(1)),
    Number(gyroPitch.toFixed(1)),
    Number(gyroYaw.toFixed(1)),
    Number(accelRoll.toFixed(2)),
    Number(accelPitch.toFixed(2)),
    Number(accelYaw.toFixed(2)),
    magX,
    magY,
    magZ,
    autoGyroRate,
    missionTimeStr, // GPS_TIME
    Number(gpsAlt.toFixed(1)),
    Number(gpsLat.toFixed(4)),
    Number(gpsLon.toFixed(4)),
    gpsSats,
    lastCommandEcho
  ].join(',');

  console.log(`[SIM TELEMETRY OUT] ${telemetryPacket}`);

  // Broadcast to all websocket connections
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(telemetryPacket);
    }
  });
}, 1000); // 1000ms = 1Hz rate (Requirement X4)

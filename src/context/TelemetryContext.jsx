import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

const TelemetryContext = createContext(null);

const MAX_RING_BUFFER_SIZE = 300; // 300 points = 5 minutes of data at 1Hz
const WS_URL = 'ws://localhost:8766';

const defaultFrame = {
  teamId: '1000',
  missionTime: '00:00:00',
  packetType: 'P',
  packetCount: 0,
  mode: 'F', // F = Flight, S = Simulation
  state: 'DISCONNECTED',
  altitude: 0.0,
  temp: 25.0,
  pressure: 101.3, // kPa
  voltage: 0.0,
  gyroR: 0.0, gyroP: 0.0, gyroY: 0.0,
  accelR: 0.0, accelP: 0.0, accelY: 9.81,
  magR: 0.0, magP: 0.0, magY: 0.0,
  autoGyroRate: 0,
  gpsTime: '00:00:00',
  gpsAlt: 0.0,
  gpsLat: 0.0,
  gpsLon: 0.0,
  gpsSats: 0,
  cmdEcho: 'None',
  pitch: 0.0,
  roll: 0.0,
  yaw: 0.0,
  vsi: 0.0
};

export const TelemetryProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [packetRateHz, setPacketRateHz] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(defaultFrame);
  
  // Track custom manual WS port URL
  const [customWsUrl, setCustomWsUrl] = useState(WS_URL);
  
  // Local browser simulation toggle
  const [localSimActive, setLocalSimActive] = useState(false);

  const [historyBuffer, setHistoryBuffer] = useState({
    timestamps: [],
    altitude: [],
    temp: [],
    pressure: [],
    voltage: [],
    gyroR: [], gyroP: [], gyroY: [],
    accelR: [], accelP: [], accelY: [],
    magR: [], magP: [], magY: [],
    autoGyroRate: [],
    gpsAlt: [],
    pitch: [], roll: [], yaw: [],
    vsi: []
  });

  const [terminalLogs, setTerminalLogs] = useState([
    { id: 1, time: new Date().toLocaleTimeString(), text: '[GCS INIT] Ground Control System ready.', type: 'INFO' }
  ]);

  const wsRef = useRef(null);
  const packetCountRef = useRef(0);
  const bufferRef = useRef({
    timestamps: [],
    altitude: [],
    temp: [],
    pressure: [],
    voltage: [],
    gyroR: [], gyroP: [], gyroY: [],
    accelR: [], accelP: [], accelY: [],
    magR: [], magP: [], magY: [],
    autoGyroRate: [],
    gpsAlt: [],
    pitch: [], roll: [], yaw: [],
    vsi: []
  });
  
  const latestFrameRef = useRef(defaultFrame);
  const prevAltitudeRef = useRef(0);
  const localSimIntervalRef = useRef(null);

  // Filter-integrated orientation tracking
  const orientationRef = useRef({ pitch: 0, roll: 0, yaw: 0 });

  const logToTerminal = (text, type = 'INFO') => {
    setTerminalLogs((prev) => [
      ...prev.slice(-300),
      { id: Date.now() + Math.random(), time: new Date().toLocaleTimeString(), text, type }
    ]);
  };

  // Raw Telemetry ASCII Parser
  const parseRawTelemetry = (asciiString) => {
    const line = asciiString.trim();
    if (!line) return null;

    // Format: TEAM_ID, MISSION_TIME, PACKET_TYPE, PACKET_COUNT, MODE, STATE, ALTITUDE, TEMPERATURE, PRESSURE, VOLTAGE, GYRO_R, GYRO_P, GYRO_Y, ACCEL_R, ACCEL_P, ACCEL_Y, MAG_R, MAG_P, MAG_Y, AUTO_GYRO_ROTATION_RATE, GPS_TIME, GPS_ALTITUDE, GPS_LATITUDE, GPS_LONGITUDE, GPS_SATS, CMD_ECHO
    const parts = line.split(',');
    
    // Check if valid CSV line with at least 25 fields
    if (parts.length < 25) {
      // Could be a command echo or status packet, log it to terminal
      if (line.startsWith('[GCS') || line.startsWith('CMD')) {
        return null; // Let standard logger output it
      }
      throw new Error(`Invalid telemetry packet length: expected >= 26 fields, got ${parts.length}`);
    }

    const teamId = parts[0];
    const missionTime = parts[1];
    const packetType = parts[2];
    const packetCount = parseInt(parts[3]) || 0;
    const mode = parts[4];
    const state = parts[5];
    const altitude = parseFloat(parts[6]) || 0.0;
    const temp = parseFloat(parts[7]) || 0.0;
    const pressure = parseFloat(parts[8]) || 0.0;
    const voltage = parseFloat(parts[9]) || 0.0;
    
    // Angular rates in deg/s
    const gyroR = parseFloat(parts[10]) || 0.0;
    const gyroP = parseFloat(parts[11]) || 0.0;
    const gyroY = parseFloat(parts[12]) || 0.0;
    
    // Accel readings in m/s^2 (or g-force)
    const accelR = parseFloat(parts[13]) || 0.0;
    const accelP = parseFloat(parts[14]) || 0.0;
    const accelY = parseFloat(parts[15]) || 9.81;

    // Magnetometer in Gauss
    const magR = parseFloat(parts[16]) || 0.0;
    const magP = parseFloat(parts[17]) || 0.0;
    const magY = parseFloat(parts[18]) || 0.0;

    const autoGyroRate = parseInt(parts[19]) || 0;
    const gpsTime = parts[20];
    const gpsAlt = parseFloat(parts[21]) || 0.0;
    const gpsLat = parseFloat(parts[22]) || 0.0;
    const gpsLon = parseFloat(parts[23]) || 0.0;
    const gpsSats = parseInt(parts[24]) || 0;
    const cmdEcho = parts[25] || 'None';

    // Calculate vertical speed (VSI) in m/s
    const vsi = Number((altitude - prevAltitudeRef.current).toFixed(2));
    prevAltitudeRef.current = altitude;

    // Calculate Pitch, Roll, Yaw using Complementary Filter
    const dt = 1.0; // telemetry updates at 1Hz
    let pitchVal = orientationRef.current.pitch;
    let rollVal = orientationRef.current.roll;
    let yawVal = orientationRef.current.yaw;

    // Accel tilt estimation
    // Pitch (rotation around lateral X axis)
    const accelPitchEst = Math.atan2(-accelR, Math.sqrt(accelP * accelP + accelY * accelY)) * (180 / Math.PI);
    // Roll (rotation around longitudinal Y axis)
    const accelRollEst = Math.atan2(accelP, accelY) * (180 / Math.PI);

    // Complementary filter updates (90% gyro integration + 10% accel tilt)
    pitchVal = 0.9 * (pitchVal + gyroP * dt) + 0.1 * accelPitchEst;
    rollVal = 0.9 * (rollVal + gyroR * dt) + 0.1 * accelRollEst;
    
    // Yaw just integrates gyro rates or drifts
    yawVal = yawVal + gyroY * dt;

    // Normalize angles to -180 to 180 range
    const normalizeAngle = (angle) => {
      let a = angle % 360;
      if (a > 180) a -= 360;
      if (a < -180) a += 360;
      return a;
    };

    pitchVal = normalizeAngle(pitchVal);
    rollVal = normalizeAngle(rollVal);
    yawVal = normalizeAngle(yawVal);

    orientationRef.current = { pitch: pitchVal, roll: rollVal, yaw: yawVal };

    return {
      teamId,
      missionTime,
      packetType,
      packetCount,
      mode,
      state,
      altitude,
      temp,
      pressure,
      voltage,
      gyroR, gyroP, gyroY,
      accelR, accelP, accelY,
      magR, magP, magY,
      autoGyroRate,
      gpsTime,
      gpsAlt,
      gpsLat,
      gpsLon,
      gpsSats,
      cmdEcho,
      pitch: Number(pitchVal.toFixed(2)),
      roll: Number(rollVal.toFixed(2)),
      yaw: Number(yawVal.toFixed(2)),
      vsi
    };
  };

  // Reconnectable WebSocket Manager
  useEffect(() => {
    let reconnectTimeout = null;

    const connect = () => {
      // Don't connect via WebSockets if local simulation is running
      if (localSimActive) return;

      console.log('[GCS UI] Connecting to Telemetry Server at:', customWsUrl);
      const ws = new WebSocket(customWsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        latestFrameRef.current = {
          ...latestFrameRef.current,
          state: 'CONNECTED'
        };
        setCurrentFrame((prev) => ({ ...prev, state: 'CONNECTED' }));
        logToTerminal(`[GCS WS] WebSocket connection established on ${customWsUrl}`, 'SUCCESS');
      };

      ws.onmessage = (event) => {
        try {
          const rawData = event.data.trim();
          if (!rawData) return;

          // Parse raw ASCII string
          const parsed = parseRawTelemetry(rawData);
          if (parsed) {
            packetCountRef.current += 1;
            latestFrameRef.current = parsed;

            // Push into Ring Buffer
            const b = bufferRef.current;
            const label = parsed.missionTime;

            b.timestamps.push(label);
            b.altitude.push(parsed.altitude);
            b.temp.push(parsed.temp);
            b.pressure.push(parsed.pressure);
            b.voltage.push(parsed.voltage);
            
            b.gyroR.push(parsed.gyroR); b.gyroP.push(parsed.gyroP); b.gyroY.push(parsed.gyroY);
            b.accelR.push(parsed.accelR); b.accelP.push(parsed.accelP); b.accelY.push(parsed.accelY);
            b.magR.push(parsed.magR); b.magP.push(parsed.magP); b.magY.push(parsed.magY);
            
            b.autoGyroRate.push(parsed.autoGyroRate);
            b.gpsAlt.push(parsed.gpsAlt);
            
            b.pitch.push(parsed.pitch);
            b.roll.push(parsed.roll);
            b.yaw.push(parsed.yaw);
            b.vsi.push(parsed.vsi);

            if (b.timestamps.length > MAX_RING_BUFFER_SIZE) {
              Object.keys(b).forEach((key) => b[key].shift());
            }

            // Print parsed frame to console
            logToTerminal(`[RX RAW] ${rawData}`, 'INFO');
          } else {
            // Probably a status or raw log message
            logToTerminal(rawData, 'INFO');
          }
        } catch (err) {
          logToTerminal(`[GCS PARSE ERR] ${err.message}`, 'WARN');
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        latestFrameRef.current = { ...latestFrameRef.current, state: 'DISCONNECTED' };
        setCurrentFrame((prev) => ({ ...prev, state: 'DISCONNECTED' }));
        logToTerminal('[GCS WS] Connection lost. Retrying in 3 seconds...', 'WARN');
        reconnectTimeout = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [customWsUrl, localSimActive]);

  // Client-Side Telemetry Stream Generator (offline mode)
  useEffect(() => {
    if (localSimActive) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(true);
      logToTerminal('[LOCAL SIM] Browser local simulation stream activated.', 'SUCCESS');

      let flightTime = 0;
      let pCount = 0;
      let simulatedAlt = 0;
      let simState = 'LAUNCH_PAD';

      localSimIntervalRef.current = setInterval(() => {
        pCount++;
        flightTime += 1;

        // Simulate flight phases
        if (flightTime < 8) {
          simState = 'LAUNCH_PAD';
          simulatedAlt = 0;
        } else if (flightTime < 24) {
          simState = 'ASCENT';
          simulatedAlt += (24 - flightTime) * 8; // accelerating up
        } else if (flightTime < 28) {
          simState = 'APOGEE';
        } else if (flightTime < 60) {
          simState = 'DESCENT';
          simulatedAlt = Math.max(700, simulatedAlt - 20.0); // 20m/s descent (M4)
        } else if (flightTime < 110) {
          simState = 'PROBE_RELEASE';
          simulatedAlt = Math.max(0, simulatedAlt - 5.2); // 5.2m/s descent (M5)
        } else {
          simState = 'LANDED';
          simulatedAlt = 0;
        }

        const hh = String(Math.floor(flightTime / 3600)).padStart(2, '0');
        const mm = String(Math.floor((flightTime % 3600) / 60)).padStart(2, '0');
        const ss = String(flightTime % 60).padStart(2, '0');
        const timeStr = `${hh}:${mm}:${ss}`;

        const pressKPa = Number((101.3 * Math.pow(1 - simulatedAlt / 44330, 5.25588)).toFixed(1));
        const tempVal = Number((24.5 - simulatedAlt / 150.0).toFixed(1));
        const voltVal = Number((8.2 - flightTime * 0.002).toFixed(2));
        
        const gRoll = simState === 'ASCENT' ? 360.0 : simState === 'DESCENT' ? 12.0 : 0.0;
        const gPitch = simState === 'LAUNCH_PAD' ? 0.0 : Math.sin(flightTime * 0.2) * 5;
        const gYaw = simState === 'LAUNCH_PAD' ? 0.0 : 1.5;

        const aX = simState === 'LAUNCH_PAD' ? 0 : Math.sin(flightTime * 0.5) * 0.5;
        const aY = simState === 'LAUNCH_PAD' ? 0 : Math.cos(flightTime * 0.5) * 0.5;
        const aZ = simState === 'ASCENT' ? 28.5 : 9.81;

        const mockPacket = [
          '1000',
          timeStr,
          'P',
          pCount,
          'F',
          simState,
          simulatedAlt.toFixed(1),
          tempVal,
          pressKPa,
          voltVal,
          gRoll.toFixed(1), gPitch.toFixed(1), gYaw.toFixed(1),
          aX.toFixed(2), aY.toFixed(2), aZ.toFixed(2),
          '0.345', '0.112', '-0.432', // mag
          simState === 'ASCENT' ? 360 : simState === 'DESCENT' ? 45 : 0, // auto-gyro
          timeStr,
          (simulatedAlt + 250).toFixed(1), // GPS Alt
          (12.9716 + flightTime * 0.00001).toFixed(4), // GPS Lat
          (77.5946 + flightTime * 0.000005).toFixed(4), // GPS Lon
          simState === 'LAUNCH_PAD' ? 5 : 9, // GPS Sats
          'None'
        ].join(',');

        packetCountRef.current += 1;
        const parsed = parseRawTelemetry(mockPacket);
        
        if (parsed) {
          latestFrameRef.current = parsed;
          setCurrentFrame(parsed);

          const b = bufferRef.current;
          b.timestamps.push(parsed.missionTime);
          b.altitude.push(parsed.altitude);
          b.temp.push(parsed.temp);
          b.pressure.push(parsed.pressure);
          b.voltage.push(parsed.voltage);
          b.gyroR.push(parsed.gyroR); b.gyroP.push(parsed.gyroP); b.gyroY.push(parsed.gyroY);
          b.accelR.push(parsed.accelR); b.accelP.push(parsed.accelP); b.accelY.push(parsed.accelY);
          b.magR.push(parsed.magR); b.magP.push(parsed.magP); b.magY.push(parsed.magY);
          b.autoGyroRate.push(parsed.autoGyroRate);
          b.gpsAlt.push(parsed.gpsAlt);
          b.pitch.push(parsed.pitch);
          b.roll.push(parsed.roll);
          b.yaw.push(parsed.yaw);
          b.vsi.push(parsed.vsi);

          if (b.timestamps.length > MAX_RING_BUFFER_SIZE) {
            Object.keys(b).forEach((key) => b[key].shift());
          }
          logToTerminal(`[LOCAL SIM RX] ${mockPacket}`, 'INFO');
        }
      }, 1000);
    } else {
      if (localSimIntervalRef.current) {
        clearInterval(localSimIntervalRef.current);
        localSimIntervalRef.current = null;
      }
    }

    return () => {
      if (localSimIntervalRef.current) clearInterval(localSimIntervalRef.current);
    };
  }, [localSimActive]);

  // 5Hz RAF Throttle Loop (Updates React UI state every 200ms)
  useEffect(() => {
    const renderInterval = setInterval(() => {
      if (latestFrameRef.current) {
        setCurrentFrame({ ...latestFrameRef.current });
      }
      setHistoryBuffer({ ...bufferRef.current });
    }, 200);

    const hzInterval = setInterval(() => {
      setPacketRateHz(packetCountRef.current);
      packetCountRef.current = 0;
    }, 1000);

    return () => {
      clearInterval(renderInterval);
      clearInterval(hzInterval);
    };
  }, []);

  // Send command string to WebSocket backend
  const sendCommand = (command) => {
    if (localSimActive) {
      logToTerminal(`[LOCAL SIM CMD] Command echoed: ${command}`, 'CMD');
      latestFrameRef.current = {
        ...latestFrameRef.current,
        cmdEcho: command.replace(/,/g, ' ')
      };
      return;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(command);
      logToTerminal(`[CMD DISPATCH] Command sent to rocket: ${command}`, 'CMD');
    } else {
      logToTerminal(`[CMD FAIL] Cannot send command '${command}': WebSocket offline`, 'WARN');
    }
  };

  const clearTerminal = () => {
    setTerminalLogs([]);
  };

  // Export current session history buffer to Flight_<TEAM_ID>.csv
  const exportSessionCSV = () => {
    const teamId = currentFrame.teamId || '1000';
    const filename = `Flight_${teamId}.csv`;

    const headers = [
      'TEAM_ID', 'MISSION_TIME', 'PACKET_TYPE', 'PACKET_COUNT', 'MODE', 'STATE',
      'ALTITUDE', 'TEMPERATURE', 'PRESSURE', 'VOLTAGE',
      'GYRO_R', 'GYRO_P', 'GYRO_Y',
      'ACCEL_R', 'ACCEL_P', 'ACCEL_Y',
      'MAG_R', 'MAG_P', 'MAG_Y',
      'AUTO_GYRO_ROTATION_RATE',
      'GPS_TIME', 'GPS_ALTITUDE', 'GPS_LATITUDE', 'GPS_LONGITUDE', 'GPS_SATS',
      'CMD_ECHO'
    ].join(',');

    const rows = [];
    const b = bufferRef.current;
    
    for (let i = 0; i < b.timestamps.length; i++) {
      const row = [
        teamId,
        b.timestamps[i] || '00:00:00',
        'P',
        i + 1,
        currentFrame.mode,
        currentFrame.state,
        b.altitude[i] ?? 0.0,
        b.temp[i] ?? 25.0,
        b.pressure[i] ?? 101.3,
        b.voltage[i] ?? 0.0,
        b.gyroR[i] ?? 0.0, b.gyroP[i] ?? 0.0, b.gyroY[i] ?? 0.0,
        b.accelR[i] ?? 0.0, b.accelP[i] ?? 0.0, b.accelY[i] ?? 9.81,
        b.magR[i] ?? 0.0, b.magP[i] ?? 0.0, b.magY[i] ?? 0.0,
        b.autoGyroRate[i] ?? 0,
        b.timestamps[i] || '00:00:00',
        b.gpsAlt[i] ?? 250.0,
        currentFrame.gpsLat,
        currentFrame.gpsLon,
        currentFrame.gpsSats,
        currentFrame.cmdEcho
      ].join(',');
      rows.push(row);
    }

    const csvContent = headers + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    logToTerminal(`[CSV EXPORT] Exported flight log session to ${filename}`, 'SUCCESS');
  };

  return (
    <TelemetryContext.Provider
      value={{
        isConnected,
        packetRateHz,
        currentFrame,
        historyBuffer,
        terminalLogs,
        customWsUrl,
        setCustomWsUrl,
        localSimActive,
        setLocalSimActive,
        sendCommand,
        logToTerminal,
        clearTerminal,
        exportSessionCSV
      }}
    >
      {children}
    </TelemetryContext.Provider>
  );
};

export const useTelemetry = () => useContext(TelemetryContext);

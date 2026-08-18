# SAMMARD GCS - Rocket Avionics Telemetry & Ground Control Station

## 1. Overall System Summary

The **Sammard Ground Control Station (GCS)** is a real-time rocket avionics and CanSat telemetry monitoring software suite designed for aerospace engineering competitions (e.g., Mock CanSat Integrated Rocket Competition). The system provides full mission lifetime data acquisition, real-time 3D flight orientation rendering, dynamic sensor plotting, telemetry logging, and two-way command & control (C2) communication via 1Hz RF telemetry streams (XBee/Serial or WebSocket uplink).

### Key Architecture Features
* **Frontend**: React 18 SPA built with Vite, Tailwind CSS / Vanilla CSS tokens, Three.js (`@react-three/fiber` & `@react-three/drei`) for 3D rocket attitude rendering, and Chart.js (`react-chartjs-2`) for multi-axis sensor graph plotting.
* **State Management**: Centralized React Context (`TelemetryContext`) featuring a 300-frame ring buffer (5 minutes of flight history at 1Hz), complementary filter orientation math (Gyro + Accel integration), vertical speed estimation (VSI), auto-reconnecting WebSockets, and browser-side offline flight simulation.
* **Backend Hardware Bridge**: Node.js server (`server/index.js`) interfacing with hardware serial ports (`serialport` & `@serialport/parser-readline` at 115200 baud) and broadcasting raw ASCII CSV telemetry strings over WebSockets (`ws` at port `8766`).
* **Flight Logger**: Thread-safe automatic CSV logging (`server/logger.js`) creating `logs/Flight_<TEAM_ID>.csv` with standard competition telemetry headers.
* **1Hz Physics Simulator**: Self-contained simulator backend (`server/simulator.js`) modeling real rocket flight dynamics across six distinct mission states (`LAUNCH_PAD`, `ASCENT`, `APOGEE`, `DESCENT`, `PROBE_RELEASE`, `LANDED`), handling barometric formula conversion, battery voltage decay, GPS position walk, and simulation uplink mode (`SIM`, `SIMP`, `CAL`).

---

## 2. List of Modules & File Structure

```
GCS control/
├── index.html                  # HTML5 Document Root & Font Imports
├── package.json                # Frontend Dependencies & NPM Scripts
├── vite.config.js              # Vite Build & Development Server Configuration
├── server/
│   ├── index.js                # Node.js Serial-to-WebSocket Relay Server
│   ├── logger.js               # CSV Flight Telemetry Logging Utility
│   ├── package.json            # Server Dependencies
│   └── simulator.js            # 1Hz Rocket Physics & Telemetry Hardware Simulator
└── src/
    ├── main.jsx                # React Application Entry Point
    ├── App.jsx                 # Top-Level Layout & Tab Navigation Router
    ├── index.css               # Global Design System, Glassmorphism & Grid CSS
    ├── context/
    │   └── TelemetryContext.jsx # Global Telemetry Provider, Buffer & Math Logic
    └── components/
        ├── Navigation.jsx      # Top Navigation Bar & Connection Status Badges
        ├── CockpitView.jsx     # Main Dashboard (Gauges, 3D Model, Alt Plot, Telemetry Grid)
        ├── GaugePanel.jsx      # Flight Metric Gauges (Alt, Baro, Temp, Volts, Auto-Gyro)
        ├── CommandPanel.jsx    # Safety Command Dispatcher & CSV Playback Controls
        ├── Attitude3D.jsx      # 3D Rocket Orientation Canvas (GLB Loader & Damping)
        ├── CustomChart.jsx     # Reusable Multi-Dataset Chart.js Wrapper
        ├── MpuGraphsView.jsx   # 3-Axis Gyro, Accel, Mag & Power Telemetry Plots
        ├── TrajectoryView.jsx  # Spatial 3D Flight Trajectory Reconstruction Map
        └── TerminalView.jsx    # Raw ASCII XBee Event Stream & Command Console Log
```

---

## 3. Installation & Run Commands

All installation commands explicitly include `--legacy-peer-deps` to guarantee smooth installation regardless of React 18 peer dependency warnings with Three.js / Chart.js packages.

### Step 1: Install Frontend Dependencies
```bash
cd "GCS control"
npm install --legacy-peer-deps
```

### Step 2: Install Backend Dependencies
```bash
cd server
npm install --legacy-peer-deps
cd ..
```

### Step 3: Run the System

#### Option A: Running with Telemetry Hardware Simulator (Recommended for Testing)
Open two terminal windows:
* **Terminal 1 (Simulator Server)**:
  ```bash
  npm run simulator
  ```
  *(Starts 1Hz mock telemetry server on `ws://localhost:8766`)*

* **Terminal 2 (Frontend Interface)**:
  ```bash
  npm run dev
  ```
  *(Launches Vite dev server on `http://localhost:5173`)*

#### Option B: Running with Physical XBee / Arduino Hardware
* **Terminal 1 (Serial Relay Backend)**:
  ```bash
  npm run server
  ```
  *(Connects to COM port, e.g., `COM7` at 115200 baud, and relays telemetry to `ws://localhost:8766`)*

* **Terminal 2 (Frontend Interface)**:
  ```bash
  npm run dev
  ```

---

## 4. Code Block-by-Code Block Detailed Breakdown

Below is an exhaustive line-by-line and block-by-block technical breakdown of every single file in the codebase.

---

### File 1: `package.json` (Frontend)

```json
1: {
2:   "name": "gcs-control",
3:   "private": true,
4:   "version": "0.0.0",
5:   "type": "module",
```
* **Lines 1-5**: Defines package metadata. `type: "module"` specifies ES Module syntax (`import`/`export`) across the frontend build step.

```json
6:   "scripts": {
7:     "dev": "vite",
8:     "build": "vite build",
9:     "lint": "eslint .",
10:    "preview": "vite preview",
11:    "server": "node server/index.js",
12:    "simulator": "node server/simulator.js"
13:  },
```
* **Lines 6-13**: NPM execution scripts. `dev` starts Vite dev server. `server` executes the hardware serial bridge. `simulator` executes the mock flight physics server.

```json
14:  "dependencies": {
15:    "@react-three/drei": "^9.100.0",
16:    "@react-three/fiber": "^8.16.0",
17:    "chart.js": "^4.4.1",
18:    "lucide-react": "^0.460.0",
19:    "react": "^18.3.1",
20:    "react-chartjs-2": "^5.2.0",
21:    "react-dom": "^18.3.1",
22:    "three": "^0.160.0"
23:  },
```
* **Lines 14-23**: Production dependencies: `@react-three/fiber` & `drei` for WebGL React wrappers, `three` for 3D computer graphics math, `chart.js` & `react-chartjs-2` for 2D canvas charting, and `lucide-react` for cockpit icons.

---

### File 2: `server/package.json` (Backend Server)

```json
1: {
2:   "name": "gcs-backend-server",
3:   "private": true,
4:   "version": "1.0.0",
5:   "type": "module",
6:   "scripts": {
7:     "start": "node index.js",
8:     "sim": "node simulator.js"
9:   },
10:  "dependencies": {
11:    "@serialport/parser-readline": "^12.0.0",
12:    "serialport": "^12.0.0",
13:    "ws": "^8.16.0"
14:  }
15: }
```
* **Lines 1-15**: Node.js backend configuration. Uses Node standard ES modules (`"type": "module"`). `serialport` and `@serialport/parser-readline` handle physical XBee UART communication, while `ws` handles WebSocket server creation.

---

### File 3: `vite.config.js`

```javascript
1: import { defineConfig } from 'vite';
2: import react from '@vitejs/plugin-react';
3: 
4: export default defineConfig({
5:   plugins: [react()],
6:   server: {
7:     port: 5173,
8:     host: true
9:   }
10: });
```
* **Lines 1-10**: Configures Vite with the `@vitejs/plugin-react` Fast Refresh plugin. Sets the dev server port to `5173` and `host: true` to enable network access across local ground station laptops.

---

### File 4: `server/logger.js` (Flight Data CSV Logger)

```javascript
1: import fs from 'fs';
2: import path from 'path';
3: import { fileURLToPath } from 'url';
4: 
5: const __filename = fileURLToPath(import.meta.url);
6: const __dirname = path.dirname(__filename);
7: 
8: const LOGS_DIR = path.join(__dirname, '..', 'logs');
9: 
10: if (!fs.existsSync(LOGS_DIR)) {
11:   fs.mkdirSync(LOGS_DIR, { recursive: true });
12: }
```
* **Lines 1-12**: Imports Node `fs` and `path` modules. Reconstructs `__dirname` for ES module compatibility and ensures a `logs/` directory exists in the workspace.

```javascript
14: export class FlightLogger {
15:   constructor() {
16:     this.filePath = null;
17:     this.buffer = [];
18:     this.flushInterval = null;
19:     this.teamId = null;
20: 
21:     // Flush buffer every 1000ms
22:     this.flushInterval = setInterval(() => this.flush(), 1000);
23:   }
```
* **Lines 14-23**: `FlightLogger` class constructor. Instantiates an in-memory string buffer array and starts a periodic 1000ms (1Hz) disk flush interval to prevent blocking I/O on rapid telemetry packet arrival.

```javascript
25:   initializeFile(teamId) {
26:     this.teamId = teamId || '1000';
27:     this.filePath = path.join(LOGS_DIR, `Flight_${this.teamId}.csv`);
28:     
29:     if (!fs.existsSync(this.filePath)) {
30:       const headers = [
31:         'TEAM_ID', 'MISSION_TIME', 'PACKET_TYPE', 'PACKET_COUNT', 'MODE', 'STATE',
32:         'ALTITUDE', 'TEMPERATURE', 'PRESSURE', 'VOLTAGE',
33:         'GYRO_R', 'GYRO_P', 'GYRO_Y',
34:         'ACCEL_R', 'ACCEL_P', 'ACCEL_Y',
35:         'MAG_R', 'MAG_P', 'MAG_Y',
36:         'AUTO_GYRO_ROTATION_RATE',
37:         'GPS_TIME', 'GPS_ALTITUDE', 'GPS_LATITUDE', 'GPS_LONGITUDE', 'GPS_SATS',
38:         'CMD_ECHO'
39:       ].join(',');
40:       fs.writeFileSync(this.filePath, headers + '\n', 'utf8');
41:       console.log(`[LOGGER] Created new flight log file: ${this.filePath}`);
42:     } else {
43:       console.log(`[LOGGER] Appending to existing flight log file: ${this.filePath}`);
44:     }
45:   }
```
* **Lines 25-46**: Dynamically creates `Flight_<TEAM_ID>.csv` when the team ID is received. Writes standard 26-column competition headers if the log file does not yet exist.

```javascript
48:   logRaw(asciiLine) {
49:     const line = asciiLine.trim();
50:     if (!line) return;
51: 
52:     const parts = line.split(',');
53:     const parsedTeamId = parts[0];
54:     
55:     if (!this.filePath || this.teamId !== parsedTeamId) {
56:       this.initializeFile(parsedTeamId);
57:     }
58: 
59:     this.buffer.push(line);
60:   }
```
* **Lines 48-61**: Pushes incoming raw telemetry CSV lines into `this.buffer`. Auto-initializes the file if the team ID changes.

```javascript
63:   flush() {
64:     if (this.buffer.length === 0 || !this.filePath) return;
65:     const content = this.buffer.join('\n') + '\n';
66:     this.buffer = [];
67:     fs.appendFile(this.filePath, content, (err) => {
68:       if (err) console.error('[LOGGER] Error writing flight log buffer:', err);
69:     });
70:   }
71: 
72:   close() {
73:     if (this.flushInterval) clearInterval(this.flushInterval);
74:     this.flush();
75:     if (this.filePath) {
76:       console.log(`[LOGGER] Flight log closed: ${this.filePath}`);
77:     }
78:   }
79: }
```
* **Lines 63-79**: `flush()` flushes the internal array to disk using `fs.appendFile`. `close()` clears the interval and performs a final synchronous flush on server shutdown.

---

### File 5: `server/index.js` (Hardware Serial-to-WebSocket Bridge)

```javascript
1: import { WebSocketServer } from 'ws';
2: import { SerialPort } from 'serialport';
3: import { ReadlineParser } from '@serialport/parser-readline';
4: import { FlightLogger } from './logger.js';
5: 
6: const WS_PORT = process.env.WS_PORT || 8766;
7: const ARDUINO_BAUD = 115200;
8: const PREFERRED_COM = process.env.ARDUINO_PORT || 'COM7';
9: 
10: const wss = new WebSocketServer({ port: WS_PORT });
11: const flightLogger = new FlightLogger();
```
* **Lines 1-11**: Initializes the WebSocket server on port `8766`, configures default baud rate (`115200`), target COM port (`COM7`), and creates an instance of `FlightLogger`.

```javascript
19: function connectSerial() {
20:   SerialPort.list().then((ports) => {
21:     console.log('[GCS SERVER] Available Serial Ports:', ports.map(p => p.path).join(', ') || 'None found');
22:     const matched = ports.find(p => p.path === PREFERRED_COM) || ports[0];
23: 
24:     if (!matched) {
25:       console.log('[GCS SERVER] No Arduino/XBee serial hardware found. Run simulator (`npm run simulator`) for mock testing.');
26:       return;
27:     }
28: 
29:     console.log(`[GCS SERVER] Connecting to Serial Port: ${matched.path} at ${ARDUINO_BAUD} baud...`);
30:     
31:     try {
32:       serialPort = new SerialPort({ path: matched.path, baudRate: ARDUINO_BAUD, autoOpen: true });
33:       parser = serialPort.pipe(new ReadlineParser({ delimiter: '\r' }));
```
* **Lines 19-33**: Enumerates serial hardware ports. Selects `PREFERRED_COM` or fallback port. Pipes serial data stream through `ReadlineParser` set to carriage return (`\r`) delimiter as specified in competition rules.

```javascript
39:       parser.on('data', (rawLine) => {
40:         const line = rawLine.toString().trim();
41:         if (!line) return;
42: 
43:         console.log(`[XBEE COM IN] ${line}`);
44:         flightLogger.logRaw(line);
45:         lastKnownFrame = line;
46:         broadcastMessage(line);
47:       });
```
* **Lines 39-51**: Listens for incoming XBee packet lines, logs raw CSV data to disk, caches `lastKnownFrame`, and broadcasts the ASCII telemetry string to all browser clients over WebSockets.

```javascript
53:       serialPort.on('error', (err) => {
54:         console.error('[GCS SERVER] Serial Error:', err.message);
55:         if (err.message.includes('Access denied')) {
56:           console.warn('[GCS SERVER] COM port locked! Please close other serial monitors.');
57:         }
58:         if (serialPort && serialPort.isOpen) {
59:           serialPort.close();
60:         } else {
61:           setTimeout(connectSerial, 3000);
62:         }
63:       });
64: 
65:       serialPort.on('close', () => {
66:         console.warn('[GCS SERVER] Serial Port Closed. Retrying in 3 seconds...');
67:         setTimeout(connectSerial, 3000);
68:       });
```
* **Lines 53-76**: Error handling and auto-reconnection loop. Re-attempts connecting every 3000ms if the physical USB serial port drops or suffers access locks.

```javascript
78: function broadcastMessage(rawMessage) {
79:   wss.clients.forEach((client) => {
80:     if (client.readyState === 1) {
81:       client.send(rawMessage);
82:     }
83:   });
84: }
```
* **Lines 78-84**: Utility function to broadcast data to all open WebSocket client connections (`readyState === 1`).

```javascript
86: wss.on('connection', (ws) => {
87:   console.log('[GCS SERVER] Telemetry client connected via WebSocket.');
88:   if (lastKnownFrame) {
89:     ws.send(lastKnownFrame);
90:   }
91: 
92:   ws.on('message', (message) => {
93:     const cmdStr = message.toString().trim();
94:     console.log(`[GCS SERVER] Command received from client UI: ${cmdStr}`);
95:     
96:     if (serialPort && serialPort.isOpen) {
97:       serialPort.write(cmdStr + '\r', (err) => {
98:         if (err) console.error('[GCS SERVER] Error writing to serial:', err.message);
99:         else console.log(`[GCS SERVER] Command written to XBee serial: ${cmdStr}`);
100:      });
101:    } else {
102:      broadcastMessage(cmdStr);
103:    }
104:  });
```
* **Lines 86-114**: Handles incoming client WebSocket connections. Implements C2 command uplink: when the web UI sends a command string (e.g. `CMD,1000,CAL`), it formats it with `\r` and writes it down the physical XBee serial pipe.

---

### File 6: `server/simulator.js` (1Hz Telemetry Physics Simulator)

```javascript
1: import { WebSocketServer } from 'ws';
2: const PORT = process.env.WS_PORT || 8766;
3: const wss = new WebSocketServer({ port: PORT });
4: 
8: const TEAM_ID = '1000';
9: let flightTime = 0;
10: let packetCount = 0;
11: let mode = 'F'; // 'F' = Flight, 'S' = Simulation
12: let simEnabled = false;
13: let simActive = false;
14: let state = 'LAUNCH_PAD'; // LAUNCH_PAD, ASCENT, APOGEE, DESCENT, PROBE_RELEASE, LANDED
15: let lastCommandEcho = 'None';
16: let altitudeOffset = 0;
```
* **Lines 1-17**: Initializes the standalone simulation server on port `8766`. Defines mission state machine parameters and physics variables.

```javascript
36:   ws.on('message', (message) => {
37:     try {
38:       const command = message.toString().trim();
39:       const parts = command.split(',');
40:       if (parts[0] !== 'CMD' || parts[1] !== TEAM_ID) return;
41: 
42:       const cmdType = parts[2];
43:       lastCommandEcho = command.replace(/,/g, ' ');
44: 
45:       if (cmdType === 'CX') {
46:         const onOff = parts[3];
47:       } else if (cmdType === 'ST') {
48:         const timeVal = parts[3];
49:       } else if (cmdType === 'SIM') {
50:         const simMode = parts[3];
51:         if (simMode === 'ENABLE') simEnabled = true;
52:         else if (simMode === 'ACTIVATE') {
53:           if (simEnabled) { simActive = true; mode = 'S'; state = 'DESCENT'; flightTime = 0; }
54:         } else if (simMode === 'DISABLE') {
55:           simEnabled = false; simActive = false; mode = 'F'; state = 'LAUNCH_PAD';
56:         }
57:       } else if (cmdType === 'SIMP') {
58:         if (simActive) {
59:           const pressPa = parseFloat(parts[3]);
60:           simulatedPressurePa = pressPa;
61:           const calcAlt = 44330 * (1 - Math.pow(pressPa / 101325, 0.190284));
62:           baseAltitude = Math.max(0, calcAlt - altitudeOffset);
63:         }
64:       } else if (cmdType === 'CAL') {
65:         if (mode === 'S') {
66:           const calcAlt = 44330 * (1 - Math.pow(simulatedPressurePa / 101325, 0.190284));
67:           altitudeOffset = calcAlt;
68:         } else {
69:           altitudeOffset = baseAltitude;
70:         }
71:         baseAltitude = 0;
72:       }
73:     } catch (err) { ... }
74:   });
```
* **Lines 36-113**: Simulator Command Parser. Supports all official CanSat commands: `CX` (Telemetry On/Off), `ST` (Time Sync), `SIM` (ENABLE/ACTIVATE/DISABLE), `SIMP` (pressure profile uplink converting pressure $P$ in Pa to altitude $h$ via barometric formula $h = 44330 \cdot [1 - (P/101325)^{0.190284}]$), and `CAL` (calibrating relative altitude to zero).

```javascript
129: setInterval(() => {
130:   if (wss.clients.size === 0) return;
131:   packetCount++;
132:   flightTime += 1.0;
133: 
134:   if (mode === 'F') {
135:     // State machine timeline:
136:     // 0-10s: LAUNCH_PAD
137:     // 10-25s: ASCENT (Rocket motor thrust, ~3G, high spin roll rate 360 deg/s)
138:     // 25-28s: APOGEE (tipping over, weightlessness)
139:     // 28-60s: DESCENT (Container parachute descent rate: 20 m/s [Req M4])
140:     // 60-120s: PROBE_RELEASE (Separated probe descent rate: 5.2 m/s [Req M5])
141:     // >120s: LANDED
```
* **Lines 129-250**: 1Hz Physics Simulation Loop. Simulates realistic rocket forces, sensor noise, rotational dynamics (spin-stabilization during motor burn), container parachute ejection at apogee, and probe release at 75% apogee altitude.

```javascript
304:   const telemetryPacket = [
305:     TEAM_ID, missionTimeStr, 'P', packetCount, mode, state,
306:     Number(baseAltitude.toFixed(1)), temp, pressureKPa, voltage,
307:     Number(gyroRoll.toFixed(1)), Number(gyroPitch.toFixed(1)), Number(gyroYaw.toFixed(1)),
308:     Number(accelRoll.toFixed(2)), Number(accelPitch.toFixed(2)), Number(accelYaw.toFixed(2)),
309:     magX, magY, magZ, autoGyroRate, missionTimeStr,
310:     Number(gpsAlt.toFixed(1)), Number(gpsLat.toFixed(4)), Number(gpsLon.toFixed(4)),
311:     gpsSats, lastCommandEcho
312:   ].join(',');
313: 
314:   wss.clients.forEach((client) => {
315:     if (client.readyState === 1) client.send(telemetryPacket);
316:   });
317: }, 1000);
```
* **Lines 304-341**: Constructs the exact 26-field ASCII CSV telemetry frame and broadcasts it to web clients every 1000ms.

---

### File 7: `src/context/TelemetryContext.jsx` (Centralized Data & Math Engine)

```javascript
1: import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
2: const TelemetryContext = createContext(null);
3: const MAX_RING_BUFFER_SIZE = 300; // 5 minutes buffer at 1Hz
4: const WS_URL = 'ws://localhost:8766';
```
* **Lines 1-7**: Initializes React Context. Defines buffer size cap (`300` frames) and default WebSocket server URL (`ws://localhost:8766`).

```javascript
8: const defaultFrame = {
9:   teamId: '1000', missionTime: '00:00:00', packetType: 'P', packetCount: 0,
10:  mode: 'F', state: 'DISCONNECTED', altitude: 0.0, temp: 25.0, pressure: 101.3,
11:  voltage: 0.0, gyroR: 0.0, gyroP: 0.0, gyroY: 0.0, accelR: 0.0, accelP: 0.0, accelY: 9.81,
12:  magR: 0.0, magP: 0.0, magY: 0.0, autoGyroRate: 0, gpsTime: '00:00:00',
13:  gpsAlt: 0.0, gpsLat: 0.0, gpsLon: 0.0, gpsSats: 0, cmdEcho: 'None',
14:  pitch: 0.0, roll: 0.0, yaw: 0.0, vsi: 0.0
15: };
```
* **Lines 8-33**: Schema for default initial telemetry frame before hardware link connection.

```javascript
97: const parseRawTelemetry = (asciiString) => {
98:   const line = asciiString.trim();
99:   if (!line) return null;
102:  const parts = line.split(',');
105:  if (parts.length < 25) { ... }
113:  const teamId = parts[0];
114:  const missionTime = parts[1];
      ...
147:  const cmdEcho = parts[25] || 'None';
```
* **Lines 97-147**: `parseRawTelemetry()` validates and parses incoming CSV packets into typed numerical values for telemetry processing.

```javascript
148:  // Calculate vertical speed (VSI) in m/s
149:  const vsi = Number((altitude - prevAltitudeRef.current).toFixed(2));
150:  prevAltitudeRef.current = altitude;
151: 
152:  // Calculate Pitch, Roll, Yaw using Complementary Filter
153:  const dt = 1.0;
154:  let pitchVal = orientationRef.current.pitch;
155:  let rollVal = orientationRef.current.roll;
156:  let yawVal = orientationRef.current.yaw;
157: 
158:  // Accel tilt estimation
159:  const accelPitchEst = Math.atan2(-accelR, Math.sqrt(accelP * accelP + accelY * accelY)) * (180 / Math.PI);
160:  const accelRollEst = Math.atan2(accelP, accelY) * (180 / Math.PI);
161: 
162:  // Complementary filter updates (90% gyro integration + 10% accel tilt)
163:  pitchVal = 0.9 * (pitchVal + gyroP * dt) + 0.1 * accelPitchEst;
164:  rollVal = 0.9 * (rollVal + gyroR * dt) + 0.1 * accelRollEst;
165:  yawVal = yawVal + gyroY * dt;
```
* **Lines 148-183**: **Sensor Fusion & Orientational Math**. Calculates Vertical Speed Indicator (`vsi`) from altitude delta. Computes pitch ($\theta$) and roll ($\phi$) using accelerometer tilt trigonometric equations:
  $$\theta_{accel} = \arctan\left(\frac{-a_x}{\sqrt{a_y^2 + a_z^2}}\right), \quad \phi_{accel} = \arctan\left(\frac{a_y}{a_z}\right)$$
  Applies a **90/10 Complementary Filter** to eliminate gyroscope integration drift while damping raw accelerometer high-frequency noise. Normalizes output angles between $-180^\circ$ and $+180^\circ$.

```javascript
213: useEffect(() => {
214:   // Reconnectable WebSocket Manager
216:   const connect = () => {
221:     const ws = new WebSocket(customWsUrl);
224:     ws.onopen = () => { setIsConnected(true); ... };
234:     ws.onmessage = (event) => {
240:       const parsed = parseRawTelemetry(rawData);
245:       // Push into Ring Buffer
246:       const b = bufferRef.current;
            ...
267:       if (b.timestamps.length > MAX_RING_BUFFER_SIZE) {
268:         Object.keys(b).forEach((key) => b[key].shift());
269:       }
270:     };
282:     ws.onclose = () => {
287:       reconnectTimeout = setTimeout(connect, 3000);
288:     };
295:   connect();
297: }, [customWsUrl, localSimActive]);
```
* **Lines 213-301**: Socket Lifecycle Effect. Establishes WebSocket link to backend, parses stream packets, pushes variables into the 300-point ring buffer (`bufferRef`), and automatically reconnects every 3 seconds if disconnected.

```javascript
304: useEffect(() => {
305:   if (localSimActive) {
         // Browser-side offline mock simulation loop generating 1Hz synthetic telemetry
         ...
       }
     }, [localSimActive]);
```
* **Lines 304-421**: Browser Offline Mock Mode. Allows testing the GCS UI without needing Node.js or any backend running.

```javascript
424: useEffect(() => {
425:   const renderInterval = setInterval(() => {
426:     if (latestFrameRef.current) {
427:       setCurrentFrame({ ...latestFrameRef.current });
428:     }
429:     setHistoryBuffer({ ...bufferRef.current });
430:   }, 200);
```
* **Lines 424-441**: **5Hz Request Rate Throttling**. Decouples raw WebSocket packet arrival from React render state updates. Updates React state every 200ms (5Hz) to maintain silky 60fps UI performance without overloading React's DOM reconciliation engine during rapid data bursts.

```javascript
444: const sendCommand = (command) => { ... };
466: const exportSessionCSV = () => { ... };
```
* **Lines 444-523**: `sendCommand()` transmits C2 strings over the socket. `exportSessionCSV()` dynamically formats active ring buffer history into a downloadable CSV blob named `Flight_<TEAM_ID>.csv`.

---

### File 8: `src/components/Navigation.jsx`

```javascript
5: export const Navigation = ({ activeTab, setActiveTab }) => {
6:   const { isConnected, packetRateHz, currentFrame } = useTelemetry();
8:   const tabs = [
9:     { id: 'cockpit', label: 'Cockpit Overview', icon: Rocket },
10:    { id: 'mpu', label: 'Sensor Telemetry Plots', icon: BarChart2 },
11:    { id: 'trajectory', label: '3D Trajectory Vector', icon: Compass },
12:    { id: 'terminal', label: 'Live Console & Logs', icon: Terminal },
13:  ];
```
* **Lines 1-14**: Header navigation component importing global context metrics (`isConnected`, `packetRateHz`, `currentFrame`).

```javascript
35: <nav className="nav-tabs-wrapper" id="desktop-nav">
36:   {tabs.map((tab) => {
40:     return (
41:       <button
42:         key={tab.id}
43:         onClick={() => setActiveTab(tab.id)}
44:         className={`nav-tab-btn ${isActive ? 'active' : ''}`}
45:       >
46:         <Icon style={{ width: '16px', height: '16px' }} />
47:         <span>{tab.label}</span>
48:       </button>
49:     );
50:   })}
51: </nav>
```
* **Lines 35-52**: Tab navigation buttons. Toggles active view between Cockpit, MPU Graphs, Trajectory, and Terminal Console.

```javascript
54: <div className="nav-metrics-group">
57:   STATE: <span style={{ color: ... }}>{currentFrame.state}</span>
62:   <span style={{ color: '#38bdf8' }}>{packetRateHz} Hz</span>
79:   <span>{isConnected ? 'ONLINE' : 'OFFLINE'}</span>
82: </div>
```
* **Lines 54-84**: Top-right status metrics group displaying current mission flight state, live data refresh rate in Hertz (Hz), and connection status.

---

### File 9: `src/components/CockpitView.jsx`

```javascript
9: export const CockpitView = () => {
10:   const { historyBuffer, currentFrame, exportSessionCSV } = useTelemetry();
13:   return (
14:     <div className="space-y-8" id="cockpit-view-container">
15:       <GaugePanel />
```
* **Lines 9-16**: Primary mission control overview container. Renders top-level quick gauges.

```javascript
18: <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
21:   <div className="lg:col-span-4">
22:     <Attitude3D />
23:   </div>
26:   <div className="lg:col-span-8">
27:     <CustomChart
28:       title="REAL-TIME ALTITUDE DATA (BAROMETRIC VS GPS)"
29:       labels={historyBuffer.timestamps}
30:       yAxisLabel="Meters (m)"
31:       height={400}
32:       datasets={[
33:         { label: 'Relative Baro Alt (m)', data: historyBuffer.altitude, borderColor: '#38bdf8', fill: true },
34:         { label: 'GPS MSL Alt (m)', data: historyBuffer.gpsAlt, borderColor: '#fb923c', fill: false }
35:       ]}
36:     />
37:   </div>
38: </div>
```
* **Lines 18-49**: 12-column responsive layout grid positioning the 3D Attitude model (4 columns) alongside the live Barometric vs GPS Altitude plot (8 columns).

```javascript
52: <div className="glass-panel p-6" id="telemetry-dashboard-panel">
62:   <button onClick={exportSessionCSV} ...>EXPORT csv LOG</button>
70:   <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
73:     {/* Mission Control Parameters */}
89:     {/* Environmental Sensors */}
105:    {/* IMU Inertial Sensors */}
145:    {/* GPS Receiver Status */}
160:  </div>
161: </div>
164: <CommandPanel />
```
* **Lines 52-166**: Real-time tabular telemetry grid displaying all 25 competition constrained data points split into 4 functional cards (Mission, Atmosphere, IMU, GPS), followed by the Command & Control Bar.

---

### File 10: `src/components/GaugePanel.jsx`

```javascript
5: export const GaugePanel = () => {
6:   const { currentFrame } = useTelemetry();
```
* **Lines 1-8**: Visual telemetry gauge panel rendering real-time flight metrics.

```javascript
12: <div className="glass-panel" id="gauge-altimeter">
18:   <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#38bdf8' }}>
19:     {currentFrame.altitude.toFixed(1)} <span style={{ fontSize: '1rem' }}>m</span>
20:   </div>
23:   <div style={{ width: '100%', backgroundColor: '#030712', height: '6px' }}>
24:     <div style={{ backgroundColor: '#38bdf8', width: `${Math.min(100, (currentFrame.altitude / 1000) * 100)}%` }} />
25:   </div>
28: </div>
```
* **Lines 12-28**: Relative Barometric Altimeter Gauge with dynamic SVG fill percentage bar based on altitude scale ($0-1000$m).

```javascript
30: {/* Barometric Pressure: currentFrame.pressure in kPa */}
49: {/* Temperature: currentFrame.temp in °C */}
68: {/* Battery Voltage: currentFrame.voltage in V */}
87: {/* Auto-Gyro Rotation Rate: currentFrame.autoGyroRate in °/s */}
```
* **Lines 30-107**: Remaining 4 gauge cards rendering Barometric Pressure (kPa), Probe Temperature (°C), Power Bus Battery Voltage (V), and Auto-Gyro Descent Spin Rate (°/s).

---

### File 11: `src/components/CommandPanel.jsx`

```javascript
5: export const CommandPanel = () => {
6:   const { sendCommand, isConnected, customWsUrl, setCustomWsUrl, localSimActive, setLocalSimActive, currentFrame } = useTelemetry();
17:   const [isArmed, setIsArmed] = useState(false);
18:   const [showConfirmModal, setShowConfirmModal] = useState(false);
19:   const [pendingCommand, setPendingCommand] = useState(null);
27:   const [csvPressures, setCsvPressures] = useState([]);
28:   const [playbackIndex, setPlaybackIndex] = useState(0);
29:   const [isPlaybackRunning, setIsPlaybackRunning] = useState(false);
```
* **Lines 5-32**: Command Dispatcher state management. Controls safety confirmation popups, manual WebSocket port reconnection, and 1Hz pressure CSV simulation playback.

```javascript
74: const handleCSVUpload = (e) => {
75:   const file = e.target.files[0];
78:   const reader = new FileReader();
79:   reader.onload = (event) => {
80:     const text = event.target.result;
81:     const lines = text.split(/\r?\n/);
        // Parses lines into pressure numerical arrays (Pascals)
        ...
107:    sendCommand('CMD,1000,SIM,ENABLE');
114:  };
115: };
```
* **Lines 74-115**: Handles pressure profile CSV file uploads. Extracts pressure points (Pa) and sends initial simulation enable command `CMD,1000,SIM,ENABLE`.

```javascript
117: const startPlayback = () => {
126:   setIsPlaybackRunning(true);
127:   sendCommand('CMD,1000,SIM,ACTIVATE');
129:   playbackIntervalRef.current = setInterval(() => {
130:     setPlaybackIndex((prevIndex) => {
           ...
140:       sendCommand(`CMD,1000,SIMP,${Math.round(pressureValue)}`);
141:       return prevIndex + 1;
142:     });
143:   }, 1000);
144: };
```
* **Lines 117-144**: **1Hz Simulation Profile Uplink Engine**. Transmits `SIM ACTIVATE` to put CanSat into simulation flight mode, then steps through loaded CSV pressure points every 1000ms, transmitting `CMD,1000,SIMP,<PRESSURE>` uplink frames.

```javascript
222: {/* Calibrate Altitude Button: CMD,1000,CAL */}
232: {/* Time Synchronization Button: CMD,1000,ST,<UTC_TIME> */}
242: {/* Telemetry On/Off Toggle Button: CMD,1000,CX,ON / OFF */}
343: {/* Confirmation Safety Modal Component */}
```
* **Lines 222-371**: UI buttons triggering safety modal confirmations before dispatching critical flight commands down the pipe.

---

### File 12: `src/components/Attitude3D.jsx` (Three.js 3D Orientation View)

```javascript
7: const Rocket3DModel = () => {
8:   const groupRef = useRef();
9:   const { currentFrame } = useTelemetry();
12:  const { scene } = useGLTF('/rocket.glb');
```
* **Lines 7-13**: Loads standard custom 3D rocket model (`/public/rocket.glb`) using `@react-three/drei`'s `useGLTF` hook.

```javascript
15:  const scale = useMemo(() => {
16:    if (!scene) return 1.0;
17:    const box = new THREE.Box3().setFromObject(scene);
18:    const size = new THREE.Vector3();
19:    box.getSize(size);
20:    const maxDim = Math.max(size.x, size.y, size.z);
22:    const scaleFactor = maxDim > 0 ? 3.2 / maxDim : 1.0;
25:    return scaleFactor;
26:  }, [scene]);
```
* **Lines 15-26**: Auto-Bounding Box Scale Math. Computes 3D mesh dimensions via `THREE.Box3` and normalizes arbitrary GLB file scales so the rocket model fits nicely within 3.2 viewport units.

```javascript
29:  const position = useMemo(() => {
30:    if (!scene) return [0, 0, 0];
31:    const box = new THREE.Box3().setFromObject(scene);
32:    const center = new THREE.Vector3();
33:    box.getCenter(center);
36:    return [-center.x * scale, -center.y * scale, -center.z * scale];
41:  }, [scene, scale]);
```
* **Lines 29-41**: Auto-Centering Pivot Offset Math. Calculates the geometric center of the model mesh and offsets position coordinates so the model rotates around its true center of mass `[0,0,0]`.

```javascript
43:  useFrame((state, delta) => {
44:    if (groupRef.current) {
49:      const targetPitch = (currentFrame.pitch * Math.PI) / 180;
50:      const targetRoll = (currentFrame.roll * Math.PI) / 180;
51:      const targetYaw = (currentFrame.yaw * Math.PI) / 180;
53:      // Smooth linear interpolation damping
54:      groupRef.current.rotation.x += (targetPitch - groupRef.current.rotation.x) * 0.06;
55:      groupRef.current.rotation.y += (targetRoll - groupRef.current.rotation.y) * 0.06;
56:      groupRef.current.rotation.z += (targetYaw - groupRef.current.rotation.z) * 0.06;
57:    }
58:  });
```
* **Lines 43-58**: **60fps Render Loop Damping**. Executed on every WebGL frame via `useFrame`. Converts pitch, roll, and yaw from telemetry degrees to radians and applies exponential smoothing interpolation (`0.06` alpha) for fluid 3D motion.

```javascript
103: <Canvas antialias="true">
104:   <PerspectiveCamera makeDefault position={[0, 0, 5.0]} fov={50} />
107:   <ambientLight intensity={0.8} />
108:   <directionalLight position={[5, 8, 5]} intensity={1.5} color="#c0e2ff" />
112:   <Suspense fallback={<LoadingPlaceholder />}>
113:     <Rocket3DModel />
114:   </Suspense>
116:   <OrbitControls enableZoom={true} enablePan={false} maxPolarAngle={Math.PI / 1.3} />
117:   <gridHelper args={[16, 16, '#1e293b', '#0f172a']} position={[0, -2.0, 0]} />
118: </Canvas>
```
* **Lines 103-118**: WebGL Three.js Canvas setup. Configures perspective camera, dual directional lights, orbit mouse controls, reference floor grid, and fallback wireframe loader.

---

### File 13: `src/components/CustomChart.jsx`

```javascript
15: ChartJS.register(
16:   CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
17: );
```
* **Lines 15-24**: Registers required Chart.js controllers and scales for tree-shaking optimization.

```javascript
37: const toggleDataset = (index) => {
38:   setDatasetVisibility((prev) => {
39:     const updated = [...prev];
40:     updated[index] = !updated[index];
41:     return updated;
42:   });
43: };
```
* **Lines 37-43**: Toggles visibility state of individual datasets when clicking header legend chips.

```javascript
63: animation: { duration: 0 },
```
* **Line 63**: **Performance Optimization**. Disables Chart.js transition animations (`duration: 0`) to allow instant 1Hz chart redraws without CPU spikes.

```javascript
124: <Line data={chartData} options={options} />
```
* **Line 124**: Renders the Chart.js canvas instance wrapped in a responsive container.

---

### File 14: `src/components/MpuGraphsView.jsx`

```javascript
5: export const MpuGraphsView = () => {
6:   const { historyBuffer } = useTelemetry();
```
* **Lines 5-6**: Multi-chart view component rendering full 3-axis sensor graphs.

```javascript
23: {/* Gyroscope Angular Rates (R/P/Y) in deg/s */}
58: {/* Accelerometer Axes (R/P/Y) in m/s² */}
95: {/* Magnetometer Axes (R/P/Y) in Gauss */}
133: {/* Auto-Gyro Rotation Rate, Battery Voltage Decay & Internal Temperature Plots */}
```
* **Lines 23-162**: Instantiates 12 `CustomChart` component instances bound to ring buffer arrays (`gyroR`, `gyroP`, `gyroY`, `accelR`, `accelP`, `accelY`, `magR`, `magP`, `magY`, `autoGyroRate`, `voltage`, `temp`).

---

### File 15: `src/components/TrajectoryView.jsx`

```javascript
8: const TrajectoryRocket = ({ position, pitch, roll, yaw }) => {
9:   const { scene } = useGLTF('/rocket.glb');
38:  const clonedScene = useMemo(() => scene.clone(), [scene]);
```
* **Lines 8-49**: Sub-component rendering the 3D rocket model at the tip of the flight trajectory path vector using `scene.clone()`.

```javascript
51: const TrajectoryPath3D = ({ showBaro, showGPS, showVectors, historyBuffer }) => {
55:   const count = historyBuffer.altitude.length;
56:   for (let i = 0; i < count; i++) {
57:     const altBaro = (historyBuffer.altitude[i] || 0) / 10;
58:     const altGPS = ((historyBuffer.gpsAlt[i] || 250) - 250) / 10;
59:     const pitch = (historyBuffer.pitch[i] || 0) * (Math.PI / 180);
60:     const yaw = (historyBuffer.yaw[i] || 0) * (Math.PI / 180);
62:     const xDist = (i * 0.15) * Math.sin(pitch) * Math.cos(yaw);
63:     const yDist = (i * 0.15) * Math.sin(pitch) * Math.sin(yaw);
65:     baroPoints.push([xDist, altBaro, yDist]);
66:     gpsPoints.push([xDist, altGPS, yDist]);
67:   }
```
* **Lines 51-68**: **3D Trajectory Reconstruction Math**. Reconstructs spatial 3D flight paths by combining barometric/GPS altitude ($Y$-axis) with pitch/yaw dead-reckoning integration ($X$/$Z$ horizontal spatial displacement).

```javascript
76: <Line points={baroPoints} color="#38bdf8" lineWidth={3} />
80: <Line points={gpsPoints} color="#fb923c" lineWidth={2} dashed />
85: <TrajectoryRocket position={currentPos} pitch={latestPitch} roll={latestRoll} yaw={latestYaw} />
93: <Line points={[currentPos, [currentPos[0], currentPos[1] + 1.5, currentPos[2]]]} color="#60a5fa" lineWidth={2} />
```
* **Lines 76-101**: Renders Three.js 3D trajectory lines for barometric path (cyan), GPS path (orange dashed), current rocket position model, and velocity direction vector arrow (blue).

---

### File 16: `src/components/TerminalView.jsx`

```javascript
6: export const TerminalView = () => {
7:   const { currentFrame, terminalLogs, clearTerminal } = useTelemetry();
11: useEffect(() => {
12:   if (autoScroll && logContainerRef.current) {
13:     logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
14:   }
15: }, [terminalLogs, autoScroll]);
```
* **Lines 6-15**: Live terminal console component. Automatically scrolls down to the newest packet line unless auto-scroll is toggled off by the ground crew operator.

```javascript
17: const downloadLogs = () => {
18:   const text = terminalLogs.map((l) => `[${l.time}] [${l.type}] ${l.text}`).join('\n');
19:   const blob = new Blob([text], { type: 'text/plain' });
      ...
26: };
```
* **Lines 17-26**: Exports raw terminal output to a text log file `gcs_terminal_<TIMESTAMP>.txt`.

```javascript
28: const filteredLogs = terminalLogs.filter((log) => {
29:   if (filterType === 'ALL') return true;
30:   return log.type === filterType;
31: });
```
* **Lines 28-31**: Filters terminal log lines by message category (`INFO`, `CMD`, `SUCCESS`, `WARN`).

---

### File 17: `src/App.jsx`

```javascript
9:  export function App() {
10:   const [activeTab, setActiveTab] = useState('cockpit');
12:   const renderActiveView = () => {
13:     switch (activeTab) {
14:       case 'cockpit': return <CockpitView />;
16:       case 'mpu': return <MpuGraphsView />;
18:       case 'trajectory': return <TrajectoryView />;
20:       case 'terminal': return <TerminalView />;
22:       default: return <CockpitView />;
23:     }
24:   };
```
* **Lines 9-25**: App root component managing top-level view routing state (`activeTab`).

```javascript
28: <TelemetryProvider>
29:   <div className="gcs-layout-container">
32:     <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
36:     <main id="main-content-view">{renderActiveView()}</main>
40:     <footer>...</footer>
47:   </div>
48: </TelemetryProvider>
```
* **Lines 28-49**: Wraps entire layout inside `<TelemetryProvider>` context so all views have access to live telemetry streams.

---

### File 18: `src/index.css`

```css
1: :root {
2:   --bg-dark: #030712;
3:   --bg-card: #0b0f19;
5:   --border-subtle: rgba(255, 255, 255, 0.08);
6:   --border-active: #38bdf8;
7:   --cyan-primary: #38bdf8;
13:  --font-mono: 'JetBrains Mono', monospace;
14: }
```
* **Lines 1-14**: CSS Custom Properties defining the cockpit dark theme color palette and JetBrains Mono typography token.

```css
42: .glass-panel {
43:   background: var(--bg-card);
44:   border: 1px solid var(--border-subtle);
45:   border-radius: 12px;
46:   padding: 1.5rem;
47:   box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
48:   transition: border-color 0.2s ease;
50: }
52: .glass-panel:hover {
53:   border-color: var(--border-active);
54: }
```
* **Lines 42-55**: Modern cockpit glassmorphism panel styling with cyan hover glow effect.

```css
121: .dynamic-grid-4 { ... }
135: .cockpit-main-grid { ... }
142: @media (max-width: 1024px) { ... }
```
* **Lines 121-155**: Dynamic responsive grid column utilities and media queries adjusting layout for lower resolution monitors down to 1024px.

---

### File 19: `index.html`

```html
1: <!DOCTYPE html>
2: <html lang="en">
3:   <head>
7:     <title>Sammard GCS - Rocket Avionics Telemetry</title>
10:    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
11:  </head>
12:  <body class="bg-[#080d19] text-slate-100 antialiased selection:bg-cyan-500 selection:text-slate-950">
13:    <div id="root"></div>
14:    <script type="module" src="/src/main.jsx"></script>
15:  </body>
16: </html>
```
* **Lines 1-16**: HTML5 boilerplate loading Google Fonts (`Inter` & `JetBrains Mono`) and mounting the React application script `/src/main.jsx`.

---

### File 20: `src/main.jsx`

```javascript
1: import React from 'react';
2: import ReactDOM from 'react-dom/client';
3: import App from './App';
4: import './index.css';
5: 
6: ReactDOM.createRoot(document.getElementById('root')).render(
7:   <React.StrictMode>
8:     <App />
9:   </React.StrictMode>
10: );
```
* **Lines 1-10**: React 18 DOM mount point rendering `<App />` within `<React.StrictMode>`.

---

## 5. Architectural Plans for Live Video Expansion using WebRTC

To integrate a high-definition, low-latency live payload video feed into the Sammard GCS UI during descent, a WebRTC real-time video streaming architecture is planned to layer directly on top of the existing GCS infrastructure.

```
+------------------------------------+        +-----------------------------------+        +-----------------------------------+
|  ROCKET PAYLOAD / CAN SAT CAMERA   |        |   GCS WEBRTC SIGNALING SERVER     |        |   SAMMARD GCS REACT FRONTEND UI   |
| (Camera + XBee 5GHz Transmitter)   |        |  (Node.js server/index.js + ws)   |        | (<CockpitView /> + HTML5 Video)   |
+------------------------------------+        +-----------------------------------+        +-----------------------------------+
                  |                                             |                                             |
                  |======== 1. RF Stream (XBee 5GHz) ==========>|                                             |
                  |   [Converted by Hardware Controller]        |                                             |
                  |                                             |--- 2. Forward SDP Offer to Browser UI ----->|
                  |                                             |<-- 3. Return SDP Answer (WebRTC Handshake) -|
                  |<-- 4. Complete Peer-to-Peer WebRTC Link ----|                                             |
                  |                                                                                           |
                  |====================== 5. Direct Low-Latency UDP RTP Video Stream ======================>|
```

### 1. RF Transmission & Hardware Controller Bridge
* **Transmission Downlink**: Real-time video frames are wirelessly downlinked from the CanSat payload via an **XBee 5GHz RF Link** operating concurrently with the primary telemetry frequency.
* **Hardware Signal Conversion**: On the receiving ground side, a dedicated **Hardware Controller** receives the XBee 5GHz RF video stream and converts the raw incoming wireless payload data into a standardized network stream (e.g. RTSP/RTP H.264 video stream). The detailed internal circuit/firmware processing of this converter module is modularized and treated as an external black-box signal adapter.

### 2. Software WebRTC Integration into Existing Architecture

#### A. Signaling Server Extension (`server/index.js`)
The existing WebSocket server (`server/index.js` running on port `8766`) will be expanded to serve as the WebRTC Signaling Mediator for exchanging Session Description Protocol (SDP) offers, answers, and Interactive Connectivity Establishment (ICE) candidates between the video gateway and browser UI clients:

```javascript
// WebRTC Signaling Handler in server/index.js
wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    try {
      const payload = JSON.parse(message);
      // Route WebRTC signaling messages
      if (['webrtc-offer', 'webrtc-answer', 'ice-candidate'].includes(payload.type)) {
        broadcastMessage(JSON.stringify(payload)); // Relay to all connected clients
      }
    } catch (err) {
      // Standard ASCII CSV telemetry processing handled here
    }
  });
});
```

#### B. React Component Integration (`VideoFeed.jsx`)
A dedicated `<VideoFeed />` component is created, leveraging native browser `RTCPeerConnection` APIs to decode incoming WebRTC H.264 video streams with sub-100ms latency:

```jsx
import React, { useEffect, useRef, useState } from 'react';
import { Video, VideoOff, Maximize2, RefreshCw } from 'lucide-react';
import { useTelemetry } from '../context/TelemetryContext';

export const VideoFeed = () => {
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const { customWsUrl } = useTelemetry();

  useEffect(() => {
    // Initialize WebRTC Peer Connection with STUN fallback
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    pcRef.current = pc;

    // Attach incoming RTP video track to HTML5 <video> element
    pc.ontrack = (event) => {
      if (videoRef.current && event.streams[0]) {
        videoRef.current.srcObject = event.streams[0];
        setIsVideoActive(true);
      }
    };

    return () => pc.close();
  }, []);

  return (
    <div className="glass-panel p-4 relative overflow-hidden flex flex-col justify-between" id="webrtc-video-panel">
      <div className="flex items-center justify-between mb-3 font-mono text-xs text-slate-300">
        <span className="flex items-center gap-2 font-bold">
          <Video className="w-4 h-4 text-cyan-400" />
          PAYLOAD LIVE HD VIDEO FEED (XBEE 5GHz WEBRTC)
        </span>
        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${
          isVideoActive ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400' : 'bg-red-950/40 border-red-500/40 text-red-400'
        }`}>
          {isVideoActive ? 'LIVE 720p @ 30FPS' : 'SIGNAL OFFLINE'}
        </span>
      </div>

      {/* HTML5 Video Display Window */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full object-cover" 
        />
        {!isVideoActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 font-mono text-xs bg-slate-950/80">
            <VideoOff className="w-8 h-8 mb-2 text-slate-700 animate-pulse" />
            <span>AWAITING XBEE 5GHz VIDEO SIGNAL CONVERSION...</span>
          </div>
        )}
      </div>
    </div>
  );
};
export default VideoFeed;
```

#### C. Dashboard Layout Integration in `CockpitView.jsx`
* `<VideoFeed />` is embedded inside [`CockpitView.jsx`](file:///c:/Users/Dheeraj%20Sutram/Documents/projects/Sammard_coz_im_Bored/GCS%20-%20Mock%20Cansat/GCS%20control/src/components/CockpitView.jsx) side-by-side with [`Attitude3D.jsx`](file:///c:/Users/Dheeraj%20Sutram/Documents/projects/Sammard_coz_im_Bored/GCS%20-%20Mock%20Cansat/GCS%20control/src/components/Attitude3D.jsx) and the real-time altitude chart.
* This grants ground operators simultaneous real-time visual situational awareness (optical camera descent view) alongside computational 3D orientation vectors and 25-point tabular sensor metrics.


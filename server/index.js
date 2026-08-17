import { WebSocketServer } from 'ws';
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { FlightLogger } from './logger.js';

const WS_PORT = process.env.WS_PORT || 8766;
const ARDUINO_BAUD = 115200;
const PREFERRED_COM = process.env.ARDUINO_PORT || 'COM7';

const wss = new WebSocketServer({ port: WS_PORT });
const flightLogger = new FlightLogger();

console.log(`[GCS SERVER] WebSocket Server started on ws://localhost:${WS_PORT}`);

let serialPort = null;
let parser = null;
let lastKnownFrame = null;

function connectSerial() {
  SerialPort.list().then((ports) => {
    console.log('[GCS SERVER] Available Serial Ports:', ports.map(p => p.path).join(', ') || 'None found');
    const matched = ports.find(p => p.path === PREFERRED_COM) || ports[0];

    if (!matched) {
      console.log('[GCS SERVER] No Arduino/XBee serial hardware found. Run simulator (`npm run simulator`) for mock testing.');
      return;
    }

    console.log(`[GCS SERVER] Connecting to Serial Port: ${matched.path} at ${ARDUINO_BAUD} baud...`);
    
    try {
      serialPort = new SerialPort({ path: matched.path, baudRate: ARDUINO_BAUD, autoOpen: true });
      parser = serialPort.pipe(new ReadlineParser({ delimiter: '\r' })); // standard CR delimiter from guide

      serialPort.on('open', () => {
        console.log(`[GCS SERVER] Serial Connection established on ${matched.path}`);
      });

      parser.on('data', (rawLine) => {
        const line = rawLine.toString().trim();
        if (!line) return;

        console.log(`[XBEE COM IN] ${line}`);
        
        // Log telemetry raw CSV line to file
        flightLogger.logRaw(line);
        lastKnownFrame = line;

        // Broadcast raw ASCII line to browser clients
        broadcastMessage(line);
      });

      serialPort.on('error', (err) => {
        console.error('[GCS SERVER] Serial Error:', err.message);
        if (err.message.includes('Access denied')) {
          console.warn('[GCS SERVER] COM port locked! Please close other serial monitors.');
        }
        if (serialPort && serialPort.isOpen) {
          serialPort.close();
        } else {
          setTimeout(connectSerial, 3000);
        }
      });

      serialPort.on('close', () => {
        console.warn('[GCS SERVER] Serial Port Closed. Retrying in 3 seconds...');
        setTimeout(connectSerial, 3000);
      });
    } catch (err) {
      console.error('[GCS SERVER] Failed to open serial port:', err.message);
      setTimeout(connectSerial, 3000);
    }
  }).catch((err) => {
    console.error('[GCS SERVER] Error listing serial ports:', err.message);
  });
}

function broadcastMessage(rawMessage) {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(rawMessage);
    }
  });
}

wss.on('connection', (ws) => {
  console.log('[GCS SERVER] Telemetry client connected via WebSocket.');

  // If we have a last known frame, push it to the client immediately
  if (lastKnownFrame) {
    ws.send(lastKnownFrame);
  }

  ws.on('message', (message) => {
    const cmdStr = message.toString().trim();
    console.log(`[GCS SERVER] Command received from client UI: ${cmdStr}`);
    
    // Broadcast back to serial port (if open)
    if (serialPort && serialPort.isOpen) {
      serialPort.write(cmdStr + '\r', (err) => {
        if (err) console.error('[GCS SERVER] Error writing to serial:', err.message);
        else console.log(`[GCS SERVER] Command written to XBee serial: ${cmdStr}`);
      });
    } else {
      // Also broadcast commands to other connected clients (like the simulator)
      // so if a simulator is connected as a client, it can act on the command
      broadcastMessage(cmdStr);
    }
  });

  ws.on('close', () => {
    console.log('[GCS SERVER] Telemetry client disconnected.');
  });
});

process.on('SIGINT', () => {
  console.log('[GCS SERVER] Shutting down server...');
  flightLogger.close();
  if (serialPort && serialPort.isOpen) serialPort.close();
  process.exit(0);
});

connectSerial();

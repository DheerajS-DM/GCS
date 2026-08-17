import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGS_DIR = path.join(__dirname, '..', 'logs');

if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

export class FlightLogger {
  constructor() {
    this.filePath = null;
    this.buffer = [];
    this.flushInterval = null;
    this.teamId = null;

    // Flush buffer every 1000ms
    this.flushInterval = setInterval(() => this.flush(), 1000);
  }

  initializeFile(teamId) {
    this.teamId = teamId || '1000';
    this.filePath = path.join(LOGS_DIR, `Flight_${this.teamId}.csv`);
    
    // Check if file already exists. If not, write headers.
    if (!fs.existsSync(this.filePath)) {
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
      fs.writeFileSync(this.filePath, headers + '\n', 'utf8');
      console.log(`[LOGGER] Created new flight log file: ${this.filePath}`);
    } else {
      console.log(`[LOGGER] Appending to existing flight log file: ${this.filePath}`);
    }
  }

  logRaw(asciiLine) {
    const line = asciiLine.trim();
    if (!line) return;

    // Parse team ID from the first field to initialize log path if not done
    const parts = line.split(',');
    const parsedTeamId = parts[0];
    
    if (!this.filePath || this.teamId !== parsedTeamId) {
      this.initializeFile(parsedTeamId);
    }

    this.buffer.push(line);
  }

  flush() {
    if (this.buffer.length === 0 || !this.filePath) return;
    const content = this.buffer.join('\n') + '\n';
    this.buffer = [];
    fs.appendFile(this.filePath, content, (err) => {
      if (err) console.error('[LOGGER] Error writing flight log buffer:', err);
    });
  }

  close() {
    if (this.flushInterval) clearInterval(this.flushInterval);
    this.flush();
    if (this.filePath) {
      console.log(`[LOGGER] Flight log closed: ${this.filePath}`);
    }
  }
}

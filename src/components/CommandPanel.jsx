import React, { useState, useEffect, useRef } from 'react';
import { Shield, Target, AlertTriangle, Play, Pause, Square, Upload, RefreshCw, Wifi, FileSpreadsheet, PlayCircle } from 'lucide-react';
import { useTelemetry } from '../context/TelemetryContext';

export const CommandPanel = () => {
  const { 
    sendCommand, 
    isConnected, 
    customWsUrl, 
    setCustomWsUrl, 
    localSimActive, 
    setLocalSimActive, 
    exportSessionCSV,
    currentFrame
  } = useTelemetry();

  const [isArmed, setIsArmed] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingCommand, setPendingCommand] = useState(null);
  
  // Custom WebSocket URL edit state
  const [wsUrlInput, setWsUrlInput] = useState(customWsUrl);

  // CX Toggle State
  const [cxOn, setCxOn] = useState(false);

  // Simulation Profile Playback State
  const [csvPressures, setCsvPressures] = useState([]);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isPlaybackRunning, setIsPlaybackRunning] = useState(false);
  const playbackIntervalRef = useRef(null);

  // Synchronize manual WS url changes
  const handleUrlChange = (e) => {
    setWsUrlInput(e.target.value);
  };

  const reconnectWs = () => {
    setCustomWsUrl(wsUrlInput);
  };

  // Safe confirm toggle
  const triggerCommand = (cmd) => {
    setPendingCommand(cmd);
    setShowConfirmModal(true);
  };

  const confirmAction = () => {
    if (pendingCommand) {
      sendCommand(pendingCommand);
      
      // Update local states if necessary
      if (pendingCommand.includes('CX,ON')) setCxOn(true);
      if (pendingCommand.includes('CX,OFF')) setCxOn(false);
      if (pendingCommand.includes('SIM,DISABLE')) {
        stopPlayback();
      }
    }
    setShowConfirmModal(false);
    setPendingCommand(null);
  };

  // Time Sync command CMD,1000,ST,hh:mm:ss
  const sendTimeSync = () => {
    const d = new Date();
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    const ss = String(d.getUTCSeconds()).padStart(2, '0');
    const timeStr = `${hh}:${mm}:${ss}`;
    sendCommand(`CMD,1000,ST,${timeStr}`);
  };

  // Load and parse CSV file
  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split(/\r?\n/);
      const pressures = [];

      for (let line of lines) {
        const clean = line.trim();
        if (!clean) continue;
        
        // Parse float from lines. If CSV contains columns, look for a numeric pressure field
        const num = parseFloat(clean);
        if (!isNaN(num)) {
          pressures.push(num);
        } else {
          // split and search for numbers
          const parts = clean.split(',');
          for (let part of parts) {
            const pVal = parseFloat(part);
            if (!isNaN(pVal) && pVal > 1000) { // pressure in Pa is > 1000 Usually
              pressures.push(pVal);
              break;
            }
          }
        }
      }

      if (pressures.length > 0) {
        setCsvPressures(pressures);
        setPlaybackIndex(0);
        sendCommand('CMD,1000,SIM,ENABLE');
        console.log(`[GCS UI] Uploaded simulation profile. Loaded ${pressures.length} pressure points.`);
      } else {
        alert('Could not find valid pressure data (Pascals) in the uploaded CSV file.');
      }
    };
    reader.readAsText(file);
  };

  // CSV Simulation playback loop at 1Hz (Requirement G10)
  const startPlayback = () => {
    if (csvPressures.length === 0) {
      alert('Please upload a pressure profile CSV file first.');
      return;
    }
    if (isPlaybackRunning) return;

    setIsPlaybackRunning(true);
    // Send SIM ACTIVATE to let CanSat enter simulation flight mode (Requirement G9)
    sendCommand('CMD,1000,SIM,ACTIVATE');

    playbackIntervalRef.current = setInterval(() => {
      setPlaybackIndex((prevIndex) => {
        if (prevIndex >= csvPressures.length) {
          clearInterval(playbackIntervalRef.current);
          setIsPlaybackRunning(false);
          sendCommand('CMD,1000,SIM,DISABLE');
          return 0;
        }

        const pressureValue = csvPressures[prevIndex];
        // Send simulated pressure packet at 1Hz (Requirement G10)
        sendCommand(`CMD,1000,SIMP,${Math.round(pressureValue)}`);
        return prevIndex + 1;
      });
    }, 1000); // 1Hz rate
  };

  const pausePlayback = () => {
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
    setIsPlaybackRunning(false);
  };

  const stopPlayback = () => {
    pausePlayback();
    setPlaybackIndex(0);
    sendCommand('CMD,1000,SIM,DISABLE');
  };

  useEffect(() => {
    return () => {
      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
    };
  }, []);

  return (
    <div className="glass-panel p-6 space-y-6" id="command-panel">
      <h3 className="text-xs font-bold text-cyan-400 tracking-wider uppercase flex items-center gap-2 border-b border-slate-900 pb-3">
        <Shield className="w-4 h-4 text-cyan-400" />
        COMMAND & CONTROL DISPATCH CENTER
      </h3>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Connection Setup Panel (4 cols) */}
        <div className="xl:col-span-4 space-y-4 bg-slate-950/40 p-4 rounded-xl border border-slate-900">
          <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
            1. Manual Comms Port Config
          </h4>
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-slate-500 block">WEBSOCKET SERVER PORT</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={wsUrlInput}
                onChange={handleUrlChange}
                className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50"
              />
              <button
                onClick={reconnectWs}
                className="px-3 py-1.5 rounded bg-slate-800 text-cyan-400 font-mono text-xs font-semibold border border-slate-700 hover:border-cyan-500/30 hover:bg-slate-700/50 transition-all flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                LINK
              </button>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap gap-2">
            {/* Offline Browser Mock Switch */}
            <button
              onClick={() => setLocalSimActive(!localSimActive)}
              className={`px-3 py-2 rounded font-mono text-xs font-bold border transition-all flex-1 flex items-center justify-center gap-2 ${
                localSimActive 
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400' 
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <PlayCircle className="w-4 h-4" />
              {localSimActive ? 'LOCAL MOCK: ACTIVE' : 'LOCAL MOCK: OFF'}
            </button>
          </div>
        </div>

        {/* Standard Commands (4 cols) */}
        <div className="xl:col-span-4 space-y-4 bg-slate-950/40 p-4 rounded-xl border border-slate-900">
          <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
            2. Standard CanSat Commands
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Calibrate Altitude */}
            <button
              onClick={() => triggerCommand('CMD,1000,CAL')}
              disabled={!isConnected}
              className="px-3 py-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 hover:text-cyan-400 text-slate-300 font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Target className="w-4 h-4 text-cyan-400" />
              CALIBRATE ALT (CAL)
            </button>

            {/* Time Synchronization */}
            <button
              onClick={sendTimeSync}
              disabled={!isConnected}
              className="px-3 py-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 hover:text-cyan-400 text-slate-300 font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin-slow" />
              TIME SYNC (ST)
            </button>

            {/* Telemetry ON/OFF Toggle */}
            <button
              onClick={() => triggerCommand(cxOn ? 'CMD,1000,CX,OFF' : 'CMD,1000,CX,ON')}
              disabled={!isConnected}
              className={`px-3 py-3 rounded-lg border font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 col-span-2 ${
                cxOn 
                  ? 'bg-red-950/30 border-red-500/40 text-red-400 hover:bg-red-950/50' 
                  : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/50'
              }`}
            >
              <Wifi className="w-4 h-4" />
              {cxOn ? 'DEACTIVATE TELEMETRY (CX OFF)' : 'ACTIVATE TELEMETRY (CX ON)'}
            </button>
          </div>
        </div>

        {/* Simulation Uplink & Playback (4 cols) */}
        <div className="xl:col-span-4 space-y-4 bg-slate-950/40 p-4 rounded-xl border border-slate-900">
          <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
            <span>3. Simulation Mode Playback</span>
            {currentFrame.mode === 'S' && <span className="text-orange-400 text-[10px] animate-pulse">MODE: SIM</span>}
          </h4>

          {/* Upload Button */}
          <div className="flex gap-2">
            <label className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 font-mono text-xs flex items-center justify-center gap-2 hover:border-slate-700 cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>{csvPressures.length > 0 ? `Profile: ${csvPressures.length} pts` : 'Upload pressure CSV'}</span>
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleCSVUpload} 
                className="hidden" 
              />
            </label>

            {csvPressures.length > 0 && (
              <button
                onClick={() => { setCsvPressures([]); stopPlayback(); }}
                className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-400 hover:text-red-400 text-xs font-mono"
              >
                Reset
              </button>
            )}
          </div>

          {/* Playback Controls */}
          <div className="space-y-3 font-mono text-xs">
            <div className="flex gap-1.5">
              <button
                onClick={startPlayback}
                disabled={!isConnected || csvPressures.length === 0}
                className={`flex-1 py-2 rounded font-bold border transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 ${
                  isPlaybackRunning 
                    ? 'bg-slate-900 border-slate-800 text-slate-600'
                    : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/40'
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                PLAY
              </button>

              <button
                onClick={pausePlayback}
                disabled={!isPlaybackRunning}
                className="flex-1 py-2 rounded bg-slate-900 border border-slate-800 text-orange-400 hover:bg-slate-800/80 font-bold disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                <Pause className="w-3.5 h-3.5" />
                PAUSE
              </button>

              <button
                onClick={stopPlayback}
                disabled={!isConnected || csvPressures.length === 0}
                className="flex-1 py-2 rounded bg-slate-900 border border-slate-800 text-red-400 hover:bg-slate-800/80 font-bold disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                <Square className="w-3.5 h-3.5" />
                STOP
              </button>
            </div>

            {/* Playback Status Bar */}
            {csvPressures.length > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>STEP: {playbackIndex} / {csvPressures.length}</span>
                  <span>UPLINK: {csvPressures[playbackIndex] ? `${Math.round(csvPressures[playbackIndex])} Pa` : '0 Pa'}</span>
                </div>
                <div className="w-full bg-slate-900 border border-slate-800 h-2 rounded overflow-hidden">
                  <div 
                    className="bg-cyan-500 h-full transition-all duration-300"
                    style={{ width: `${(playbackIndex / csvPressures.length) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Confirmation Safety Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4" id="safety-modal">
          <div className="glass-panel p-6 max-w-md w-full border-red-500/40 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400 mb-3 font-mono">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
              <h4 className="text-lg font-bold">SAFETY CRITICAL SYSTEM CMD</h4>
            </div>
            <p className="text-sm text-slate-300 mb-6 font-mono leading-relaxed">
              Are you sure you want to execute command string: <br />
              <strong className="text-red-400 font-mono block mt-2 text-center select-all bg-slate-950 p-2 rounded border border-slate-900">{pendingCommand}</strong>
            </p>
            <div className="flex justify-end gap-3 font-mono text-sm">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700"
              >
                CANCEL
              </button>
              <button
                onClick={confirmAction}
                className="px-4 py-2 rounded-lg bg-red-950/80 border border-red-500 text-red-400 font-bold hover:bg-red-900/60"
              >
                CONFIRM DISPATCH
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CommandPanel;

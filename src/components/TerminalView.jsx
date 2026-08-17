import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Download, Trash2, Pause, Play, Filter } from 'lucide-react';
import { useTelemetry } from '../context/TelemetryContext';

export const TerminalView = () => {
  const { currentFrame, terminalLogs, clearTerminal } = useTelemetry();
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const logContainerRef = useRef(null);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [terminalLogs, autoScroll]);

  const downloadLogs = () => {
    const text = terminalLogs.map((l) => `[${l.time}] [${l.type}] ${l.text}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gcs_terminal_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = terminalLogs.filter((log) => {
    if (filterType === 'ALL') return true;
    return log.type === filterType;
  });

  return (
    <div className="space-y-6" id="terminal-view-container">
      
      {/* Terminal Toolbar */}
      <div className="glass-panel p-6 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
            <Terminal className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100 tracking-wider">TELEMETRY LOG CONSOLE</h2>
            <p className="text-sm text-slate-400 font-mono">Real-time raw XBee telemetry packet stream & commands log</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
            <Filter className="w-4 h-4 text-slate-400 mr-2" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">ALL LOGS</option>
              <option value="INFO" className="bg-slate-900">INFO</option>
              <option value="CMD" className="bg-slate-900">COMMANDS</option>
              <option value="SUCCESS" className="bg-slate-900">SUCCESS</option>
              <option value="WARN" className="bg-slate-900">WARNINGS</option>
            </select>
          </div>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-4 py-2 rounded-lg border transition-all flex items-center gap-2 ${
              autoScroll ? 'bg-slate-800 border-slate-700 text-cyan-400' : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            {autoScroll ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{autoScroll ? 'AUTO-SCROLL ON' : 'PAUSED'}</span>
          </button>

          <button
            onClick={downloadLogs}
            className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>EXPORT LOGS</span>
          </button>

          <button
            onClick={clearTerminal}
            className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:border-red-500 hover:text-red-400 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>CLEAR</span>
          </button>
        </div>
      </div>

      {/* Terminal Output Box */}
      <div className="glass-panel p-6 rounded-2xl font-mono text-xs bg-slate-950 border-slate-800 h-[600px] flex flex-col justify-between" id="terminal-window">
        
        {/* Top 1Hz Header Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-slate-200 font-bold tracking-wide flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>[1Hz RAW TELEMETRY EVENT STREAM]</span>
          </div>
          <div className="text-slate-300">
            ALTITUDE: <span className="text-cyan-400">{currentFrame.altitude.toFixed(1)}m</span> | PRESSURE: <span className="text-orange-400">{currentFrame.pressure.toFixed(1)}kPa</span> | STATE: <span className="text-emerald-400">{currentFrame.state}</span>
          </div>
        </div>

        {/* Log Lines */}
        <div ref={logContainerRef} className="flex-1 overflow-y-auto space-y-2 pr-2">
          {filteredLogs.map((log) => {
            let badgeStyle = 'text-cyan-400';
            if (log.type === 'WARN') badgeStyle = 'text-orange-400 font-bold';
            if (log.type === 'CMD') badgeStyle = 'text-purple-400 font-bold';
            if (log.type === 'SUCCESS') badgeStyle = 'text-emerald-400';

            return (
              <div key={log.id} className="flex items-start space-x-3 leading-relaxed p-1 hover:bg-slate-900/60 rounded">
                <span className="text-slate-500 select-none">[{log.time}]</span>
                <span className={badgeStyle}>[{log.type}]</span>
                <span className="text-slate-200 break-all">{log.text}</span>
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
};

import React from 'react';

export default function Header() {
  return (
    <header className="widget glow header-span" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ fontSize: '2rem', fontWeight: 'bold', border: '2px solid var(--primary-green)', padding: '5px 15px' }}>
          GO
        </div>
        <div>
          <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', letterSpacing: '1px' }}>SYSTEM STATUS</div>
          <div style={{ fontSize: '1.2rem' }}>NOMINAL</div>
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', letterSpacing: '2px' }}>T-MINUS</div>
        <div style={{ fontSize: '2.5rem', fontWeight: 'bold', fontFamily: 'monospace' }}>00:14:32</div>
      </div>

      <div style={{ display: 'flex', gap: '30px', textAlign: 'right' }}>
        <div>
          <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', letterSpacing: '1px' }}>MISSION PHASE</div>
          <div style={{ fontSize: '1.2rem' }}>PRE-LAUNCH</div>
        </div>
        <div>
          <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', letterSpacing: '1px' }}>LINK (RSSI)</div>
          <div style={{ fontSize: '1.2rem' }}>-45 dBm</div>
        </div>
      </div>
    </header>
  );
}

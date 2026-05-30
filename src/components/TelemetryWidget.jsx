import React from 'react';

export default function TelemetryWidget({ title, children, className = '' }) {
  return (
    <div className={`widget glow ${className}`}>
      <div className="widget-title">{title}</div>
      {children}
    </div>
  );
}

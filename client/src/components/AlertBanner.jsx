import React from 'react';
import { fmtMs } from '../api.js';

// One line per API that is currently failing. Click opens its details.
export default function AlertBanner({ monitors, onSelect }) {
  const down = monitors.filter((m) => m.status === 'down');
  if (!down.length) return null;

  return (
    <div className="alerts" role="alert">
      {down.map((m) => (
        <button key={m._id} className="alert" onClick={() => onSelect(m._id)}>
          <span className="alert-icon" aria-hidden="true">
            🚨
          </span>
          <span className="alert-body">
            <span className="alert-title">{m.name} is down</span>
            <span className="alert-facts">
              <span>Status {m.lastStatusCode ?? 'no response'}</span>
              <span>Response {fmtMs(m.lastResponseMs)}</span>
            </span>
            {m.lastError && <span className="alert-reason">{m.lastError}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

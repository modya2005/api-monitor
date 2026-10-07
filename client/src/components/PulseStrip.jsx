import React from 'react';
import { fmtDateTime, fmtMs } from '../api.js';

const SLOTS = 48;

// A row of thin bars, one per recent check. Height follows response time,
// colour follows the outcome. Older checks sit on the left; empty slots pad
// the strip so every row lines up.
export default function PulseStrip({ results = [], height = 28 }) {
  const shown = results.slice(-SLOTS);
  const max = Math.max(200, ...shown.map((r) => r.responseMs || 0));
  const empty = SLOTS - shown.length;

  return (
    <div className="pulse" style={{ height }} role="img" aria-label={`Outcome of the last ${shown.length} checks`}>
      {Array.from({ length: empty }, (_, i) => (
        <span key={`e${i}`} className="bar bar-empty" />
      ))}
      {shown.map((r) => {
        const h = r.success ? Math.max(0.28, (r.responseMs || 0) / max) : 1;
        return (
          <span
            key={r._id || r.checkedAt}
            className={r.success ? 'bar bar-up' : 'bar bar-down'}
            style={{ height: `${Math.round(h * 100)}%` }}
            title={`${fmtDateTime(r.checkedAt)}: ${r.success ? 'OK' : 'Failed'}, ${r.statusCode ?? 'no response'}, ${fmtMs(r.responseMs)}`}
          />
        );
      })}
    </div>
  );
}

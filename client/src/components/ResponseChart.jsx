import React, { useState } from 'react';
import { fmtDateTime, fmtMs } from '../api.js';

// Dependency-free SVG chart of response time. Hover (or touch) to read a point;
// failed checks are marked in the down colour.
export default function ResponseChart({ results }) {
  const [hover, setHover] = useState(null);

  if (!results.length) return <p className="muted">No checks have run yet.</p>;

  const W = 560;
  const H = 170;
  const pad = { l: 46, r: 8, t: 12, b: 8 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const n = results.length;

  const max = niceMax(Math.max(100, ...results.map((r) => r.responseMs || 0)));
  const x = (i) => pad.l + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v) => pad.t + innerH - (v / max) * innerH;

  const pts = results.map((r, i) => [x(i), y(r.responseMs || 0)]);
  const line = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
  const area = `${line} L${pts[n - 1][0].toFixed(1)},${y(0)} L${pts[0][0].toFixed(1)},${y(0)} Z`;
  const ticks = [0, 0.5, 1].map((t) => Math.round(max * t));

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - pad.l) / innerW) * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, i)));
  };

  const h = hover != null ? results[hover] : null;

  return (
    <div className="chart-wrap">
      <div className="chart-readout" aria-live="polite">
        {h ? (
          <>
            <strong className="num">{fmtMs(h.responseMs)}</strong>
            <span>{h.success ? 'OK' : `Failed, ${h.error || h.statusCode}`}</span>
            <span className="muted">{fmtDateTime(h.checkedAt)}</span>
          </>
        ) : (
          <span className="muted">Hover over the chart to read a single check</span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="chart"
        role="img"
        aria-label="Response time over recent checks"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        onTouchMove={(e) =>
          e.touches[0] && onMove({ currentTarget: e.currentTarget, clientX: e.touches[0].clientX })
        }
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="chart-grid" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="chart-label">
              {fmtMs(t)}
            </text>
          </g>
        ))}
        <path d={area} className="chart-area" />
        <path d={line} className="chart-line" fill="none" />
        {results.map(
          (r, i) =>
            !r.success && <circle key={r._id} cx={pts[i][0]} cy={pts[i][1]} r="3.5" className="chart-fail" />
        )}
        {hover != null && (
          <g>
            <line x1={pts[hover][0]} x2={pts[hover][0]} y1={pad.t} y2={y(0)} className="chart-cursor" />
            <circle cx={pts[hover][0]} cy={pts[hover][1]} r="4.5" className="chart-point" />
          </g>
        )}
      </svg>
    </div>
  );
}

// Round the top of the axis to something readable (100, 200, 500, 1 s, 2 s...)
function niceMax(v) {
  const steps = [100, 200, 300, 500, 1000, 2000, 3000, 5000, 10000, 20000, 60000];
  return steps.find((s) => s >= v * 1.05) || Math.ceil(v / 1000) * 1000;
}

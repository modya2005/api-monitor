import React from 'react';
import { fmtMs, fmtPct } from '../api.js';
import PulseStrip from './PulseStrip.jsx';

const STATUS_LABEL = { up: 'Up', down: 'Down', unknown: 'Waiting for first check' };

export default function MonitorList({ monitors, onSelect, onAdd }) {
  if (!monitors.length) {
    return (
      <div className="empty">
        <p className="empty-title">Nothing is being monitored yet</p>
        <p className="muted">Add the URL of an API and it will be checked on a schedule. You will see its status here and get an email if it goes down.</p>
        <button className="btn btn-primary" onClick={onAdd}>
          Add your first API
        </button>
      </div>
    );
  }

  return (
    <div className="list" role="list">
      <div className="list-head" aria-hidden="true">
        <span />
        <span>API</span>
        <span className="col-pulse">Last 48 checks</span>
        <span className="col-num">Availability</span>
        <span className="col-num">Response</span>
      </div>

      {monitors.map((m) => (
        <button key={m._id} role="listitem" className="row" onClick={() => onSelect(m._id)}>
          <span className={`dot dot-${m.status}`} title={STATUS_LABEL[m.status]}>
            <span className="sr-only">{STATUS_LABEL[m.status]}</span>
          </span>

          <span className="row-name">
            <span className="row-title">
              {m.name}
              {!m.active && <span className="chip">Paused</span>}
            </span>
            <span className="row-url">{m.url}</span>
          </span>

          <span className="col-pulse">
            <PulseStrip results={m.recent} />
          </span>

          <span className="col-num col-avail num">{fmtPct(m.stats.last24h.uptime)}</span>
          <span className="col-num col-resp num">{fmtMs(m.lastResponseMs)}</span>
        </button>
      ))}
    </div>
  );
}

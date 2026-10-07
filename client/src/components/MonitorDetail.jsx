import React, { useCallback, useEffect, useState } from 'react';
import { api, fmtAgo, fmtDateTime, fmtMs, fmtPct } from '../api.js';
import ResponseChart from './ResponseChart.jsx';
import PulseStrip from './PulseStrip.jsx';

const STATUS_TEXT = { up: 'Up', down: 'Down', unknown: 'Not checked yet' };

export default function MonitorDetail({ monitor, onChanged, onDeleted }) {
  const [results, setResults] = useState([]);
  const [failures, setFailures] = useState([]);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    const [r, f] = await Promise.all([api.results(monitor._id), api.failures(monitor._id)]);
    setResults(r);
    setFailures(f);
  }, [monitor._id]);

  // Reload history whenever a new check lands
  useEffect(() => {
    load().catch(() => {});
  }, [load, monitor.lastCheckedAt]);

  const checkNow = async () => {
    setBusy(true);
    try {
      await api.checkNow(monitor._id);
      await onChanged();
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async () => {
    await api.update(monitor._id, { active: !monitor.active });
    await onChanged();
  };

  const remove = async () => {
    await api.remove(monitor._id);
    onDeleted();
  };

  const s = monitor.stats;
  const v = monitor.validation || {};
  const isDown = monitor.status === 'down';

  return (
    <div className="detail">
      <header className="detail-head">
        <div className="detail-state">
          <span className={`dot dot-${monitor.status}`} />
          <span>{monitor.active ? STATUS_TEXT[monitor.status] : 'Paused'}</span>
        </div>
        <h2 className="detail-title">{monitor.name}</h2>
        <p className="detail-url">
          <span className="method">{monitor.method}</span> {monitor.url}
        </p>
        <div className="actions">
          <button className="btn btn-primary" onClick={checkNow} disabled={busy}>
            {busy ? 'Checking' : 'Check now'}
          </button>
          <button className="btn" onClick={toggleActive}>
            {monitor.active ? 'Pause checks' : 'Resume checks'}
          </button>
        </div>
      </header>

      {isDown && (
        <div className="callout" role="alert">
          <strong>API is down.</strong> Status {monitor.lastStatusCode ?? 'no response'}, response{' '}
          {fmtMs(monitor.lastResponseMs)}.
          {monitor.lastError && <span className="callout-reason">{monitor.lastError}</span>}
        </div>
      )}

      <dl className="figures">
        <div>
          <dt>Availability, 24 hours</dt>
          <dd className="num">{fmtPct(s.last24h.uptime)}</dd>
        </div>
        <div>
          <dt>Response</dt>
          <dd className="num">{fmtMs(monitor.lastResponseMs)}</dd>
        </div>
        <div>
          <dt>Status code</dt>
          <dd className={`num ${isDown ? 'is-down' : ''}`}>{monitor.lastStatusCode ?? '—'}</dd>
        </div>
        <div>
          <dt>Last checked</dt>
          <dd className="figure-text">{fmtAgo(monitor.lastCheckedAt)}</dd>
        </div>
      </dl>

      <section className="section">
        <h3>Recent checks</h3>
        <PulseStrip results={results.slice(-48)} height={36} />
      </section>

      <section className="section">
        <h3>Response time</h3>
        <ResponseChart results={results} />
      </section>

      <section className="section">
        <h3>Availability over time</h3>
        <ul className="ledger">
          <li>
            <span>Last 24 hours</span>
            <span className="num">{fmtPct(s.last24h.uptime)}</span>
          </li>
          <li>
            <span>Last 7 days</span>
            <span className="num">{fmtPct(s.last7d.uptime)}</span>
          </li>
          <li>
            <span>Last 30 days</span>
            <span className="num">{fmtPct(s.last30d.uptime)}</span>
          </li>
          <li>
            <span>Average response, 24 hours</span>
            <span className="num">{fmtMs(s.last24h.avgResponseMs)}</span>
          </li>
        </ul>
      </section>

      <section className="section">
        <h3>Failure history</h3>
        {failures.length === 0 ? (
          <p className="muted">No failed checks on record.</p>
        ) : (
          <ul className="failures">
            {failures.map((f) => (
              <li key={f._id}>
                <span className="failure-when">{fmtDateTime(f.checkedAt)}</span>
                <span className="failure-what">
                  <strong>{f.statusCode ? `Status ${f.statusCode}` : 'No response'}</strong>
                  <span className="muted">{fmtMs(f.responseMs)}</span>
                </span>
                <span className="failure-why">{f.error}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section">
        <h3>How it is checked</h3>
        <ul className="ledger ledger-plain">
          <li>
            <span>Frequency</span>
            <span>Every {monitor.intervalMinutes} min</span>
          </li>
          <li>
            <span>Timeout</span>
            <span>{fmtMs(monitor.timeoutMs)}</span>
          </li>
          <li>
            <span>Expected status</span>
            <span>{monitor.expectedStatus}</span>
          </li>
          {v.maxResponseMs > 0 && (
            <li>
              <span>Fails if slower than</span>
              <span>{fmtMs(v.maxResponseMs)}</span>
            </li>
          )}
          {v.bodyContains && (
            <li>
              <span>Body must contain</span>
              <span>{v.bodyContains}</span>
            </li>
          )}
          {v.requiredFields?.length > 0 && (
            <li>
              <span>Required JSON fields</span>
              <span>{v.requiredFields.join(', ')}</span>
            </li>
          )}
          <li>
            <span>Email alerts to</span>
            <span>{monitor.alertEmail || 'default recipient'}</span>
          </li>
        </ul>
      </section>

      <footer className="danger-zone">
        {confirmDelete ? (
          <>
            <span>Delete this API and all of its history?</span>
            <button className="btn btn-danger" onClick={remove}>
              Delete permanently
            </button>
            <button className="btn" onClick={() => setConfirmDelete(false)}>
              Keep it
            </button>
          </>
        ) : (
          <button className="btn btn-quiet" onClick={() => setConfirmDelete(true)}>
            Delete this API
          </button>
        )}
      </footer>
    </div>
  );
}

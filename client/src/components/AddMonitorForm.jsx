import React, { useState } from 'react';
import { api } from '../api.js';

const empty = {
  name: '',
  url: '',
  method: 'GET',
  intervalMinutes: 5,
  expectedStatus: 200,
  maxResponseMs: '',
  bodyContains: '',
  requiredFields: '',
  alertEmail: '',
};

export default function AddMonitorForm({ onCreated }) {
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const created = await api.create({
        name: form.name,
        url: form.url,
        method: form.method,
        intervalMinutes: Number(form.intervalMinutes),
        expectedStatus: Number(form.expectedStatus),
        alertEmail: form.alertEmail,
        validation: {
          maxResponseMs: Number(form.maxResponseMs) || 0,
          bodyContains: form.bodyContains,
          requiredFields: form.requiredFields.split(',').map((s) => s.trim()).filter(Boolean),
        },
      });
      setForm(empty);
      onCreated(created._id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="form" onSubmit={submit}>
      <h2 className="detail-title">Add an API</h2>
      <p className="muted form-intro">
        We check it on a schedule and email you if it fails. The first check runs as soon as you save.
      </p>

      <label className="field">
        <span>Name</span>
        <input value={form.name} onChange={set('name')} placeholder="User API" required />
      </label>

      <label className="field">
        <span>URL</span>
        <input
          type="url"
          value={form.url}
          onChange={set('url')}
          placeholder="https://api.example.com/users"
          required
        />
      </label>

      <div className="field-row">
        <label className="field">
          <span>Method</span>
          <select value={form.method} onChange={set('method')}>
            <option>GET</option>
            <option>HEAD</option>
            <option>POST</option>
          </select>
        </label>
        <label className="field">
          <span>Check every (minutes)</span>
          <input type="number" min="1" max="1440" value={form.intervalMinutes} onChange={set('intervalMinutes')} />
        </label>
        <label className="field">
          <span>Expected status</span>
          <input type="number" value={form.expectedStatus} onChange={set('expectedStatus')} />
        </label>
      </div>

      <label className="field">
        <span>Send alerts to</span>
        <input type="email" value={form.alertEmail} onChange={set('alertEmail')} placeholder="you@example.com" />
      </label>

      <details className="more">
        <summary>Validate the response</summary>
        <p className="muted">A check fails if any of these rules are not met, even when the status code is right.</p>
        <label className="field">
          <span>Required JSON fields</span>
          <input value={form.requiredFields} onChange={set('requiredFields')} placeholder="data.id, status" />
          <small>Separate with commas. Use dots for nested fields.</small>
        </label>
        <label className="field">
          <span>Body must contain</span>
          <input value={form.bodyContains} onChange={set('bodyContains')} placeholder="ok" />
        </label>
        <label className="field">
          <span>Fail if slower than (ms)</span>
          <input type="number" min="0" value={form.maxResponseMs} onChange={set('maxResponseMs')} placeholder="2000" />
        </label>
      </details>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="btn btn-primary btn-wide" disabled={busy}>
        {busy ? 'Saving' : 'Start monitoring'}
      </button>
    </form>
  );
}

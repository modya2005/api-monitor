import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api, fmtPct } from './api.js';
import AlertBanner from './components/AlertBanner.jsx';
import MonitorList from './components/MonitorList.jsx';
import MonitorDetail from './components/MonitorDetail.jsx';
import AddMonitorForm from './components/AddMonitorForm.jsx';
import Drawer from './components/Drawer.jsx';
import AuthScreen from './components/AuthScreen.jsx';

const POLL_MS = 15000;

// One plain sentence that says what is going on right now.
function headline(monitors) {
  if (!monitors.length) return 'Add an API to start watching it';
  const active = monitors.filter((m) => m.active);
  const down = active.filter((m) => m.status === 'down');
  // The alert rows below name the failing APIs, so the headline stays general.
  if (down.length === 1) return `1 of ${active.length} APIs is down`;
  if (down.length > 1) return `${down.length} of ${active.length} APIs are down`;
  if (active.length && active.every((m) => m.status === 'unknown')) return 'Running the first checks';
  if (!active.length) return 'All checks are paused';
  return active.length === 1 ? 'Your API is running normally' : `All ${active.length} APIs are running normally`;
}

function summary(monitors) {
  const vals = monitors.map((m) => m.stats.last24h.uptime).filter((v) => v != null);
  if (!vals.length) return 'Results will appear after the first check.';
  const avg = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  return `Average availability over the last 24 hours is ${fmtPct(avg)}.`;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [monitors, setMonitors] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setMonitors(await api.list());
      setError('');
    } catch (err) {
      setError(`Cannot reach the server. ${err.message}`);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    api.me().then((data) => setUser(data.user)).catch(() => setUser(null)).finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    refresh();
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  const selected = monitors.find((m) => m._id === selectedId) || null;
  const anyDown = useMemo(() => monitors.some((m) => m.active && m.status === 'down'), [monitors]);

  const closeDrawer = useCallback(() => {
    setSelectedId(null);
    setAdding(false);
  }, []);

  const handleCreated = async (id) => {
    setAdding(false);
    await refresh();
    setSelectedId(id);
    // the first check runs on the server right after saving
    setTimeout(refresh, 2500);
  };

  if (authLoading) return <main className="auth-page"><p className="muted">Loading your account…</p></main>;
  if (!user) return <AuthScreen onAuthenticated={setUser} />;

  return (
    <div className="page">
      <header className="top">
        <div>
          <h1 className={anyDown ? 'is-down' : ''}>{loaded ? headline(monitors) : 'Loading'}</h1>
          {monitors.length > 0 && <p className="muted lede">{summary(monitors)}</p>}
        </div>
        <div className="top-actions">
          <span className="user-chip">{user.name}</span>
          <button className="btn btn-primary" onClick={() => setAdding(true)}>Add API</button>
          <button className="btn" onClick={async () => { await api.logout(); setUser(null); }}>Sign out</button>
        </div>
      </header>

      {error && (
        <div className="callout" role="alert">
          {error}
        </div>
      )}

      <AlertBanner monitors={monitors.filter((m) => m.active)} onSelect={setSelectedId} />

      {loaded && <MonitorList monitors={monitors} onSelect={setSelectedId} onAdd={() => setAdding(true)} />}

      {adding && (
        <Drawer title="Add an API" onClose={closeDrawer}>
          <AddMonitorForm onCreated={handleCreated} />
        </Drawer>
      )}

      {selected && !adding && (
        <Drawer title={selected.name} onClose={closeDrawer}>
          <MonitorDetail
            key={selected._id}
            monitor={selected}
            onChanged={refresh}
            onDeleted={() => {
              closeDrawer();
              refresh();
            }}
          />
        </Drawer>
      )}
    </div>
  );
}

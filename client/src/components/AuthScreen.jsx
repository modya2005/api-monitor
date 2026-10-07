import React, { useState } from 'react';

export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      onAuthenticated(data.user);
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">API Monitor</div>
        <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="muted">{mode === 'login' ? 'Sign in to manage your API monitors.' : 'Start monitoring your APIs in minutes.'}</p>
        {error && <div className="callout" role="alert">{error}</div>}
        <form onSubmit={submit} className="auth-form">
          {mode === 'signup' && (
            <label>Full name<input required minLength="2" maxLength="80" value={form.name} onChange={(e) => setForm({...form,name:e.target.value})} autoComplete="name" /></label>
          )}
          <label>Email<input required type="email" value={form.email} onChange={(e) => setForm({...form,email:e.target.value})} autoComplete="email" /></label>
          <label>Password<input required type="password" minLength="8" maxLength="128" value={form.password} onChange={(e) => setForm({...form,password:e.target.value})} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
          <button className="btn btn-primary btn-wide" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        </form>
        <button className="auth-switch" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}>
          {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>
        <p className="auth-note">Your password is securely hashed and never stored in plain text.</p>
      </section>
    </main>
  );
}

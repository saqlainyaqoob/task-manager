import { useState } from 'react';
import * as api from './api.js';
import { I } from './Icons.jsx';

export default function AuthModal({ mode, setMode, onDone, onClose }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isRegister = mode === 'register';

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = isRegister ? await api.register(form) : await api.login(form);
      api.setToken(data.token);
      onDone(data.user, isRegister);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="glass w-full max-w-sm space-y-4 rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{isRegister ? 'Create your profile' : 'Welcome back'}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><I.X /></button>
        </div>
        <p className="text-sm text-white/70">Your guest tasks will be moved into your account.</p>
        {isRegister && <input className="field" placeholder="Name" value={form.name} required maxLength={80} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
        <input className="field" type="email" placeholder="Email" value={form.email} required onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="field" type="password" placeholder={isRegister ? 'Password (min 8 characters)' : 'Password'} value={form.password} required minLength={isRegister ? 8 : undefined} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p role="alert" className="rounded-lg bg-black/30 px-3 py-2 text-sm">{error}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-white px-4 py-2.5 font-semibold text-purple-900 hover:bg-white/90 disabled:opacity-60">
          {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
        </button>
        <p className="text-center text-sm text-white/70">
          {isRegister ? 'Already have an account?' : 'New here?'}{' '}
          <button type="button" className="font-semibold underline" onClick={() => { setError(''); setMode(isRegister ? 'login' : 'register'); }}>
            {isRegister ? 'Sign in' : 'Create a profile'}
          </button>
        </p>
      </form>
    </div>
  );
}

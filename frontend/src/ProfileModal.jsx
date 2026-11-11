import { useState } from 'react';
import * as api from './api.js';
import { I } from './Icons.jsx';

export default function ProfileModal({ user, tasks, onUpdated, onLogout, onClose, notify }) {
  const [name, setName] = useState(user.name);
  const done = tasks.filter((t) => t.completed).length;

  async function save(e) {
    e.preventDefault();
    try {
      onUpdated(await api.updateMe({ name }));
      notify('success', 'Profile updated');
    } catch (err) {
      notify('error', err.message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="modal-panel  w-full max-w-sm space-y-5 rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your profile</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><I.X /></button>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[['Total', tasks.length], ['Done', done], ['Open', tasks.length - done]].map(([label, n]) => (
            <div key={label} className="rounded-2xl bg-white/10 py-3"><p className="text-2xl font-semibold">{n}</p><p className="text-xs text-white/60">{label}</p></div>
          ))}
        </div>
        <form onSubmit={save} className="space-y-3">
          <label className="block text-sm text-white/70">Name
            <input className="field mt-1" value={name} required maxLength={80} onChange={(e) => setName(e.target.value)} />
          </label>
          <p className="text-sm text-white/70">Email: {user.email}<br />Member since {new Date(user.created_at).toLocaleDateString()}</p>
          <button className="w-full rounded-xl bg-white px-4 py-2.5 font-semibold text-purple-900 hover:bg-white/90">Save changes</button>
        </form>
        <button onClick={onLogout} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/40 px-4 py-2.5 font-medium hover:bg-white/15"><I.Logout size={18} /> Log out</button>
      </div>
    </div>
  );
}

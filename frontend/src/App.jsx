import { useEffect, useState } from 'react';
import * as api from './api.js';
import { I } from './Icons.jsx';
import Sidebar from './Sidebar.jsx';
import TaskItem from './TaskItem.jsx';
import AuthModal from './AuthModal.jsx';
import ProfileModal from './ProfileModal.jsx';

const FILTERS = [['all', 'All'], ['active', 'To do'], ['done', 'Done']];

export default function App() {
  const [user, setUser] = useState(null);      // null = guest
  const [ready, setReady] = useState(false);   // session check finished
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState(null);    // 'login' | 'register' | 'profile' | null
  const [menuOpen, setMenuOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });

  const notify = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  // 1) Restore a saved login (if any), 2) listen for expired sessions.
  useEffect(() => {
    if (!api.getToken()) setReady(true);
    else api.me().then(setUser).catch(() => api.setToken(null)).finally(() => setReady(true));
    const expired = () => { setUser(null); notify('error', 'Session expired. Please sign in again.'); };
    window.addEventListener('auth-expired', expired);
    return () => window.removeEventListener('auth-expired', expired);
  }, []);

  // Load tasks once the session is known, and again whenever the user changes (login/logout).
  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    api.getTasks().then(setTasks).catch((e) => notify('error', e.message)).finally(() => setLoading(false));
  }, [ready, user?.id]);

  // Runs an API call, then re-fetches so the UI always matches the database.
  async function run(action, okText) {
    setBusy(true);
    try {
      await action();
      setTasks(await api.getTasks());
      if (okText) notify('success', okText);
    } catch (e) {
      notify('error', e.message);
    } finally {
      setBusy(false);
    }
  }

  const add = (e) => {
    e.preventDefault();
    run(() => api.createTask(form), 'Task added');
    setForm({ title: '', description: '' });
  };
  const toggle = (t) => run(() => api.patchTask(t.id, { completed: !t.completed }), t.completed ? 'Moved back to To do' : 'Nice work! Task completed');
  const save = (id, data) => run(() => api.replaceTask(id, data), 'Task updated');
  const remove = (t) => run(() => api.deleteTask(t.id), 'Task deleted');

  const done = tasks.filter((t) => t.completed).length;
  const percent = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const visible = tasks.filter((t) => filter === 'all' || (filter === 'done' ? t.completed : !t.completed));
  const counts = { all: tasks.length, active: tasks.length - done, done };

  return (
    <div className="min-h-screen lg:pl-80">
      <Sidebar user={user} tasks={tasks} open={menuOpen} onClose={() => setMenuOpen(false)}
               onLogin={() => setModal('login')} onRegister={() => setModal('register')} onProfile={() => setModal('profile')}
               onToggle={toggle} onDelete={remove} />

      <main className="mx-auto max-w-3xl space-y-5 p-4 sm:p-8">
        <header className="flex items-center gap-3">
          <button className="icon-btn glass lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu"><I.Menu /></button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold sm:text-3xl">Hello, {user ? user.name.split(' ')[0] : 'there'}</h1>
            <p className="text-sm text-white/70">{tasks.length ? `${done} of ${tasks.length} tasks done` : 'Add your first task to get started'}</p>
          </div>
          {busy && <span className="glass rounded-full px-3 py-1 text-xs">Saving…</span>}
          {!user && <button onClick={() => setModal('login')} className="glass hidden items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium hover:bg-white/20 sm:flex"><I.User size={16} /> Sign in</button>}
        </header>

        <div className="glass rounded-2xl p-4" aria-label="Progress">
          <div className="mb-2 flex justify-between text-sm"><span>Progress</span><span>{percent}%</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-white transition-all" style={{ width: `${percent}%` }} /></div>
        </div>

        <form onSubmit={add} className="glass space-y-3 rounded-2xl p-4">
          <div className="flex gap-2">
            <input className="field" placeholder="What needs to be done?" value={form.title} required maxLength={200}
                   onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <button type="submit" disabled={busy} className="flex shrink-0 items-center gap-1 rounded-xl bg-white px-4 font-semibold text-purple-900 hover:bg-white/90 disabled:opacity-60">
              <I.Plus size={18} /> <span className="hidden sm:inline">Add</span>
            </button>
          </div>
          <input className="field" placeholder="Add a note (optional)" value={form.description}
                 onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </form>

        <div className="glass flex rounded-2xl p-1" role="tablist">
          {FILTERS.map(([key, label]) => (
            <button key={key} role="tab" aria-selected={filter === key} onClick={() => setFilter(key)}
                    className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition ${filter === key ? 'bg-white/30' : 'hover:bg-white/10'}`}>
              {label} <span className="text-white/60">{counts[key]}</span>
            </button>
          ))}
        </div>

        {loading && <p className="animate-pulse py-6 text-center text-white/80">Loading your tasks…</p>}

        {!loading && visible.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center text-white/80">
            {tasks.length === 0 ? 'No tasks yet. Type one above and press Add!' : 'Nothing here. Try another filter.'}
          </div>
        )}

        <ul className="space-y-3">
          {visible.map((t) => <TaskItem key={t.id} task={t} onToggle={toggle} onSave={save} onDelete={remove} />)}
        </ul>
      </main>

      {toast && (
        <div role="status" className="glass fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full px-5 py-3 text-sm shadow-xl">
          {toast.type === 'success' ? <I.Check size={16} /> : <I.X size={16} />} {toast.text}
        </div>
      )}

      {(modal === 'login' || modal === 'register') && (
        <AuthModal mode={modal} setMode={setModal} onClose={() => setModal(null)}
                   onDone={(u, isNew) => { setUser(u); setModal(null); notify('success', isNew ? `Welcome, ${u.name}!` : `Welcome back, ${u.name}!`); }} />
      )}
      {modal === 'profile' && user && (
        <ProfileModal user={user} tasks={tasks} notify={notify} onClose={() => setModal(null)} onUpdated={setUser}
                      onLogout={() => { api.setToken(null); setUser(null); setModal(null); notify('success', 'Logged out'); }} />
      )}
    </div>
  );
}

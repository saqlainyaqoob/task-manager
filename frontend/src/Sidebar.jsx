import { I } from './Icons.jsx';

function ago(iso) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

export default function Sidebar({ user, tasks, open, onClose, onLogin, onRegister, onProfile, onToggle, onDelete }) {
  const completed = tasks.filter((t) => t.completed)
    .sort((a, b) => new Date(b.completed_at || 0) - new Date(a.completed_at || 0)).slice(0, 20);
  const recent = tasks.filter((t) => !t.completed).slice(0, 5); // API already sorts newest first

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} />}
      {/* glass-sidebar: glass on desktop, near-solid base layer on mobile (see index.css).
          CHANGED: scrollbar-none -> [scrollbar-width:none] (scrollbar-none is not a built-in Tailwind v4 class) */}
      <aside className={`glass-sidebar fixed inset-y-0 left-0 z-40 flex w-80 max-w-[85vw] flex-col gap-4 overflow-y-auto rounded-r-4xl p-5 transition-transform duration-300 scrollbar-none [&::-webkit-scrollbar]:hidden lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-semibold"><I.Logo size={26} /> TaskFlow</div>
          <button className="icon-btn lg:hidden" onClick={onClose} aria-label="Close menu"><I.X /></button>
        </div>

        {user ? (
          <button onClick={onProfile} className="glass-inner flex items-center gap-3 rounded-2xl p-3 text-left hover:bg-white/20">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/25 font-semibold">{user.name[0].toUpperCase()}</span>
            <span className="min-w-0"><span className="block truncate font-medium">{user.name}</span><span className="block truncate text-xs text-white/60">View profile</span></span>
          </button>
        ) : (
          <div className="glass-inner space-y-3 rounded-2xl p-4 text-sm">
            <p className="text-white/80">Using as <b>guest</b>. Sign in to keep your tasks on any device.</p>
            <div className="flex gap-2">
              <button onClick={onLogin} className="flex-1 rounded-xl bg-white px-3 py-2 font-medium text-purple-900 hover:bg-white/90">Sign in</button>
              <button onClick={onRegister} className="flex-1 rounded-xl border border-white/40 px-3 py-2 font-medium hover:bg-white/15">Sign up</button>
            </div>
          </div>
        )}

        <div className="glow-divider" />

        <section>
          <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white"><I.History size={16} /> Completed ({completed.length})</h3>
          {completed.length === 0 && <p className="text-sm text-white/90">Finished tasks will show up here.</p>}
          <ul className="space-y-1">
            {completed.map((t) => (
              <li key={t.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-white/10">
                <I.Check size={16} className="shrink-0 text-white" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm line-through opacity-70">{t.title}</p>
                  <p className="text-xs text-white/90">{ago(t.completed_at || t.created_at)}</p>
                </div>
                <button className="icon-btn size-7" title="Restore" aria-label="Restore task" onClick={() => onToggle(t)}><I.Undo size={15} /></button>
                <button className="icon-btn size-7" title="Delete" aria-label="Delete task" onClick={() => onDelete(t)}><I.X size={15} /></button>
              </li>
            ))}
          </ul>
        </section>

        <div className="glow-divider" />

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white">Recently added</h3>
          {recent.length === 0 && <p className="text-sm text-white/90">Nothing pending.</p>}
          <ul className="space-y-1">
            {recent.map((t) => (
              <li key={t.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-white/10">
                <I.Circle size={16} className="shrink-0 text-white/90" />
                <p className="min-w-0 flex-1 truncate text-sm">{t.title}</p>
                <span className="text-xs text-white/50">{ago(t.created_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </>
  );
}
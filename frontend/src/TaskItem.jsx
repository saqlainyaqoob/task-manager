import { useState } from 'react';
import { I } from './Icons.jsx';

export default function TaskItem({ task, onToggle, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: task.title, description: task.description });

  function save(e) {
    e.preventDefault();
    onSave(task.id, { ...draft, completed: task.completed }); // PUT: replaces the whole task
    setEditing(false);
  }

  if (editing) {
    return (
      <form onSubmit={save} className="glass space-y-2 rounded-2xl p-4">
        <input className="field" value={draft.title} maxLength={200} required autoFocus
               onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        <textarea className="field" rows={2} placeholder="Description (optional)" value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        <div className="flex justify-end gap-1">
          <button type="button" className="icon-btn" title="Cancel" aria-label="Cancel" onClick={() => setEditing(false)}><I.X /></button>
          <button type="submit" className="icon-btn" title="Save" aria-label="Save"><I.Check /></button>
        </div>
      </form>
    );
  }

  return (
    <li className="glass group flex items-start gap-3 rounded-2xl p-4 transition hover:bg-white/20">
      <button className="icon-btn mt-0.5 shrink-0" onClick={() => onToggle(task)}
              title={task.completed ? 'Mark as not done' : 'Mark as done'}
              aria-label={task.completed ? 'Mark as not done' : 'Mark as done'}>
        {task.completed ? <I.CheckCircle size={26} /> : <I.Circle size={26} />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`wrap-break font-medium ${task.completed ? 'line-through opacity-60' : ''}`}>{task.title}</p>
        {task.description && <p className={`mt-0.5 wrap-break text-sm text-white/80 ${task.completed ? 'line-through opacity-60' : ''}`}>{task.description}</p>}
        <p className="mt-1 text-xs text-white/70">Added {new Date(task.created_at).toLocaleDateString()}</p>
      </div>
      <div className="flex shrink-0 gap-0.5">
        <button className="icon-btn" title="Edit" aria-label="Edit task" onClick={() => setEditing(true)}><I.Edit size={18} /></button>
        <button className="icon-btn hover:bg-red-500/40" title="Delete" aria-label="Delete task" onClick={() => onDelete(task)}><I.Trash size={18} /></button>
      </div>
    </li>
  );
}

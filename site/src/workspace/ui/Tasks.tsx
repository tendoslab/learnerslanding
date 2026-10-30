import { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Circle, Plus, Target, Trash2, X } from 'lucide-react';
import { useWorkspace, type Priority, type Task } from '../store';
import { TASK_REWARD } from '../rewards';

const PRIORITY_STYLE: Record<Priority, string> = {
  High: 'text-red-200 bg-red-400/15 border-red-300/30',
  Medium: 'text-yellow-100 bg-yellow-400/15 border-yellow-300/30',
  Low: 'text-sky-100 bg-sky-400/15 border-sky-300/30',
};
const ORDER: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };

export default function Tasks() {
  const tasks = useWorkspace((s) => s.tasks);
  const activeTaskId = useWorkspace((s) => s.activeTaskId);
  const { addTask, clearCompleted } = useWorkspace.getState();
  const [title, setTitle] = useState('');

  const open = tasks.filter((t) => !t.completed).sort((a, b) => ORDER[a.priority] - ORDER[b.priority]);
  const done = tasks.filter((t) => t.completed);

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addTask(title);
          setTitle('');
        }}
        className="flex items-center rounded-xl border border-white/10 bg-white/10 px-3 py-2 focus-within:border-plum"
      >
        <Plus size={18} className="mr-2 shrink-0 text-purple-200" />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task and press Enter…"
          aria-label="New task"
          className="w-full bg-transparent text-sm text-white placeholder-white/40 focus:outline-none"
        />
      </form>
      <p className="text-[11px] text-white/50">Checking off a task earns {TASK_REWARD} coins. Press the target icon to track focus time on it.</p>

      <ul className="space-y-2.5">
        {open.map((t) => (
          <TaskItem key={t.id} task={t} active={t.id === activeTaskId} />
        ))}
      </ul>
      {open.length === 0 && <p className="py-6 text-center text-sm text-white/50">All caught up! Add something new or enjoy a break.</p>}

      {done.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wider text-white/40">
            <span>Done ({done.length})</span>
            <button onClick={clearCompleted} className="normal-case tracking-normal hover:text-white">
              Clear
            </button>
          </div>
          <ul className="space-y-2">
            {done.map((t) => (
              <TaskItem key={t.id} task={t} active={false} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function TaskItem({ task, active }: { task: Task; active: boolean }) {
  const { toggleTask, deleteTask, setPriority, setActiveTask, addSubtask, toggleSubtask, deleteSubtask, renameTask } = useWorkspace.getState();
  const [expanded, setExpanded] = useState(false);
  const [sub, setSub] = useState('');
  const [editing, setEditing] = useState(false);
  const subDone = task.subtasks.filter((s) => s.completed).length;

  return (
    <li className={`rounded-xl border bg-white/5 transition ${active ? 'border-plum shadow-[0_0_14px_rgba(140,90,230,0.35)]' : 'border-white/5 hover:border-white/20'}`}>
      <div className="flex items-start gap-2.5 p-3">
        <button onClick={() => toggleTask(task.id)} className="mt-0.5 shrink-0" aria-label={task.completed ? 'Mark as not done' : 'Mark as done'}>
          {task.completed ? <CheckCircle2 size={18} className="text-green-300" /> : <Circle size={18} className="text-white/40 hover:text-white" />}
        </button>
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              autoFocus
              defaultValue={task.title}
              onBlur={(e) => {
                renameTask(task.id, e.target.value);
                setEditing(false);
              }}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              className="w-full rounded bg-black/30 px-1 text-sm text-white focus:outline-none"
            />
          ) : (
            <p onDoubleClick={() => setEditing(true)} className={`break-words text-sm font-semibold ${task.completed ? 'text-white/40 line-through' : 'text-white'}`}>
              {task.title}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className={`rounded border px-1.5 py-0.5 ${PRIORITY_STYLE[task.priority]}`}>{task.priority}</span>
            {task.focusMinutes > 0 && <span className="rounded border border-purple-300/30 bg-purple-400/15 px-1.5 py-0.5 text-purple-100">{task.focusMinutes}m focused</span>}
            {task.subtasks.length > 0 && (
              <span className="rounded bg-white/5 px-1.5 py-0.5 text-white/60">
                {subDone}/{task.subtasks.length} steps
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1.5">
          {!task.completed && (
            <button
              onClick={() => setActiveTask(active ? null : task.id)}
              title={active ? 'Stop tracking' : 'Track focus time on this task'}
              className={`rounded-md p-1 transition ${active ? 'bg-plum text-white' : 'text-white/50 hover:bg-white/10 hover:text-white'}`}
            >
              <Target size={16} />
            </button>
          )}
          <button onClick={() => setExpanded(!expanded)} className="text-white/40 hover:text-white" aria-label="Details">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-3 rounded-b-xl border-t border-white/5 bg-black/25 px-3 pb-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {(['Low', 'Medium', 'High'] as Priority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(task.id, p)}
                  className={`rounded border px-2 py-0.5 text-[10px] ${task.priority === p ? PRIORITY_STYLE[p] : 'border-white/10 text-white/40 hover:text-white'}`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button onClick={() => deleteTask(task.id)} className="rounded bg-red-400/10 p-1 text-red-300/70 hover:text-red-300" aria-label="Delete task">
              <Trash2 size={13} />
            </button>
          </div>
          <ul className="space-y-1.5">
            {task.subtasks.map((st) => (
              <li key={st.id} className="group flex items-center gap-2">
                <button onClick={() => toggleSubtask(task.id, st.id)} aria-label="Toggle step">
                  {st.completed ? <CheckCircle2 size={14} className="text-green-300/80" /> : <Circle size={14} className="text-white/40" />}
                </button>
                <span className={`flex-1 text-xs ${st.completed ? 'text-white/40 line-through' : 'text-white/80'}`}>{st.title}</span>
                <button onClick={() => deleteSubtask(task.id, st.id)} className="text-white/30 opacity-0 hover:text-white group-hover:opacity-100" aria-label="Delete step">
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addSubtask(task.id, sub);
              setSub('');
            }}
            className="flex items-center rounded-lg border border-white/5 bg-white/5 px-2 py-1.5"
          >
            <Plus size={12} className="mr-2 text-white/40" />
            <input value={sub} onChange={(e) => setSub(e.target.value)} placeholder="Break it into a smaller step…" className="w-full bg-transparent text-xs text-white focus:outline-none" />
          </form>
          <p className="text-[10px] text-white/30">Tip: double-click a task's title to rename it.</p>
        </div>
      )}
    </li>
  );
}

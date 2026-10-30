import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  COINS_PER_FOCUS_MINUTE,
  RESIDENTS,
  SESSION_BONUS,
  STARTING_COINS,
  TASK_REWARD,
  decorById,
  type Resident,
} from './rewards';
import { STORAGE_KEY, workspaceStorage } from './storage';

export type Mode = 'focus' | 'short' | 'long';
export type Priority = 'Low' | 'Medium' | 'High';
export type SkyMode = 'auto' | 'day' | 'dusk' | 'night';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  priority: Priority;
  completed: boolean;
  /** Coins are only paid out the first time a task is checked off. */
  rewarded: boolean;
  focusMinutes: number;
  subtasks: Subtask[];
}

export interface Placed {
  uid: string;
  itemId: string;
  /** Horizontal position, 0–100 (% of scene width). */
  x: number;
  /** Depth, 0 (back of the field) – 1 (front). */
  y: number;
  flip?: boolean;
}

export interface Settings {
  focus: number;
  short: number;
  long: number;
  longEvery: number;
  autoStart: boolean;
  chime: boolean;
  avatar: number;
  sky: SkyMode;
  /** Desktop notification when a session ends (needs browser permission). */
  notify: boolean;
}

export interface CompletionEvent {
  id: number;
  kind: 'focus' | 'break' | 'task';
  coins: number;
  unlocked: Resident[];
}

interface TimerState {
  mode: Mode;
  running: boolean;
  /** Epoch ms when the running timer hits zero. */
  endsAt: number | null;
  /** Remaining ms while paused / not started. */
  remaining: number;
  /** Focus sessions finished in the current long-break cycle. */
  cycle: number;
}

export interface WorkspaceState {
  coins: number;
  totalFocusMinutes: number;
  sessionsCompleted: number;
  tasksCompleted: number;
  /** Focus minutes per local day, keyed YYYY-MM-DD. */
  history: Record<string, number>;
  tasks: Task[];
  activeTaskId: string | null;
  notes: string;
  inventory: Record<string, number>;
  placed: Placed[];
  settings: Settings;
  timer: TimerState;
  lastEvent: CompletionEvent | null;

  // timer
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  setMode: (mode: Mode) => void;
  tick: () => void;
  // tasks
  addTask: (title: string) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  renameTask: (id: string, title: string) => void;
  setPriority: (id: string, p: Priority) => void;
  setActiveTask: (id: string | null) => void;
  addSubtask: (taskId: string, title: string) => void;
  toggleSubtask: (taskId: string, subId: string) => void;
  deleteSubtask: (taskId: string, subId: string) => void;
  clearCompleted: () => void;
  /** Moves a task so it sits just before `beforeId` (or last when null). */
  moveTask: (id: string, beforeId: string | null) => void;
  sortTasksByPriority: () => void;
  // village
  buy: (itemId: string) => boolean;
  place: (itemId: string, x: number, y: number) => void;
  move: (uid: string, x: number, y: number) => void;
  flip: (uid: string) => void;
  pickUp: (uid: string) => void;
  // misc
  setNotes: (notes: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  importData: (json: string) => boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  focus: 25,
  short: 5,
  long: 15,
  longEvery: 4,
  autoStart: false,
  chime: true,
  avatar: 1,
  sky: 'auto',
  notify: false,
};

export const PRIORITY_ORDER: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const minutesFor = (s: Settings, m: Mode) => (m === 'focus' ? s.focus : m === 'short' ? s.short : s.long);
export const todayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const unlockedResidents = (minutes: number) => RESIDENTS.filter((r) => minutes >= r.unlockAt);
export const nextResident = (minutes: number) => RESIDENTS.find((r) => minutes < r.unlockAt) ?? null;

export const remainingMs = (t: TimerState, now = Date.now()) =>
  t.running && t.endsAt ? Math.max(0, t.endsAt - now) : t.remaining;

/** Consecutive days (ending today, or yesterday if nothing logged yet today) with focus time. */
export const streak = (history: Record<string, number>) => {
  const d = new Date();
  if (!history[todayKey(d)]) d.setDate(d.getDate() - 1);
  let n = 0;
  while (history[todayKey(d)]) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
};

const initialData = () => ({
  coins: STARTING_COINS,
  totalFocusMinutes: 0,
  sessionsCompleted: 0,
  tasksCompleted: 0,
  history: {} as Record<string, number>,
  tasks: [
    {
      id: uid(),
      title: 'Try one 25-minute focus session',
      priority: 'High' as Priority,
      completed: false,
      rewarded: false,
      focusMinutes: 0,
      subtasks: [
        { id: uid(), title: 'Pick a task and press Focus', completed: false },
        { id: uid(), title: 'Put your phone in another room', completed: false },
      ],
    },
  ],
  activeTaskId: null as string | null,
  notes: '',
  inventory: { flowers: 1 } as Record<string, number>,
  placed: [] as Placed[],
  settings: DEFAULT_SETTINGS,
  timer: { mode: 'focus' as Mode, running: false, endsAt: null, remaining: DEFAULT_SETTINGS.focus * 60_000, cycle: 0 },
  lastEvent: null as CompletionEvent | null,
});

const mapTask = (tasks: Task[], id: string, fn: (t: Task) => Task) => tasks.map((t) => (t.id === id ? fn(t) : t));

export const useWorkspace = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      ...initialData(),

      start: () =>
        set(({ timer }) => (timer.running ? {} : { timer: { ...timer, running: true, endsAt: Date.now() + timer.remaining } })),
      pause: () => set(({ timer }) => ({ timer: { ...timer, running: false, endsAt: null, remaining: remainingMs(timer) } })),
      reset: () =>
        set(({ timer, settings }) => ({
          timer: { ...timer, running: false, endsAt: null, remaining: minutesFor(settings, timer.mode) * 60_000 },
        })),
      setMode: (mode) =>
        set(({ timer, settings }) => ({ timer: { ...timer, mode, running: false, endsAt: null, remaining: minutesFor(settings, mode) * 60_000 } })),
      skip: () => {
        const { timer, settings } = get();
        // Skipping never pays out; it just moves to the next step of the cycle.
        const next: Mode = timer.mode === 'focus' ? ((timer.cycle + 1) % settings.longEvery === 0 ? 'long' : 'short') : 'focus';
        set({
          timer: {
            mode: next,
            running: false,
            endsAt: null,
            remaining: minutesFor(settings, next) * 60_000,
            cycle: timer.mode === 'focus' ? timer.cycle + 1 : timer.cycle,
          },
        });
      },
      tick: () => {
        if (!get().timer.running || !get().timer.endsAt || Date.now() < get().timer.endsAt!) return;
        // Another tab (workspace or a content page) may have finished this session
        // already; pull in the saved state first so it isn't paid out twice.
        void useWorkspace.persist.rehydrate();
        const s = get();
        const { timer, settings } = s;
        if (!timer.running || !timer.endsAt || Date.now() < timer.endsAt) return;

        const patch: Partial<WorkspaceState> = {};
        let coins = 0;
        let unlocked: Resident[] = [];
        let next: Mode = 'focus';
        let cycle = timer.cycle;

        if (timer.mode === 'focus') {
          const minutes = settings.focus;
          coins = minutes * COINS_PER_FOCUS_MINUTE + SESSION_BONUS;
          const before = s.totalFocusMinutes;
          const after = before + minutes;
          unlocked = RESIDENTS.filter((r) => r.unlockAt > before && r.unlockAt <= after);
          const day = todayKey();
          Object.assign(patch, {
            coins: s.coins + coins,
            totalFocusMinutes: after,
            sessionsCompleted: s.sessionsCompleted + 1,
            history: { ...s.history, [day]: (s.history[day] ?? 0) + minutes },
            tasks: s.activeTaskId ? mapTask(s.tasks, s.activeTaskId, (t) => ({ ...t, focusMinutes: t.focusMinutes + minutes })) : s.tasks,
          });
          cycle += 1;
          next = cycle % settings.longEvery === 0 ? 'long' : 'short';
        }

        const remaining = minutesFor(settings, next) * 60_000;
        patch.timer = {
          mode: next,
          cycle,
          running: settings.autoStart,
          endsAt: settings.autoStart ? Date.now() + remaining : null,
          remaining,
        };
        patch.lastEvent = { id: Date.now(), kind: timer.mode === 'focus' ? 'focus' : 'break', coins, unlocked };
        set(patch);
      },

      addTask: (title) => {
        if (!title.trim()) return;
        set((s) => ({
          tasks: [...s.tasks, { id: uid(), title: title.trim(), priority: 'Medium', completed: false, rewarded: false, focusMinutes: 0, subtasks: [] }],
        }));
      },
      toggleTask: (id) =>
        set((s) => {
          const task = s.tasks.find((t) => t.id === id);
          if (!task) return {};
          const completing = !task.completed;
          const pay = completing && !task.rewarded;
          return {
            tasks: mapTask(s.tasks, id, (t) => ({ ...t, completed: completing, rewarded: t.rewarded || pay })),
            coins: s.coins + (pay ? TASK_REWARD : 0),
            tasksCompleted: s.tasksCompleted + (pay ? 1 : 0),
            activeTaskId: completing && s.activeTaskId === id ? null : s.activeTaskId,
            lastEvent: pay ? { id: Date.now(), kind: 'task', coins: TASK_REWARD, unlocked: [] } : s.lastEvent,
          };
        }),
      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id), activeTaskId: s.activeTaskId === id ? null : s.activeTaskId })),
      renameTask: (id, title) => title.trim() && set((s) => ({ tasks: mapTask(s.tasks, id, (t) => ({ ...t, title: title.trim() })) })),
      setPriority: (id, priority) => set((s) => ({ tasks: mapTask(s.tasks, id, (t) => ({ ...t, priority })) })),
      setActiveTask: (activeTaskId) => set({ activeTaskId }),
      addSubtask: (taskId, title) =>
        title.trim() &&
        set((s) => ({
          tasks: mapTask(s.tasks, taskId, (t) => ({ ...t, subtasks: [...t.subtasks, { id: uid(), title: title.trim(), completed: false }] })),
        })),
      toggleSubtask: (taskId, subId) =>
        set((s) => ({
          tasks: mapTask(s.tasks, taskId, (t) => ({
            ...t,
            subtasks: t.subtasks.map((st) => (st.id === subId ? { ...st, completed: !st.completed } : st)),
          })),
        })),
      deleteSubtask: (taskId, subId) =>
        set((s) => ({ tasks: mapTask(s.tasks, taskId, (t) => ({ ...t, subtasks: t.subtasks.filter((st) => st.id !== subId) })) })),
      clearCompleted: () => set((s) => ({ tasks: s.tasks.filter((t) => !t.completed) })),
      moveTask: (id, beforeId) =>
        set((s) => {
          const task = s.tasks.find((t) => t.id === id);
          if (!task || id === beforeId) return {};
          const rest = s.tasks.filter((t) => t.id !== id);
          const at = beforeId ? rest.findIndex((t) => t.id === beforeId) : -1;
          return { tasks: at < 0 ? [...rest, task] : [...rest.slice(0, at), task, ...rest.slice(at)] };
        }),
      sortTasksByPriority: () => set((s) => ({ tasks: [...s.tasks].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]) })),

      buy: (itemId) => {
        const item = decorById[itemId];
        const { coins, inventory } = get();
        if (!item || coins < item.price) return false;
        set({ coins: coins - item.price, inventory: { ...inventory, [itemId]: (inventory[itemId] ?? 0) + 1 } });
        return true;
      },
      place: (itemId, x, y) => {
        const { inventory, placed } = get();
        if (!inventory[itemId]) return;
        set({
          inventory: { ...inventory, [itemId]: inventory[itemId] - 1 },
          placed: [...placed, { uid: uid(), itemId, x, y }],
        });
      },
      move: (id, x, y) => set((s) => ({ placed: s.placed.map((p) => (p.uid === id ? { ...p, x, y } : p)) })),
      flip: (id) => set((s) => ({ placed: s.placed.map((p) => (p.uid === id ? { ...p, flip: !p.flip } : p)) })),
      pickUp: (id) =>
        set((s) => {
          const p = s.placed.find((q) => q.uid === id);
          if (!p) return {};
          return {
            placed: s.placed.filter((q) => q.uid !== id),
            inventory: { ...s.inventory, [p.itemId]: (s.inventory[p.itemId] ?? 0) + 1 },
          };
        }),

      setNotes: (notes) => set({ notes }),
      updateSettings: (patch) =>
        set(({ settings, timer }) => {
          const next = { ...settings, ...patch };
          const idle = !timer.running && timer.remaining === minutesFor(settings, timer.mode) * 60_000;
          return { settings: next, timer: idle ? { ...timer, remaining: minutesFor(next, timer.mode) * 60_000 } : timer };
        }),
      importData: (json) => {
        try {
          const parsed = JSON.parse(json);
          const data = parsed?.state ?? parsed;
          if (typeof data !== 'object' || !Array.isArray(data.tasks)) return false;
          const base = initialData();
          set({
            ...base,
            ...data,
            settings: { ...DEFAULT_SETTINGS, ...data.settings },
            placed: (data.placed ?? []).filter((p: Placed) => decorById[p.itemId]),
            timer: base.timer,
            lastEvent: null,
          });
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      storage: workspaceStorage,
      migrate: (persisted, version) => {
        const data = persisted as WorkspaceState;
        // v1 always showed tasks sorted by priority; v2 lets you reorder them, so
        // start from the order people were used to seeing.
        if (version < 2 && Array.isArray(data?.tasks)) {
          data.tasks = [...data.tasks].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
        }
        return data;
      },
      partialize: ({ lastEvent, ...rest }) => rest,
    },
  ),
);

// Keep every open tab in sync (e.g. the workspace in one tab, an article in another).
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && e.newValue !== e.oldValue) void useWorkspace.persist.rehydrate();
  });
}

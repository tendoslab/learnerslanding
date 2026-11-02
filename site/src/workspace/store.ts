import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  COINS_PER_FOCUS_MINUTE,
  LANDSCAPES,
  SESSION_BONUS,
  STARTING_COINS,
  TASK_DAILY_CAP,
  TASK_MIN_AGE_MINUTES,
  TASK_REWARD,
  decorById,
  newResidentOrder,
  residentsInOrder,
  type Landscape,
  type Resident,
} from './rewards';
import { STORAGE_KEY, workspaceStorage } from './storage';
import { cleanNotes, plainToNotes } from './notes';

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
  /** Epoch ms when the task was added (missing on tasks from older saves). */
  createdAt?: number;
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
  /** Scenery behind the village (see LANDSCAPES). */
  landscape: string;
  /** Desktop notification when a session ends (needs browser permission). */
  notify: boolean;
}

export interface CompletionEvent {
  id: number;
  kind: 'focus' | 'break' | 'task';
  coins: number;
  unlocked: Resident[];
  scenery: Landscape[];
  /** Why a completed task paid nothing (shown instead of the coin message). */
  note?: string;
  /** How a focus session's minutes were shared out, when it covered more than one task. */
  split?: { title: string; minutes: number }[];
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
  /** Focus ms spent on each task so far this session, keyed by task id ('' = no task picked). */
  split?: Record<string, number>;
  /** Epoch ms the current stretch of running focus time started. */
  splitFrom?: number | null;
}

export interface WorkspaceState {
  coins: number;
  totalFocusMinutes: number;
  sessionsCompleted: number;
  tasksCompleted: number;
  /** Task rewards paid today (see TASK_DAILY_CAP). */
  taskPayouts: { day: string; count: number };
  /** Focus minutes per local day, keyed YYYY-MM-DD. */
  history: Record<string, number>;
  tasks: Task[];
  activeTaskId: string | null;
  notes: string;
  inventory: Record<string, number>;
  placed: Placed[];
  /** The order residents move into this person's village (ids, random per person). */
  residentOrder: string[];
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
  addTask: (title: string, priority?: Priority) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  renameTask: (id: string, title: string) => void;
  setPriority: (id: string, p: Priority) => void;
  setActiveTask: (id: string | null) => void;
  addSubtask: (taskId: string, title: string) => void;
  toggleSubtask: (taskId: string, subId: string) => void;
  renameSubtask: (taskId: string, subId: string, title: string) => void;
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
  landscape: 'mountains',
  notify: false,
};

export const PRIORITY_ORDER: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const minutesFor = (s: Settings, m: Mode) => (m === 'focus' ? s.focus : m === 'short' ? s.short : s.long);
export const todayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const unlockedResidents = (minutes: number, order: string[]) => residentsInOrder(order).filter((r) => minutes >= r.unlockAt);
export const nextResident = (minutes: number, order: string[]) => residentsInOrder(order).find((r) => minutes < r.unlockAt) ?? null;

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
  taskPayouts: { day: '', count: 0 },
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
  residentOrder: newResidentOrder(),
  settings: DEFAULT_SETTINGS,
  timer: { mode: 'focus' as Mode, running: false, endsAt: null, remaining: DEFAULT_SETTINGS.focus * 60_000, cycle: 0 },
  lastEvent: null as CompletionEvent | null,
});

/**
 * Credits the running focus time since `splitFrom` to the task that was active
 * during it, so switching tasks mid-session shares the minutes out fairly.
 */
const flushSplit = (timer: TimerState, activeTaskId: string | null, now = Date.now()): TimerState => {
  if (timer.mode !== 'focus' || !timer.running || !timer.splitFrom) return timer;
  const until = Math.min(now, timer.endsAt ?? now);
  const key = activeTaskId ?? '';
  const split = { ...(timer.split ?? {}) };
  split[key] = (split[key] ?? 0) + Math.max(0, until - timer.splitFrom);
  return { ...timer, split, splitFrom: until };
};

/** Shares `minutes` out by time spent (largest remainder, so the parts add up to the whole). */
const shareMinutes = (split: Record<string, number>, minutes: number) => {
  const entries = Object.entries(split).filter(([, ms]) => ms > 0);
  const total = entries.reduce((n, [, ms]) => n + ms, 0);
  if (!total) return {} as Record<string, number>;
  const parts = entries.map(([id, ms]) => {
    const exact = (minutes * ms) / total;
    return { id, whole: Math.floor(exact), rest: exact - Math.floor(exact) };
  });
  let left = minutes - parts.reduce((n, p) => n + p.whole, 0);
  [...parts].sort((a, b) => b.rest - a.rest).forEach((p) => left-- > 0 && p.whole++);
  return Object.fromEntries(parts.map((p) => [p.id, p.whole]));
};

const mapTask = (tasks: Task[], id: string, fn: (t: Task) => Task) => tasks.map((t) => (t.id === id ? fn(t) : t));

export const useWorkspace = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      ...initialData(),

      start: () =>
        set(({ timer }) => {
          if (timer.running) return {};
          const now = Date.now();
          return { timer: { ...timer, running: true, endsAt: now + timer.remaining, splitFrom: now } };
        }),
      pause: () =>
        set(({ timer, activeTaskId }) => ({
          timer: { ...flushSplit(timer, activeTaskId), running: false, endsAt: null, remaining: remainingMs(timer), splitFrom: null },
        })),
      reset: () =>
        set(({ timer, settings }) => ({
          timer: { ...timer, running: false, endsAt: null, remaining: minutesFor(settings, timer.mode) * 60_000, split: {}, splitFrom: null },
        })),
      setMode: (mode) =>
        set(({ timer, settings }) => ({
          timer: { ...timer, mode, running: false, endsAt: null, remaining: minutesFor(settings, mode) * 60_000, split: {}, splitFrom: null },
        })),
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
        let scenery: Landscape[] = [];
        let next: Mode = 'focus';
        let cycle = timer.cycle;
        let split: CompletionEvent['split'];

        if (timer.mode === 'focus') {
          const minutes = settings.focus;
          coins = minutes * COINS_PER_FOCUS_MINUTE + SESSION_BONUS;
          const before = s.totalFocusMinutes;
          const after = before + minutes;
          unlocked = residentsInOrder(s.residentOrder).filter((r) => r.unlockAt > before && r.unlockAt <= after);
          scenery = LANDSCAPES.filter((l) => l.unlockAt > before && l.unlockAt <= after);
          const day = todayKey();
          // Share the minutes between every task worked on this session, by time spent.
          const spent = flushSplit(timer, s.activeTaskId, timer.endsAt).split ?? {};
          const shares = Object.keys(spent).length ? shareMinutes(spent, minutes) : s.activeTaskId ? { [s.activeTaskId]: minutes } : {};
          const tasks = s.tasks.map((t) => (shares[t.id] ? { ...t, focusMinutes: t.focusMinutes + shares[t.id] } : t));
          const credited = s.tasks.filter((t) => shares[t.id]).map((t) => ({ title: t.title, minutes: shares[t.id] }));
          if (credited.length > 1) split = credited;
          Object.assign(patch, {
            coins: s.coins + coins,
            totalFocusMinutes: after,
            sessionsCompleted: s.sessionsCompleted + 1,
            history: { ...s.history, [day]: (s.history[day] ?? 0) + minutes },
            tasks,
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
          split: {},
          splitFrom: settings.autoStart ? Date.now() : null,
        };
        patch.lastEvent = { id: Date.now(), kind: timer.mode === 'focus' ? 'focus' : 'break', coins, unlocked, scenery, split };
        set(patch);
      },

      addTask: (title, priority = 'Medium') => {
        if (!title.trim()) return;
        set((s) => ({
          tasks: [...s.tasks, { id: uid(), title: title.trim(), priority, completed: false, rewarded: false, createdAt: Date.now(), focusMinutes: 0, subtasks: [] }],
        }));
      },
      toggleTask: (id) =>
        set((s) => {
          const task = s.tasks.find((t) => t.id === id);
          if (!task) return {};
          const completing = !task.completed;
          const now = Date.now();
          const day = todayKey();
          const paidToday = s.taskPayouts?.day === day ? s.taskPayouts.count : 0;
          const waitMs = (task.createdAt ?? 0) + TASK_MIN_AGE_MINUTES * 60_000 - now;
          const due = completing && !task.rewarded;
          const pay = due && waitMs <= 0 && paidToday < TASK_DAILY_CAP;
          let note: string | undefined;
          if (due && !pay) {
            note =
              paidToday >= TASK_DAILY_CAP
                ? `Task done! You've collected today's ${TASK_DAILY_CAP} task rewards; focus sessions still earn coins.`
                : `Task done! New tasks pay coins after ${TASK_MIN_AGE_MINUTES} minutes on your list (${Math.ceil(waitMs / 60_000)} min to go).`;
          }
          return {
            tasks: mapTask(s.tasks, id, (t) => ({ ...t, completed: completing, rewarded: t.rewarded || pay })),
            coins: s.coins + (pay ? TASK_REWARD : 0),
            tasksCompleted: s.tasksCompleted + (pay ? 1 : 0),
            taskPayouts: pay ? { day, count: paidToday + 1 } : s.taskPayouts,
            activeTaskId: completing && s.activeTaskId === id ? null : s.activeTaskId,
            timer: completing && s.activeTaskId === id ? flushSplit(s.timer, id) : s.timer,
            lastEvent: due ? { id: now, kind: 'task', coins: pay ? TASK_REWARD : 0, unlocked: [], scenery: [], note } : s.lastEvent,
          };
        }),
      deleteTask: (id) =>
        set((s) => ({
          tasks: s.tasks.filter((t) => t.id !== id),
          activeTaskId: s.activeTaskId === id ? null : s.activeTaskId,
          timer: s.activeTaskId === id ? flushSplit(s.timer, id) : s.timer,
        })),
      renameTask: (id, title) => title.trim() && set((s) => ({ tasks: mapTask(s.tasks, id, (t) => ({ ...t, title: title.trim() })) })),
      setPriority: (id, priority) => set((s) => ({ tasks: mapTask(s.tasks, id, (t) => ({ ...t, priority })) })),
      setActiveTask: (activeTaskId) =>
        set((s) => (activeTaskId === s.activeTaskId ? {} : { activeTaskId, timer: flushSplit(s.timer, s.activeTaskId) })),
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
      renameSubtask: (taskId, subId, title) =>
        title.trim() &&
        set((s) => ({
          tasks: mapTask(s.tasks, taskId, (t) => ({
            ...t,
            subtasks: t.subtasks.map((st) => (st.id === subId ? { ...st, title: title.trim() } : st)),
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
          const notes = typeof data.notes === 'string' ? data.notes : '';
          data.notes = cleanNotes((parsed?.version ?? 0) < 3 ? plainToNotes(notes) : notes);
          const base = initialData();
          if (!Array.isArray(data.residentOrder)) data.residentOrder = newResidentOrder(data.totalFocusMinutes ?? 0);
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
      version: 4,
      storage: workspaceStorage,
      migrate: (persisted, version) => {
        const data = persisted as WorkspaceState;
        // v1 always showed tasks sorted by priority; v2 lets you reorder them, so
        // start from the order people were used to seeing.
        if (version < 2 && Array.isArray(data?.tasks)) {
          data.tasks = [...data.tasks].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
        }
        // v3 notes support formatting and are stored as (sanitised) HTML.
        if (version < 3 && typeof data?.notes === 'string') data.notes = data.notes ? plainToNotes(data.notes) : '';
        // v4 residents move in in a random order per person; keep everyone who
        // already lives in the village and shuffle who's still to come.
        if (version < 4 && data && !Array.isArray(data.residentOrder)) data.residentOrder = newResidentOrder(data.totalFocusMinutes ?? 0);
        return data;
      },
      partialize: ({ lastEvent, ...rest }) => rest,
    },
  ),
);

// A first visit picks a random resident order; save it straight away so every
// page (and tab) shows the same village rather than each rolling its own.
if (typeof window !== 'undefined' && workspaceStorage?.getItem(STORAGE_KEY) == null) useWorkspace.setState({});

// Keep every open tab in sync (e.g. the workspace in one tab, an article in another).
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && e.newValue !== e.oldValue) void useWorkspace.persist.rehydrate();
  });
  // Going Back/Forward can restore a page from the browser's cache with the
  // state it had when you left, and storage events don't reach cached pages.
  // Re-read the save so that page doesn't show (and later write back) an old village.
  window.addEventListener('pageshow', (e) => e.persisted && void useWorkspace.persist.rehydrate());
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && void useWorkspace.persist.rehydrate());
}

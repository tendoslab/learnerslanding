import { createJSONStorage, type StateStorage } from 'zustand/middleware';

// Where workspace progress is saved.
//
// Right now everything lives in the visitor's browser (localStorage), so there
// are no accounts and nothing leaves their device. When you add user accounts
// later (e.g. Supabase or Firebase), write a StateStorage that reads/writes the
// same JSON blob to your backend and swap it in here; the rest of the app
// doesn't need to change.

const memory = new Map<string, string>();

const browserStorage: StateStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return memory.get(key) ?? null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      memory.set(key, value);
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      memory.delete(key);
    }
  },
};

export const STORAGE_KEY = 'learners-landing:workspace';
export const workspaceStorage = createJSONStorage(() => browserStorage);

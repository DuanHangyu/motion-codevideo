import { useSyncExternalStore } from "react";
import { Progress, markWatched, recordAnswer } from "./mastery";
import { NODE_STEPS } from "../quiz/questions";

const KEY = "classroom.progress.v1";

const load = (): Progress => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Progress) : {};
  } catch (err) {
    console.error("could not read saved progress, starting fresh", err);
    return {};
  }
};

let state: Progress = load();
const listeners = new Set<() => void>();

const commit = (next: Progress) => {
  if (next === state) return;
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    console.error("could not save progress", err);
  }
  listeners.forEach((l) => l());
};

export const progress = {
  watched: (id: string) => commit(markWatched(state, id)),
  answer: (ids: string[], correct: boolean) => commit(recordAnswer(state, ids, correct, NODE_STEPS)),
  reset: () => commit({}),
};

export const useProgress = (): Progress =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );

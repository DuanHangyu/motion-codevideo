import { useSyncExternalStore } from "react";

/**
 * Web-player interaction state. The MP4 render never touches this, so `paused`
 * stays false there and every frame remains a pure function of time.
 * A module-level store (not React context) so it also reaches inside R3F canvases.
 */
type State = {
  paused: boolean;
  /** Bumped on every pause→play so camera rigs can blend back to the script. */
  resumeCount: number;
  seek: (frame: number) => void;
};

let state: State = { paused: false, resumeCount: 0, seek: () => undefined };
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export const setPaused = (paused: boolean) => {
  if (paused === state.paused) return;
  state = { ...state, paused, resumeCount: paused ? state.resumeCount : state.resumeCount + 1 };
  emit();
};

export const setSeek = (seek: (frame: number) => void) => {
  state = { ...state, seek };
  emit();
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useInteractive = (): State => useSyncExternalStore(subscribe, () => state, () => state);

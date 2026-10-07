import { useEffect, useReducer, useSyncExternalStore } from "react";

/**
 * "Time freeze" state shared by the classroom page and the lesson scenes.
 *
 * Playing, the lesson is a pure function of time. When the student freezes time inside a world zone,
 * the scene with that zone id takes over the mouse; on resume it blends back to the script.
 * The MP4 render never calls enter(), so `phase` stays "off" and every frame stays deterministic.
 */
export type Phase = "off" | "entering" | "on" | "returning";
export type ExploreState = { phase: Phase; zone: string | null; since: number };

export const ENTER_MS = 900;
export const RETURN_MS = 900;

let state: ExploreState = { phase: "off", zone: null, since: 0 };
let dragging = false;
/** zones whose challenge the student has completed (kept for the whole visit) */
const completed = new Set<string>();
const completeListeners = new Set<(zone: string) => void>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const now = () => (typeof performance === "undefined" ? 0 : performance.now());

let timer: ReturnType<typeof setTimeout> | undefined;

export const explore = {
  enter(zone: string) {
    clearTimeout(timer);
    state = { phase: "entering", zone, since: now() };
    emit();
    timer = setTimeout(() => {
      state = { ...state, phase: "on" };
      emit();
    }, ENTER_MS);
  },
  /** Blend back to the script; resolves once the scene is back on its scripted state. */
  exit(): Promise<void> {
    clearTimeout(timer);
    if (state.phase === "off") return Promise.resolve();
    state = { ...state, phase: "returning", since: now() };
    dragging = false;
    emit();
    return new Promise((resolve) => {
      timer = setTimeout(() => {
        state = { phase: "off", zone: null, since: now() };
        emit();
        resolve();
      }, RETURN_MS);
    });
  },
  /** Leave instantly (seek, page change). */
  reset() {
    clearTimeout(timer);
    dragging = false;
    if (state.phase === "off") return;
    state = { phase: "off", zone: null, since: now() };
    emit();
  },
  get: () => state,
  /** Mark this zone's challenge done; the first time per zone it notifies listeners (progress, celebration). */
  complete(zone: string) {
    if (completed.has(zone)) return;
    completed.add(zone);
    completeListeners.forEach((l) => l(zone));
    emit();
  },
  isCompleted: (zone: string) => completed.has(zone),
  onComplete(l: (zone: string) => void) {
    completeListeners.add(l);
    return () => {
      completeListeners.delete(l);
    };
  },
  setDragging: (on: boolean) => {
    dragging = on;
  },
  isDragging: () => dragging,
};

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** 0 = the scripted video, 1 = fully in explore mode. Read live (e.g. inside useFrame) for smooth motion. */
export const blendNow = (s: ExploreState = state, t = now()): number => {
  if (s.phase === "off") return 0;
  if (s.phase === "on") return 1;
  const k = (t - s.since) / (s.phase === "entering" ? ENTER_MS : RETURN_MS);
  return s.phase === "entering" ? smooth(k) : 1 - smooth(k);
};

/** Seconds of the entering transition elapsed, 0..1 (for one-shot effects like the freeze ripple). */
export const enterProgress = (s: ExploreState = state, t = now()) => (s.phase === "entering" ? Math.min(1, (t - s.since) / ENTER_MS) : s.phase === "off" ? 0 : 1);

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/**
 * Explore state for one zone. Re-renders every animation frame while that zone is frozen,
 * so wall-clock driven explore animations keep moving although the video frame does not.
 */
export const useExplore = (zone?: string) => {
  const s = useSyncExternalStore(subscribe, () => state, () => state);
  const mine = s.phase !== "off" && (zone === undefined || s.zone === zone);
  const [, tick] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    if (!mine) return;
    let id = requestAnimationFrame(function loop() {
      tick();
      id = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(id);
  }, [mine]);
  const t = now();
  return {
    phase: s.phase,
    zone: s.zone,
    /** this zone is frozen (including the transitions in and out) */
    active: mine,
    /** the student may manipulate things */
    interactive: mine && (s.phase === "on" || s.phase === "entering"),
    blend: mine ? blendNow(s, t) : 0,
    enter: mine ? enterProgress(s, t) : 0,
    /** wall-clock seconds, for explore animations */
    clock: t / 1000,
  };
};

/** Pointer capture that never aborts a drag: capturing fails (harmlessly) for pointers the browser no longer tracks. */
export const capturePointer = (el: Element | null, pointerId: number) => {
  if (!el || !("setPointerCapture" in el)) return;
  try {
    el.setPointerCapture(pointerId);
  } catch {
    // the pointer was released before capture; the drag still works without it
  }
};

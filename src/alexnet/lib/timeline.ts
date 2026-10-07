import timeline from "../generated/timeline.json";

/** Everything is timed off the voice-over: src/alexnet/generated/timeline.json (built by audio/alexnet/tts.py). */
export const FPS = timeline.fps;
export const DURATION_SEC = timeline.duration;
export const DURATION = Math.round(DURATION_SEC * FPS);

export type Word = { t: number; d: number; i: number; text: string };
export type Line = { id: string; scene: string; text: string; start: number; end: number; words: Word[] };
export type Scene = { id: string; num: string; title: string; en: string; start: number; end: number };

export const SCENES = timeline.scenes as Scene[];
export const LINES = timeline.lines as Line[];

const BY_ID = new Map(LINES.map((l) => [l.id, l]));
const SCENE_BY_ID = new Map(SCENES.map((s) => [s.id, s]));

export const line = (id: string): Line => {
  const l = BY_ID.get(id);
  if (!l) throw new Error(`unknown line ${id}`);
  return l;
};

export const scene = (id: string): Scene => {
  const s = SCENE_BY_ID.get(id);
  if (!s) throw new Error(`unknown scene ${id}`);
  return s;
};

/**
 * Absolute time (s) at which `phrase` starts being spoken in line `id`.
 * Without a phrase: the line start. Matching is by character offset, so it is
 * independent of how the TTS engine happened to segment the words.
 */
export const cue = (id: string, phrase?: string, occurrence = 0): number => {
  const l = line(id);
  if (!phrase) return l.start;
  let idx = -1;
  for (let k = 0; k <= occurrence; k++) {
    idx = l.text.indexOf(phrase, idx + 1);
    if (idx < 0) throw new Error(`phrase "${phrase}" #${occurrence} not in ${id}: ${l.text}`);
  }
  let w = l.words[0];
  for (const cand of l.words) if (cand.i <= idx) w = cand;
  const into = Math.max(0, idx - w.i) / Math.max(1, w.text.length);
  return w.t + w.d * Math.min(1, into);
};

/** Time the last word of a line finishes. */
export const lineEnd = (id: string): number => line(id).end;

export const sceneAt = (t: number): Scene => SCENES.find((s) => t >= s.start && t < s.end) ?? SCENES[SCENES.length - 1];

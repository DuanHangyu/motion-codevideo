import timeline from "../timeline.json";
import lines from "../../public/audio/vo/lines.json";
import events from "../audio-events.json";

export const FPS = timeline.fps;
export const DURATION = timeline.durationSec * FPS;
export const BEAT = 60 / timeline.bpm;

export type SceneName = keyof typeof timeline.scenes;
export const SCENES = timeline.scenes as Record<SceneName, [number, number]>;
export const EVENTS = events;

export type Word = { text: string; start: number; end: number };
export type Line = { id: string; text: string; start: number; words: Word[] };

const VO = timeline.vo as Record<string, number>;

export const LINES: Line[] = lines.map((l) => ({
  id: l.id,
  text: l.text,
  start: VO[l.id],
  words: l.words.map((w) => ({ text: w.text, start: VO[l.id] + w.t, end: VO[l.id] + w.t + w.d })),
}));

/** Absolute time (s) the n-th occurrence of `text` is spoken in line `lineId`. */
export const wordAt = (lineId: string, text: string, occurrence = 0): number => {
  const line = LINES.find((l) => l.id === lineId);
  const hits = line?.words.filter((w) => w.text === text) ?? [];
  const hit = hits[occurrence];
  if (!hit) throw new Error(`word "${text}" #${occurrence} not found in ${lineId}`);
  return hit.start;
};

export const sec = (s: number) => Math.round(s * FPS);

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** Normalised progress of t through [a, b]. */
export const prog = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export const ease = {
  outCubic: (x: number) => 1 - (1 - x) ** 3,
  inCubic: (x: number) => x ** 3,
  inOutCubic: (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2),
  outExpo: (x: number) => (x >= 1 ? 1 : 1 - 2 ** (-10 * x)),
  inExpo: (x: number) => (x <= 0 ? 0 : 2 ** (10 * x - 10)),
  outBack: (x: number) => 1 + 2.7 * (x - 1) ** 3 + 1.7 * (x - 1) ** 2,
};

/** Sum of exponential decays from every event already passed — a beat-reactive envelope. */
export const pulse = (t: number, times: number[], tau = 0.12) => {
  let v = 0;
  for (const e of times) {
    if (e > t) break;
    if (t - e < tau * 8) v += Math.exp(-(t - e) / tau);
  }
  return v;
};

/** Cheap deterministic 1D noise in [-1, 1]. */
export const wobble = (t: number, seed = 0) =>
  (Math.sin(t * 37.1 + seed * 11.3) + Math.sin(t * 23.7 + seed * 5.1) * 0.6 + Math.sin(t * 61.3 + seed) * 0.3) / 1.9;

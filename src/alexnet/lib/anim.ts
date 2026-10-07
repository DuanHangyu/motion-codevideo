export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
/** Normalised progress of t through [a, b]. */
export const prog = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export const ease = {
  outCubic: (x: number) => 1 - (1 - x) ** 3,
  inCubic: (x: number) => x ** 3,
  inOutCubic: (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2),
  outQuint: (x: number) => 1 - (1 - x) ** 5,
  inOutSine: (x: number) => -(Math.cos(Math.PI * x) - 1) / 2,
  outExpo: (x: number) => (x >= 1 ? 1 : 1 - 2 ** (-10 * x)),
  inExpo: (x: number) => (x <= 0 ? 0 : 2 ** (10 * x - 10)),
  outBack: (x: number) => 1 + 2.7 * (x - 1) ** 3 + 1.7 * (x - 1) ** 2,
};

/** Eased 0→1 ramp starting at `a` and lasting `dur` seconds. */
export const rise = (t: number, a: number, dur = 0.6, fn: (x: number) => number = ease.outCubic) => fn(prog(t, a, a + dur));

/** 0→1 over [a, a+fi], hold, 1→0 over [b-fo, b]. */
export const win = (t: number, a: number, b: number, fi = 0.5, fo = 0.5) =>
  Math.min(ease.outCubic(prog(t, a, a + fi)), 1 - ease.inCubic(prog(t, b - fo, b)));

/** Deterministic hash noise in [0, 1). */
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Smooth deterministic 1D noise in [-1, 1]. */
export const wobble = (t: number, seed = 0) =>
  (Math.sin(t * 1.31 + seed * 11.3) + Math.sin(t * 2.17 + seed * 5.1) * 0.6 + Math.sin(t * 3.73 + seed) * 0.3) / 1.9;

/** Exponential decay "flash" envelope after an event. */
export const flash = (t: number, at: number, tau = 0.25) => (t >= at ? Math.exp(-(t - at) / tau) : 0);

export const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US");

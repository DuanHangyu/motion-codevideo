import { loss } from "../../src/alexnet/lib/loss";

export type P = [number, number];
export const BOUND = 7;
/** Default drop point of the lab; the lab's learning-rate presets are pinned against it in descent.test.ts. */
export const START: P = [-5.5, 5];

export const grad = ([x, z]: P): P => {
  const e = 1e-3;
  return [(loss(x + e, z) - loss(x - e, z)) / (2 * e), (loss(x, z + e) - loss(x, z - e)) / (2 * e)];
};

/** One gradient-descent step: w ← w − η·∇L */
export const step = (p: P, lr: number): P => {
  const [gx, gz] = grad(p);
  return [p[0] - lr * gx, p[1] - lr * gz];
};

export const outside = ([x, z]: P) => Math.abs(x) > BOUND || Math.abs(z) > BOUND;

export type Verdict = "running" | "converged" | "oscillating" | "diverged";

/** Classify the recent behaviour of a descent path. */
export const verdict = (path: P[]): Verdict => {
  const last = path[path.length - 1];
  if (outside(last)) return "diverged";
  if (path.length < 6) return "running";
  const [gx, gz] = grad(last);
  if (Math.hypot(gx, gz) < 0.02) return "converged";
  // loss going up and down over the last steps → bouncing across the valley
  const ls = path.slice(-6).map((p) => loss(p[0], p[1]));
  const flips = ls.slice(2).filter((l, i) => Math.sign(l - ls[i + 1]) !== Math.sign(ls[i + 1] - ls[i])).length;
  return flips >= 3 ? "oscillating" : "running";
};

export const VERDICT_TEXT: Record<Verdict, string> = {
  running: "正在下山…",
  converged: "到达谷底：梯度几乎为 0",
  oscillating: "来回震荡：步子太大，在山谷两侧跳",
  diverged: "冲出了山谷：学习率太大",
};

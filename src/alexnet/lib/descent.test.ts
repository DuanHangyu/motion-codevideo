import { describe, expect, it } from "vitest";
import { loss } from "./loss";
import { P, START, outside, step, verdict } from "./descent";

const run = (start: P, lr: number, n: number) => {
  const path: P[] = [start];
  for (let i = 0; i < n && !outside(path[path.length - 1]); i++) path.push(step(path[path.length - 1], lr));
  return path;
};

describe("gradient descent", () => {
  it("a small learning rate lowers the loss and settles", () => {
    const path = run([4.6, 4.0], 0.3, 300);
    const [a, b] = [path[0], path[path.length - 1]];
    expect(loss(b[0], b[1])).toBeLessThan(loss(a[0], a[1]));
    expect(verdict(path)).toBe("converged");
  });

  it("a huge learning rate throws the ball out of the valley", () => {
    expect(verdict(run([4.6, 4.0], 12, 60))).toBe("diverged");
  });

  it("the lab presets behave as their labels say", () => {
    expect(verdict(run(START, 0.6, 60))).toBe("converged");
    expect(verdict(run(START, 2, 60))).toBe("oscillating");
    expect(verdict(run(START, 10, 60))).toBe("diverged");
  });
});

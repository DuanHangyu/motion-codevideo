import { describe, expect, it } from "vitest";
import { PRESETS, changedRatio, convolveSame, convolveValid, normalise, shiftChangedRatio, transform, type Gray } from "./convolve";

const img = (w: number, h: number, f: (x: number, y: number) => number): Gray => {
  const data = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data[y * w + x] = f(x, y);
  return { w, h, data };
};
const kernel = (id: string) => PRESETS.find((p) => p.id === id)!.kernel;

describe("convolveValid", () => {
  it("shrinks the image by 2 in each direction", () => {
    const out = convolveValid(img(28, 28, () => 100), kernel("identity"));
    expect(out.w).toBe(26);
    expect(out.h).toBe(26);
  });

  it("matches a hand-computed window", () => {
    const src = img(3, 3, (x, y) => y * 3 + x); // 0..8
    const out = convolveValid(src, kernel("vertical"));
    // (-1·0 + 1·2) + (-2·3 + 2·5) + (-1·6 + 1·8) = 2 + 4 + 2
    expect(out.data[0]).toBe(8);
  });

  it("responds to a vertical edge but not to a horizontal one", () => {
    const vertical = img(10, 10, (x) => (x < 5 ? 0 : 255));
    const horizontal = img(10, 10, (_, y) => (y < 5 ? 0 : 255));
    const peak = (g: Gray) => Math.max(...g.data.map(Math.abs));
    expect(peak(convolveValid(vertical, kernel("vertical")))).toBe(1020);
    expect(peak(convolveValid(horizontal, kernel("vertical")))).toBe(0);
  });
});

describe("convolveSame", () => {
  it("keeps the size and the identity kernel returns the image", () => {
    const src = img(6, 4, (x, y) => x * 10 + y);
    const out = convolveSame(src, kernel("identity"));
    expect(out.w).toBe(6);
    expect(Array.from(out.data)).toEqual(Array.from(src.data));
  });
});

describe("normalise", () => {
  it("maps signed edge responses to |value| in 0..1", () => {
    const n = normalise({ w: 3, h: 1, data: new Float32Array([-10, 0, 5]) }, kernel("vertical"));
    expect(Array.from(n)).toEqual([1, 0, 0.5]);
  });
});

describe("shiftChangedRatio", () => {
  it("is 0 for a flat image and for no shift", () => {
    expect(shiftChangedRatio(img(20, 20, () => 80), 6)).toBe(0);
    expect(shiftChangedRatio(img(20, 20, (x) => x * 10), 0)).toBe(0);
  });

  it("counts every compared pixel on a gradient", () => {
    // 20 wide, shift 5 → 15 compared columns out of 20
    expect(shiftChangedRatio(img(20, 4, (x) => x * 10), 5)).toBeCloseTo(15 / 20);
  });
});

describe("transform + changedRatio", () => {
  const src = img(30, 6, (x, y) => (x * 7 + y * 13) % 200);

  it("a pure shift changes exactly what shiftChangedRatio counts", () => {
    expect(changedRatio(src, transform(src, 6, 1))).toBeCloseTo(shiftChangedRatio(src, 6));
  });

  it("no shift and gain 1 changes nothing; brightening changes non-black pixels", () => {
    expect(changedRatio(src, transform(src, 0, 1))).toBe(0);
    const bright = changedRatio(src, transform(src, 0, 1.5));
    expect(bright).toBeGreaterThan(0.8);
  });
});

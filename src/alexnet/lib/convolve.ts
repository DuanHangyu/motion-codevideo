/** Pure image math for the labs. Images are row-major grey arrays with values in 0..255. */
export type Kernel = number[][];
export type Gray = { w: number; h: number; data: Float32Array };

export const PRESETS: Array<{ id: string; name: string; kernel: Kernel }> = [
  { id: "vertical", name: "竖直边缘", kernel: [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]] },
  { id: "horizontal", name: "水平边缘", kernel: [[-1, -2, -1], [0, 0, 0], [1, 2, 1]] },
  { id: "blur", name: "模糊", kernel: [[1, 1, 1], [1, 1, 1], [1, 1, 1]] },
  { id: "sharpen", name: "锐化", kernel: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]] },
  { id: "outline", name: "轮廓", kernel: [[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]] },
  { id: "identity", name: "原样", kernel: [[0, 0, 0], [0, 1, 0], [0, 0, 0]] },
];

export const grayFromRGBA = (rgba: Uint8ClampedArray, w: number, h: number): Gray => {
  const data = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) data[i] = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
  return { w, h, data };
};

/** Value of one 3×3 window whose top-left corner is (x, y). Out-of-range pixels clamp to the border. */
export const windowSum = (img: Gray, k: Kernel, x: number, y: number): number => {
  let s = 0;
  for (let dy = 0; dy < 3; dy++)
    for (let dx = 0; dx < 3; dx++) {
      const px = Math.min(img.w - 1, Math.max(0, x + dx));
      const py = Math.min(img.h - 1, Math.max(0, y + dy));
      s += k[dy][dx] * img.data[py * img.w + px];
    }
  return s;
};

/** "Valid" convolution: output is (w−2)×(h−2), like the 28→26 example in the lesson. */
export const convolveValid = (img: Gray, k: Kernel): Gray => {
  const w = img.w - 2;
  const h = img.h - 2;
  const data = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data[y * w + x] = windowSum(img, k, x, y);
  return { w, h, data };
};

/** "Same" convolution: output has the input's size (border clamped), used on the full photo. */
export const convolveSame = (img: Gray, k: Kernel): Gray => {
  const data = new Float32Array(img.w * img.h);
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) data[y * img.w + x] = windowSum(img, k, x - 1, y - 1);
  return { w: img.w, h: img.h, data };
};

/** Map a feature map to 0..1 for display. Signed kernels (edges) show |response|, others are min–max normalised. */
export const normalise = (map: Gray, k: Kernel): Float32Array => {
  const signed = k.flat().some((v) => v < 0) && Math.abs(k.flat().reduce((a, b) => a + b, 0)) < 1e-6;
  const vals = signed ? map.data.map(Math.abs) : map.data;
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of vals) {
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  if (signed) lo = 0;
  const span = hi - lo || 1;
  return vals.map((v) => (v - lo) / span);
};

/**
 * Fraction of pixels whose value changes when the image moves `shift` px to the right.
 * Mirrors ml/extract.py: compares img[:, s:] with img[:, :-s] and counts over the full frame.
 */
export const shiftChangedRatio = (img: Gray, shift: number, threshold = 2): number => {
  if (shift <= 0) return 0;
  let changed = 0;
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w - shift; x++) if (Math.abs(img.data[y * img.w + x + shift] - img.data[y * img.w + x]) > threshold) changed++;
  return changed / (img.w * img.h);
};

/** Move the image `shift` px right and scale its brightness by `gain`; uncovered pixels keep their value. */
export const transform = (img: Gray, shift: number, gain: number): Gray => {
  const data = new Float32Array(img.w * img.h);
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      const sx = x - shift >= 0 ? x - shift : x;
      data[y * img.w + x] = Math.min(255, Math.max(0, img.data[y * img.w + sx] * gain));
    }
  return { w: img.w, h: img.h, data };
};

/** Fraction of pixels whose value differs by more than `threshold` between two same-size images. */
export const changedRatio = (a: Gray, b: Gray, threshold = 2): number => {
  let n = 0;
  for (let i = 0; i < a.data.length; i++) if (Math.abs(a.data[i] - b.data[i]) > threshold) n++;
  return n / a.data.length;
};

/** Activation palette shared with the lesson: black → deep blue → cyan → white. */
export const heat = (v: number): [number, number, number] => {
  const stops = [
    [5, 7, 13],
    [20, 40, 110],
    [40, 200, 255],
    [240, 250, 255],
  ];
  const x = Math.min(1, Math.max(0, v)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const f = x - i;
  return [0, 1, 2].map((c) => stops[i][c] * (1 - f) + stops[i + 1][c] * f) as [number, number, number];
};

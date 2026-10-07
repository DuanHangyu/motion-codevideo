/** The toy loss landscape used in chapter 03 and the gradient-descent explorer. */
export const loss = (x: number, z: number) =>
  0.045 * (x * x + z * z) + 0.55 * Math.sin(x * 0.9) * Math.cos(z * 0.8) - 1.6 * Math.exp(-((x + 1.2) ** 2 + (z + 0.8) ** 2) / 3) + 1.4;

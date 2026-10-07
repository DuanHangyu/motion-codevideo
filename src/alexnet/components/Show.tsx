import { CSSProperties, ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { ease, prog } from "../lib/anim";

/**
 * A "beat": children exist only inside [from, to] and cross-fade at both ends.
 * Unmounting outside the window keeps heavy 3D canvases from rendering off-screen.
 */
export const Show = ({
  t,
  from,
  to,
  fadeIn = 0.5,
  fadeOut = 0.5,
  drift = 0,
  children,
  style,
}: {
  t: number;
  from: number;
  to: number;
  fadeIn?: number;
  fadeOut?: number;
  /** px of upward drift during the fade-in */
  drift?: number;
  children: ReactNode;
  style?: CSSProperties;
}) => {
  if (t < from || t > to) return null;
  const a = fadeIn > 0 ? ease.outCubic(prog(t, from, from + fadeIn)) : 1;
  const b = fadeOut > 0 ? 1 - ease.inCubic(prog(t, to - fadeOut, to)) : 1;
  return (
    <AbsoluteFill style={{ opacity: Math.min(a, b), transform: drift ? `translateY(${(1 - a) * drift}px)` : undefined, ...style }}>
      {children}
    </AbsoluteFill>
  );
};

import { AbsoluteFill, useCurrentFrame } from "remotion";
import { EVENTS, FPS, pulse, wobble } from "../lib/timing";
import { IVORY } from "../lib/theme";

const BIG_HITS = new Set([14, 25]);

export const useShake = () => {
  const t = useCurrentFrame() / FPS;
  const hit = EVENTS.hits.reduce((acc, h) => acc + (h <= t ? Math.exp(-(t - h) / 0.16) * (BIG_HITS.has(h) ? 22 : 10) : 0), 0);
  const kick = t > 14 ? pulse(t, EVENTS.kicks, 0.07) * 3 : 0;
  const amp = hit + kick;
  return { x: wobble(t, 1) * amp, y: wobble(t, 2) * amp, scale: 1 + amp * 0.0015 };
};

export const Flash = () => {
  const t = useCurrentFrame() / FPS;
  const v = EVENTS.hits.reduce((acc, h) => acc + (h <= t ? Math.exp(-(t - h) / (BIG_HITS.has(h) ? 0.2 : 0.09)) * (BIG_HITS.has(h) ? 0.95 : 0.45) : 0), 0);
  if (v < 0.005) return null;
  return <AbsoluteFill style={{ background: IVORY, opacity: Math.min(1, v), mixBlendMode: "screen", pointerEvents: "none" }} />;
};

export const Grain = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: 0.11, mixBlendMode: "overlay", pointerEvents: "none" }}>
      <svg width="100%" height="100%">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={frame % 24} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};

export const Vignette = () => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.62) 100%)", pointerEvents: "none" }} />
);

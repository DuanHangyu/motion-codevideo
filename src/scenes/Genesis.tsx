import { AbsoluteFill, useCurrentFrame } from "remotion";
import { FPS, SCENES, ease, lerp, prog, wordAt } from "../lib/timing";
import { CLAY, EMBER, FONT_DISPLAY, FONT_MONO, INK, IVORY } from "../lib/theme";

const T_POINT = wordAt("l2", "点");
const T_LINE = wordAt("l2", "线");
const T_PLANE = wordAt("l2", "面");
const [, T_END] = SCENES.genesis;

const HALF_W = 700;
const HALF_H = 330;
const GRID_ROWS = 12;
const GRID_COLS = 24;

const Tag = ({ label, dim, at, t, x, y }: { label: string; dim: string; at: number; t: number; x: number; y: number }) => {
  const k = ease.outCubic(prog(t, at, at + 0.25));
  if (k <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, fontFamily: FONT_MONO, color: IVORY, opacity: k, transform: `translateX(${(1 - k) * -20}px)` }}>
      <div style={{ fontSize: 16, letterSpacing: 4, color: CLAY }}>{dim}</div>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 34, fontWeight: 600, letterSpacing: 2 }}>{label}</div>
    </div>
  );
};

export const Genesis = () => {
  const t = useCurrentFrame() / FPS;
  const pointPop = Math.exp(-Math.max(0, t - T_POINT) / 0.18) * (t >= T_POINT ? 1 : 0);
  const stretch = ease.outExpo(prog(t, T_LINE - 0.06, T_LINE + 0.45));
  const spread = ease.outExpo(prog(t, T_PLANE - 0.06, T_PLANE + 0.55));
  const cols = ease.outCubic(prog(t, T_PLANE + 0.1, T_PLANE + 0.7));
  const tilt = ease.inOutCubic(prog(t, T_END - 0.85, T_END));

  const halfW = HALF_W * stretch;
  const halfH = HALF_H * spread;
  const headX = 960 + halfW;

  const rows = [];
  for (let i = 0; i <= GRID_ROWS; i++) {
    const y = 540 + lerp(-halfH, halfH, i / GRID_ROWS);
    const center = i === GRID_ROWS / 2;
    rows.push(<line key={`r${i}`} x1={960 - halfW} x2={960 + halfW} y1={y} y2={y} stroke={center ? IVORY : CLAY} strokeWidth={center ? 3 : 1.5} opacity={center ? 1 : 0.35 + 0.5 * spread} />);
  }
  const colLines = [];
  for (let i = 0; i <= GRID_COLS; i++) {
    const x = 960 + lerp(-HALF_W, HALF_W, i / GRID_COLS);
    const k = prog(cols, Math.abs(i - GRID_COLS / 2) / GRID_COLS, Math.abs(i - GRID_COLS / 2) / GRID_COLS + 0.5);
    if (k <= 0) continue;
    colLines.push(<line key={`c${i}`} x1={x} x2={x} y1={540 - HALF_H * k} y2={540 + HALF_H * k} stroke={CLAY} strokeWidth={1.5} opacity={0.6} />);
  }

  return (
    <AbsoluteFill style={{ background: INK }}>
      <AbsoluteFill style={{ perspective: 900, perspectiveOrigin: "50% 30%" }}>
        <AbsoluteFill style={{ transform: `rotateX(${tilt * 64}deg) translateY(${tilt * 160}px) scale(${1 + tilt * 0.9})`, transformOrigin: "50% 50%" }}>
          <svg width={1920} height={1080}>
            <defs>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <g filter="url(#glow)">
              {spread > 0 && <rect x={960 - halfW} y={540 - halfH} width={halfW * 2} height={halfH * 2} fill={CLAY} opacity={0.05 + 0.08 * (1 - cols)} />}
              {stretch > 0 ? rows.slice(spread > 0 ? 0 : GRID_ROWS / 2, spread > 0 ? undefined : GRID_ROWS / 2 + 1) : null}
              {colLines}
              {stretch > 0 && stretch < 1 && (
                <>
                  <circle cx={headX} cy={540} r={9} fill={IVORY} />
                  <circle cx={960 - halfW} cy={540} r={9} fill={IVORY} />
                </>
              )}
              <circle cx={960} cy={540} r={9 + pointPop * 16} fill={EMBER} opacity={1 - spread * 0.4} />
              {pointPop > 0.02 && <circle cx={960} cy={540} r={20 + (1 - pointPop) * 120} fill="none" stroke={EMBER} strokeWidth={2} opacity={pointPop} />}
            </g>
          </svg>
          <Tag label="POINT" dim="0D · (0, 0)" at={T_POINT} t={t} x={990} y={450} />
          <Tag label="LINE" dim="1D · y = 0" at={T_LINE + 0.15} t={t} x={960 + HALF_W - 140} y={460} />
          <Tag label="PLANE" dim="2D · z = 0" at={T_PLANE + 0.3} t={t} x={960 - HALF_W} y={540 - HALF_H - 90} />
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

import { CSSProperties, ReactNode } from "react";
import { ease, fmtInt, prog } from "../lib/anim";
import { AMBER, DIM, FONT_CN, FONT_DISPLAY, FONT_MONO, FONT_TITLE, IVORY, LINE, PANEL } from "../lib/theme";

type Pos = { x: number; y: number };

const abs = (p?: Pos, center = false): CSSProperties =>
  p ? { position: "absolute", left: p.x, top: p.y, transform: center ? "translate(-50%, -50%)" : undefined } : {};

/** Small all-caps monospace annotation. */
export const Mono = ({ children, color = DIM, size = 16, at, center, style }: { children: ReactNode; color?: string; size?: number; at?: Pos; center?: boolean; style?: CSSProperties }) => (
  <div style={{ fontFamily: FONT_MONO, fontSize: size, letterSpacing: size * 0.18, color, whiteSpace: "nowrap", ...abs(at, center), ...style }}>{children}</div>
);

/** Editorial serif heading. */
export const Heading = ({ children, size = 72, color = IVORY, at, center, style }: { children: ReactNode; size?: number; color?: string; at?: Pos; center?: boolean; style?: CSSProperties }) => (
  <div style={{ fontFamily: FONT_TITLE, fontWeight: 700, fontSize: size, color, letterSpacing: size * 0.08, whiteSpace: "nowrap", lineHeight: 1.25, ...abs(at, center), ...style }}>
    {children}
  </div>
);

export const Body = ({ children, size = 34, color = IVORY, at, center, style }: { children: ReactNode; size?: number; color?: string; at?: Pos; center?: boolean; style?: CSSProperties }) => (
  <div style={{ fontFamily: FONT_CN, fontWeight: 500, fontSize: size, color, letterSpacing: size * 0.06, lineHeight: 1.5, ...abs(at, center), ...style }}>{children}</div>
);

/** Big display number that counts from `from` to `to` between t0 and t1. */
export const Counter = ({
  t,
  t0,
  t1,
  from = 0,
  to,
  size = 120,
  color = IVORY,
  suffix = "",
  decimals = 0,
  style,
}: {
  t: number;
  t0: number;
  t1: number;
  from?: number;
  to: number;
  size?: number;
  color?: string;
  suffix?: string;
  decimals?: number;
  style?: CSSProperties;
}) => {
  const k = ease.outCubic(prog(t, t0, t1));
  const v = from + (to - from) * k;
  return (
    <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: size, color, letterSpacing: -size * 0.02, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", ...style }}>
      {decimals ? v.toFixed(decimals) : fmtInt(v)}
      {suffix}
    </div>
  );
};

/** Glassy panel used for diagrams and callouts. */
export const Panel = ({ children, style, glow = AMBER, at, center }: { children: ReactNode; style?: CSSProperties; glow?: string; at?: Pos; center?: boolean }) => (
  <div
    style={{
      background: PANEL,
      border: `1px solid ${LINE}`,
      borderRadius: 18,
      boxShadow: `0 0 0 1px rgba(255,255,255,0.02), 0 30px 80px rgba(0,0,0,0.5), 0 0 60px ${glow}18`,
      backdropFilter: "blur(10px)",
      ...abs(at, center),
      ...style,
    }}
  >
    {children}
  </div>
);

/** Characters appear one by one (driven by video time, not wall-clock). */
export const Reveal = ({ t, at, text, per = 0.045, style }: { t: number; at: number; text: string; per?: number; style?: CSSProperties }) => (
  <span style={style}>
    {[...text].map((c, i) => {
      const k = ease.outCubic(prog(t, at + i * per, at + i * per + 0.35));
      return (
        <span key={i} style={{ opacity: k, display: "inline-block", transform: `translateY(${(1 - k) * 0.35}em)`, whiteSpace: "pre" }}>
          {c}
        </span>
      );
    })}
  </span>
);

/** SVG arrow from a to b with an animated draw-on progress. */
export const Arrow = ({ x1, y1, x2, y2, k = 1, color = DIM, width = 3, head = 14 }: { x1: number; y1: number; x2: number; y2: number; k?: number; color?: string; width?: number; head?: number }) => {
  const x = x1 + (x2 - x1) * k;
  const y = y1 + (y2 - y1) * k;
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const hx = (s: number) => x - head * Math.cos(ang + s * 0.45);
  const hy = (s: number) => y - head * Math.sin(ang + s * 0.45);
  return (
    <g opacity={k > 0.01 ? 1 : 0}>
      <line x1={x1} y1={y1} x2={x} y2={y} stroke={color} strokeWidth={width} strokeLinecap="round" />
      <path d={`M ${hx(1)} ${hy(1)} L ${x} ${y} L ${hx(-1)} ${hy(-1)}`} stroke={color} strokeWidth={width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
};

export const Svg = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0, overflow: "visible", ...style }}>
    {children}
  </svg>
);

import { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { BEAT, FPS, SCENES, ease, prog, wordAt } from "../lib/timing";
import { CLAY, EMBER, FONT_CN, FONT_DISPLAY, FONT_MONO, INK, IVORY } from "../lib/theme";

const [T_START, T_END] = SCENES.cuts;
const BEATS = Math.round((T_END - T_START) / BEAT);
const WIPE = 0.13;

type Panel = { bg: string; fg: string; clip: (p: number) => string; body: (t: number, local: number) => ReactNode };

const big = (fg: string, size = 300): CSSProperties => ({ fontFamily: FONT_CN, fontWeight: 900, fontSize: size, color: fg, letterSpacing: -6, lineHeight: 1 });

const Word = ({ text, at, t, fg, size }: { text: string; at: number; t: number; fg: string; size?: number }) => {
  const k = ease.outBack(prog(t, at - 0.04, at + 0.12));
  return <span style={{ ...big(fg, size), display: "inline-block", transform: `translateY(${(1 - k) * 80}px) scale(${0.6 + 0.4 * k})`, opacity: k > 0 ? 1 : 0 }}>{text}</span>;
};

const Rings = ({ t, color }: { t: number; color: string }) => (
  <AbsoluteFill>
    {Array.from({ length: 9 }, (_, i) => {
      const s = ((t * 1.6 + i / 9) % 1) * 2.4;
      return <div key={i} style={{ position: "absolute", left: 960, top: 540, width: 800, height: 800, border: `3px solid ${color}`, transform: `translate(-50%,-50%) scale(${s}) rotate(45deg)`, opacity: 1 - s / 2.4 }} />;
    })}
  </AbsoluteFill>
);

const Stripes = ({ t, color }: { t: number; color: string }) => (
  <AbsoluteFill style={{ background: `repeating-linear-gradient(-45deg, ${color} 0 26px, transparent 26px 80px)`, backgroundPositionX: `${t * 400}px`, opacity: 0.25 }} />
);

const PANELS: Panel[] = [
  {
    bg: INK,
    fg: IVORY,
    clip: (p) => `inset(${(1 - p) * 50}% 0 ${(1 - p) * 50}% 0)`,
    body: (t) => (
      <>
        <Word text="每" at={wordAt("l6", "每")} t={t} fg={IVORY} />
        <Word text="一次" at={wordAt("l6", "一次")} t={t} fg={CLAY} />
      </>
    ),
  },
  {
    bg: CLAY,
    fg: INK,
    clip: (p) => `circle(${p * 120}% at 50% 50%)`,
    body: (t) => (
      <>
        <Rings t={t} color={INK} />
        <Word text="转场" at={wordAt("l6", "转场")} t={t} fg={INK} size={360} />
      </>
    ),
  },
  {
    bg: IVORY,
    fg: INK,
    clip: (p) => `polygon(0 0, ${p * 160}% 0, ${p * 160 - 60}% 100%, 0 100%)`,
    body: (t) => (
      <>
        <Stripes t={t} color={INK} />
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 210, color: "transparent", WebkitTextStroke: `4px ${INK}`, letterSpacing: -4 }}>CUT·CUT</span>
      </>
    ),
  },
  {
    bg: EMBER,
    fg: INK,
    clip: (p) => `inset(0 0 ${(1 - p) * 100}% 0)`,
    body: (t) => (
      <>
        <Word text="都" at={wordAt("l6", "都")} t={t} fg={INK} />
        <Word text="踩" at={wordAt("l6", "踩")} t={t} fg={IVORY} />
        <Word text="在" at={wordAt("l6", "在")} t={t} fg={INK} />
      </>
    ),
  },
  {
    bg: INK,
    fg: IVORY,
    clip: (p) => `inset(0 ${(1 - p) * 50}% 0 ${(1 - p) * 50}%)`,
    body: (t) => (
      <>
        <Rings t={t} color={EMBER} />
        <Word text="节拍" at={wordAt("l6", "节拍")} t={t} fg={IVORY} size={340} />
        <Word text="上" at={wordAt("l6", "上")} t={t} fg={EMBER} size={340} />
      </>
    ),
  },
  {
    bg: IVORY,
    fg: INK,
    clip: (p) => `circle(${p * 120}% at 50% 50%)`,
    body: (t, local) => {
      const collapse = ease.inExpo(prog(local, 0.05, BEAT));
      return (
        <div style={{ transform: `scale(${1 - collapse * 0.98})`, textAlign: "center" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 250, color: INK, letterSpacing: -6, lineHeight: 1 }}>♩=120</div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 30, color: INK, letterSpacing: 6, marginTop: 20 }}>
            {t.toFixed(3)}s · ON BEAT
          </div>
        </div>
      );
    },
  },
];

const Sequencer = ({ t }: { t: number }) => {
  const current = Math.floor((t - T_START) / BEAT);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 130, display: "flex", justifyContent: "center", gap: 16, mixBlendMode: "difference" }}>
      {Array.from({ length: BEATS }, (_, i) => {
        const at = T_START + i * BEAT;
        const flash = t >= at ? Math.exp(-(t - at) / 0.12) : 0;
        return (
          <div key={i} style={{ textAlign: "center", fontFamily: FONT_MONO, fontSize: 15, color: IVORY, letterSpacing: 2 }}>
            <div style={{ width: 90, height: 14, border: `2px solid ${IVORY}`, background: i <= current ? IVORY : "transparent", transform: `scaleY(${1 + flash * 1.6})` }} />
            <div style={{ marginTop: 10, opacity: i <= current ? 1 : 0.4 }}>{at.toFixed(1)}s</div>
          </div>
        );
      })}
    </div>
  );
};

export const Cuts = () => {
  const t = useCurrentFrame() / FPS;
  return (
    <AbsoluteFill style={{ background: INK }}>
      {PANELS.map((panel, i) => {
        const at = T_START + i * BEAT;
        if (t < at - 0.01) return null;
        const p = i === 0 ? 1 : ease.outExpo(prog(t, at, at + WIPE));
        const punch = 1 + 0.12 * Math.exp(-(t - at) / 0.1);
        return (
          <AbsoluteFill key={i} style={{ background: panel.bg, clipPath: panel.clip(p), justifyContent: "center", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", transform: `scale(${punch})` }}>{panel.body(t, t - at)}</div>
            <div style={{ position: "absolute", left: 76, top: 120, fontFamily: FONT_MONO, fontSize: 18, letterSpacing: 3, color: panel.fg }}>
              CUT {String(i + 1).padStart(2, "0")} <span style={{ opacity: 0.55 }}>@ {at.toFixed(2)}s</span>
            </div>
          </AbsoluteFill>
        );
      })}
      <Sequencer t={t} />
    </AbsoluteFill>
  );
};

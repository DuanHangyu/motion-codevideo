import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease, prog } from "../lib/anim";
import { DURATION_SEC, FPS, SCENES, sceneAt } from "../lib/timeline";
import { AMBER, BG, CYAN, DIM, FONT_DISPLAY, FONT_MONO, FONT_TITLE, IVORY } from "../lib/theme";

export const Grain = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: 0.07, mixBlendMode: "overlay", pointerEvents: "none" }}>
      <svg width="100%" height="100%">
        <filter id="lesson-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={frame % 30} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#lesson-grain)" />
      </svg>
    </AbsoluteFill>
  );
};

export const Vignette = () => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 58%, rgba(0,0,0,0.55) 100%)", pointerEvents: "none" }} />
);

/** Faint blueprint grid + glow that sits behind 2D chapters. */
export const Backdrop = ({ tint = CYAN, grid = 0.05 }: { tint?: string; grid?: number }) => (
  <AbsoluteFill style={{ background: BG }}>
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 60% at 50% 45%, ${tint}14 0%, transparent 70%)` }} />
    <AbsoluteFill
      style={{
        opacity: grid,
        backgroundImage: "linear-gradient(rgba(180,200,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(180,200,255,1) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
        backgroundPosition: "30px 30px",
      }}
    />
  </AbsoluteFill>
);

/** Thin chapter progress rail at the very top + persistent chapter tag. */
export const ChapterRail = () => {
  const t = useCurrentFrame() / FPS;
  const s = sceneAt(t);
  const tagIn = ease.outCubic(prog(t, s.start + 2.1, s.start + 2.7));
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 3, display: "flex", gap: 3, opacity: 0.85 }}>
        {SCENES.map((sc) => {
          const k = prog(t, sc.start, sc.end);
          return (
            <div key={sc.id} style={{ flex: sc.end - sc.start, background: "rgba(255,255,255,0.08)", position: "relative" }}>
              <div style={{ position: "absolute", inset: 0, width: `${k * 100}%`, background: sc.id === s.id ? AMBER : "rgba(236,241,248,0.45)" }} />
            </div>
          );
        })}
      </div>
      {s.num && (
        <div
          style={{
            position: "absolute",
            left: 56,
            top: 40,
            display: "flex",
            alignItems: "baseline",
            gap: 16,
            opacity: tagIn * 0.9,
            transform: `translateX(${(1 - tagIn) * -16}px)`,
          }}
        >
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700, color: AMBER, letterSpacing: 2 }}>{s.num}</span>
          <span style={{ fontFamily: FONT_TITLE, fontSize: 22, fontWeight: 700, color: IVORY, letterSpacing: 3 }}>{s.title}</span>
          <span style={{ fontFamily: FONT_MONO, fontSize: 13, color: DIM, letterSpacing: 3 }}>{s.en}</span>
        </div>
      )}
      <div style={{ position: "absolute", right: 56, top: 44, fontFamily: FONT_MONO, fontSize: 13, color: DIM, letterSpacing: 3, opacity: 0.7 }}>
        ALEXNET · 2012 &nbsp; {fmtClock(t)} / {fmtClock(DURATION_SEC)}
      </div>
    </AbsoluteFill>
  );
};

const fmtClock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

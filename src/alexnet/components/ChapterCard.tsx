import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease, prog } from "../lib/anim";
import { FPS, sceneAt } from "../lib/timeline";
import { AMBER, BG, DIM, FONT_DISPLAY, FONT_MONO, FONT_TITLE, IVORY } from "../lib/theme";

const HOLD = 2.0;
const OUT = 0.55;

/** Full-screen chapter title for the first ~2.4 s of every numbered chapter. */
export const ChapterCard = () => {
  const t = useCurrentFrame() / FPS;
  const s = sceneAt(t);
  const local = t - s.start;
  if (!s.num || local > HOLD + OUT) return null;

  const out = ease.inOutCubic(prog(local, HOLD, HOLD + OUT));
  const num = ease.outExpo(prog(local, 0.05, 0.9));
  const rule = ease.outQuint(prog(local, 0.15, 1.1));
  const label = ease.outCubic(prog(local, 0.5, 1.1));
  const chars = [...s.title];

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* two dark shutters that part to reveal the chapter */}
      <AbsoluteFill style={{ background: BG, clipPath: `inset(0 0 ${50 + out * 50}% 0)` }} />
      <AbsoluteFill style={{ background: BG, clipPath: `inset(${50 + out * 50}% 0 0 0)` }} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: 1 - out, transform: `scale(${1 + out * 0.06})` }}>
        <div
          style={{
            position: "absolute",
            fontFamily: FONT_DISPLAY,
            fontWeight: 800,
            fontSize: 420,
            color: "transparent",
            WebkitTextStroke: `2px ${AMBER}`,
            opacity: 0.22 * num,
            transform: `translateY(${(1 - num) * 60}px)`,
            letterSpacing: -10,
          }}
        >
          {s.num}
        </div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 20, letterSpacing: 10, color: AMBER, opacity: label, marginBottom: 26 }}>
          CHAPTER {s.num} · {s.en}
        </div>
        <div style={{ fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 96, color: IVORY, letterSpacing: 10, display: "flex" }}>
          {chars.map((c, i) => {
            const k = ease.outCubic(prog(local, 0.2 + i * 0.05, 0.75 + i * 0.05));
            return (
              <span key={i} style={{ opacity: k, transform: `translateY(${(1 - k) * 30}px)`, filter: `blur(${(1 - k) * 8}px)`, display: "inline-block" }}>
                {c}
              </span>
            );
          })}
        </div>
        <div style={{ marginTop: 34, width: 760 * rule, height: 2, background: `linear-gradient(90deg, transparent, ${AMBER}, transparent)` }} />
        <div style={{ marginTop: 18, fontFamily: FONT_MONO, fontSize: 15, color: DIM, letterSpacing: 6, opacity: label }}>ALEXNET · 一次让机器学会“看”的革命</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

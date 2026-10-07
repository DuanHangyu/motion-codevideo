import { CSSProperties, ReactNode, useEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { explore, useExplore } from "../lib/explore";
import { sfx } from "../lib/sfx";
import { AMBER, DIM, FONT_CN, FONT_MONO, IVORY, LIME } from "../lib/theme";

/**
 * Task prompt that floats inside the frozen world, plus an optional challenge.
 * When `done` first becomes true the challenge is reported and celebrated (chime + light burst).
 */
export const ExploreTask = ({ zone, task, sub, goal, done }: { zone: string; task: string; sub?: string[]; goal?: string; done?: boolean }) => {
  const ex = useExplore(zone);
  const doneAt = useRef<number | null>(null);
  const finished = !!done || explore.isCompleted(zone);
  useEffect(() => {
    if (!ex.interactive || !done || explore.isCompleted(zone)) return;
    doneAt.current = performance.now() / 1000;
    explore.complete(zone);
    sfx.chime();
    sfx.impact();
  }, [done, ex.interactive, zone]);
  if (!ex.active) return null;
  const burst = doneAt.current === null ? 0 : Math.max(0, 1 - (ex.clock - doneAt.current) / 1.6);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", alignItems: "center", opacity: ex.blend }}>
      <div
        style={{
          marginTop: 80,
          padding: "12px 40px 14px",
          borderRadius: 28,
          textAlign: "center",
          background: "radial-gradient(ellipse at 50% 50%, rgba(5,8,14,0.82) 0%, rgba(5,8,14,0.55) 60%, rgba(5,8,14,0) 100%)",
          transform: `translateY(${(1 - ex.blend) * -16}px)`,
        }}
      >
        <div style={{ fontFamily: FONT_MONO, fontSize: 15, letterSpacing: 6, color: AMBER }}>◆ 时间已暂停 · 你在画面里</div>
        <div style={{ marginTop: 12, fontFamily: FONT_CN, fontSize: 34, color: IVORY, textShadow: "0 2px 18px #000, 0 0 2px #000" }}>{task}</div>
        {sub && (
          <div style={{ marginTop: 10, display: "flex", gap: 22, justifyContent: "center", fontFamily: FONT_CN, fontSize: 20, color: DIM, textShadow: "0 2px 10px #000" }}>
            {sub.map((x) => (
              <span key={x}>· {x}</span>
            ))}
          </div>
        )}
        {goal && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              marginTop: 16,
              padding: "8px 18px",
              borderRadius: 999,
              fontFamily: FONT_CN,
              fontSize: 21,
              color: finished ? "#0b1a04" : LIME,
              background: finished ? LIME : "rgba(10,20,8,0.75)",
              border: `1.5px solid ${LIME}`,
              boxShadow: `0 0 ${20 + burst * 80}px rgba(168,255,96,${0.25 + burst * 0.6})`,
              transform: `scale(${1 + burst * 0.15})`,
            }}
          >
            <b style={{ fontFamily: FONT_MONO, fontSize: 15, letterSpacing: 3 }}>{finished ? "✓ 挑战完成" : "挑战"}</b>
            {goal}
          </div>
        )}
      </div>
      {burst > 0 && (
        <div
          style={{
            position: "absolute",
            left: 960,
            top: 540,
            width: 2600 * (1 - burst),
            height: 2600 * (1 - burst),
            marginLeft: -1300 * (1 - burst),
            marginTop: -1300 * (1 - burst),
            borderRadius: "50%",
            border: `${4 + 14 * burst}px solid rgba(168,255,96,${0.6 * burst})`,
            boxShadow: `0 0 120px rgba(168,255,96,${0.5 * burst})`,
          }}
        />
      )}
    </AbsoluteFill>
  );
};

/** A chip-style button that lives inside the composition. */
export const WorldButton = ({ on, onClick, children, color = AMBER, style }: { on?: boolean; onClick: () => void; children: ReactNode; color?: string; style?: CSSProperties }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    onPointerDown={(e) => e.stopPropagation()}
    style={{
      fontFamily: FONT_CN,
      fontSize: 20,
      padding: "8px 16px",
      borderRadius: 10,
      cursor: "pointer",
      border: `1.5px solid ${on ? color : "rgba(236,241,248,0.25)"}`,
      background: on ? `${color}26` : "rgba(10,15,28,0.75)",
      color: on ? color : IVORY,
      ...style,
    }}
  >
    {children}
  </button>
);

/** The moment time stops: a ripple sweeps out from the centre and a cold rim of light frames the frozen world. */
export const FreezeFX = () => {
  const ex = useExplore();
  if (!ex.active) return null;
  const r = ex.enter;
  const ring = r < 1 ? 1 - r : 0;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {ring > 0 && (
        <div
          style={{
            position: "absolute",
            left: 960,
            top: 540,
            width: 2400 * r,
            height: 2400 * r,
            marginLeft: -1200 * r,
            marginTop: -1200 * r,
            borderRadius: "50%",
            border: `${3 + 10 * ring}px solid rgba(160, 225, 255, ${0.55 * ring})`,
            boxShadow: `0 0 80px rgba(120, 210, 255, ${0.5 * ring}), inset 0 0 80px rgba(120, 210, 255, ${0.35 * ring})`,
          }}
        />
      )}
      <AbsoluteFill style={{ opacity: ex.blend, boxShadow: "inset 0 0 0 2px rgba(255,181,71,0.55), inset 0 0 160px rgba(60,140,255,0.28)" }} />
      <AbsoluteFill style={{ opacity: ex.blend * 0.12, background: "linear-gradient(180deg, rgba(120,190,255,0.6), transparent 30%, transparent 70%, rgba(120,190,255,0.6))" }} />
    </AbsoluteFill>
  );
};

/** A labelled slider that lives inside the composition. */
export const WorldSlider = ({ label, value, min, max, step, unit, onChange, color = AMBER }: { label: string; value: number; min: number; max: number; step: number; unit: (v: number) => string; onChange: (v: number) => void; color?: string }) => (
  <div style={{ marginBottom: 14 }} onPointerDown={(e) => e.stopPropagation()}>
    <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FONT_CN, fontSize: 21, color: IVORY }}>
      <span>{label}</span>
      <span style={{ fontFamily: FONT_MONO, color }}>{unit(value)}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%", accentColor: color, marginTop: 8, height: 22 }} />
  </div>
);

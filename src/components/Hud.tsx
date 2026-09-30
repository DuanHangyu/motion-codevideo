import { AbsoluteFill, useCurrentFrame } from "remotion";
import { BEAT, DURATION, FPS, SCENES, SceneName } from "../lib/timing";
import { CLAY, FONT_MONO, IVORY } from "../lib/theme";

const LABELS: Record<SceneName, string> = {
  opener: "IGNITION",
  genesis: "GENESIS",
  world: "WORLD",
  materials: "MATERIAL",
  code: "SOURCE",
  cuts: "RHYTHM",
  finale: "SIGNATURE",
};
const MUSIC_START = 4;

const pad = (n: number, w: number) => String(n).padStart(w, "0");

const Corner = ({ x, y }: { x: 0 | 1; y: 0 | 1 }) => (
  <div
    style={{
      position: "absolute",
      [x ? "right" : "left"]: 36,
      [y ? "bottom" : "top"]: 36,
      width: 26,
      height: 26,
      borderColor: IVORY,
      borderStyle: "solid",
      borderWidth: 0,
      [`border${y ? "Bottom" : "Top"}Width`]: 2,
      [`border${x ? "Right" : "Left"}Width`]: 2,
      opacity: 0.7,
    }}
  />
);

export const Hud = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const names = Object.keys(SCENES) as SceneName[];
  const idx = Math.max(0, names.findIndex((n) => t >= SCENES[n][0] && t < SCENES[n][1]));
  const beat = t >= MUSIC_START ? Math.floor((t - MUSIC_START) / BEAT) : -1;
  const intro = Math.min(1, t / 0.6);
  const text = { position: "absolute" as const, fontFamily: FONT_MONO, fontSize: 17, letterSpacing: 2.5, color: IVORY };

  return (
    <AbsoluteFill style={{ mixBlendMode: "difference", opacity: 0.85 * intro, pointerEvents: "none" }}>
      <Corner x={0} y={0} />
      <Corner x={1} y={0} />
      <Corner x={0} y={1} />
      <Corner x={1} y={1} />
      <div style={{ ...text, left: 76, top: 50 }}>
        OPUS 5.5 <span style={{ opacity: 0.5 }}>// REALTIME</span>
      </div>
      <div style={{ ...text, right: 76, top: 50, textAlign: "right" }}>
        FRAME {pad(frame, 4)} <span style={{ opacity: 0.5 }}>/ {pad(DURATION, 4)}</span>
      </div>
      <div style={{ ...text, left: 76, bottom: 50 }}>
        {pad(idx + 1, 2)} <span style={{ color: CLAY }}>—</span> {LABELS[names[idx]]}
      </div>
      <div style={{ ...text, right: 76, bottom: 50, display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ opacity: 0.5, marginRight: 8 }}>
          00:{pad(Math.floor(t), 2)}:{pad(frame % FPS, 2)}
        </span>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{ width: 12, height: 12, border: `1.5px solid ${IVORY}`, background: beat >= 0 && beat % 4 === i ? IVORY : "transparent" }}
          />
        ))}
        <span style={{ marginLeft: 8 }}>120 BPM</span>
      </div>
    </AbsoluteFill>
  );
};

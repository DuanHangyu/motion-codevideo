import { AbsoluteFill, random, useCurrentFrame } from "remotion";
import { useInteractive } from "../lib/interactive";
import { DURATION, FPS, ease, lerp, prog, wordAt } from "../lib/timing";
import { CLAY, EMBER, FONT_DISPLAY, FONT_MONO, INK, IVORY, IVORY_DIM } from "../lib/theme";

const TITLE = "OPUS 5.5";
const GLYPHS = "▚▞█▓▒░<>/\\{}#$%&*+=01ΔΣΩ";
const COLS = 45;
const ROWS = DURATION / COLS;
const CELL = 26;
const GAP = 4;

const T_HEY = wordAt("l1", "嘿");
const T_OPUS = wordAt("l1", "Opus");
const T_55 = wordAt("l1", "5.5");
const T_FRAME = wordAt("l1", "每");
const T_ALL = wordAt("l1", "都");
const T_MADE = wordAt("l1", "做");
const T_END = 6;

const Title = ({ t }: { t: number }) => {
  const settle = prog(t, T_55, T_55 + 0.25);
  const lift = ease.inOutCubic(prog(t, T_FRAME - 0.9, T_FRAME - 0.2));
  const out = ease.inCubic(prog(t, T_END - 0.55, T_END - 0.15));
  const frame = Math.floor(t * FPS);
  return (
    <div
      style={{
        position: "absolute",
        top: lerp(540, 150, lift),
        left: 0,
        right: 0,
        textAlign: "center",
        transform: `translateY(-50%) scale(${lerp(1, 0.42, lift) * (1 + (1 - settle) * 0.06)})`,
        fontFamily: FONT_DISPLAY,
        fontWeight: 800,
        fontSize: 190,
        letterSpacing: -4,
        color: IVORY,
        opacity: 1 - out,
        whiteSpace: "pre",
      }}
    >
      {TITLE.split("").map((ch, i) => {
        const at = ch === " " ? 0 : i < 4 ? T_OPUS - 0.3 + i * 0.07 : T_55 - 0.05 + (i - 5) * 0.05;
        const appear = t >= T_HEY + 0.25 + i * 0.04;
        const resolved = t >= at;
        const glyph = resolved || ch === " " ? ch : GLYPHS[Math.floor(random(`g${i}-${Math.floor(frame / 2)}`) * GLYPHS.length)];
        const pop = ease.outBack(prog(t, at, at + 0.22));
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: appear ? (resolved ? 1 : 0.55) : 0,
              color: resolved ? (i >= 5 ? CLAY : IVORY) : IVORY_DIM,
              transform: `translateY(${resolved ? (1 - pop) * 30 : 0}px)`,
              minWidth: ch === " " ? 60 : undefined,
            }}
          >
            {glyph}
          </span>
        );
      })}
    </div>
  );
};

/** One cell per frame of the whole film; the current frame glows. */
const FrameGrid = ({ t }: { t: number }) => {
  const frame = Math.floor(t * FPS);
  const { paused, seek } = useInteractive();
  const reveal = prog(t, T_FRAME - 0.55, T_FRAME + 0.45);
  const sweep = prog(t, T_ALL - 0.05, T_MADE + 0.3); // fill every future frame
  const collapse = ease.inExpo(prog(t, T_END - 0.55, T_END - 0.02));
  if (reveal <= 0) return null;
  const W = COLS * (CELL + GAP) - GAP;
  const H = ROWS * (CELL + GAP) - GAP;
  const cells = [];
  for (let i = 0; i < DURATION; i++) {
    const c = i % COLS;
    const r = Math.floor(i / COLS);
    const x = c * (CELL + GAP) - W / 2 + CELL / 2;
    const y = r * (CELL + GAP) - H / 2 + CELL / 2;
    const diag = (c + r) / (COLS + ROWS);
    const show = ease.outCubic(prog(reveal, diag * 0.7, diag * 0.7 + 0.3));
    if (show <= 0) continue;
    const swept = sweep > 0 && i / DURATION < ease.inOutCubic(sweep);
    const past = i < frame;
    const now = i === frame;
    const jitter = random(`c${i}`);
    const k = ease.inExpo(prog(collapse, jitter * 0.4, 0.6 + jitter * 0.4));
    const fill = now ? EMBER : swept ? CLAY : past ? IVORY : "transparent";
    cells.push(
      <div
        key={i}
        className={paused ? "frame-cell" : undefined}
        title={paused ? `跳到第 ${i} 帧 · ${(i / FPS).toFixed(2)}s` : undefined}
        onClick={paused ? () => seek(i) : undefined}
        style={{
          position: "absolute",
          cursor: paused ? "pointer" : undefined,
          left: 960 + x * (1 - k) - CELL / 2,
          top: 590 + y * (1 - k) - CELL / 2,
          width: CELL,
          height: CELL,
          border: `1px solid ${past || now || swept ? "transparent" : IVORY_DIM}`,
          background: fill,
          opacity: show * (past && !swept ? 0.85 : 1) * (1 - k * 0.3),
          transform: `scale(${(now ? 1.25 : 1) * show * (1 - k * 0.7)})`,
          boxShadow: now || swept ? `0 0 ${now ? 26 : 10}px ${now ? EMBER : CLAY}` : undefined,
        }}
      />,
    );
  }
  return (
    <>
      {cells}
      <div
        style={{
          position: "absolute",
          top: 590 - H / 2 - 52,
          left: 960 - W / 2,
          width: W,
          display: "flex",
          justifyContent: "space-between",
          fontFamily: FONT_MONO,
          fontSize: 20,
          letterSpacing: 3,
          color: IVORY,
          opacity: reveal * (1 - collapse),
        }}
      >
        <span>
          FRAME <span style={{ color: EMBER }}>{String(frame).padStart(4, "0")}</span> — RENDERING NOW
        </span>
        <span style={{ opacity: 0.55 }}>{DURATION} FRAMES · 1 CELL = 1 FRAME</span>
      </div>
    </>
  );
};

export const Opener = () => {
  const t = useCurrentFrame() / FPS;
  const ring = prog(t, T_HEY, T_HEY + 1.1);
  const dotBlink = t < T_HEY ? (Math.floor(t * 6) % 2 === 0 ? 1 : 0.2) : 0;
  const endDot = ease.outCubic(prog(t, T_END - 0.25, T_END));
  return (
    <AbsoluteFill style={{ background: INK }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 55%, rgba(232,121,74,${0.16 * (1 - ring * 0.5)}) 0%, transparent 55%)` }} />
      {ring > 0 && ring < 1 && (
        <svg width={1920} height={1080} style={{ position: "absolute" }}>
          {[0, 0.12, 0.24].map((d) => {
            const k = prog(ring, d, 1);
            return <circle key={d} cx={960} cy={540} r={8 + ease.outExpo(k) * 1100} fill="none" stroke={CLAY} strokeWidth={3 * (1 - k)} opacity={1 - k} />;
          })}
        </svg>
      )}
      <div
        style={{
          position: "absolute",
          left: 960,
          top: 540,
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: EMBER,
          boxShadow: `0 0 30px ${EMBER}`,
          transform: "translate(-50%,-50%)",
          opacity: Math.max(dotBlink, endDot),
        }}
      />
      <Title t={t} />
      <FrameGrid t={t} />
    </AbsoluteFill>
  );
};

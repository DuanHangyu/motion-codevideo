import { AbsoluteFill, useCurrentFrame } from "remotion";
import source from "../generated/source.json";
import { EVENTS, FPS, SCENES, ease, lerp, prog, wordAt } from "../lib/timing";
import { CLAY, CYAN, EMBER, FONT_DISPLAY, FONT_MONO, INK, INK_2, IVORY } from "../lib/theme";

const [T_START, T_END] = SCENES.code;
const T_CAMERA = wordAt("l5", "摄像机");
const T_ASSETS = wordAt("l5", "素材库");
const T_CODE = wordAt("l5", "代码");
const T_ZOOM = T_END - 1.1;

const KEYWORDS = /\b(const|let|return|import|from|export|def|for|in|if|else|uniform|attribute|varying|vec2|vec3|vec4|float|mat2|void|new|async|await|type)\b/g;
const tokenColor = (line: string) => {
  const trimmed = line.trim();
  if (trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith('"""')) return "comment";
  return "code";
};

/** Very small syntax highlighter: keywords, strings, numbers. */
const Highlighted = ({ line }: { line: string }) => {
  if (tokenColor(line) === "comment") return <span style={{ color: "rgba(243,238,230,0.35)" }}>{line}</span>;
  const parts = line.split(/("[^"]*"|'[^']*'|`[^`]*`|\b\d+(?:\.\d+)?\b)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (/^["'`]/.test(p)) return <span key={i} style={{ color: "#B5E08C" }}>{p}</span>;
        if (/^\d/.test(p)) return <span key={i} style={{ color: CYAN }}>{p}</span>;
        const words = p.split(KEYWORDS);
        return words.map((w, j) => (j % 2 === 1 ? <span key={`${i}-${j}`} style={{ color: CLAY }}>{w}</span> : <span key={`${i}-${j}`}>{w}</span>));
      })}
    </>
  );
};

const ALL_LINES = source.files.flatMap((f) => [`// ── ${f.name}`, ...f.lines]);
const SHADER = source.files.find((f) => f.name.endsWith("ParticleField.tsx"));
const SHADER_START = SHADER ? SHADER.lines.findIndex((l) => l.includes("void main()")) : 0;
const TYPED = (SHADER?.lines ?? ALL_LINES).slice(SHADER_START, SHADER_START + 15);
const TYPED_CHARS = TYPED.join("\n").length;

const Column = ({ offset, speed, t, x, rot }: { offset: number; speed: number; t: number; x: number; rot: number }) => {
  const lineH = 26;
  const scroll = (t - T_START) * speed + ease.inExpo(prog(t, T_CODE, T_END)) * 2400;
  const first = Math.floor(scroll / lineH);
  const rows = [];
  for (let i = 0; i < 48; i++) {
    const idx = (offset + first + i) % ALL_LINES.length;
    rows.push(
      <div key={i} style={{ height: lineH, whiteSpace: "pre" }}>
        <span style={{ opacity: 0.35, marginRight: 18 }}>{String(idx + 1).padStart(4, " ")}</span>
        <Highlighted line={ALL_LINES[idx].slice(0, 64)} />
      </div>,
    );
  }
  return (
    <div style={{ position: "absolute", left: x, top: -120, width: 820, transform: `rotateY(${rot}deg) translateZ(-220px)`, transformOrigin: "50% 50%" }}>
      <div style={{ transform: `translateY(${-(scroll % lineH)}px)`, fontFamily: FONT_MONO, fontSize: 17, color: IVORY }}>{rows}</div>
    </div>
  );
};

const Stat = ({ at, t, label, value, note, accent, struck }: { at: number; t: number; label: string; value: string; note: string; accent: string; struck?: boolean }) => {
  const k = ease.outBack(prog(t, at - 0.05, at + 0.3));
  const strike = ease.outExpo(prog(t, at + 0.25, at + 0.55));
  if (k <= 0) return null;
  return (
    <div style={{ background: INK_2, border: `1.5px solid ${accent}`, padding: "22px 30px", width: 460, transform: `translateX(${(1 - k) * 80}px)`, opacity: Math.min(1, k), boxShadow: `0 0 40px rgba(0,0,0,0.6)` }}>
      <div style={{ fontFamily: FONT_MONO, fontSize: 16, letterSpacing: 4, color: accent }}>{label}</div>
      <div style={{ position: "relative", fontFamily: FONT_DISPLAY, fontSize: 64, fontWeight: 700, color: IVORY, lineHeight: 1.15, marginTop: 4 }}>
        {value}
        {struck && <div style={{ position: "absolute", left: -6, top: "54%", height: 6, width: `${strike * 104}%`, background: EMBER }} />}
      </div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 15, color: IVORY, opacity: 0.55, marginTop: 6 }}>{note}</div>
    </div>
  );
};

const Editor = ({ t }: { t: number }) => {
  const typedTicks = EVENTS.ticks.filter((x) => x <= t).length;
  const chars = Math.min(TYPED_CHARS, Math.floor((typedTicks / EVENTS.ticks.length) * TYPED_CHARS * 1.25));
  const text = TYPED.join("\n").slice(0, chars);
  const lines = text.split("\n");
  const enter = ease.outCubic(prog(t, T_START, T_START + 0.35));
  const grow = ease.inOutCubic(prog(t, T_CODE, T_CODE + 0.5));
  const zoom = ease.inExpo(prog(t, T_ZOOM, T_END));
  return (
    <div
      style={{
        position: "absolute",
        left: lerp(120, 360, grow),
        top: lerp(200, 170, grow),
        width: 1060,
        background: "rgba(16,16,24,0.92)",
        border: `1.5px solid ${grow > 0 ? CLAY : "rgba(243,238,230,0.25)"}`,
        boxShadow: `0 30px 80px rgba(0,0,0,0.7), 0 0 ${60 * grow}px rgba(232,121,74,0.35)`,
        transform: `translateY(${(1 - enter) * 60}px) scale(${lerp(1, 1.12, grow) * (1 + zoom * 7)})`,
        transformOrigin: "35% 45%",
        opacity: enter * (1 - prog(t, T_END - 0.25, T_END)),
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "14px 20px", borderBottom: "1px solid rgba(243,238,230,0.12)", fontFamily: FONT_MONO, fontSize: 15, color: IVORY }}>
        {[EMBER, CLAY, IVORY].map((c) => (
          <span key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c, opacity: 0.8 }} />
        ))}
        <span style={{ marginLeft: 12, opacity: 0.7 }}>{SHADER?.name ?? "source"}</span>
        <span style={{ marginLeft: "auto", color: CLAY }}>GLSL · written by Opus 5.5</span>
      </div>
      <div style={{ padding: "18px 24px", fontFamily: FONT_MONO, fontSize: 21, lineHeight: 1.6, color: IVORY, minHeight: 560 }}>
        {lines.map((l, i) => (
          <div key={i} style={{ whiteSpace: "pre" }}>
            <span style={{ opacity: 0.3, marginRight: 22 }}>{String(SHADER_START + i + 1).padStart(3, " ")}</span>
            <Highlighted line={l} />
            {i === lines.length - 1 && <span style={{ background: EMBER, opacity: Math.floor(t * 4) % 2 ? 1 : 0.2 }}>&nbsp;</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

export const Code = () => {
  const t = useCurrentFrame() / FPS;
  const bright = lerp(0.14, 0.4, ease.outCubic(prog(t, T_CODE, T_CODE + 0.4)));
  const statsOut = ease.inCubic(prog(t, T_CODE, T_CODE + 0.35));
  return (
    <AbsoluteFill style={{ background: INK, overflow: "hidden" }}>
      <AbsoluteFill style={{ perspective: 1100, opacity: bright }}>
        <Column offset={0} speed={260} t={t} x={-260} rot={38} />
        <Column offset={420} speed={340} t={t} x={560} rot={0} />
        <Column offset={900} speed={300} t={t} x={1360} rot={-38} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: `linear-gradient(90deg, ${INK} 0%, transparent 25%, transparent 75%, ${INK} 100%)` }} />
      <Editor t={t} />
      <div style={{ position: "absolute", right: 110, top: 190, display: "flex", flexDirection: "column", gap: 22, opacity: 1 - statsOut, transform: `translateX(${statsOut * 120}px)` }}>
        <Stat at={T_CAMERA} t={t} label="CAMERAS USED" value="0" note="no footage was filmed" accent={EMBER} struck />
        <Stat at={T_ASSETS} t={t} label="STOCK ASSETS" value="0" note="no images · no samples · no presets" accent={EMBER} struck />
      </div>
      <div
        style={{
          position: "absolute",
          right: 110,
          bottom: 190,
          textAlign: "right",
          fontFamily: FONT_MONO,
          color: IVORY,
          opacity: ease.outCubic(prog(t, T_CODE, T_CODE + 0.3)) * (1 - prog(t, T_END - 0.3, T_END)),
        }}
      >
        <div style={{ fontSize: 16, letterSpacing: 4, color: CLAY }}>ONLY CODE</div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 72, fontWeight: 700 }}>{source.totalLines.toLocaleString("en-US")}</div>
        <div style={{ fontSize: 16, opacity: 0.6 }}>lines · {source.fileCount} files · TS / GLSL / Python</div>
      </div>
    </AbsoluteFill>
  );
};

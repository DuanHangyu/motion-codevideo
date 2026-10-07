import { AbsoluteFill, Img } from "remotion";
import { Backdrop } from "../components/Frame";
import { Show } from "../components/Show";
import { Arrow, Body, Heading, Mono, Panel, Svg } from "../components/ui";
import { ease, hash, lerp, prog, rise } from "../lib/anim";
import { asset, gray28 } from "../lib/data";
import { cue, scene } from "../lib/timeline";
import { AMBER, BG, CORAL, CYAN, DIM, FAINT, FONT_CN, FONT_DISPLAY, FONT_MONO, FONT_TITLE, IVORY, LIME } from "../lib/theme";

const S = scene("hand");
const T_H1 = cue("h1");
const T_HUMAN = cue("h1", "由人来");
const T_H2 = cue("h2");
const T_EDGE = cue("h2", "轮廓");
const T_GRID = cue("h2", "切成");
const T_DIR = cue("h2", "统计");
const T_H3 = cue("h3");
const T_SIFT = cue("h3", "SIFT");
const T_WISDOM = cue("h3", "凝结");
const T_H4 = cue("h4");
const T_SVM = cue("h4", "支持向量机");
const T_H5 = cue("h5");
const T_SLOW = cue("h5", "越来越慢");
const T_H6 = cue("h6");
const T_PERSON = cue("h6", "在于");
const T_LIMIT = cue("h6", "人能想到");
const T_INF = cue("h6", "而真实世界");
const T_H7 = cue("h7");
const T_SELF = cue("h7", "而是让它");
const T_LEARN = cue("h7", "自己学会");

/* ── the pipeline that frames the whole chapter ───────────────────────── */
type Node = { id: string; zh: string; en: string; x: number };
const NODES: Node[] = [
  { id: "img", zh: "图像", en: "IMAGE", x: 300 },
  { id: "feat", zh: "特征提取", en: "FEATURES", x: 760 },
  { id: "clf", zh: "分类器", en: "CLASSIFIER", x: 1200 },
  { id: "out", zh: "“猫”", en: "LABEL", x: 1620 },
];

const Pipeline = ({ t }: { t: number }) => {
  // big and centred for h1 and h6–h7, a compact header strip in between
  const compact = ease.inOutCubic(prog(t, T_H2 - 0.6, T_H2 + 0.4)) * (1 - ease.inOutCubic(prog(t, T_H6 - 0.5, T_H6 + 0.5)));
  const y = lerp(lerp(540, 400, ease.inOutCubic(prog(t, T_H6 - 0.5, T_H6 + 0.5))), 150, compact);
  const scale = lerp(1, 0.62, compact);
  const learned = ease.inOutCubic(prog(t, T_SELF - 0.2, T_SELF + 1.0));
  const blame = rise(t, T_PERSON, 0.5) * (1 - learned);
  const focus = (id: string) => {
    if (t >= T_H2 && t < T_H4) return id === "feat";
    if (t >= T_H4 && t < T_H5) return id === "clf";
    return false;
  };
  return (
    <AbsoluteFill style={{ transform: `translateY(${y - 540}px) scale(${scale})`, transformOrigin: "50% 50%" }}>
      <Svg>
        {NODES.slice(0, -1).map((n, i) => (
          <Arrow key={n.id} x1={n.x + 150} y1={540} x2={NODES[i + 1].x - 150} y2={540} k={rise(t, T_H1 + 0.4 + i * 0.35, 0.5)} color={DIM} width={3} />
        ))}
      </Svg>
      {NODES.map((n, i) => {
        const k = rise(t, T_H1 + i * 0.35, 0.6);
        const isFeat = n.id === "feat";
        const on = focus(n.id);
        const border = isFeat ? (learned > 0.5 ? CYAN : blame > 0 ? CORAL : AMBER) : on ? AMBER : FAINT;
        return (
          <div
            key={n.id}
            style={{
              position: "absolute",
              left: n.x - 140,
              top: 540 - 95,
              width: 280,
              height: 190,
              borderRadius: 20,
              background: isFeat ? `rgba(${learned > 0.5 ? "60,224,255" : blame > 0 ? "255,84,112" : "255,181,71"},0.08)` : "rgba(14,20,36,0.85)",
              border: `2px solid ${border}`,
              boxShadow: isFeat || on ? `0 0 ${40 + blame * 30 + learned * 40}px ${border}55` : "none",
              opacity: k * (focus("feat") || focus("clf") ? (on ? 1 : 0.45) : 1),
              transform: `translateY(${(1 - k) * 30}px) scale(${1 + (isFeat ? blame * 0.06 + learned * 0.08 : 0)})`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
            }}
          >
            {n.id === "img" ? (
              <Img src={asset("cat.jpg")} style={{ width: 120, height: 120, borderRadius: 10, objectFit: "cover" }} />
            ) : (
              <div style={{ fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 44, color: IVORY, letterSpacing: 4 }}>{isFeat && learned > 0.5 ? "自动学习" : n.zh}</div>
            )}
            <div style={{ fontFamily: FONT_MONO, fontSize: 15, color: isFeat ? border : DIM, letterSpacing: 4, marginTop: 12 }}>
              {isFeat ? (learned > 0.5 ? "LEARNED FROM DATA" : "✎ 人工设计 · HAND-MADE") : n.en}
            </div>
          </div>
        );
      })}
      {/* the human who writes the rules */}
      <div style={{ position: "absolute", left: 760 - 220, top: 540 + 115, width: 440, textAlign: "center", whiteSpace: "nowrap", opacity: rise(t, T_HUMAN, 0.6) * (1 - compact) * (1 - learned) }}>
        <Body size={26} color={blame > 0 ? CORAL : AMBER}>
          ▲ 专家思考：该看什么？
        </Body>
      </div>
    </AbsoluteFill>
  );
};

/* ── HOG: edges, a grid of cells, one orientation histogram per cell ─────── */
const BINS = 9;
/** Real gradient-orientation histogram of a 6×6 patch of the 28×28 thumbnail (the cat's left ear edge). */
const HIST = (() => {
  const h = new Array(BINS).fill(0);
  for (let y = 4; y < 10; y++) {
    for (let x = 4; x < 10; x++) {
      const gx = gray28(x + 1, y) - gray28(x - 1, y);
      const gy = gray28(x, y + 1) - gray28(x, y - 1);
      const mag = Math.hypot(gx, gy);
      const ang = ((Math.atan2(gy, gx) * 180) / Math.PI + 180) % 180;
      h[Math.min(BINS - 1, Math.floor(ang / (180 / BINS)))] += mag;
    }
  }
  const m = Math.max(...h);
  return h.map((v) => v / m);
})();

const Hog = ({ t }: { t: number }) => {
  const edges = rise(t, T_EDGE + 0.4, 0.8);
  const grid = rise(t, T_GRID, 0.8);
  const hog = rise(t, T_DIR + 0.3, 1.0);
  const cell = rise(t, T_DIR + 0.6, 0.8);
  const size = 520;
  const X = 260;
  const Y = 330;
  const cells = 16;
  const cs = size / cells;
  // highlighted cell sits on the left ear
  const hx = 4;
  const hy = 3;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: X, top: Y, width: size, height: size, borderRadius: 12, overflow: "hidden", boxShadow: `0 0 0 1px ${FAINT}` }}>
        <Img src={asset("cat.jpg")} style={{ position: "absolute", width: "100%", height: "100%" }} />
        <Img src={asset("edges.png")} style={{ position: "absolute", width: "100%", height: "100%", opacity: edges * (1 - hog) }} />
        <Img src={asset("hog.png")} style={{ position: "absolute", width: "100%", height: "100%", opacity: hog, filter: "sepia(1) saturate(3) hue-rotate(-12deg) brightness(1.4)" }} />
        <svg width={size} height={size} style={{ position: "absolute", inset: 0 }}>
          {Array.from({ length: cells - 1 }, (_, i) => {
            const k = prog(grid, i / cells, i / cells + 0.3);
            return (
              <g key={i} opacity={0.5 * k}>
                <line x1={(i + 1) * cs} y1={0} x2={(i + 1) * cs} y2={size * k} stroke={AMBER} strokeWidth={1} />
                <line x1={0} y1={(i + 1) * cs} x2={size * k} y2={(i + 1) * cs} stroke={AMBER} strokeWidth={1} />
              </g>
            );
          })}
          <rect x={hx * cs} y={hy * cs} width={cs * 2} height={cs * 2} fill="none" stroke={CYAN} strokeWidth={3} opacity={cell} />
        </svg>
      </div>
      <Mono at={{ x: X, y: Y + size + 24 }} size={16} color={hog > 0.5 ? AMBER : edges > 0.5 ? IVORY : DIM}>
        {hog > 0.5 ? "HOG：每一格里边缘方向的统计" : grid > 0.5 ? "切成许多小格" : edges > 0.5 ? "边缘：亮度突变的地方" : "原图"}
      </Mono>
      {/* zoomed cell with its orientation histogram */}
      <Svg style={{ opacity: cell }}>
        <line x1={X + (hx + 2) * cs} y1={Y + hy * cs} x2={1010} y2={340} stroke={CYAN} strokeWidth={1.5} opacity={0.6} />
        <line x1={X + (hx + 2) * cs} y1={Y + (hy + 2) * cs} x2={1010} y2={820} stroke={CYAN} strokeWidth={1.5} opacity={0.6} />
      </Svg>
      <Panel at={{ x: 1010, y: 330 }} style={{ width: 700, height: 500, opacity: cell, transform: `scale(${0.94 + 0.06 * cell})` }} glow={CYAN}>
        <Mono at={{ x: 34, y: 28 }} size={15} color={CYAN}>
          一个小格 · 9 个方向的“投票”
        </Mono>
        <svg width={700} height={500} style={{ position: "absolute", inset: 0 }}>
          {HIST.map((v, b) => {
            const ang = ((b + 0.5) * Math.PI) / BINS;
            const k = ease.outCubic(prog(t, T_DIR + 0.9 + b * 0.12, T_DIR + 1.5 + b * 0.12));
            const len = 30 + v * 180 * k;
            const cx = 350;
            const cy = 270;
            return (
              <g key={b}>
                {[1, -1].map((s) => (
                  <line key={s} x1={cx} y1={cy} x2={cx + s * Math.cos(ang) * len} y2={cy - s * Math.sin(ang) * len} stroke={v > 0.6 ? AMBER : IVORY} strokeOpacity={0.35 + 0.65 * v} strokeWidth={6 + 8 * v} strokeLinecap="round" />
                ))}
                <rect x={60 + b * 64} y={470 - 4 - v * 50 * k} width={44} height={v * 50 * k} fill={v > 0.6 ? AMBER : DIM} opacity={0.9} />
              </g>
            );
          })}
          <circle cx={350} cy={270} r={7} fill={IVORY} />
        </svg>
      </Panel>
    </AbsoluteFill>
  );
};

/* ── the famous hand-crafted descriptors ───────────────────────────────── */
const Descriptors = ({ t }: { t: number }) => {
  const cards = [
    { name: "HOG", who: "Dalal & Triggs", year: "2005", desc: "方向梯度直方图：数一数每一格里边缘的朝向", img: "hog.png", at: T_H3 },
    { name: "SIFT", who: "David Lowe", year: "1999", desc: "尺度不变特征：找出旋转、缩放后依然稳定的关键点", img: "cat.jpg", at: T_SIFT },
  ];
  const wisdom = rise(t, T_WISDOM, 0.8);
  return (
    <AbsoluteFill>
      {cards.map((c, i) => {
        const k = rise(t, c.at - 0.1, 0.7);
        return (
          <Panel key={c.name} at={{ x: 330 + i * 660, y: 330 }} style={{ width: 600, height: 470, opacity: k, transform: `translateY(${(1 - k) * 40}px)`, overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 30, top: 30, width: 200, height: 200, borderRadius: 12, overflow: "hidden" }}>
              <Img src={asset(c.img)} style={{ width: "100%", height: "100%", filter: c.name === "HOG" ? "sepia(1) saturate(3) hue-rotate(-12deg) brightness(1.4)" : "saturate(0.5) brightness(0.7)" }} />
              {c.name === "SIFT" && (
                <svg width={200} height={200} style={{ position: "absolute", inset: 0 }}>
                  {Array.from({ length: 14 }, (_, j) => {
                    const x = 20 + hash(j * 3 + 1) * 160;
                    const y = 20 + hash(j * 7 + 2) * 160;
                    const r = 6 + hash(j * 5) * 22;
                    const a = hash(j * 11) * Math.PI * 2;
                    const kk = rise(t, c.at + 0.3 + j * 0.06, 0.4);
                    return (
                      <g key={j} opacity={kk}>
                        <circle cx={x} cy={y} r={r} fill="none" stroke={AMBER} strokeWidth={1.6} />
                        <line x1={x} y1={y} x2={x + Math.cos(a) * r} y2={y + Math.sin(a) * r} stroke={AMBER} strokeWidth={1.6} />
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
            <div style={{ position: "absolute", left: 260, top: 40 }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 64, fontWeight: 800, color: AMBER }}>{c.name}</div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 18, color: DIM, marginTop: 8 }}>
                {c.who} · {c.year}
              </div>
            </div>
            <Body size={28} at={{ x: 30, y: 270 }} style={{ width: 540 }}>
              {c.desc}
            </Body>
          </Panel>
        );
      })}
      <Heading size={40} at={{ x: 960, y: 880 }} center color={DIM} style={{ opacity: wisdom }}>
        每一种特征，都是专家多年经验的结晶
      </Heading>
    </AbsoluteFill>
  );
};

/* ── the classifier: a line that separates two kinds of feature vectors ─── */
// boundary runs from (60,30) to (W-60,530) inside a 760×560 panel; points keep clear of the margin
const PW = 760;
const NX = 500 / Math.hypot(PW - 120, 500);
const NY = -(PW - 120) / Math.hypot(PW - 120, 500);
const PTS = (() => {
  const out: Array<{ cx: number; cy: number; cls: number }> = [];
  for (let i = 0; out.length < 46 && i < 600; i++) {
    const cx = 50 + hash(i * 3.1 + 0.3) * (PW - 100);
    const cy = 50 + hash(i * 7.7 + 0.9) * 460;
    const d = (cx - 60) * NX + (cy - 30) * NY; // signed distance to the boundary
    if (Math.abs(d) < 62 || Math.abs(d) > 300) continue;
    out.push({ cx, cy, cls: d > 0 ? 1 : 0 });
  }
  return out;
})();

const Classifier = ({ t }: { t: number }) => {
  const W = PW;
  const X = 580;
  const Y = 300;
  const line = rise(t, T_SVM - 0.2, 1.0);
  const margin = rise(t, T_SVM + 0.8, 0.8);
  return (
    <AbsoluteFill>
      <Panel at={{ x: X, y: Y }} style={{ width: W, height: 560 }} glow={CYAN}>
        <svg width={W} height={560} style={{ position: "absolute", inset: 0 }}>
          {PTS.map((p, i) => {
            const k = rise(t, T_H4 + 0.2 + i * 0.03, 0.4);
            const { cx, cy } = p;
            return p.cls ? (
              <circle key={i} cx={cx} cy={cy} r={11 * k} fill={CYAN} opacity={0.85} />
            ) : (
              <rect key={i} x={cx - 10 * k} y={cy - 10 * k} width={20 * k} height={20 * k} fill={CORAL} opacity={0.85} transform={`rotate(45 ${cx} ${cy})`} />
            );
          })}
          {/* decision boundary + margins */}
          {[-1, 0, 1].map((m) => {
            const ox = m * 46 * margin * NX;
            const oy = m * 46 * margin * NY;
            const k = m === 0 ? line : margin;
            return <line key={m} x1={60 + ox} y1={30 + oy} x2={60 + ox + (W - 120) * k} y2={30 + oy + 500 * k} stroke={m === 0 ? AMBER : IVORY} strokeWidth={m === 0 ? 4 : 1.5} strokeDasharray={m === 0 ? undefined : "8 8"} opacity={m === 0 ? 1 : 0.5} />;
          })}
        </svg>
        <Mono at={{ x: 30, y: -40 }} size={16} color={DIM}>
          特征空间 · 每个点是一张图的特征
        </Mono>
      </Panel>
      <div style={{ position: "absolute", left: X + W + 60, top: Y + 160, opacity: line }}>
        <div style={{ fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 48, color: AMBER }}>支持向量机</div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 18, color: DIM, marginTop: 10 }}>SVM · SUPPORT VECTOR MACHINE</div>
        <Body size={26} color={DIM} style={{ marginTop: 26 }}>
          <span style={{ color: CYAN }}>●</span> 猫 &nbsp; <span style={{ color: CORAL }}>◆</span> 狗
          <br />
          找一条间隔最宽的分界线
        </Body>
      </div>
    </AbsoluteFill>
  );
};

/* ── progress keeps slowing down ───────────────────────────────────────── */
const Progress = ({ t }: { t: number }) => {
  const draw = rise(t, T_H5 + 0.2, 2.6, ease.inOutCubic);
  const slow = rise(t, T_SLOW, 0.7);
  const X = 360;
  const Y = 300;
  const W = 1200;
  const Hh = 500;
  const curve = (u: number) => 1 - Math.exp(-u * 3.2);
  const n = 80;
  const pts = Array.from({ length: n + 1 }, (_, i) => {
    const u = (i / n) * draw;
    return `${X + u * W},${Y + Hh - curve(u) * Hh * 0.8}`;
  }).join(" ");
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <line x1={X} y1={Y + Hh} x2={X + W} y2={Y + Hh} stroke={FAINT} strokeWidth={2} />
        <line x1={X} y1={Y} x2={X} y2={Y + Hh} stroke={FAINT} strokeWidth={2} />
        <polyline points={pts} fill="none" stroke={AMBER} strokeWidth={5} strokeLinecap="round" />
        {slow > 0 && (
          <g opacity={slow}>
            <path d={`M ${X + W * 0.62} ${Y + 40} Q ${X + W * 0.82} ${Y - 10} ${X + W * 0.98} ${Y + 50}`} fill="none" stroke={CORAL} strokeWidth={3} strokeDasharray="10 8" />
          </g>
        )}
      </svg>
      <Mono at={{ x: X, y: Y + Hh + 24 }} size={16}>
        2000
      </Mono>
      <Mono at={{ x: X + W - 60, y: Y + Hh + 24 }} size={16}>
        2011
      </Mono>
      <Mono at={{ x: X + 20, y: Y - 10 }} size={16}>
        识别能力（示意）
      </Mono>
      <Body size={34} at={{ x: X + W * 0.62, y: Y - 80 }} color={CORAL} style={{ opacity: slow }}>
        越来越难往上走
      </Body>
    </AbsoluteFill>
  );
};

/* ── limited rules vs. an unlimited world ──────────────────────────────── */
const RULES = ["边缘的方向", "颜色的分布", "角点的位置", "纹理的统计", "……"];

const Limits = ({ t }: { t: number }) => {
  const left = rise(t, T_LIMIT, 0.6);
  const right = rise(t, T_INF, 0.6);
  return (
    <AbsoluteFill style={{ opacity: 1 - rise(t, T_H7 - 0.4, 0.5) }}>
      <Panel at={{ x: 230, y: 720 }} style={{ width: 620, height: 220, padding: "24px 36px", opacity: left }} glow={AMBER}>
        <Mono color={AMBER} size={15}>人能想到的规则 · 有限</Mono>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 22 }}>
          {RULES.map((r, i) => (
            <span key={r} style={{ fontFamily: FONT_CN, fontSize: 26, color: IVORY, padding: "6px 16px", borderRadius: 8, border: `1px solid ${AMBER}66`, opacity: rise(t, T_LIMIT + 0.3 + i * 0.15, 0.4) }}>
              {r}
            </span>
          ))}
        </div>
      </Panel>
      <div style={{ position: "absolute", left: 1000, top: 720, width: 700, height: 310, opacity: right, overflow: "hidden", borderRadius: 18 }}>
        {Array.from({ length: 60 }, (_, i) => {
          const k = rise(t, T_INF + i * 0.035, 0.4);
          const s = 64;
          return (
            <div key={i} style={{ position: "absolute", left: (i % 10) * 70, top: Math.floor(i / 10) * 52, width: s, height: 46, borderRadius: 4, overflow: "hidden", opacity: k * (0.4 + 0.6 * hash(i)) }}>
              <Img
                src={asset("cat.jpg")}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: `rotate(${(hash(i * 3) - 0.5) * 80}deg) scale(${1 + hash(i * 5) * 1.6}) scaleX(${hash(i * 9) > 0.5 ? -1 : 1})`,
                  filter: `brightness(${0.3 + hash(i * 7) * 1.1}) hue-rotate(${(hash(i * 13) - 0.5) * 60}deg)`,
                }}
              />
            </div>
          );
        })}
        <AbsoluteFill style={{ background: `linear-gradient(90deg, transparent 50%, ${BG})` }} />
      </div>
      <Mono at={{ x: 1000, y: 690 }} color={CORAL} size={15} style={{ opacity: right }}>
        真实世界的变化 · 无穷 ∞
      </Mono>
    </AbsoluteFill>
  );
};

/* ── the bold idea ─────────────────────────────────────────────────────── */
const Idea = ({ t }: { t: number }) => {
  const k = rise(t, T_LEARN, 0.9);
  return (
    <AbsoluteFill>
      {/* data streaming into the feature block */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: 70 }, (_, i) => {
          const u = ((t - T_SELF) * (0.35 + hash(i) * 0.4) + hash(i * 3)) % 1;
          const y0 = 140 + hash(i * 7) * 800;
          const x = lerp(-40, 760, u);
          const y = lerp(y0, 540, u ** 2);
          return <circle key={i} cx={x} cy={y} r={2 + hash(i * 9) * 4} fill={CYAN} opacity={rise(t, T_SELF, 0.6) * (1 - u) * 0.9} />;
        })}
      </svg>
      <div style={{ position: "absolute", top: 760, width: "100%", textAlign: "center", opacity: k, transform: `translateY(${(1 - k) * 20}px)` }}>
        <span style={{ fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 60, color: IVORY, letterSpacing: 6 }}>
          不告诉机器看什么，让它<span style={{ color: CYAN }}>自己学会</span>
        </span>
        <div style={{ fontFamily: FONT_MONO, fontSize: 18, color: LIME, letterSpacing: 6, marginTop: 20 }}>LET THE DATA DECIDE</div>
      </div>
    </AbsoluteFill>
  );
};

export const Hand = ({ t }: { t: number }) => (
  <AbsoluteFill style={{ background: BG }}>
    <Backdrop grid={0.035} tint={AMBER} />
    <Pipeline t={t} />
    <Show t={t} from={T_H2 + 0.2} to={T_H3}>
      <Hog t={t} />
    </Show>
    <Show t={t} from={T_H3 - 0.1} to={T_H4}>
      <Descriptors t={t} />
    </Show>
    <Show t={t} from={T_H4 - 0.1} to={T_H5}>
      <Classifier t={t} />
    </Show>
    <Show t={t} from={T_H5 - 0.1} to={T_H6 - 0.2}>
      <Progress t={t} />
    </Show>
    <Show t={t} from={T_H6} to={S.end}>
      <Limits t={t} />
      <Idea t={t} />
    </Show>
  </AbsoluteFill>
);

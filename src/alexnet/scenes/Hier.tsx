import { useEffect, useState } from "react";
import { AbsoluteFill, Img } from "remotion";
import { ExploreTask, WorldButton } from "../components/ExploreUI";
import { useExplore } from "../lib/explore";
import { sfx } from "../lib/sfx";
import { Backdrop } from "../components/Frame";
import { Show } from "../components/Show";
import { Body, Heading, Mono, Panel } from "../components/ui";
import { ease, flash, hash, lerp, prog, rise, wobble } from "../lib/anim";
import { asset } from "../lib/data";
import { cue, scene } from "../lib/timeline";
import { AMBER, BG, CORAL, CYAN, DIM, FAINT, FONT_CN, FONT_DISPLAY, FONT_MONO, FONT_TITLE, IVORY, LIME, VIOLET } from "../lib/theme";

const S = scene("hier");
const T_F1 = cue("f1");
const T_POOL = cue("f1", "池化");
const T_MAX = cue("f1", "只保留");
const T_F2 = cue("f2");
const T_SHIFT = cue("f2", "微小的位移");
const T_OVERLAP = cue("f2", "AlexNet");
const T_F3 = cue("f3");
const T_AGAIN = cue("f3", "然后再来");
const T_MAGIC = cue("f3", "神奇");
const T_F4 = cue("f4");
const T_REAL = cue("f4", "真实的卷积核");
const T_NOBODY = cue("f4", "没有任何人");
const T_SELF = cue("f4", "它却自己");
const T_F5 = cue("f5");
const T_SIMILAR = cue("f5", "惊人地相似");
const T_F6 = cue("f6");
const T_EDGE = cue("f6", "从边缘");
const T_TEX = cue("f6", "到纹理");
const T_PART = cue("f6", "到眼睛");
const T_OBJ = cue("f6", "整个物体");
const T_F7 = cue("f7");
const T_ABSTRACT = cue("f7", "更抽象");

/* ── f1–f2: max pooling ────────────────────────────────────────────────── */
const POOL_IN = [
  [1, 3, 2, 0],
  [8, 2, 1, 4],
  [0, 5, 9, 3],
  [2, 1, 6, 7],
];
const CELL = 110;

const POOLING = "pooling";
type Grid = number[][];
type PoolPlay = { grid: Grid; mode: "max" | "avg"; flash: number };
const pool = (g: Grid, mode: "max" | "avg") =>
  [0, 1, 2, 3].map((k) => {
    const bx = (k % 2) * 2;
    const by = Math.floor(k / 2) * 2;
    const v = [g[by][bx], g[by][bx + 1], g[by + 1][bx], g[by + 1][bx + 1]];
    return mode === "max" ? Math.max(...v) : v.reduce((a, b) => a + b, 0) / 4;
  });
const ORIGINAL_OUT = pool(POOL_IN, "max");
const fmtOut = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2));

const Pooling = ({ t }: { t: number }) => {
  const ex = useExplore(POOLING);
  const [play, setPlay] = useState<PoolPlay | null>(null);
  useEffect(() => {
    if (ex.active && !play) setPlay({ grid: POOL_IN.map((r) => [...r]), mode: "max", flash: 0 });
    if (!ex.active && play) setPlay(null);
  }, [ex.active, play]);
  const live = !!play && ex.interactive;
  const b = ex.blend;
  const X = 330;
  const Y = 300;
  const step = Math.floor(prog(t, T_MAX - 0.2, T_MAX + 3.0) * 3.999);
  const started = t >= T_MAX - 0.2;
  const wx = (step % 2) * 2;
  const wy = Math.floor(step / 2) * 2;
  const done = (k: number) => (started && k <= step) || !!play;
  const OX = 1100;
  const OY = Y + CELL;
  const grid = play && b > 0.5 ? play.grid : POOL_IN;
  const mode = play?.mode ?? "max";
  const out = pool(grid, mode);
  const changedCells = play ? play.grid.flat().filter((v, i) => v !== POOL_IN.flat()[i]).length : 0;
  const sameOut = mode === "max" && out.every((v, i) => v === ORIGINAL_OUT[i]);
  const edit = (i: number, d: number) => {
    if (!play) return;
    const g = play.grid.map((r) => [...r]);
    const y = Math.floor(i / 4);
    const x = i % 4;
    g[y][x] = (g[y][x] + d + 10) % 10;
    sfx.blip(400 + g[y][x] * 90, 0.08);
    setPlay({ ...play, grid: g, flash: ex.clock });
  };
  const shift = () => {
    if (!play) return;
    sfx.whoosh(true);
    setPlay({ ...play, grid: play.grid.map((r) => [0, ...r.slice(0, 3)]), flash: ex.clock });
  };
  const outFlash = play ? Math.exp(-(ex.clock - play.flash) / 0.4) : 0;
  return (
    <AbsoluteFill>
      <Heading size={46} at={{ x: X, y: 160 }} color={AMBER} style={{ opacity: rise(t, T_POOL, 0.5) * (1 - b) }}>
        最大池化 <span style={{ fontFamily: FONT_MONO, fontSize: 22, color: DIM, letterSpacing: 4 }}>MAX POOLING</span>
      </Heading>
      {grid.flat().map((v, i) => {
        const x = i % 4;
        const y = Math.floor(i / 4);
        const block = Math.floor(y / 2) * 2 + Math.floor(x / 2);
        const inWin = play ? true : started && x >= wx && x < wx + 2 && y >= wy && y < wy + 2;
        const blockMax = Math.max(...[0, 1].flatMap((dy) => [0, 1].map((dx) => grid[Math.floor(y / 2) * 2 + dy][Math.floor(x / 2) * 2 + dx])));
        const isMax = mode === "max" && v === blockMax;
        const edited = play && v !== POOL_IN[y][x];
        return (
          <div
            key={i}
            onClick={live ? () => edit(i, 1) : undefined}
            onContextMenu={
              live
                ? (e) => {
                    e.preventDefault();
                    edit(i, -1);
                  }
                : undefined
            }
            style={{
              position: "absolute",
              left: X + x * CELL,
              top: Y + y * CELL,
              width: CELL - 8,
              height: CELL - 8,
              borderRadius: 10,
              background: `rgba(60,224,255,${0.06 + v * 0.05})`,
              border: `2px solid ${edited ? VIOLET : inWin ? (play ? ["#FFB547", "#3CE0FF", "#A8FF60", "#9B7BFF"][block] + "88" : AMBER) : "rgba(255,255,255,0.08)"}`,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontFamily: FONT_DISPLAY,
              fontSize: 44,
              color: inWin && isMax ? AMBER : IVORY,
              opacity: Math.max(rise(t, T_F1 + 0.3 + i * 0.04, 0.4), b),
              boxShadow: inWin && isMax ? `0 0 30px ${AMBER}88` : "none",
              cursor: live ? "pointer" : undefined,
              userSelect: "none",
            }}
          >
            {v}
          </div>
        );
      })}
      {!play && <div style={{ position: "absolute", left: X + wx * CELL - 8, top: Y + wy * CELL - 8, width: CELL * 2 + 8, height: CELL * 2 + 8, border: `3px solid ${AMBER}`, borderRadius: 14, opacity: started ? 1 : 0 }} />}
      <div style={{ position: "absolute", left: 870, top: Y + 180, fontFamily: FONT_DISPLAY, fontSize: 60, color: DIM, opacity: rise(t, T_MAX, 0.5) }}>→</div>
      {[0, 1, 2, 3].map((k) => {
        const on = done(k);
        const same = play ? out[k] === ORIGINAL_OUT[k] : true;
        const col = play && b > 0.5 ? (same ? LIME : CORAL) : AMBER;
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: OX + (k % 2) * CELL,
              top: OY + Math.floor(k / 2) * CELL,
              width: CELL - 8,
              height: CELL - 8,
              borderRadius: 10,
              border: `2px solid ${on ? col : FAINT}`,
              background: on ? `${col}1f` : "transparent",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontFamily: FONT_DISPLAY,
              fontSize: mode === "avg" ? 32 : 44,
              color: col,
              opacity: rise(t, T_MAX, 0.4),
              transform: `scale(${1 + outFlash * 0.12})`,
              boxShadow: `0 0 ${outFlash * 40}px ${col}`,
            }}
          >
            {on ? fmtOut(out[k]) : ""}
          </div>
        );
      })}
      <Mono at={{ x: OX, y: OY + 2 * CELL + 20 }} size={16} color={AMBER} style={{ opacity: rise(t, T_MAX, 0.4) }}>
        {play && b > 0.5 ? (mode === "max" ? "最大池化 · 绿色 = 和原来一样" : "平均池化 · 每块取平均") : "4×4 → 2×2 · 每块只留最大值"}
      </Mono>
      {play ? (
        <Panel at={{ x: 1380, y: 300 }} style={{ width: 480, padding: "24px 28px", opacity: b, pointerEvents: live ? "auto" : "none" }} glow={LIME}>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <WorldButton on={mode === "max"} onClick={() => setPlay({ ...play, mode: "max", flash: ex.clock })}>
              最大池化
            </WorldButton>
            <WorldButton on={mode === "avg"} onClick={() => setPlay({ ...play, mode: "avg", flash: ex.clock })}>
              平均池化
            </WorldButton>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <WorldButton on color={CYAN} onClick={shift}>
              → 把特征右移一格
            </WorldButton>
            <WorldButton onClick={() => setPlay({ ...play, grid: POOL_IN.map((r) => [...r]), flash: ex.clock })}>还原</WorldButton>
          </div>
          <Body size={22} color={DIM} style={{ marginTop: 16 }}>
            已改动 <b style={{ color: VIOLET }}>{changedCells}</b> 个数字 · 输出 {sameOut ? <b style={{ color: LIME }}>完全没变</b> : <b style={{ color: CORAL }}>变了</b>}
          </Body>
          <Body size={20} color={DIM} style={{ marginTop: 6 }}>
            点击数字 +1，右键 −1
          </Body>
        </Panel>
      ) : (
        <>
      <Panel at={{ x: 1380, y: 300 }} style={{ width: 480, padding: "24px 30px", opacity: rise(t, T_F2, 0.6) }}>
          <Body size={24}>
            <span style={{ color: LIME }}>✓</span> 特征图变小，计算量下降
          </Body>
          <Body size={24} style={{ marginTop: 12, opacity: rise(t, T_SHIFT, 0.5) }}>
            <span style={{ color: LIME }}>✓</span> 特征挪动一点，最大值还在
          </Body>
        </Panel>
        {/* overlapping pooling, AlexNet's variant */}
        <Panel at={{ x: 1380, y: 520 }} style={{ width: 480, padding: "24px 30px", opacity: rise(t, T_OVERLAP, 0.6) }} glow={CYAN}>
          <Mono size={15} color={CYAN}>
            ALEXNET · 重叠池化
          </Mono>
          <svg width={360} height={170} style={{ marginTop: 14 }}>
            {Array.from({ length: 7 }, (_, i) => (
              <rect key={i} x={10 + i * 36} y={40} width={32} height={32} fill="rgba(255,255,255,0.06)" />
            ))}
            <rect x={8} y={20} width={110} height={72} fill="none" stroke={AMBER} strokeWidth={3} rx={6} />
            <rect x={80} y={30} width={110} height={72} fill="none" stroke={CYAN} strokeWidth={3} rx={6} />
            <rect x={82} y={40} width={34} height={32} fill={LIME} opacity={0.35} />
            <text x={10} y={140} fill={DIM} fontFamily={FONT_CN} fontSize={20}>
              窗口 3×3 · 步长 2 → 相邻窗口重叠
            </text>
          </svg>
          <Body size={22} color={DIM}>
            论文发现：能稍稍减轻过拟合
          </Body>
        </Panel>
          </>
      )}
      <ExploreTask
        zone={POOLING}
        task="点数字改输入，看哪些改动会影响池化结果"
        sub={["把特征右移一格试试", "换成平均池化比一比"]}
        goal="改动至少 3 个数字，但让最大池化的输出保持不变"
        done={changedCells >= 3 && sameOut}
      />
    </AbsoluteFill>
  );
};

/* ── f3: conv → ReLU → pool, again and again ───────────────────────────── */
const Stack = ({ t }: { t: number }) => {
  const blocks = Array.from({ length: 5 }, (_, i) => i);
  const magic = rise(t, T_MAGIC, 0.8);
  return (
    <AbsoluteFill style={{ perspective: 1600 }}>
      <div style={{ position: "absolute", left: 960, top: 520, transformStyle: "preserve-3d", transform: `scale(1.55) rotateX(58deg) rotateZ(${-32 + (t - T_F3) * 3}deg)` }}>
        {blocks.map((b) => {
          const k = rise(t, T_F3 + 0.2 + b * (b < 1 ? 0 : 0.55) + (b >= 1 ? T_AGAIN - T_F3 - 0.8 : 0), 0.6);
          return (
            <div key={b} style={{ position: "absolute", left: -330 + b * 140, top: -150, transformStyle: "preserve-3d", opacity: k, transform: `translateZ(${(1 - k) * 200}px)` }}>
              {["卷积", "ReLU", "池化"].map((n, j) => (
                <div key={n} style={{ position: "absolute", left: 0, top: j * 110, width: 110, height: 96, borderRadius: 10, border: `2px solid ${[AMBER, LIME, CYAN][j]}`, background: `${[AMBER, LIME, CYAN][j]}22`, display: "flex", justifyContent: "center", alignItems: "center", fontFamily: FONT_CN, fontSize: 24, color: IVORY, transform: `translateZ(${j * 2}px)` }}>
                  {n}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <Heading size={58} at={{ x: 960, y: 880 }} center color={AMBER} style={{ opacity: magic, transform: `translate(-50%, -50%) scale(${0.9 + 0.1 * magic})` }}>
        神奇的事情发生了……
      </Heading>
    </AbsoluteFill>
  );
};

/* ── f4–f5: the real conv1 kernels fly in ──────────────────────────────── */
const TILE = 66;
const PAD = 6;
const ATLAS = 8 * (TILE + PAD) + PAD;
const SHOW = 86;

const Filters = ({ t, compact = 0 }: { t: number; compact?: number }) => {
  const push = prog(t, T_F4, T_F6);
  return (
    <div style={{ position: "absolute", inset: 0, perspective: 1500 }}>
      <div style={{ position: "absolute", left: lerp(960, 700, compact), top: 540, transformStyle: "preserve-3d", transform: `rotateY(${lerp(-16, 8, push) * (1 - compact)}deg) rotateX(${6 + wobble(t * 0.3, 2) * 2}deg) scale(${lerp(1, 0.78, compact)})` }}>
        {Array.from({ length: 64 }, (_, k) => {
          const r = Math.floor(k / 8);
          const c = k % 8;
          const at = T_REAL - 0.6 + hash(k * 1.7) * 1.4;
          const f = ease.outCubic(prog(t, at, at + 1.1));
          const z = (1 - f) * (900 + hash(k) * 1600);
          const x = (c - 3.5) * (SHOW + 10);
          const y = (r - 3.5) * (SHOW + 10);
          const pulse = flash(t, T_SELF + hash(k * 3) * 2, 0.4);
          return (
            <div
              key={k}
              style={{
                position: "absolute",
                left: x - SHOW / 2,
                top: y - SHOW / 2,
                width: SHOW,
                height: SHOW,
                borderRadius: 6,
                backgroundImage: `url(${asset("filters.png")})`,
                backgroundSize: `${(ATLAS / TILE) * SHOW}px ${(ATLAS / TILE) * SHOW}px`,
                backgroundPosition: `-${((PAD + c * (TILE + PAD)) / TILE) * SHOW}px -${((PAD + r * (TILE + PAD)) / TILE) * SHOW}px`,
                imageRendering: "pixelated",
                opacity: f,
                transform: `translateZ(${-z}px) rotateY(${(1 - f) * (hash(k * 5) - 0.5) * 120}deg)`,
                boxShadow: `0 0 ${10 + pulse * 30}px rgba(255,255,255,${0.1 + pulse * 0.4})`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

const FilterCaption = ({ t }: { t: number }) => (
  <AbsoluteFill>
    <Panel at={{ x: 120, y: 200 }} style={{ padding: "22px 28px", width: 300, opacity: rise(t, T_REAL, 0.6) * (1 - rise(t, T_F5 - 0.6, 0.5)) }} glow={AMBER}>
      <Mono size={14} color={AMBER}>
        REAL WEIGHTS · 真实权重
      </Mono>
      <div style={{ fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 36, color: IVORY, marginTop: 10 }}>第一层的卷积核</div>
      <Body size={20} color={DIM} style={{ marginTop: 10 }}>
        训练好的 AlexNet（torchvision 版）·64 个 · 每个 11×11×3
      </Body>
    </Panel>
    <Body size={30} at={{ x: 960, y: 905 }} center color={IVORY} style={{ opacity: rise(t, T_NOBODY, 0.6) * (1 - rise(t, T_F5 - 0.3, 0.4)), whiteSpace: "nowrap" }}>
      没有人告诉它 · 它自己学会了 <span style={{ color: AMBER }}>边缘</span>、<span style={{ color: AMBER }}>条纹</span>、<span style={{ color: AMBER }}>颜色</span>
    </Body>
  </AbsoluteFill>
);

/** Hubel & Wiesel style receptive fields: oriented excitatory bars with inhibitory flanks. */
const Receptive = ({ t }: { t: number }) => {
  const k = rise(t, T_F5, 0.7);
  const sim = rise(t, T_SIMILAR, 0.6);
  return (
    <div style={{ position: "absolute", left: 1180, top: 230, width: 620, opacity: k, transform: `translateX(${(1 - k) * 60}px)` }}>
      <Mono size={15} color={LIME}>
        猫视觉皮层神经元的感受野（示意）
      </Mono>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 180px)", gap: 20, marginTop: 24 }}>
        {[0, 30, 60, 90, 120, 150].map((deg, i) => (
          <svg key={deg} width={180} height={180} style={{ background: "#7F7F82", borderRadius: 10 }}>
            <g transform={`rotate(${deg} 90 90)`}>
              <rect x={56} y={0} width={22} height={180} fill="#2A2A2E" />
              <rect x={78} y={0} width={24} height={180} fill="#F2F2F2" />
              <rect x={102} y={0} width={22} height={180} fill="#2A2A2E" />
            </g>
            <rect x={0} y={0} width={180} height={180} fill="none" stroke={sim > 0.5 && i < 3 ? LIME : "transparent"} strokeWidth={4} rx={10} />
          </svg>
        ))}
      </div>
      <Heading size={44} color={LIME} style={{ marginTop: 34, opacity: sim }}>
        惊人地相似
      </Heading>
    </div>
  );
};

/* ── f6: deeper layers see more, and see more abstract things ──────────── */
const LEVELS = [
  { img: "fmap_conv1.png", layer: "第 1 层", what: "边缘", rf: 11, at: () => T_EDGE, color: AMBER },
  { img: "fmap_conv2.png", layer: "第 2 层", what: "纹理", rf: 51, at: () => T_TEX, color: LIME },
  { img: "fmap_conv3.png", layer: "第 3 层", what: "部件", rf: 99, at: () => T_PART, color: CYAN },
  { img: "fmap_conv5.png", layer: "第 5 层", what: "物体", rf: 163, at: () => T_OBJ, color: VIOLET },
];

const Hierarchy = ({ t }: { t: number }) => {
  const active = LEVELS.reduce((a, l, i) => (t >= l.at() - 0.2 ? i : a), -1);
  const rf = active >= 0 ? LEVELS[active].rf : 0;
  const rfK = active >= 0 ? rise(t, LEVELS[active].at() - 0.2, 0.6) : 0;
  const thumb = 380;
  const scale = thumb / 224;
  const prev = active > 0 ? LEVELS[active - 1].rf : 4;
  const side = lerp(prev, rf, rfK) * scale;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 110, top: 300 }}>
        <div style={{ position: "relative", width: thumb, height: thumb, borderRadius: 12, overflow: "hidden" }}>
          <Img src={asset("cat.jpg")} style={{ width: "100%", height: "100%" }} />
          <div style={{ position: "absolute", left: thumb * 0.36 - side / 2, top: thumb * 0.47 - side / 2, width: side, height: side, border: `3px solid ${active >= 0 ? LEVELS[active].color : AMBER}`, boxShadow: "0 0 0 2000px rgba(0,0,0,0.45)", opacity: active >= 0 ? 1 : 0 }} />
        </div>
        <Mono size={16} style={{ marginTop: 16 }} color={active >= 0 ? LEVELS[active].color : DIM}>
          一个神经元能“看到”的范围：{Math.round(lerp(prev, rf, rfK))}×{Math.round(lerp(prev, rf, rfK))} 像素
        </Mono>
      </div>
      {LEVELS.map((l, i) => {
        const k = rise(t, l.at() - 0.3, 0.7);
        const x = 600 + i * 320;
        const on = i === active;
        return (
          <div key={l.img} style={{ position: "absolute", left: x, top: 260 + (on ? -10 : 0), width: 290, opacity: k * (on ? 1 : 0.55), transform: `translateY(${(1 - k) * 40}px)` }}>
            <div style={{ fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 52, color: l.color }}>{l.what}</div>
            <Mono size={15} style={{ marginTop: 4 }}>
              {l.layer} · 感受野 {l.rf}px
            </Mono>
            <div style={{ marginTop: 16, width: 290, height: 290, borderRadius: 10, overflow: "hidden", border: `2px solid ${on ? l.color : FAINT}`, boxShadow: on ? `0 0 40px ${l.color}44` : "none" }}>
              <Img src={asset(l.img)} style={{ width: "100%", height: "100%", imageRendering: i > 1 ? "pixelated" : "auto" }} />
            </div>
            {i < 3 && <div style={{ position: "absolute", right: -32, top: 210, fontFamily: FONT_DISPLAY, fontSize: 30, color: DIM }}>→</div>}
          </div>
        );
      })}
      <Mono at={{ x: 600, y: 680 }} size={14} color={DIM} style={{ opacity: rise(t, T_EDGE, 0.6) }}>
        这只猫在训练好的 AlexNet 各层激活最强的 16 个通道（真实计算结果）
      </Mono>
    </AbsoluteFill>
  );
};

const Depth = ({ t }: { t: number }) => {
  const k = rise(t, T_F7, 0.8);
  const words = ["像素", "边缘", "纹理", "部件", "物体"];
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column-reverse", alignItems: "center", gap: 12 }}>
        {words.map((w, i) => {
          const kk = rise(t, T_F7 + 0.3 + i * 0.3, 0.5);
          return (
            <div key={w} style={{ width: 300 + i * 90, height: 70, borderRadius: 12, border: `2px solid ${[DIM, AMBER, LIME, CYAN, VIOLET][i]}`, background: `${[DIM, AMBER, LIME, CYAN, VIOLET][i]}14`, display: "flex", justifyContent: "center", alignItems: "center", fontFamily: FONT_CN, fontSize: 30, color: IVORY, opacity: kk, transform: `translateY(${(1 - kk) * 30}px)` }}>
              {w}
            </div>
          );
        })}
      </div>
      <Heading size={52} at={{ x: 960, y: 160 }} center color={IVORY} style={{ opacity: k }}>
        “深度”的意义：层层搭建，<span style={{ color: CYAN, opacity: rise(t, T_ABSTRACT, 0.5) }}>越来越抽象</span>
      </Heading>
    </AbsoluteFill>
  );
};

export const Hier = ({ t }: { t: number }) => (
  <AbsoluteFill style={{ background: BG }}>
    <Backdrop grid={0.03} />
    <Show t={t} from={S.start} to={T_F3 + 0.1} fadeIn={0.3}>
      <Pooling t={t} />
    </Show>
    <Show t={t} from={T_F3 - 0.1} to={T_F4 + 0.1}>
      <Stack t={t} />
    </Show>
    <Show t={t} from={T_F4 - 0.1} to={T_F6 + 0.1}>
      <Filters t={t} compact={ease.inOutCubic(prog(t, T_F5 - 0.4, T_F5 + 0.6))} />
      <FilterCaption t={t} />
      <Receptive t={t} />
    </Show>
    <Show t={t} from={T_F6 - 0.1} to={T_F7 + 0.1}>
      <Hierarchy t={t} />
    </Show>
    <Show t={t} from={T_F7 - 0.1} to={S.end}>
      <Depth t={t} />
    </Show>
  </AbsoluteFill>
);

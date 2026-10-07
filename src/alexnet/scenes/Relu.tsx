import { AbsoluteFill } from "remotion";
import { Backdrop } from "../components/Frame";
import { Show } from "../components/Show";
import { Body, Heading, Mono, Panel } from "../components/ui";
import { ease, flash, hash, lerp, prog, rise } from "../lib/anim";
import { cue, scene } from "../lib/timeline";
import { AMBER, BG, CORAL, CYAN, DIM, FAINT, FONT_CN, FONT_DISPLAY, FONT_MONO, FONT_TITLE, IVORY, LIME, VIOLET } from "../lib/theme";

const S = scene("relu");
const T_R1 = cue("r1");
const T_ACT = cue("r1", "激活函数");
const T_R2 = cue("r2");
const T_HUNDRED = cue("r2", "叠上一百层");
const T_ONE = cue("r2", "只相当于一层");
const T_LINE = cue("r2", "只能画出直线");
const T_R3 = cue("r3");
const T_BEND = cue("r3", "弯曲");
const T_COMPLEX = cue("r3", "复杂的边界");
const T_R4 = cue("r4");
const T_SIG = cue("r4", "sigmoid");
const T_TANH = cue("r4", "tanh");
const T_R5 = cue("r5");
const T_FLAT = cue("r5", "两端");
const T_ZERO = cue("r5", "梯度接近于零");
const T_R6 = cue("r6");
const T_EACH = cue("r6", "每穿过一层");
const T_VANISH = cue("r6", "梯度消失");
const T_R7 = cue("r7");
const T_RELU = cue("r7", "ReLU");
const T_NEG = cue("r7", "输入小于零");
const T_POS = cue("r7", "大于零");
const T_R8 = cue("r8");
const T_GRAD1 = cue("r8", "恒等于一");
const T_FAST = cue("r8", "只需要");
const T_R9 = cue("r9");
const T_SIX = cue("r9", "六倍");
const T_R10 = cue("r10");

/* ── r1: where the activation sits ─────────────────────────────────────── */
const WhereF = ({ t }: { t: number }) => {
  const f = rise(t, T_ACT, 0.6);
  const glow = flash(t, T_ACT, 0.6);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 92, color: IVORY, whiteSpace: "nowrap" }}>
        <span style={{ color: AMBER }}>y</span> ={" "}
        <span style={{ color: LIME, opacity: 0.25 + 0.75 * f, textShadow: `0 0 ${20 + glow * 60}px ${LIME}` }}>f</span>
        <span style={{ color: DIM }}>(</span> Σ <span style={{ color: AMBER }}>w</span>
        <span style={{ color: CYAN }}>x</span> + <span style={{ color: VIOLET }}>b</span> <span style={{ color: DIM }}>)</span>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: f }}>
        <path d="M 760 640 Q 760 720 860 740" stroke={LIME} strokeWidth={3} fill="none" />
      </svg>
      <Body size={34} at={{ x: 880, y: 720 }} color={LIME} style={{ opacity: f, whiteSpace: "nowrap" }}>
        激活函数 · ACTIVATION
      </Body>
      <Heading size={46} at={{ x: 960, y: 880 }} center color={IVORY} style={{ opacity: rise(t, cue("r1", "为什么"), 0.6), whiteSpace: "nowrap" }}>
        为什么一定需要它？
      </Heading>
    </AbsoluteFill>
  );
};

/* ── r2–r3: linear layers collapse; nonlinearity bends the boundary ───── */
const RING = Array.from({ length: 120 }, (_, i) => {
  const inner = i % 2 === 0;
  const a = hash(i * 3.3) * Math.PI * 2;
  const r = inner ? hash(i * 5.1) * 0.42 : 0.62 + hash(i * 7.7) * 0.32;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r, inner };
});

const Collapse = ({ t }: { t: number }) => {
  const merge = ease.inOutCubic(prog(t, T_ONE - 0.4, T_ONE + 0.8));
  const cards = ["W₁", "W₂", "W₃", "…", "W₁₀₀"];
  const show = rise(t, T_HUNDRED - 0.5, 0.6);
  return (
    <div style={{ position: "absolute", left: 120, top: 230, width: 760, height: 500 }}>
      <Mono size={16} color={DIM}>
        线性层 × 100
      </Mono>
      <div style={{ position: "relative", height: 200, marginTop: 30 }}>
        {cards.map((c, i) => {
          const x = lerp(i * 140, 280, merge);
          return (
            <div key={c} style={{ position: "absolute", left: x, top: 0, width: 120, height: 150, borderRadius: 14, border: `2px solid ${AMBER}`, background: "rgba(255,181,71,0.08)", display: "flex", justifyContent: "center", alignItems: "center", fontFamily: FONT_DISPLAY, fontSize: 40, color: AMBER, opacity: show * (i === 2 ? 1 : 1 - merge * 0.9) }}>
              {i === 2 && merge > 0.6 ? "W" : c}
            </div>
          );
        })}
      </div>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 34, color: IVORY, marginTop: 20, opacity: merge }}>
        W₁₀₀···W₂W₁ x <span style={{ color: DIM }}>=</span> <span style={{ color: AMBER }}>W</span> x
      </div>
      <Body size={28} color={CORAL} style={{ marginTop: 18, opacity: merge }}>
        一百层，等于一层
      </Body>
    </div>
  );
};

const Boundary = ({ t }: { t: number }) => {
  const CX = 1360;
  const CY = 520;
  const R = 320;
  const pts = rise(t, T_R2 + 0.6, 0.8);
  const lineK = rise(t, T_LINE - 0.4, 0.5);
  const bend = ease.inOutCubic(prog(t, T_BEND - 0.2, T_COMPLEX + 0.8));
  const swing = Math.sin((t - T_LINE) * 1.4) * 0.6 * (1 - bend);
  // boundary: a straight line that morphs into a circle of radius 0.52
  const N = 90;
  const path = Array.from({ length: N + 1 }, (_, i) => {
    const u = i / N;
    const lx = lerp(-1.1, 1.1, u);
    const ly = 0.1;
    const ca = Math.cos(swing);
    const sa = Math.sin(swing);
    const sx = lx * ca - ly * sa;
    const sy = lx * sa + ly * ca;
    const ang = u * Math.PI * 2;
    const cx = Math.cos(ang) * 0.52;
    const cy = Math.sin(ang) * 0.52;
    return `${i ? "L" : "M"} ${CX + lerp(sx, cx, bend) * R} ${CY + lerp(sy, cy, bend) * R}`;
  }).join(" ");
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      <rect x={CX - R - 30} y={CY - R - 30} width={2 * R + 60} height={2 * R + 60} rx={18} fill="rgba(14,20,36,0.6)" stroke={FAINT} />
      {RING.map((p, i) => (
        <circle key={i} cx={CX + p.x * R} cy={CY + p.y * R} r={8 * pts} fill={p.inner ? CYAN : CORAL} opacity={0.85} />
      ))}
      <path d={path} stroke={bend > 0.5 ? LIME : AMBER} strokeWidth={5} fill="none" opacity={lineK} />
      <text x={CX} y={CY + R + 70} textAnchor="middle" fontFamily={FONT_CN} fontSize={28} fill={bend > 0.5 ? LIME : CORAL} opacity={lineK}>
        {bend > 0.5 ? "有了激活函数：边界可以弯曲" : "只有直线：怎么也分不开"}
      </text>
    </svg>
  );
};

/* ── r4–r8: the curves themselves ──────────────────────────────────────── */
const PX = 260;
const PY = 260;
const PW = 760;
const PH = 460;
const XR = 6;
const sx = (x: number) => PX + ((x + XR) / (2 * XR)) * PW;
const sy = (y: number) => PY + PH / 2 - y * (PH / 2 / 1.2);
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const curve = (f: (x: number) => number, k: number, from = -XR) =>
  Array.from({ length: 141 }, (_, i) => {
    const x = from + ((XR - from) * i * k) / 140;
    return `${i ? "L" : "M"} ${sx(x)} ${sy(f(x))}`;
  }).join(" ");

const Curves = ({ t }: { t: number }) => {
  const axes = rise(t, T_R4, 0.6);
  const sig = rise(t, T_SIG - 0.2, 1.2, ease.inOutCubic);
  const th = rise(t, T_TANH - 0.2, 1.2, ease.inOutCubic);
  const flat = rise(t, T_FLAT, 0.6);
  const deriv = rise(t, T_ZERO - 0.4, 1.0, ease.inOutCubic);
  const relu = rise(t, T_RELU - 0.2, 1.2, ease.inOutCubic);
  const fadeOld = rise(t, T_R7, 0.6) * 0.75;
  const neg = rise(t, T_NEG, 0.5);
  const pos = rise(t, T_POS, 0.5);
  const one = rise(t, T_GRAD1, 0.6);
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: axes }}>
        <rect x={PX - 20} y={PY - 20} width={PW + 40} height={PH + 40} rx={16} fill="rgba(14,20,36,0.6)" stroke={FAINT} />
        <line x1={PX} y1={sy(0)} x2={PX + PW} y2={sy(0)} stroke={FAINT} strokeWidth={2} />
        <line x1={sx(0)} y1={PY} x2={sx(0)} y2={PY + PH} stroke={FAINT} strokeWidth={2} />
        {/* saturated regions */}
        <rect x={PX} y={PY} width={sx(-3) - PX} height={PH} fill={CORAL} opacity={0.1 * flat * (1 - fadeOld)} />
        <rect x={sx(3)} y={PY} width={PX + PW - sx(3)} height={PH} fill={CORAL} opacity={0.1 * flat * (1 - fadeOld)} />
        <path d={curve(sigmoid, sig)} stroke={AMBER} strokeWidth={5} fill="none" opacity={1 - fadeOld} />
        <path d={curve(Math.tanh, th)} stroke={VIOLET} strokeWidth={5} fill="none" opacity={1 - fadeOld} />
        {/* sigmoid derivative */}
        <path d={curve((x) => sigmoid(x) * (1 - sigmoid(x)) * 2.4 - 1.05, deriv)} stroke={CORAL} strokeWidth={3} strokeDasharray="8 6" fill="none" opacity={1 - fadeOld} />
        <path d={curve((x) => Math.max(0, x) / 5, relu)} stroke={LIME} strokeWidth={7} fill="none" style={{ filter: "drop-shadow(0 0 10px #A8FF60)" }} />
      </svg>
      <div style={{ position: "absolute", left: PX + PW + 70, top: PY, width: 700 }}>
        <Legend color={AMBER} name="sigmoid" desc="σ(x) = 1 / (1 + e⁻ˣ)" k={sig * (1 - fadeOld)} />
        <Legend color={VIOLET} name="tanh" desc="双曲正切 · 输出 −1 ~ 1" k={th * (1 - fadeOld)} />
        <Legend color={CORAL} name="梯度（导数）" desc="两端 → 0 ：信号几乎传不过去" k={deriv * (1 - fadeOld)} dashed />
        <div style={{ opacity: relu, marginTop: 40 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 72, fontWeight: 800, color: LIME, textShadow: `0 0 40px ${LIME}66` }}>ReLU</div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 34, color: IVORY, marginTop: 6 }}>f(x) = max(0, x)</div>
          <Body size={26} color={DIM} style={{ marginTop: 16 }}>
            <span style={{ opacity: 0.3 + 0.7 * neg }}>x &lt; 0 → 0</span> &nbsp;·&nbsp; <span style={{ opacity: 0.3 + 0.7 * pos }}>x &gt; 0 → x</span>
          </Body>
          <Body size={26} color={LIME} style={{ marginTop: 8, opacity: one }}>
            激活时，梯度恒等于 1
          </Body>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Legend = ({ color, name, desc, k, dashed }: { color: string; name: string; desc: string; k: number; dashed?: boolean }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 22, opacity: k }}>
    <div style={{ width: 48, height: 0, borderTop: `5px ${dashed ? "dashed" : "solid"} ${color}` }} />
    <div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 26, color }}>{name}</div>
      <div style={{ fontFamily: FONT_CN, fontSize: 20, color: DIM, marginTop: 2 }}>{desc}</div>
    </div>
  </div>
);

/* ── r6 & r8: an error signal travelling back through 8 layers ─────────── */
const Chain = ({ t, t0, factor, color, label }: { t: number; t0: number; factor: number; color: string; label: string }) => {
  const L = 8;
  const X0 = 1660;
  const DX = 200;
  const Y = 760;
  const per = 0.55;
  const pos = Math.max(0, (t - t0) / per);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Mono at={{ x: X0 - (L - 1) * DX - 40, y: Y - 120 }} size={18} color={color}>
        {label}
      </Mono>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <line x1={X0 - (L - 1) * DX} y1={Y} x2={X0} y2={Y} stroke={FAINT} strokeWidth={2} />
        {Array.from({ length: L }, (_, i) => {
          const x = X0 - i * DX;
          const g = factor ** i;
          const reached = pos >= i;
          return (
            <g key={i}>
              <circle cx={x} cy={Y} r={26} fill="rgba(14,20,36,0.95)" stroke={reached ? color : FAINT} strokeWidth={2} strokeOpacity={reached ? Math.max(0.15, g ** 0.35) : 1} />
              <text x={x} y={Y + 70} textAnchor="middle" fontFamily={FONT_MONO} fontSize={20} fill={reached ? color : DIM} opacity={reached ? Math.max(0.25, g ** 0.25) : 0.5}>
                {reached ? (g < 0.001 ? g.toExponential(0) : g.toFixed(g < 0.01 ? 4 : 2)) : "·"}
              </text>
              {i > 0 && (
                <text x={x + DX / 2} y={Y - 22} textAnchor="middle" fontFamily={FONT_MONO} fontSize={16} fill={DIM} opacity={reached ? 0.8 : 0.2}>
                  ×{factor}
                </text>
              )}
            </g>
          );
        })}
        {pos < L - 0.01 && (
          <circle cx={X0 - Math.min(L - 1, pos) * DX} cy={Y} r={6 + 26 * factor ** Math.min(L - 1, pos)} fill={color} opacity={0.35 + 0.65 * factor ** Math.min(L - 1, pos)} style={{ filter: `drop-shadow(0 0 16px ${color})` }} />
        )}
      </svg>
      <div style={{ position: "absolute", left: X0 - (L - 1) * DX - 60, top: Y - 34, fontFamily: FONT_CN, fontSize: 22, color: DIM, transform: "translateX(-100%)" }}>← 前面的层</div>
      <div style={{ position: "absolute", left: X0 + 50, top: Y - 34, fontFamily: FONT_CN, fontSize: 22, color: CORAL }}>误差</div>
    </div>
  );
};

/* ── r9: Figure 1 of the paper, redrawn ────────────────────────────────── */
const reluErr = (e: number) => 0.08 + 0.67 * Math.exp(-e / 4.6);
const tanhErr = (e: number) => 0.12 + 0.63 * Math.exp(-e / 22);

const Race = ({ t }: { t: number }) => {
  const X = 300;
  const Y = 240;
  const W = 1000;
  const H = 520;
  const ex = (e: number) => X + (e / 40) * W;
  const ey = (v: number) => Y + H - (v / 0.75) * H;
  const k = rise(t, T_R9 + 0.3, 3.2, ease.inOutSine);
  const six = rise(t, T_SIX - 0.2, 0.6);
  const path = (f: (e: number) => number) =>
    Array.from({ length: 161 }, (_, i) => {
      const e = (40 * i * k) / 160;
      return `${i ? "L" : "M"} ${ex(e)} ${ey(f(e))}`;
    }).join(" ");
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <rect x={X - 30} y={Y - 30} width={W + 60} height={H + 60} rx={16} fill="rgba(14,20,36,0.6)" stroke={FAINT} />
        <line x1={X} y1={ey(0.25)} x2={X + W} y2={ey(0.25)} stroke={IVORY} strokeOpacity={0.35} strokeDasharray="6 8" />
        <text x={X + W - 8} y={ey(0.25) - 12} textAnchor="end" fontFamily={FONT_MONO} fontSize={16} fill={DIM}>
          训练误差 25%
        </text>
        <path d={path(tanhErr)} stroke={VIOLET} strokeWidth={5} fill="none" strokeDasharray="14 8" />
        <path d={path(reluErr)} stroke={LIME} strokeWidth={6} fill="none" />
        {[0, 10, 20, 30, 40].map((e) => (
          <text key={e} x={ex(e)} y={Y + H + 36} textAnchor="middle" fontFamily={FONT_MONO} fontSize={16} fill={DIM}>
            {e}
          </text>
        ))}
        <g opacity={six}>
          <line x1={ex(6)} y1={ey(0.25)} x2={ex(6)} y2={Y + H} stroke={LIME} strokeWidth={2} />
          <line x1={ex(36)} y1={ey(0.25)} x2={ex(36)} y2={Y + H} stroke={VIOLET} strokeWidth={2} />
          <circle cx={ex(6)} cy={ey(0.25)} r={10} fill={LIME} />
          <circle cx={ex(36)} cy={ey(0.25)} r={10} fill={VIOLET} />
          <line x1={ex(6) + 20} y1={Y + H - 40} x2={ex(36) - 20} y2={Y + H - 40} stroke={IVORY} strokeWidth={2} markerEnd="" />
        </g>
      </svg>
      <Mono at={{ x: X, y: Y + H + 60 }} size={16}>
        训练轮数 (EPOCHS)
      </Mono>
      <Mono at={{ x: X, y: Y - 80 }} size={16}>
        论文图 1 重绘 · CIFAR-10 · 四层卷积网络
      </Mono>
      <div style={{ position: "absolute", left: X + W + 90, top: Y + 40 }}>
        <div style={{ fontFamily: FONT_MONO, fontSize: 28, color: LIME }}>━ ReLU</div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 28, color: VIOLET, marginTop: 14 }}>┅ tanh</div>
        <div style={{ opacity: six, marginTop: 60 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 150, fontWeight: 800, color: LIME, lineHeight: 1, textShadow: `0 0 60px ${LIME}55` }}>6×</div>
          <Body size={28} color={IVORY} style={{ marginTop: 10 }}>
            更快达到同样的误差
          </Body>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Moral = ({ t }: { t: number }) => {
  const k = rise(t, T_R10, 0.8);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ fontFamily: FONT_MONO, fontSize: 130, fontWeight: 700, color: LIME, opacity: k, textShadow: `0 0 70px ${LIME}66`, transform: `scale(${0.9 + 0.1 * k})` }}>max(0, x)</div>
      <div style={{ fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 52, color: IVORY, marginTop: 40, opacity: rise(t, T_R10 + 0.8, 0.8), letterSpacing: 6 }}>最重要的改进，恰恰是最简单的那一个</div>
    </AbsoluteFill>
  );
};

export const Relu = ({ t }: { t: number }) => (
  <AbsoluteFill style={{ background: BG }}>
    <Backdrop grid={0.03} tint={LIME} />
    <Show t={t} from={S.start} to={T_R2 + 0.2} fadeIn={0.3}>
      <WhereF t={t} />
    </Show>
    <Show t={t} from={T_R2 - 0.1} to={T_R4 + 0.1}>
      <Collapse t={t} />
      <Boundary t={t} />
    </Show>
    <Show t={t} from={T_R4 - 0.1} to={T_R9 + 0.1}>
      <AbsoluteFill style={{ transform: `translateY(${-130 * ease.inOutCubic(prog(t, T_EACH - 0.8, T_EACH)) * (1 - ease.inOutCubic(prog(t, T_R7 - 0.3, T_R7 + 0.5))) + -130 * ease.inOutCubic(prog(t, T_FAST - 1.2, T_FAST - 0.4))}px)` }}>
        <Curves t={t} />
      </AbsoluteFill>
      <Show t={t} from={T_EACH - 0.6} to={T_R7 + 0.2}>
        <Chain t={t} t0={T_EACH + 0.3} factor={0.25} color={AMBER} label="sigmoid：每层最多 ×0.25" />
        <Heading size={46} at={{ x: 960, y: 920 }} center color={CORAL} style={{ opacity: rise(t, T_VANISH, 0.6) }}>
          梯度消失
        </Heading>
      </Show>
      <Show t={t} from={T_FAST - 1.0} to={T_R9 + 0.1}>
        <Chain t={t} t0={T_FAST - 0.6} factor={1} color={LIME} label="ReLU：每层 ×1" />
      </Show>
    </Show>
    <Show t={t} from={T_R9 - 0.1} to={T_R10 + 0.1}>
      <Race t={t} />
    </Show>
    <Show t={t} from={T_R10 - 0.1} to={S.end}>
      <Moral t={t} />
    </Show>
  </AbsoluteFill>
);


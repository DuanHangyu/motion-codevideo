import { useEffect, useRef, useState } from "react";
import { AbsoluteFill } from "remotion";
import { ExploreTask, WorldButton, WorldSlider } from "../components/ExploreUI";
import { explore, useExplore, capturePointer } from "../lib/explore";
import { sfx } from "../lib/sfx";
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
const Chain = ({ t, t0, factor, color, label, layers = 8 }: { t: number; t0: number; factor: number; color: string; label: string; layers?: number }) => {
  const L = layers;
  const X0 = 1660;
  const DX = 1400 / (L - 1);
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
              <circle cx={x} cy={Y} r={Math.min(26, DX * 0.3)} fill="rgba(14,20,36,0.95)" stroke={reached ? color : FAINT} strokeWidth={2} strokeOpacity={reached ? Math.max(0.15, g ** 0.35) : 1} />
              <text x={x} y={Y + (i % 2 && L > 10 ? 96 : 70)} textAnchor="middle" fontFamily={FONT_MONO} fontSize={L > 10 ? 16 : 20} fill={reached ? color : DIM} opacity={reached ? Math.max(0.25, g ** 0.25) : 0.5}>
                {reached ? (g < 0.001 ? g.toExponential(0) : g.toFixed(g < 0.01 ? 4 : 2)) : "·"}
              </text>
              {i > 0 && (
                <text x={x + DX / 2} y={Y - 22} textAnchor="middle" fontFamily={FONT_MONO} fontSize={L > 10 ? 12 : 16} fill={DIM} opacity={reached ? 0.8 : 0.2}>
                  ×{Number.isInteger(factor) ? factor : factor.toFixed(2)}
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

/* ── explore: the gradient conveyor belt ───────────────────────────────── */
const ACTIVATION = "activation";
const FNS = {
  sigmoid: { name: "sigmoid", color: AMBER, f: sigmoid, d: (x: number) => sigmoid(x) * (1 - sigmoid(x)), scale: 1 },
  tanh: { name: "tanh", color: VIOLET, f: Math.tanh, d: (x: number) => 1 - Math.tanh(x) ** 2, scale: 1 },
  relu: { name: "ReLU", color: LIME, f: (x: number) => Math.max(0, x), d: (x: number) => (x > 0 ? 1 : 0), scale: 0.2 },
};
type FnId = keyof typeof FNS;
type ActPlay = { fn: FnId; x: number; layers: number; loopAt: number };
const LAYER_SEC = 0.42;

const ActivationWorld = ({ t, children }: { t: number; children: React.ReactNode }) => {
  const ex = useExplore(ACTIVATION);
  const [play, setPlay] = useState<ActPlay | null>(null);
  const reached = useRef(-1);
  useEffect(() => {
    if (ex.active && !play) setPlay({ fn: "sigmoid", x: 0, layers: 8, loopAt: ex.clock });
    if (!ex.active && play) setPlay(null);
  }, [ex.active, play, ex.clock]);
  const blend = ex.blend;
  const live = !!play && ex.interactive;
  const F = play ? FNS[play.fn] : FNS.relu;
  const g = play ? F.d(play.x) : 1;
  const remaining = play ? g ** (play.layers - 1) : 1;
  const span = play ? play.layers * LAYER_SEC + 1.0 : 1;
  const local = play ? (ex.clock - play.loopAt) % span : 0;
  const idx = Math.floor(local / LAYER_SEC);
  // one note per layer the signal reaches, quieter and lower as it fades
  useEffect(() => {
    if (!live || !play) return;
    if (idx < reached.current) reached.current = -1;
    if (idx > reached.current && idx < play.layers) {
      reached.current = idx;
      const amp = g ** idx;
      if (amp > 1e-4) sfx.blip(660 + 900 * Math.min(1, amp), 0.03 + 0.12 * Math.min(1, amp));
    }
  });
  // functional updates: a drag fires several events before React re-renders
  const set = (patch: Partial<ActPlay>) => setPlay((p) => (p ? { ...p, ...patch, loopAt: ex.clock } : p));
  const setX = (x: number) => setPlay((p) => (p ? { ...p, x: Math.max(-XR, Math.min(XR, Math.round(x * 20) / 20)) } : p));

  return (
    <>
      <AbsoluteFill style={{ opacity: 1 - blend }}>{children}</AbsoluteFill>
      {play && (
        <AbsoluteFill style={{ opacity: blend }}>
          {/* plot + controls sit between the task banner (top) and the signal chain (bottom) */}
          <AbsoluteFill style={{ transform: "translateY(120px) scale(0.78)", transformOrigin: "50% 0" }}>
            <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              <rect x={PX - 20} y={PY - 20} width={PW + 40} height={PH + 40} rx={16} fill="rgba(4,6,12,0.82)" stroke={live ? F.color : FAINT} strokeOpacity={0.6} />
              <line x1={PX} y1={sy(0)} x2={PX + PW} y2={sy(0)} stroke={FAINT} strokeWidth={2} />
              <line x1={sx(0)} y1={PY} x2={sx(0)} y2={PY + PH} stroke={FAINT} strokeWidth={2} />
              <path d={curve(F.d, 1)} stroke={CORAL} strokeWidth={3} strokeDasharray="8 6" fill="none" />
              <path d={curve((x) => F.f(x) * F.scale, 1)} stroke={F.color} strokeWidth={6} fill="none" style={{ filter: `drop-shadow(0 0 10px ${F.color})` }} />
              <line x1={sx(play.x)} y1={PY} x2={sx(play.x)} y2={PY + PH} stroke={IVORY} strokeOpacity={0.3} strokeDasharray="4 6" />
              <line
                x1={sx(play.x - 1.4)}
                y1={sy((F.f(play.x) - F.d(play.x) * 1.4) * F.scale)}
                x2={sx(play.x + 1.4)}
                y2={sy((F.f(play.x) + F.d(play.x) * 1.4) * F.scale)}
                stroke={IVORY}
                strokeWidth={2}
              />
              <circle cx={sx(play.x)} cy={sy(F.f(play.x) * F.scale)} r={12} fill={IVORY} style={{ filter: "drop-shadow(0 0 10px #fff)" }} />
              <circle cx={sx(play.x)} cy={sy(g)} r={8} fill={CORAL} />
              <text x={sx(play.x) + 14} y={sy(g) - 12} fill={CORAL} fontFamily={FONT_MONO} fontSize={20}>
                f′ = {g.toFixed(3)}
              </text>
            </svg>
            {/* drag anywhere on the plot to move x */}
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                capturePointer(e.currentTarget, e.pointerId);
                explore.setDragging(true);
                const r = e.currentTarget.getBoundingClientRect();
                setX(((e.clientX - r.left) / r.width) * 2 * XR - XR);
              }}
              onPointerMove={(e) => {
                if (!e.buttons) return;
                const r = e.currentTarget.getBoundingClientRect();
                setX(((e.clientX - r.left) / r.width) * 2 * XR - XR);
              }}
              onPointerUp={() => {
                explore.setDragging(false);
                set({});
              }}
              style={{ position: "absolute", left: PX, top: PY, width: PW, height: PH, cursor: live ? "ew-resize" : undefined, pointerEvents: live ? "auto" : "none", touchAction: "none" }}
            />
            <Panel at={{ x: PX + PW + 70, y: PY - 10 }} style={{ width: 600, padding: "22px 28px", pointerEvents: live ? "auto" : "none" }} glow={F.color}>
              <div style={{ display: "flex", gap: 10 }}>
                {(Object.keys(FNS) as FnId[]).map((id) => (
                  <WorldButton key={id} on={play.fn === id} color={FNS[id].color} onClick={() => set({ fn: id })}>
                    {FNS[id].name}
                  </WorldButton>
                ))}
              </div>
              <div style={{ display: "flex", gap: 30, marginTop: 18, fontFamily: FONT_DISPLAY }}>
                <div>
                  <div style={{ fontFamily: FONT_CN, fontSize: 18, color: DIM }}>输入 x</div>
                  <div style={{ fontSize: 40, color: IVORY }}>{play.x.toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ fontFamily: FONT_CN, fontSize: 18, color: DIM }}>梯度 f′(x)</div>
                  <div style={{ fontSize: 40, color: CORAL }}>{g.toFixed(3)}</div>
                </div>
                <div>
                  <div style={{ fontFamily: FONT_CN, fontSize: 18, color: DIM }}>传到最前面还剩</div>
                  <div style={{ fontSize: 40, color: remaining > 0.5 ? LIME : remaining > 0.01 ? AMBER : CORAL }}>{remaining >= 0.001 ? `${(remaining * 100).toFixed(1)}%` : remaining.toExponential(1)}</div>
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <WorldSlider label="网络层数" value={play.layers} min={3} max={14} step={1} unit={(v) => `${v} 层`} onChange={(v) => set({ layers: v })} color={F.color} />
              </div>
            </Panel>
          </AbsoluteFill>
          <Chain t={ex.clock} t0={play.loopAt + Math.floor((ex.clock - play.loopAt) / span) * span} factor={Math.round(g * 1000) / 1000} color={F.color} label={`${F.name}：每层 ×f′(x)`} layers={play.layers} />
        </AbsoluteFill>
      )}
      <ExploreTask
        zone={ACTIVATION}
        task="信号快消失了！拖动曲线上的 x、换激活函数，把它救回来"
        sub={["sigmoid 在哪里梯度最大？", "x 变成负数时 ReLU 会怎样？"]}
        goal="让误差信号穿过 12 层以上，仍然保留 90%"
        done={!!play && play.layers >= 12 && remaining >= 0.9}
      />
    </>
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

/** The narrated curves; they step aside while the student is inside the activation world. */
const ScriptedCurves = ({ t }: { t: number }) => {
  const ex = useExplore(ACTIVATION);
  const lift = -130 * ease.inOutCubic(prog(t, T_EACH - 0.8, T_EACH)) * (1 - ease.inOutCubic(prog(t, T_R7 - 0.3, T_R7 + 0.5))) + -130 * ease.inOutCubic(prog(t, T_FAST - 1.2, T_FAST - 0.4));
  return (
    <AbsoluteFill style={{ transform: `translateY(${lift}px)`, opacity: 1 - ex.blend }}>
      <Curves t={t} />
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
      <ScriptedCurves t={t} />
      <Show t={t} from={T_EACH - 0.6} to={T_R7 + 0.2}>
        <ActivationWorld t={t}>
          <Chain t={t} t0={T_EACH + 0.3} factor={0.25} color={AMBER} label="sigmoid：每层最多 ×0.25" />
          <Heading size={46} at={{ x: 960, y: 920 }} center color={CORAL} style={{ opacity: rise(t, T_VANISH, 0.6) }}>
            梯度消失
          </Heading>
        </ActivationWorld>
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


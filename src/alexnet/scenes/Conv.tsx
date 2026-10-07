import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { AbsoluteFill, Img } from "remotion";
import { Backdrop } from "../components/Frame";
import { Show } from "../components/Show";
import { Pose, Stage3D, projector } from "../components/Stage3D";
import { Body, Heading, Mono, Panel } from "../components/ui";
import { ease, fmtInt, hash, prog, rise, wobble } from "../lib/anim";
import { asset, gray28 } from "../lib/data";
import { cue, lineEnd, scene } from "../lib/timeline";
import { AMBER, BG, CORAL, CYAN, DIM, FAINT, FONT_CN, FONT_DISPLAY, FONT_HAND, FONT_MONO, FONT_TITLE, IVORY, LIME, VIOLET } from "../lib/theme";
import { ConvSlide, EdgeReveal, KERNEL } from "./ConvSlide";

const S = scene("conv");
const T_C1 = cue("c1");
const T_FC = cue("c1", "全连接");
const T_C2 = cue("c2");
const T_PARAMS = cue("c2", "一亿五千万");
const T_C3 = cue("c3");
const T_OVERFIT = cue("c3", "过拟合");
const T_NEW = cue("c3", "换一张");
const T_C4 = cue("c4");
const T_TL = cue("c4", "猫出现在左上角");
const T_BR = cue("c4", "右下角");
const T_C5 = cue("c5");
const T_C6 = cue("c6");
const T_1959 = cue("c6", "1959");
const T_SMALL = cue("c6", "一小块");
const T_ORIENT = cue("c6", "特定方向");
const T_C7 = cue("c7");
const T_LOCAL = cue("c7", "局部连接");
const T_C8 = cue("c8");
const T_SHARE = cue("c8", "权重共享");
const T_REUSE = cue("c8", "那就让");
const T_C9 = cue("c9");
const T_C12 = cue("c12");
const T_C13 = cue("c13");
const T_35K = cue("c13", "三万五千");
const T_40B = cue("c13", "四百多亿");
const T_1M = cue("c13", "一百多万倍");
const T_C14 = cue("c14");
const T_1989 = cue("c14", "1989");
const T_ZIP = cue("c14", "邮政编码");
const T_C15 = cue("c15");
const T_MISSING = cue("c15", "要看懂");
const T_THINGS = cue("c15", "缺了");

/* ── c1–c2: fully connected — every pixel to every neuron ──────────────── */
const PIX = 28;
const NEU = 10;
const PSP = 0.2;
const pixPos = (i: number): [number, number, number] => [-4.2, ((PIX - 1) / 2 - Math.floor(i / PIX)) * PSP, ((i % PIX) - (PIX - 1) / 2) * PSP];
const neuPos = (j: number): [number, number, number] => [4.2, ((NEU - 1) / 2 - Math.floor(j / NEU)) * 0.42, ((j % NEU) - (NEU - 1) / 2) * 0.42];
const FC_LINES = 6000;

/** Lives inside the Canvas so its refs are attached when the layout effect runs (R3F has its own reconciler). */
const FcMeshes = () => {
  const pixRef = useRef<THREE.InstancedMesh>(null);
  const neuRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const a = pixRef.current;
    const b = neuRef.current;
    if (!a || !b) return;
    const dummy = new THREE.Object3D();
    const c = new THREE.Color();
    for (let i = 0; i < PIX * PIX; i++) {
      dummy.position.set(...pixPos(i));
      dummy.scale.set(0.04, PSP * 0.9, PSP * 0.9);
      dummy.updateMatrix();
      a.setMatrixAt(i, dummy.matrix);
      const v = gray28(i % PIX, Math.floor(i / PIX)) / 255;
      a.setColorAt(i, c.setRGB(v, v, v));
    }
    for (let j = 0; j < NEU * NEU; j++) {
      dummy.position.set(...neuPos(j));
      dummy.scale.setScalar(0.11);
      dummy.updateMatrix();
      b.setMatrixAt(j, dummy.matrix);
    }
    a.instanceMatrix.needsUpdate = true;
    b.instanceMatrix.needsUpdate = true;
    if (a.instanceColor) a.instanceColor.needsUpdate = true;
  }, []);
  return (
    <>
      <instancedMesh ref={pixRef} args={[undefined, undefined, PIX * PIX]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={neuRef} args={[undefined, undefined, NEU * NEU]} frustumCulled={false}>
        <sphereGeometry args={[1, 16, 8]} />
        <meshBasicMaterial color={AMBER} toneMapped={false} />
      </instancedMesh>
    </>
  );
};

const FullyConnected = ({ t }: { t: number }) => {
  const lines = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(FC_LINES * 6);
    for (let k = 0; k < FC_LINES; k++) {
      const i = Math.floor(hash(k * 1.31) * PIX * PIX);
      const j = Math.floor(hash(k * 2.77 + 5) * NEU * NEU);
      p.set([...pixPos(i), ...neuPos(j)], k * 6);
    }
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    return g;
  }, []);
  const draw = Math.floor(FC_LINES * ease.inCubic(prog(t, T_FC - 0.6, T_FC + 2.4)));
  lines.setDrawRange(0, draw * 2);
  const a = 0.9 + wobble(t * 0.2, 1) * 0.08 + prog(t, T_C1, T_C3) * 0.3;
  const pose: Pose = { position: [Math.sin(a) * 14, 3.2, Math.cos(a) * 14], target: [0, 0, 0], fov: 38 };
  const proj = projector(pose);
  const pin = proj(-4.2, -3.4, 0);
  const nin = proj(4.2, -2.6, 0);
  const count = rise(t, T_C2 + 0.2, 0.6);
  return (
    <AbsoluteFill>
      <Stage3D pose={pose} bloom={0.8} threshold={0.2}>
        <ambientLight intensity={1} />
        <FcMeshes />
        <lineSegments geometry={lines}>
          <lineBasicMaterial color={CORAL} transparent opacity={0.07} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </lineSegments>
      </Stage3D>
      <Mono at={{ x: pin.x, y: pin.y }} center size={18}>
        输入像素
      </Mono>
      <Mono at={{ x: nin.x, y: nin.y }} center size={18} color={AMBER}>
        下一层的神经元
      </Mono>
      <Panel at={{ x: 960, y: 840 }} center style={{ padding: "18px 40px", opacity: count * rise(t, T_PARAMS - 0.7, 0.3), whiteSpace: "nowrap" }} glow={CORAL}>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 38, color: IVORY }}>
          150,528 <span style={{ color: DIM }}>×</span> 1,000 <span style={{ color: DIM }}>=</span>{" "}
          <span style={{ color: CORAL, fontWeight: 800, fontSize: 52 }}>{fmtInt(150528000 * ease.outCubic(prog(t, T_PARAMS - 0.6, T_PARAMS + 0.8)))}</span>
        </span>
        <span style={{ fontFamily: FONT_CN, fontSize: 26, color: CORAL, marginLeft: 16 }}>个权重</span>
      </Panel>
    </AbsoluteFill>
  );
};

/* ── c3: overfitting — memorising instead of understanding ─────────────── */
const TRAIN = Array.from({ length: 8 }, (_, i) => {
  const x = 0.08 + i * 0.12;
  return { x, y: 0.5 + 0.28 * Math.sin(x * 5.2) + (hash(i * 9.1) - 0.5) * 0.22 };
});
const lagrange = (x: number) =>
  TRAIN.reduce((s, p, i) => s + p.y * TRAIN.reduce((m, q, j) => (j === i ? m : (m * (x - q.x)) / (p.x - q.x)), 1), 0);
const truth = (x: number) => 0.5 + 0.28 * Math.sin(x * 5.2);

const Overfit = ({ t }: { t: number }) => {
  const X = 260;
  const Y = 260;
  const W = 900;
  const H = 520;
  const px = (x: number) => X + x * W;
  const py = (y: number) => Y + H - Math.max(-0.2, Math.min(1.2, y)) * H;
  const wiggle = rise(t, T_OVERFIT - 0.3, 1.6, ease.inOutCubic);
  const smooth = rise(t, T_OVERFIT + 1.0, 1.2, ease.inOutCubic);
  const test = rise(t, T_NEW, 0.5);
  const path = (f: (x: number) => number, k: number) =>
    Array.from({ length: 121 }, (_, i) => {
      const x = 0.04 + (0.92 * i * k) / 120;
      return `${i ? "L" : "M"} ${px(x)} ${py(f(x))}`;
    }).join(" ");
  const tx = 0.86;
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <rect x={X} y={Y} width={W} height={H} fill="rgba(14,20,36,0.6)" stroke={FAINT} rx={12} />
        <path d={path(truth, smooth)} stroke={CYAN} strokeWidth={4} fill="none" strokeDasharray="12 8" opacity={smooth} />
        <path d={path(lagrange, wiggle)} stroke={CORAL} strokeWidth={4} fill="none" />
        {TRAIN.map((p, i) => (
          <circle key={i} cx={px(p.x)} cy={py(p.y)} r={11 * rise(t, T_C3 + 0.2 + i * 0.1, 0.4)} fill={IVORY} />
        ))}
        <g opacity={test}>
          <circle cx={px(tx)} cy={py(truth(tx) + 0.02)} r={14} fill={LIME} />
          <line x1={px(tx)} y1={py(truth(tx) + 0.02)} x2={px(tx)} y2={py(lagrange(tx))} stroke={LIME} strokeWidth={2} strokeDasharray="4 6" />
        </g>
      </svg>
      <div style={{ position: "absolute", left: X + W + 60, top: Y + 30, width: 520 }}>
        <Heading size={56} color={CORAL} style={{ opacity: rise(t, T_OVERFIT, 0.5) }}>
          过拟合
        </Heading>
        <Mono size={16} style={{ marginTop: 6, opacity: rise(t, T_OVERFIT, 0.5) }}>
          OVERFITTING
        </Mono>
        <Body size={26} style={{ marginTop: 34, opacity: wiggle }}>
          <span style={{ color: CORAL }}>━</span> 参数太多：穿过每一个训练点，“死记硬背”
        </Body>
        <Body size={26} style={{ marginTop: 14, opacity: smooth }}>
          <span style={{ color: CYAN }}>┅</span> 真正的规律：简单而平滑
        </Body>
        <Body size={26} style={{ marginTop: 14, opacity: test }}>
          <span style={{ color: LIME }}>●</span> 一张新图：死记硬背的模型错得离谱
        </Body>
      </div>
    </AbsoluteFill>
  );
};

/* ── c4: no notion of "where" ──────────────────────────────────────────── */
const Position = ({ t }: { t: number }) => {
  const g = 8;
  const cs = 36;
  const panel = (ox: number, at: number, cx: number, cy: number, label: string, color: string) => {
    const k = rise(t, at - 0.2, 0.6);
    return (
      <div style={{ position: "absolute", left: ox, top: 250, opacity: k, transform: `translateY(${(1 - k) * 30}px)` }}>
        <div style={{ position: "relative", width: g * cs, height: g * cs, background: "rgba(14,20,36,0.8)", border: `1px solid ${FAINT}` }}>
          {Array.from({ length: g * g }, (_, i) => (
            <div key={i} style={{ position: "absolute", left: (i % g) * cs, top: Math.floor(i / g) * cs, width: cs, height: cs, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)" }} />
          ))}
          <div style={{ position: "absolute", left: cx * cs, top: cy * cs, width: cs * 3, height: cs * 3, overflow: "hidden", borderRadius: 4 }}>
            <Img src={asset("cat.jpg")} style={{ width: "100%", height: "100%" }} />
          </div>
        </div>
        <div style={{ position: "relative", width: g * cs, height: g * cs, marginTop: 30 }}>
          {Array.from({ length: g * g }, (_, i) => {
            const x = i % g;
            const y = Math.floor(i / g);
            const on = x >= cx && x < cx + 3 && y >= cy && y < cy + 3;
            const lit = on ? rise(t, at + 0.5 + hash(i) * 0.5, 0.4) : 0;
            return <div key={i} style={{ position: "absolute", left: x * cs + 3, top: y * cs + 3, width: cs - 6, height: cs - 6, borderRadius: 4, background: on ? color : "rgba(255,255,255,0.04)", opacity: on ? 0.2 + 0.8 * lit : 1 }} />;
          })}
        </div>
        <Mono size={16} color={color} style={{ marginTop: 14 }}>
          {label}
        </Mono>
      </div>
    );
  };
  const diff = rise(t, T_BR + 1.0, 0.6);
  const unroll = ease.inOutCubic(prog(t, T_C4 + 0.8, T_C4 + 3.6));
  const stripOut = rise(t, T_TL - 0.6, 0.5);
  const SG = 8;
  const SC = 26;
  return (
    <AbsoluteFill>
      {/* the 2D image is flattened into one long row of unrelated numbers */}
      <AbsoluteFill style={{ opacity: rise(t, T_C4, 0.5) * (1 - stripOut) }}>
        {Array.from({ length: SG * SG }, (_, i) => {
          const r = Math.floor(i / SG);
          const c = i % SG;
          const v = gray28(4 + c * 3, 3 + r * 3);
          const gx = 960 - (SG / 2) * (SC + 30) + c * (SC + 30);
          const gy = 300 + r * (SC + 30);
          const lx = 960 - (SG * SG * SC) / 2 + i * SC;
          const ly = 540;
          const k = prog(unroll, r / SG * 0.6, r / SG * 0.6 + 0.4);
          return (
            <div key={i} style={{ position: "absolute", left: lerpN(gx, lx, k), top: lerpN(gy, ly, k), width: SC - 2, height: SC + 10, background: `rgb(${v},${v},${v})`, borderRadius: 3, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
              <span style={{ fontFamily: FONT_MONO, fontSize: 9, color: v > 128 ? "#000" : "#FFF", opacity: unroll }}>{v}</span>
            </div>
          );
        })}
        <Body size={28} at={{ x: 960, y: 760 }} center color={CORAL} style={{ opacity: unroll, whiteSpace: "nowrap" }}>
          二维的图像，被拉成了一长串“互不相干”的数字
        </Body>
      </AbsoluteFill>
      <AbsoluteFill style={{ transform: "scale(0.92)", transformOrigin: "50% 45%", opacity: stripOut }}>
      {panel(520, T_TL, 0, 0, "猫在左上角 → 用到这些权重", CYAN)}
      {panel(1110, T_BR, 5, 5, "猫在右下角 → 用到另一批权重", VIOLET)}
      <Heading size={44} at={{ x: 960, y: 140 }} center color={CORAL} style={{ opacity: diff }}>
        同一只猫，要分别重新学一遍
      </Heading>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const lerpN = (a: number, b: number, k: number) => a + (b - a) * k;

/* ── c5: stop and think ────────────────────────────────────────────────── */
const Think = ({ t }: { t: number }) => {
  const t0 = lineEnd("c5");
  const t1 = cue("c6");
  const k = rise(t, T_C5, 0.7);
  const ring = prog(t, t0, t1 - 0.2);
  const R = 120;
  const C = 2 * Math.PI * R;
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <svg width={320} height={320} style={{ position: "absolute", top: 180, left: 800, opacity: k }}>
        <circle cx={160} cy={160} r={R} stroke={FAINT} strokeWidth={4} fill="none" />
        <circle cx={160} cy={160} r={R} stroke={AMBER} strokeWidth={6} fill="none" strokeDasharray={C} strokeDashoffset={C * (1 - ring)} transform="rotate(-90 160 160)" strokeLinecap="round" />
        <text x={160} y={185} textAnchor="middle" fontFamily={FONT_TITLE} fontWeight={700} fontSize={64} fill={IVORY}>
          想一想
        </text>
      </svg>
      <div style={{ position: "absolute", top: 560, width: "100%", textAlign: "center", opacity: k }}>
        <div style={{ fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 58, color: IVORY, letterSpacing: 6 }}>如果是你，会怎样改进这个设计？</div>
        <div style={{ fontFamily: FONT_CN, fontSize: 26, color: DIM, marginTop: 30, opacity: rise(t, t0, 0.6) }}>提示：想想你自己是怎么看东西的 —— 可以先暂停视频</div>
      </div>
    </AbsoluteFill>
  );
};

/* ── c6: Hubel & Wiesel — a neuron that loves one orientation ─────────── */
export const barAngle = (t: number) => Math.sin((t - T_C6) * 0.9) * (Math.PI / 2) * 0.95;
export const firingRate = (t: number) => Math.max(0, Math.cos(barAngle(t))) ** 6;
const BIN = 1 / 90;
const spikeAt = (bin: number) => hash(bin * 0.731 + 17) < firingRate(bin * BIN) * 0.55 + 0.01;

const Hubel = ({ t }: { t: number }) => {
  const ang = barAngle(t);
  const rate = firingRate(t);
  const field = rise(t, T_SMALL, 0.6);
  const orient = rise(t, T_ORIENT, 0.6);
  const SW = 640;
  const SH = 470;
  const window = 3;
  const now = Math.floor(t / BIN);
  const spikes: number[] = [];
  for (let b = now - Math.floor(window / BIN); b <= now; b++) if (b * BIN > T_C6 && spikeAt(b)) spikes.push(b);
  return (
    <AbsoluteFill>
      <Heading size={44} at={{ x: 160, y: 140 }} style={{ opacity: rise(t, T_1959, 0.6) }}>
        1959 · 休伯尔与威泽尔的实验
      </Heading>
      <Mono at={{ x: 162, y: 210 }} size={16} style={{ opacity: rise(t, T_1959 + 0.3, 0.6) }}>
        HUBEL & WIESEL · 1981 年诺贝尔生理学或医学奖
      </Mono>
      {/* the stimulus screen the cat is looking at */}
      <div style={{ position: "absolute", left: 160, top: 300, width: SW, height: SH, borderRadius: 16, background: "#05070B", border: `1px solid ${FAINT}`, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: SW / 2 - 18, top: SH / 2 - 140, width: 36, height: 280, background: IVORY, boxShadow: `0 0 40px ${IVORY}`, transform: `rotate(${(ang * 180) / Math.PI}deg)`, borderRadius: 4 }} />
        <svg width={SW} height={SH} style={{ position: "absolute", inset: 0, opacity: field }}>
          <circle cx={SW / 2} cy={SH / 2} r={150} stroke={AMBER} strokeWidth={2} strokeDasharray="8 8" fill="none" />
          <text x={SW / 2 + 110} y={SH / 2 - 130} fill={AMBER} fontFamily={FONT_CN} fontSize={20}>
            感受野
          </text>
        </svg>
        <Mono at={{ x: 24, y: 20 }} size={14}>
          猫眼前的屏幕 · 一根光条在旋转
        </Mono>
      </div>
      {/* oscilloscope */}
      <div style={{ position: "absolute", left: 880, top: 300, width: 880, height: SH, borderRadius: 16, background: "rgba(6,12,10,0.9)", border: `1px solid ${LIME}44`, overflow: "hidden" }}>
        <svg width={880} height={SH} style={{ position: "absolute", inset: 0 }}>
          {Array.from({ length: 11 }, (_, i) => (
            <line key={i} x1={i * 88} y1={0} x2={i * 88} y2={SH} stroke={LIME} strokeOpacity={0.07} />
          ))}
          <line x1={0} y1={SH / 2} x2={880} y2={SH / 2} stroke={LIME} strokeOpacity={0.35} />
          {spikes.map((b) => {
            const x = 880 - ((now - b) * BIN * 880) / window;
            const h = 120 + hash(b) * 60;
            return <path key={b} d={`M ${x - 3} ${SH / 2} L ${x} ${SH / 2 - h} L ${x + 4} ${SH / 2 + h * 0.35} L ${x + 7} ${SH / 2}`} stroke={LIME} strokeWidth={2.5} fill="none" style={{ filter: "drop-shadow(0 0 4px #A8FF60)" }} />;
          })}
        </svg>
        <Mono at={{ x: 24, y: 20 }} size={14} color={LIME}>
          视觉皮层中一个神经元的放电
        </Mono>
        <div style={{ position: "absolute", right: 30, top: 18, fontFamily: FONT_MONO, fontSize: 20, color: LIME }}>{Math.round(rate * 48)} 次/秒</div>
      </div>
      <Body size={30} at={{ x: 960, y: 830 }} center color={rate > 0.5 ? LIME : DIM} style={{ opacity: orient, whiteSpace: "nowrap" }}>
        {rate > 0.5 ? "▲ 光条竖直时：疯狂放电" : "光条倾斜时：几乎沉默"}
      </Body>
    </AbsoluteFill>
  );
};

/* ── c7–c8: local connectivity, then weight sharing (3D) ──────────────── */
const G = 28;
const GS = 0.3;
const gxz = (x: number, y: number): [number, number] => [(x - (G - 1) / 2) * GS, (y - (G - 1) / 2) * GS];
const NEURON_GRID = Array.from({ length: 36 }, (_, i) => ({ x: 2 + (i % 6) * 4, y: 2 + Math.floor(i / 6) * 4 }));
const LAYER_Y = 2.6;

const ShareTiles = ({ nVisible, share }: { nVisible: number; share: number }) => {
  const tiles = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = tiles.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    for (let i = 0; i < G * G; i++) {
      const x = i % G;
      const y = Math.floor(i / G);
      const [px, pz] = gxz(x, y);
      dummy.position.set(px, 0, pz);
      dummy.scale.set(GS * 0.9, 0.05, GS * 0.9);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      const v = (gray28(x, y) / 255) * 0.8;
      color.setRGB(v, v, v);
      // tiles inside a visible receptive field take the kernel's colours once weights are shared
      const owner = NEURON_GRID.findIndex((n, k) => k < nVisible && Math.abs(x - n.x) <= 1 && Math.abs(y - n.y) <= 1);
      if (owner >= 0) {
        const w = KERNEL[y - NEURON_GRID[owner].y + 1][x - NEURON_GRID[owner].x + 1];
        const tint = new THREE.Color(w > 0 ? AMBER : w < 0 ? CYAN : "#556070").multiplyScalar(0.4 + 0.25 * Math.abs(w));
        const local = new THREE.Color(AMBER).multiplyScalar(0.35 + 0.4 * hash(owner * 9 + x * 3 + y));
        color.lerp(local.lerp(tint, share), 0.85);
      }
      m.setColorAt(i, color);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh ref={tiles} args={[undefined, undefined, G * G]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
};

const LocalShare = ({ t }: { t: number }) => {
  const share = ease.inOutCubic(prog(t, T_SHARE, T_SHARE + 1.0));
  const nVisible = t < T_LOCAL + 2.2 ? 1 : Math.min(36, 1 + Math.floor((t - T_LOCAL - 2.2) * 12));
  const lines = useMemo(() => new THREE.BufferGeometry(), []);
  const pts: number[] = [];
  NEURON_GRID.slice(0, nVisible).forEach((n) => {
    const [nx, nz] = gxz(n.x, n.y);
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const [px, pz] = gxz(n.x + dx, n.y + dy);
        pts.push(px, 0.04, pz, nx, LAYER_Y, nz);
      }
  });
  lines.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pts), 3));
  const a = -0.5 + prog(t, T_C7, T_C9) * 0.7;
  const pose: Pose = { position: [Math.sin(a) * 11, 8.5, Math.cos(a) * 11], target: [0, 0.8, 0], fov: 40 };
  return (
    <AbsoluteFill>
      <Stage3D pose={pose} bloom={0.9} threshold={0.3}>
        <ambientLight intensity={1} />
        <ShareTiles nVisible={nVisible} share={share} />
        <lineSegments geometry={lines}>
          <lineBasicMaterial color={share > 0.5 ? AMBER : CYAN} transparent opacity={0.55} toneMapped={false} />
        </lineSegments>
        {NEURON_GRID.slice(0, nVisible).map((n, k) => {
          const [nx, nz] = gxz(n.x, n.y);
          return (
            <mesh key={k} position={[nx, LAYER_Y, nz]} scale={k === 0 ? 0.2 : 0.13}>
              <sphereGeometry args={[1, 16, 8]} />
              <meshBasicMaterial color={share > 0.5 ? AMBER : CYAN} toneMapped={false} />
            </mesh>
          );
        })}
      </Stage3D>
      <Panel at={{ x: 120, y: 220 }} style={{ padding: "24px 32px", width: 560, opacity: rise(t, T_LOCAL - 0.2, 0.6) }} glow={CYAN}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: CYAN }}>01</div>
        <div style={{ fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 44, color: IVORY, marginTop: 6 }}>局部连接</div>
        <Body size={24} color={DIM} style={{ marginTop: 10 }}>
          每个神经元只看一小块 3×3 区域
        </Body>
      </Panel>
      <Panel at={{ x: 120, y: 480 }} style={{ padding: "24px 32px", width: 560, opacity: rise(t, T_SHARE - 0.2, 0.6) }} glow={AMBER}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: AMBER }}>02</div>
        <div style={{ fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 44, color: IVORY, marginTop: 6 }}>权重共享</div>
        <Body size={24} color={DIM} style={{ marginTop: 10 }}>
          所有位置使用<span style={{ color: AMBER }}>同一组</span> 9 个权重
        </Body>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 48px)", gap: 4, marginTop: 18, opacity: rise(t, T_REUSE, 0.5) }}>
          {KERNEL.flat().map((w, i) => (
            <div key={i} style={{ height: 40, borderRadius: 5, display: "flex", justifyContent: "center", alignItems: "center", fontFamily: FONT_MONO, fontSize: 18, color: w > 0 ? AMBER : w < 0 ? CYAN : DIM, background: "rgba(255,255,255,0.05)" }}>
              {w}
            </div>
          ))}
        </div>
      </Panel>
    </AbsoluteFill>
  );
};

/* ── c13: how many parameters? Area makes the ratio visible ────────────── */
const FC_EQUIV = 150528 * 290400;
const CONV1 = 34944;

const ParamArea = ({ t }: { t: number }) => {
  const big = rise(t, T_40B - 0.3, 1.0, ease.inOutCubic);
  const dot = rise(t, T_35K, 0.6);
  const ratio = rise(t, T_1M, 0.8);
  const side = 820;
  const dotSide = side / Math.sqrt(FC_EQUIV / CONV1);
  const X = 1000;
  const Y = 140;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: X, top: Y, width: side * big, height: side * big, background: `linear-gradient(135deg, ${CORAL}55, ${CORAL}22)`, border: `2px solid ${CORAL}`, boxShadow: `0 0 80px ${CORAL}33` }} />
      <div style={{ position: "absolute", left: X + 6, top: Y + 6, width: Math.max(1.5, dotSide), height: Math.max(1.5, dotSide), background: AMBER, opacity: dot }} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: dot }}>
        <circle cx={X + 7} cy={Y + 7} r={26} stroke={AMBER} strokeWidth={3} fill="none" />
        <line x1={X - 14} y1={Y + 20} x2={X - 110} y2={Y + 120} stroke={AMBER} strokeWidth={2} />
      </svg>
      <div style={{ position: "absolute", left: 140, top: 230, width: 760 }}>
        <div style={{ opacity: dot }}>
          <Mono size={16} color={AMBER}>
            卷积 · ALEXNET 第一层（96 个 11×11×3 卷积核）
          </Mono>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 84, fontWeight: 800, color: AMBER, marginTop: 6 }}>34,944</div>
          <Body size={26} color={DIM}>
            ← 右边那个几乎看不见的小点
          </Body>
        </div>
        <div style={{ opacity: big, marginTop: 50 }}>
          <Mono size={16} color={CORAL}>
            全连接 · 产生同样大小的输出（55×55×96）
          </Mono>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 72, fontWeight: 800, color: CORAL, marginTop: 6 }}>{fmtInt(FC_EQUIV * ease.outCubic(big))}</div>
          <Body size={26} color={DIM}>
            ≈ 437 亿 · 整个红色方块
          </Body>
        </div>
        <div style={{ marginTop: 50, opacity: ratio, fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 52, color: IVORY }}>
          面积之比 ≈ <span style={{ color: LIME }}>1 : 1,250,000</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ── c14: LeNet reads zip codes ────────────────────────────────────────── */
const LENET = [
  { w: 60, h: 160, label: "输入 32×32" },
  { w: 30, h: 140, label: "卷积" },
  { w: 30, h: 100, label: "池化" },
  { w: 30, h: 80, label: "卷积" },
  { w: 30, h: 56, label: "池化" },
  { w: 20, h: 140, label: "全连接" },
  { w: 20, h: 60, label: "10 个数字" },
];

const LeNet = ({ t }: { t: number }) => {
  const env = rise(t, T_1989 - 0.3, 0.8);
  const net = rise(t, T_C14 + 0.3, 0.8);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 150, top: 260, width: 700, height: 420, background: "#E9E2D0", borderRadius: 10, transform: `rotate(-3deg) translateY(${(1 - env) * 60}px)`, opacity: env, boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ position: "absolute", right: 40, top: 30, width: 90, height: 110, border: "3px dashed #B44", borderRadius: 4 }} />
        <div style={{ position: "absolute", left: 70, top: 150, fontFamily: FONT_HAND, fontSize: 40, color: "#223", lineHeight: 1.4 }}>
          1234 Main St.
          <br />
          Buffalo, NY
        </div>
        <div style={{ position: "absolute", left: 70, top: 300, display: "flex", gap: 18 }}>
          {"14221".split("").map((d, i) => {
            const k = rise(t, T_ZIP + i * 0.18, 0.35);
            return (
              <div key={i} style={{ width: 70, height: 84, border: `3px solid ${k > 0.5 ? "#1A7F3A" : "#99A"}`, borderRadius: 6, display: "flex", justifyContent: "center", alignItems: "center", fontFamily: FONT_HAND, fontSize: 60, color: "#111", transform: `rotate(${(hash(i) - 0.5) * 8}deg)` }}>
                {d}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ position: "absolute", left: 980, top: 300, display: "flex", alignItems: "center", gap: 18, opacity: net }}>
        {LENET.map((b, i) => (
          <div key={i} style={{ textAlign: "center", opacity: rise(t, T_C14 + 0.3 + i * 0.12, 0.4) }}>
            <div style={{ width: b.w, height: b.h, margin: "0 auto", border: `2px solid ${i === 0 ? IVORY : AMBER}`, background: `${AMBER}18`, borderRadius: 4 }} />
            <div style={{ fontFamily: FONT_CN, fontSize: 16, color: DIM, marginTop: 10, whiteSpace: "nowrap" }}>{b.label}</div>
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", left: 980, top: 560, opacity: net }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 56, fontWeight: 800, color: AMBER }}>LeNet</div>
        <Mono size={18} style={{ marginTop: 8 }}>
          YANN LECUN（杨立昆）· 贝尔实验室 · 1989
        </Mono>
        <Body size={26} color={DIM} style={{ marginTop: 18 }}>
          用美国邮局信件上的手写邮编训练，自动识别数字
        </Body>
      </div>
    </AbsoluteFill>
  );
};

/* ── c15: what is still missing ────────────────────────────────────────── */
const Missing = ({ t }: { t: number }) => {
  const cmp = rise(t, T_C15 + 0.2, 0.6);
  const slots = rise(t, T_THINGS, 0.6);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 300, top: 230, display: "flex", alignItems: "flex-end", gap: 120, opacity: cmp }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 90, height: 90, margin: "0 auto", background: "#EEE", display: "flex", justifyContent: "center", alignItems: "center", fontFamily: FONT_HAND, fontSize: 70, color: "#111" }}>7</div>
          <Mono size={16} style={{ marginTop: 16 }}>
            1989 · 小小的黑白数字
          </Mono>
        </div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 60, color: DIM, paddingBottom: 60 }}>→</div>
        <div style={{ textAlign: "center", opacity: rise(t, T_MISSING, 0.6) }}>
          <div style={{ width: 300, height: 300, margin: "0 auto", borderRadius: 10, overflow: "hidden" }}>
            <Img src={asset("cat.jpg")} style={{ width: "100%", height: "100%" }} />
          </div>
          <Mono size={16} style={{ marginTop: 16 }} color={CYAN}>
            真实世界的彩色照片 · 1000 类
          </Mono>
        </div>
      </div>
      <div style={{ position: "absolute", left: 1150, top: 300, display: "flex", flexDirection: "column", gap: 26, opacity: slots }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 420, height: 84, borderRadius: 14, border: `2px dashed ${AMBER}88`, display: "flex", alignItems: "center", gap: 20, paddingLeft: 26, opacity: rise(t, T_THINGS + i * 0.3, 0.5) }}>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 40, color: AMBER }}>?</span>
            <span style={{ fontFamily: FONT_CN, fontSize: 26, color: DIM }}>缺少的第 {i + 1} 样东西</span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const Conv = ({ t }: { t: number }) => (
  <AbsoluteFill style={{ background: BG }}>
    <Backdrop grid={0.03} />
    <Show t={t} from={S.start} to={T_C3 + 0.2} fadeIn={0.3}>
      <FullyConnected t={t} />
    </Show>
    <Show t={t} from={T_C3 - 0.2} to={T_C4 + 0.1}>
      <Overfit t={t} />
    </Show>
    <Show t={t} from={T_C4 - 0.1} to={T_C5 + 0.1}>
      <Position t={t} />
    </Show>
    <Show t={t} from={T_C5 - 0.1} to={T_C6 + 0.2}>
      <Think t={t} />
    </Show>
    <Show t={t} from={T_C6} to={T_C7 + 0.2}>
      <Hubel t={t} />
    </Show>
    <Show t={t} from={T_C7 - 0.1} to={T_C9 + 0.3}>
      <LocalShare t={t} />
    </Show>
    <Show t={t} from={T_C9} to={T_C12 + 0.2}>
      <ConvSlide t={t} />
    </Show>
    <Show t={t} from={T_C12 - 0.1} to={T_C13 + 0.2}>
      <EdgeReveal t={t} />
    </Show>
    <Show t={t} from={T_C13 - 0.1} to={T_C14 + 0.1}>
      <ParamArea t={t} />
    </Show>
    <Show t={t} from={T_C14 - 0.1} to={T_C15 + 0.1}>
      <LeNet t={t} />
    </Show>
    <Show t={t} from={T_C15 - 0.1} to={S.end}>
      <Missing t={t} />
    </Show>
  </AbsoluteFill>
);


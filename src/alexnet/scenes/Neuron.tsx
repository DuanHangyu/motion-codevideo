import { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Img } from "remotion";
import { Backdrop } from "../components/Frame";
import { Show } from "../components/Show";
import { Pose, Stage3D, V3, lerpPose, projector } from "../components/Stage3D";
import { Body, Heading, Mono, Panel } from "../components/ui";
import { clamp01, ease, hash, lerp, prog, rise, wobble } from "../lib/anim";
import { asset } from "../lib/data";
import { cue, scene } from "../lib/timeline";
import { loss } from "../lib/loss";
import { AMBER, BG, CORAL, CYAN, DIM, FAINT, FONT_CN, FONT_DISPLAY, FONT_MONO, FONT_TITLE, IVORY, LIME, VIOLET } from "../lib/theme";

const S = scene("neuron");
const T_N1 = cue("n1");
const T_UNIT = cue("n1", "神经元");
const T_N2 = cue("n2");
const T_INPUT = cue("n2", "接收");
const T_MUL = cue("n2", "乘上");
const T_SUM = cue("n2", "全部加起来");
const T_BIAS = cue("n2", "偏置");
const T_N3 = cue("n3");
const T_N4 = cue("n4");
const T_LAYER = cue("n4", "排成一层");
const T_STACK = cue("n4", "再把许多层");
const T_N5 = cue("n5");
const T_GUESS = cue("n5", "它猜");
const T_WRONG = cue("n5", "猜错了");
const T_LOSS = cue("n5", "损失");
const T_N6 = cue("n6");
const T_STEP = cue("n6", "每一步");
const T_GD = cue("n6", "梯度下降");
const T_N7 = cue("n7");
const T_BACK = cue("n7", "一层一层");
const T_KNOB = cue("n7", "告诉");
const T_N8 = cue("n8");
const T_80S = cue("n8", "80年代");
const T_WHY = cue("n8", "为什么");

/* ── network geometry ──────────────────────────────────────────────────── */
const LAYERS = [4, 7, 7, 5, 3];
const LX = (l: number) => (l - 2) * 3.4;
const NY = (n: number, i: number) => (i - (n - 1) / 2) * 1.25;
const NODES = LAYERS.flatMap((n, l) => Array.from({ length: n }, (_, i) => ({ l, i, p: [LX(l), NY(n, i), 0] as V3 })));
const SOLO = { l: 1, i: 3 };
const SOLO_P: V3 = [LX(1), NY(7, 3), 0];
type Edge = { a: V3; b: V3; w: number; l: number; solo: boolean; k: number };
const EDGES: Edge[] = [];
for (let l = 0; l < LAYERS.length - 1; l++) {
  for (let i = 0; i < LAYERS[l]; i++) {
    for (let j = 0; j < LAYERS[l + 1]; j++) {
      const k = EDGES.length;
      EDGES.push({ a: [LX(l), NY(LAYERS[l], i), 0], b: [LX(l + 1), NY(LAYERS[l + 1], j), 0], w: hash(k * 1.7 + 3) * 2 - 1, l, solo: l === 0 && j === SOLO.i, k });
    }
  }
}
const SOLO_EDGES = EDGES.filter((e) => e.solo);
const INPUT_VALUES = [0.8, 0.3, 0.9, 0.5];

const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/** A glowing cylinder between two points. */
const Beam = ({ a, b, r, color, opacity = 1 }: { a: V3; b: V3; r: number; color: string; opacity?: number }) => {
  tmpA.set(...a);
  tmpB.set(...b);
  const len = tmpA.distanceTo(tmpB);
  const mid = tmpA.clone().add(tmpB).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(UP, tmpB.clone().sub(tmpA).normalize());
  return (
    <mesh position={mid} quaternion={q}>
      <cylinderGeometry args={[r, r, len, 10, 1]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} toneMapped={false} />
    </mesh>
  );
};

/** Lines for the whole network in one draw call. */
const Wires = ({ alpha, highlight }: { alpha: number; highlight: (e: Edge) => number }) => {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(EDGES.flatMap((e) => [...e.a, ...e.b])), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(EDGES.length * 6), 3));
    return g;
  }, []);
  const col = geo.getAttribute("color") as THREE.BufferAttribute;
  const c = new THREE.Color();
  EDGES.forEach((e, k) => {
    const h = highlight(e);
    c.set(e.w > 0 ? AMBER : CYAN).multiplyScalar((0.12 + 0.35 * Math.abs(e.w)) * alpha + h);
    col.setXYZ(k * 2, c.r, c.g, c.b);
    col.setXYZ(k * 2 + 1, c.r, c.g, c.b);
  });
  col.needsUpdate = true;
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial vertexColors transparent opacity={1} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </lineSegments>
  );
};

/** Pulses travelling along edges: forward (cyan) or backward (amber). */
const Pulses = ({ t, t0, dir, alpha }: { t: number; t0: number; dir: 1 | -1; alpha: number }) => {
  const LAYER_T = 0.55;
  const pts = useMemo(() => new Float32Array(EDGES.length * 3), []);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    return g;
  }, [pts]);
  const local = t - t0;
  const span = (LAYERS.length - 1) * LAYER_T;
  const cycle = local % (span + 0.6);
  EDGES.forEach((e, k) => {
    const order = dir === 1 ? e.l : LAYERS.length - 2 - e.l;
    let u = (cycle - order * LAYER_T) / LAYER_T;
    if (local < 0 || u < 0 || u > 1) u = -10;
    const from = dir === 1 ? e.a : e.b;
    const to = dir === 1 ? e.b : e.a;
    pts.set(u < -1 ? [0, 0, -999] : [lerp(from[0], to[0], u), lerp(from[1], to[1], u), lerp(from[2], to[2], u)], k * 3);
  });
  (geo.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
  return (
    <points geometry={geo} frustumCulled={false}>
      <pointsMaterial size={0.22} color={dir === 1 ? CYAN : AMBER} transparent opacity={alpha} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </points>
  );
};

const Nodes = ({ t, solo, rest, glow }: { t: number; solo: number; rest: number; glow: (l: number, i: number) => number }) => (
  <group>
    {NODES.map(({ l, i, p }) => {
      const isSolo = l === SOLO.l && i === SOLO.i;
      const isInput = l === 0;
      const vis = isSolo || isInput ? solo : rest;
      if (vis < 0.01) return null;
      const g = glow(l, i);
      const base = isSolo ? AMBER : isInput ? CYAN : IVORY;
      return (
        <mesh key={`${l}-${i}`} position={p} scale={(isSolo ? 0.42 : 0.26) * (0.6 + 0.4 * vis) * (1 + 0.25 * g)}>
          <sphereGeometry args={[1, 32, 16]} />
          <meshBasicMaterial color={base} transparent opacity={vis * (0.35 + 0.65 * Math.min(1, 0.3 + g))} toneMapped={false} />
        </mesh>
      );
    })}
    {/* soft halo on the solo neuron */}
    <mesh position={SOLO_P} scale={0.9 + 0.08 * Math.sin(t * 4)}>
      <sphereGeometry args={[1, 32, 16]} />
      <meshBasicMaterial color={AMBER} transparent opacity={0.12 * solo} depthWrite={false} toneMapped={false} />
    </mesh>
  </group>
);

const netPose = (t: number): Pose => {
  const solo: Pose = { position: [LX(0.5) + 0.9, 0.2, 9.6], target: [LX(0.5) + 0.9, -0.15, 0], fov: 40 };
  const wide: Pose = { position: [2.5, 2.4, 17.5], target: [0, 0, 0], fov: 42 };
  const k = ease.inOutCubic(prog(t, T_LAYER - 0.4, T_STACK + 1.2));
  const p = lerpPose(solo, wide, k);
  const drift = wobble(t * 0.4, 3) * 0.35;
  return { ...p, position: [p.position[0] + drift, p.position[1] + wobble(t * 0.3, 5) * 0.2, p.position[2]] };
};

const Network = ({ t, mode }: { t: number; mode: "build" | "back" }) => {
  const pose = mode === "build" ? netPose(t) : { position: [-2.2, 1.6, 16] as V3, target: [0, 0, 0] as V3, fov: 42 };
  const proj = projector(pose);
  const solo = mode === "build" ? rise(t, T_N1 + 0.2, 1.0) : 1;
  const rest = mode === "build" ? rise(t, T_LAYER - 0.2, 1.4) : 1;
  const mul = rise(t, T_MUL, 0.5);
  const fwd = mode === "build" ? rise(t, T_STACK + 0.6, 0.6) : 0;
  const back = mode === "back" ? rise(t, T_N7 + 0.2, 0.6) : 0;
  const knobSpin = mode === "back" ? prog(t, T_KNOB, T_KNOB + 2.0) : prog(t, T_N3 + 0.4, T_N3 + 3.4);
  const weightOf = (e: Edge, k: number) => e.w + (mode === "back" ? -0.6 * Math.sign(e.w) * ease.inOutSine(knobSpin) * 0.5 : Math.sin(knobSpin * Math.PI * 2 + k) * 0.35 * (t > T_N3 ? 1 : 0));
  const sum = rise(t, T_SUM, 0.5);
  return (
    <AbsoluteFill>
      <Stage3D pose={pose} bloom={1.0} threshold={0.3}>
        <Wires alpha={rest} highlight={(e) => (e.solo ? 0 : 0) + (mode === "back" ? 0.15 * back : 0)} />
        {mode === "build" &&
          SOLO_EDGES.map((e, k) => {
            const w = weightOf(e, k);
            return <Beam key={e.k} a={e.a} b={e.b} r={0.025 + 0.06 * Math.abs(w) * mul} color={w > 0 ? AMBER : CYAN} opacity={solo * (0.5 + 0.5 * mul) * (1 - rest * 0.6)} />;
          })}
        {mode === "build" && <Beam a={SOLO_P} b={[SOLO_P[0] + 2.2 * sum, SOLO_P[1], 0]} r={0.05} color={AMBER} opacity={sum * (1 - rest)} />}
        <Nodes t={t} solo={solo} rest={rest} glow={(l, i) => (fwd > 0 ? 0.5 + 0.5 * Math.sin(t * 5 - l * 1.3 + i) : 0.4)} />
        {fwd > 0 && <Pulses t={t} t0={T_STACK + 0.6} dir={1} alpha={fwd} />}
        {back > 0 && <Pulses t={t} t0={T_N7 + 0.2} dir={-1} alpha={back} />}
      </Stage3D>
      {mode === "build" && (
        <>
          {/* input values and weight labels around the solo neuron */}
          {SOLO_EDGES.map((e, k) => {
            const a = proj(...e.a);
            const m = proj((e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2 + 0.18, 0);
            const w = weightOf(e, k);
            const kin = rise(t, T_INPUT + k * 0.15, 0.4) * (1 - rest);
            return (
              <div key={e.k}>
                <div style={{ position: "absolute", left: a.x - 210, top: a.y - 20, width: 130, textAlign: "right", fontFamily: FONT_MONO, fontSize: 26, color: CYAN, opacity: kin }}>
                  x{"₁₂₃₄"[3 - k]}={INPUT_VALUES[3 - k]}
                </div>
                <div style={{ position: "absolute", left: m.x - 50, top: m.y - 38, fontFamily: FONT_MONO, fontSize: 22, color: w > 0 ? AMBER : CYAN, opacity: mul * (1 - rest) }}>
                  w{"₁₂₃₄"[3 - k]}={w.toFixed(2)}
                </div>
                {/* weight knob */}
                {t > T_N3 - 0.2 && (
                  <svg width={70} height={70} style={{ position: "absolute", left: m.x - 120, top: m.y - 50, opacity: rise(t, T_N3, 0.5) * (1 - rest) }}>
                    <circle cx={35} cy={35} r={26} fill="rgba(10,15,28,0.9)" stroke={AMBER} strokeWidth={2} />
                    <line x1={35} y1={35} x2={35 + Math.sin(w * 2.4) * 22} y2={35 - Math.cos(w * 2.4) * 22} stroke={AMBER} strokeWidth={4} strokeLinecap="round" />
                  </svg>
                )}
              </div>
            );
          })}
          <Formula t={t} rest={rest} />
        </>
      )}
      {mode === "build" && <LayerLabels t={t} proj={proj} />}
      {mode === "build" && <Guess t={t} />}
      {mode === "back" && <BackLabels t={t} proj={proj} />}
    </AbsoluteFill>
  );
};

const Formula = ({ t, rest }: { t: number; rest: number }) => {
  const k = rise(t, T_MUL - 0.3, 0.6) * (1 - rest);
  const terms = [0, 1, 2, 3];
  const sum = rise(t, T_SUM, 0.5);
  const bias = rise(t, T_BIAS, 0.5);
  return (
    <Panel at={{ x: 1400, y: 790 }} center style={{ padding: "22px 44px", opacity: k, whiteSpace: "nowrap" }}>
      <span style={{ fontFamily: FONT_DISPLAY, fontSize: 40, color: IVORY }}>
        <span style={{ color: AMBER }}>y</span> ={" "}
        {terms.map((i) => (
          <span key={i} style={{ opacity: 0.35 + 0.65 * rise(t, T_MUL + i * 0.18, 0.3) }}>
            {i > 0 && <span style={{ color: sum > 0.5 ? LIME : DIM }}> + </span>}
            <span style={{ color: AMBER }}>w{"₁₂₃₄"[i]}</span>
            <span style={{ color: CYAN }}>x{"₁₂₃₄"[i]}</span>
          </span>
        ))}
        <span style={{ opacity: bias }}>
          {" "}
          + <span style={{ color: VIOLET }}>b</span>
        </span>
      </span>
      <div style={{ display: "flex", justifyContent: "space-around", fontFamily: FONT_CN, fontSize: 20, color: DIM, marginTop: 10 }}>
        <span style={{ color: AMBER, opacity: rise(t, T_MUL, 0.4) }}>乘权重</span>
        <span style={{ color: LIME, opacity: sum }}>求和</span>
        <span style={{ color: VIOLET, opacity: bias }}>加偏置</span>
      </div>
    </Panel>
  );
};

const LayerLabels = ({ t, proj }: { t: number; proj: ReturnType<typeof projector> }) => {
  const k = rise(t, T_STACK + 0.4, 0.8) * (1 - rise(t, T_N5 - 0.3, 0.4));
  const names = ["输入层", "隐藏层", "隐藏层", "隐藏层", "输出层"];
  return (
    <>
      {LAYERS.map((n, l) => {
        const p = proj(LX(l), NY(n, 0) - 1.0, 0);
        return (
          <Mono key={l} at={{ x: p.x, y: p.y }} center size={18} color={l === 0 ? CYAN : l === 4 ? AMBER : DIM} style={{ opacity: k }}>
            {names[l]}
          </Mono>
        );
      })}
    </>
  );
};

/** The network guesses "dog", the truth is "cat" → a loss. */
const Guess = ({ t }: { t: number }) => {
  const k = rise(t, T_N5 + 0.2, 0.6);
  const wrong = rise(t, T_WRONG, 0.5);
  const loss = rise(t, T_LOSS - 0.3, 0.8);
  if (k <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity: k }}>
      <div style={{ position: "absolute", left: 80, top: 380, width: 220, height: 220, borderRadius: 14, overflow: "hidden", boxShadow: `0 0 0 2px ${CYAN}` }}>
        <Img src={asset("cat.jpg")} style={{ width: "100%", height: "100%" }} />
      </div>
      <Panel at={{ x: 1460, y: 300 }} style={{ width: 400, padding: "28px 32px" }} glow={CORAL}>
        <Mono size={15}>网络的猜测</Mono>
        {[
          ["狗", 0.62],
          ["猫", 0.27],
          ["兔子", 0.11],
        ].map(([n, p], i) => (
          <div key={n as string} style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16, opacity: rise(t, T_GUESS + i * 0.15, 0.4) }}>
            <span style={{ fontFamily: FONT_CN, fontSize: 28, color: IVORY, width: 70 }}>{n}</span>
            <div style={{ flex: 1, height: 18, background: "rgba(255,255,255,0.06)", borderRadius: 9 }}>
              <div style={{ width: `${(p as number) * 100}%`, height: "100%", borderRadius: 9, background: i === 0 ? CORAL : i === 1 ? LIME : DIM }} />
            </div>
            <span style={{ fontFamily: FONT_MONO, fontSize: 20, color: DIM, width: 54 }}>{Math.round((p as number) * 100)}%</span>
          </div>
        ))}
        <div style={{ marginTop: 22, fontFamily: FONT_CN, fontSize: 26, color: CORAL, opacity: wrong }}>✗ 正确答案是：猫</div>
      </Panel>
      <Panel at={{ x: 1460, y: 680 }} style={{ width: 400, padding: "22px 32px", opacity: loss }} glow={CORAL}>
        <Mono size={15} color={CORAL}>
          LOSS · 损失 = 错得有多离谱
        </Mono>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 64, fontWeight: 800, color: CORAL, marginTop: 6 }}>{(1.31 * ease.outCubic(loss)).toFixed(2)}</div>
      </Panel>
    </AbsoluteFill>
  );
};

const BackLabels = ({ t, proj }: { t: number; proj: ReturnType<typeof projector> }) => {
  const k = rise(t, T_N7 + 0.3, 0.6);
  const o = proj(LX(4) + 1.3, 0, 0);
  const i = proj(LX(0) - 1.3, 0, 0);
  const knob = rise(t, T_KNOB, 0.6);
  return (
    <AbsoluteFill style={{ opacity: k }}>
      <div style={{ position: "absolute", left: o.x - 40, top: o.y - 340, fontFamily: FONT_CN, fontSize: 28, color: CORAL }}>误差</div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="bp" x1="1" x2="0">
            <stop offset="0" stopColor={CORAL} />
            <stop offset="1" stopColor={AMBER} />
          </linearGradient>
        </defs>
        <path d={`M ${o.x} ${o.y - 300} L ${i.x} ${i.y - 300}`} stroke="url(#bp)" strokeWidth={4} strokeDasharray="14 10" strokeDashoffset={-(t * 80) % 24} />
        <path d={`M ${i.x + 20} ${i.y - 318} L ${i.x} ${i.y - 300} L ${i.x + 20} ${i.y - 282}`} stroke={AMBER} strokeWidth={4} fill="none" />
      </svg>
      <Heading size={44} at={{ x: 960, y: 130 }} center color={AMBER}>
        反向传播 <span style={{ fontFamily: FONT_MONO, fontSize: 22, color: DIM }}>BACKPROPAGATION</span>
      </Heading>
      <Body size={28} at={{ x: 960, y: 900 }} center color={IVORY} style={{ opacity: knob, whiteSpace: "nowrap" }}>
        每个权重都知道：<span style={{ color: AMBER }}>往哪边拧</span>、<span style={{ color: AMBER }}>拧多少</span>
      </Body>
    </AbsoluteFill>
  );
};

/* ── the loss landscape and gradient descent ───────────────────────────── */
const PATH = (() => {
  const pts: Array<[number, number, number]> = [];
  let x = 4.6;
  let z = 4.0;
  for (let i = 0; i < 40; i++) {
    pts.push([x, loss(x, z), z]);
    const e = 1e-3;
    const gx = (loss(x + e, z) - loss(x - e, z)) / (2 * e);
    const gz = (loss(x, z + e) - loss(x, z - e)) / (2 * e);
    x -= 0.55 * gx;
    z -= 0.55 * gz;
  }
  return pts;
})();

const Terrain = () => {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(14, 14, 140, 140);
    g.rotateX(-Math.PI / 2);
    const pos = g.getAttribute("position") as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const lo = new THREE.Color("#0A3A66");
    const mid = new THREE.Color(VIOLET);
    const hi = new THREE.Color(CORAL);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = loss(x, z);
      pos.setY(i, y);
      const h = clamp01(y / 4.2);
      c.copy(lo).lerp(mid, clamp01(h * 2)).lerp(hi, clamp01(h * 2 - 1));
      colors.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <group>
      <mesh geometry={geo}>
        <meshStandardMaterial vertexColors roughness={0.55} metalness={0.15} />
      </mesh>
      <mesh geometry={geo} position={[0, 0.01, 0]}>
        <meshBasicMaterial color={CYAN} wireframe transparent opacity={0.08} />
      </mesh>
    </group>
  );
};

const Descent = ({ t }: { t: number }) => {
  const steps = (PATH.length - 1) * ease.inOutSine(prog(t, T_STEP - 0.4, T_GD + 1.5));
  const i = Math.floor(steps);
  const f = steps - i;
  const a = PATH[i];
  const b = PATH[Math.min(PATH.length - 1, i + 1)];
  const ball: V3 = [lerp(a[0], b[0], f), lerp(a[1], b[1], f) + 0.22, lerp(a[2], b[2], f)];
  const pose: Pose = { position: [14 + wobble(t * 0.2, 1) * 0.5, 14, 15.5 - prog(t, T_N6, T_N7) * 2.5], target: [0, 1.1, 0], fov: 40 };
  const proj = projector(pose);
  const bp = proj(...ball);
  const trail = PATH.slice(0, i + 1).map((p) => [p[0], p[1] + 0.08, p[2]] as V3);
  return (
    <AbsoluteFill>
      <Stage3D pose={pose} bloom={0.8} threshold={0.5} fog={[18, 34]}>
        <ambientLight intensity={0.45} />
        <directionalLight position={[6, 10, 4]} intensity={2} />
        <pointLight position={ball} intensity={6} distance={4} color={AMBER} />
        <Terrain />
        <mesh position={ball} scale={0.22}>
          <sphereGeometry args={[1, 32, 16]} />
          <meshBasicMaterial color={AMBER} toneMapped={false} />
        </mesh>
        {trail.slice(1).map((p, k) => (
          <Beam key={k} a={trail[k]} b={p} r={0.035} color={AMBER} opacity={0.9} />
        ))}
      </Stage3D>
      <Mono at={{ x: bp.x + 30, y: bp.y - 50 }} size={18} color={AMBER} style={{ opacity: rise(t, T_STEP, 0.5) }}>
        当前的权重 · LOSS {(ball[1] - 0.22).toFixed(2)}
      </Mono>
      <Heading size={52} at={{ x: 120, y: 160 }} style={{ opacity: rise(t, T_N6 + 0.3, 0.7) }}>
        损失的山地
      </Heading>
      <Body size={26} color={DIM} at={{ x: 122, y: 240 }} style={{ opacity: rise(t, T_N6 + 0.6, 0.7) }}>
        高度 = 损失 · 位置 = 所有权重的取值
      </Body>
      <Panel at={{ x: 120, y: 760 }} style={{ padding: "20px 30px", opacity: rise(t, T_GD - 0.2, 0.6) }}>
        <div style={{ fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 40, color: AMBER }}>梯度下降</div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 22, color: IVORY, marginTop: 10 }}>w ← w − η · ∂Loss/∂w</div>
        <div style={{ fontFamily: FONT_CN, fontSize: 20, color: DIM, marginTop: 8 }}>沿着最陡的下坡方向，迈一小步</div>
      </Panel>
    </AbsoluteFill>
  );
};

/* ── the ideas were all there by the 1980s ─────────────────────────────── */
const MILESTONES = [
  { y: 1943, zh: "人工神经元模型", who: "McCulloch & Pitts" },
  { y: 1958, zh: "感知机", who: "Rosenblatt" },
  { y: 1986, zh: "反向传播", who: "Rumelhart · Hinton · Williams" },
  { y: 1989, zh: "卷积神经网络", who: "LeCun" },
];

const History = ({ t }: { t: number }) => {
  const X0 = 180;
  const X1 = 1740;
  const yr = (y: number) => X0 + ((y - 1940) / (2015 - 1940)) * (X1 - X0);
  const axis = rise(t, T_N8, 1.2);
  const why = rise(t, T_WHY, 0.8);
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <line x1={X0} y1={560} x2={X0 + (X1 - X0) * axis} y2={560} stroke={FAINT} strokeWidth={2} />
        {[1940, 1960, 1980, 2000].map((y) => (
          <text key={y} x={yr(y)} y={600} fill={DIM} fontFamily={FONT_MONO} fontSize={16} textAnchor="middle" opacity={axis}>
            {y}
          </text>
        ))}
        <rect x={yr(1980)} y={540} width={yr(1990) - yr(1980)} height={40} fill={AMBER} opacity={0.12 * rise(t, T_80S, 0.6)} />
      </svg>
      {MILESTONES.map((m, i) => {
        const k = rise(t, T_N8 + 0.3 + i * 0.35, 0.5);
        const up = i % 2 === 0;
        return (
          <div key={m.y} style={{ position: "absolute", left: yr(m.y) - 4, top: up ? 340 : 580, opacity: k, transform: `translateY(${(1 - k) * (up ? 20 : -20)}px)` }}>
            <div style={{ position: "absolute", left: 0, top: up ? 160 : -20, width: 8, height: 8, borderRadius: 4, background: AMBER, boxShadow: `0 0 16px ${AMBER}` }} />
            <div style={{ position: "absolute", left: 3, top: up ? 100 : 0, width: 2, height: 60, background: `${AMBER}66` }} />
            <div style={{ position: "absolute", left: -80, top: up ? 0 : 70, width: 260 }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 36, fontWeight: 700, color: AMBER }}>{m.y}</div>
              <div style={{ fontFamily: FONT_CN, fontSize: 28, color: IVORY, marginTop: 4 }}>{m.zh}</div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 16, color: DIM, marginTop: 4 }}>{m.who}</div>
            </div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: yr(2012) - 90, top: 400, width: 180, textAlign: "center", opacity: why, transform: `scale(${0.6 + 0.4 * ease.outBack(why)})` }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 40, fontWeight: 800, color: CYAN }}>2012</div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 110, fontWeight: 800, color: CYAN, textShadow: `0 0 60px ${CYAN}`, lineHeight: 1 }}>?</div>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: why }}>
        <line x1={yr(1989) + 20} y1={560} x2={yr(2012) - 20} y2={560} stroke={CORAL} strokeWidth={3} strokeDasharray="4 10" />
      </svg>
      <Body size={26} at={{ x: (yr(1989) + yr(2012)) / 2, y: 610 }} center color={CORAL} style={{ opacity: why, whiteSpace: "nowrap" }}>
        沉寂了二十多年
      </Body>
    </AbsoluteFill>
  );
};

export const Neuron = ({ t }: { t: number }) => (
  <AbsoluteFill style={{ background: BG }}>
    <Backdrop grid={0.03} />
    <Show t={t} from={S.start} to={T_N6 + 0.1} fadeIn={0.3}>
      <Network t={t} mode="build" />
      <Heading size={34} at={{ x: 960, y: 140 }} center color={AMBER} style={{ opacity: rise(t, T_UNIT, 0.6) * (1 - rise(t, T_MUL - 0.4, 0.4)) }}>
        神经元 · NEURON
      </Heading>
    </Show>
    <Show t={t} from={T_N6 - 0.3} to={T_N7 + 0.2}>
      <Descent t={t} />
    </Show>
    <Show t={t} from={T_N7 - 0.1} to={T_N8 + 0.1}>
      <Network t={t} mode="back" />
    </Show>
    <Show t={t} from={T_N8 - 0.1} to={S.end}>
      <History t={t} />
    </Show>
  </AbsoluteFill>
);

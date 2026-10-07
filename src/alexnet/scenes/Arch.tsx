import { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Img } from "remotion";
import { Backdrop } from "../components/Frame";
import { Show } from "../components/Show";
import { Pose, Stage3D, V3, lerpPose, projector } from "../components/Stage3D";
import { Body, Heading, Mono, Panel } from "../components/ui";
import { ease, flash, fmtInt, hash, lerp, prog, rise, wobble } from "../lib/anim";
import { DATA, PRED_ZH, asset } from "../lib/data";
import { cue, scene } from "../lib/timeline";
import { useLoadedTextures } from "../lib/texture";
import { BLOCKS, Block, CONV_PARAMS, FC_PARAMS, Kind, MAX_PARAMS, MID_X, END_X, byId } from "../lib/arch";
import { AMBER, BG, CORAL, CYAN, DIM, FAINT, FONT_CN, FONT_DISPLAY, FONT_MONO, FONT_TITLE, IVORY, LIME, VIOLET } from "../lib/theme";

const S = scene("arch");
const T_A1 = cue("a1");
const T_A2 = cue("a2");
const T_A3 = cue("a3");
const T_STRIDE = cue("a3", "步长");
const T_55 = cue("a3", "55乘55");
const T_A4 = cue("a4");
const T_C2 = cue("a4", "第二层");
const T_A5 = cue("a5");
const T_A6 = cue("a6");
const T_SEE = cue("a6", "看");
const T_THINK = cue("a6", "想");
const T_A7 = cue("a7");
const T_1000 = cue("a7", "最后一层");
const T_SOFTMAX = cue("a7", "softmax");
const T_A8 = cue("a8");
const T_60M = cue("a8", "六千万");
const T_95 = cue("a8", "超过百分之九十五");
const T_A9 = cue("a9");
const T_A10 = cue("a10");
const T_TABBY = cue("a10", "虎斑猫");
const T_A11 = cue("a11");
const T_FACE = cue("a11", "猫的脸");

const KIND_COLOR: Record<Kind, string> = { img: IVORY, conv: AMBER, pool: CYAN, fc: VIOLET };

/* ── 3D pieces ─────────────────────────────────────────────────────────── */
const Slab = ({ b, alpha, heat, lit }: { b: Block; alpha: number; heat: number; lit: number }) => {
  const geo = useMemo(() => new THREE.BoxGeometry(b.w, b.h, b.kind === "fc" ? 0.22 : b.h), [b]);
  const edges = useMemo(() => new THREE.EdgesGeometry(geo), [geo]);
  const base = new THREE.Color(KIND_COLOR[b.kind]);
  const hot = new THREE.Color(CORAL);
  const col = base.clone().lerp(hot, heat);
  return (
    <group position={[b.x, 0, 0]}>
      <mesh geometry={geo}>
        <meshBasicMaterial color={col} transparent opacity={(0.07 + 0.25 * heat + 0.12 * lit) * alpha} depthWrite={false} toneMapped={false} />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={col} transparent opacity={(0.55 + 0.45 * lit) * alpha} toneMapped={false} />
      </lineSegments>
    </group>
  );
};

/** Real feature map / photo on the face that looks back toward the input. */
const Face = ({ b, tex, alpha }: { b: Block; tex: THREE.Texture; alpha: number }) => {
  const size = b.h * 0.98;
  return (
    <mesh position={[b.x - b.w / 2 - 0.005, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial map={tex} color="#8C8C8C" transparent opacity={alpha} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
};

/** FC layers drawn as columns of neurons. */
const Neurons = ({ b, alpha, lit }: { b: Block; alpha: number; lit: number }) => {
  const n = b.s === 4096 ? 40 : 22;
  const geo = useMemo(() => {
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) p.set([b.x, (i / (n - 1) - 0.5) * (b.h - 0.2), 0], i * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    return g;
  }, [b, n]);
  return (
    <points geometry={geo}>
      <pointsMaterial color={lit > 0.3 ? IVORY : VIOLET} size={0.14} transparent opacity={alpha} toneMapped={false} />
    </points>
  );
};

/** Conv1's receptive-field frustum: an 11×11 window on the input → one point of conv1. */
const Frustum = ({ k, sweep }: { k: number; sweep: number }) => {
  const inp = byId("input");
  const c1 = byId("conv1");
  const fx = inp.x;
  const half = (inp.h * (11 / 224)) / 2;
  const cy = lerp(1.6, -1.6, sweep);
  const cz = lerp(-1.6, 1.6, (sweep * 7) % 1);
  const ty = (cy / inp.h) * c1.h;
  const tz = (cz / inp.h) * c1.h;
  const corners: V3[] = [
    [fx, cy - half, cz - half],
    [fx, cy + half, cz - half],
    [fx, cy + half, cz + half],
    [fx, cy - half, cz + half],
  ];
  const geo = useMemo(() => new THREE.BufferGeometry(), []);
  const tip: V3 = [c1.x - c1.w / 2, ty, tz];
  const pts = corners.flatMap((c, i) => [...c, ...tip, ...c, ...corners[(i + 1) % 4]]);
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pts), 3));
  return (
    <group>
      <lineSegments geometry={geo}>
        <lineBasicMaterial color={AMBER} transparent opacity={k} toneMapped={false} />
      </lineSegments>
      <mesh position={tip} scale={0.06 * k}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshBasicMaterial color={IVORY} toneMapped={false} />
      </mesh>
    </group>
  );
};

/** Data particles streaming through the network during the forward pass. */
const PCOUNT = 2600;
const extentAt = (x: number) => {
  let prev = BLOCKS[0];
  for (const b of BLOCKS) {
    if (b.x >= x) {
      const k = prog(x, prev.x, b.x);
      return lerp(prev.h, b.h, k) * 0.45;
    }
    prev = b;
  }
  return prev.h * 0.45;
};
const Stream = ({ t, t0, alpha }: { t: number; t0: number; alpha: number }) => {
  const pos = useMemo(() => new Float32Array(PCOUNT * 3), []);
  const col = useMemo(() => new Float32Array(PCOUNT * 3), []);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, [pos, col]);
  const a = new THREE.Color(CYAN);
  const b = new THREE.Color(AMBER);
  const c = new THREE.Color();
  for (let i = 0; i < PCOUNT; i++) {
    const delay = hash(i * 1.3) * 1.6;
    const speed = 5.5 + hash(i * 2.1) * 2.5;
    const x = (t - t0 - delay) * speed;
    if (x < 0 || x > END_X + 0.5) {
      pos.set([0, 0, -999], i * 3);
      continue;
    }
    const e = extentAt(x);
    const y = (hash(i * 3.7) - 0.5) * 2 * e;
    const z = (hash(i * 5.9) - 0.5) * 2 * e;
    pos.set([x, y * (x > byId("fc6").x - 0.5 ? 0.9 : 1), x > byId("fc6").x - 0.5 ? z * 0.08 : z], i * 3);
    c.copy(a).lerp(b, x / END_X);
    col.set([c.r, c.g, c.b], i * 3);
  }
  (geo.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
  (geo.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;
  return (
    <points geometry={geo} frustumCulled={false}>
      <pointsMaterial size={0.06} vertexColors transparent opacity={alpha} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </points>
  );
};

/* ── camera choreography ───────────────────────────────────────────────── */
const focus = (id: string, dist = 9, side = 0.75, up = 2.4): Pose => {
  const b = byId(id);
  return { position: [b.x - Math.cos(side) * dist, up, Math.sin(side) * dist], target: [b.x + 1.0, 0, 0], fov: 40 };
};
const WIDE: Pose = { position: [MID_X - 8, 6.5, 17], target: [MID_X, -0.3, 0], fov: 40 };

const KEYS: Array<[number, Pose]> = [
  [S.start, { position: [MID_X - 18, 10, 26], target: [MID_X, 0, 0], fov: 40 }],
  [T_A1 + 2.5, WIDE],
  [T_A2 + 0.3, focus("input", 8.5, 0.95, 2.2)],
  [T_A3 + 0.6, focus("conv1", 8, 0.85, 2.6)],
  [T_A4 + 0.4, focus("conv2", 9, 0.8, 2.6)],
  [T_A5 + 0.6, focus("conv4", 13, 0.95, 3.6)],
  [T_A6 + 0.6, WIDE],
  [T_A7 + 0.6, { position: [byId("fc7").x - 7, 2.6, 9.5], target: [byId("fc7").x + 0.5, 0, 0], fov: 40 }],
  [T_A8 + 0.6, { ...WIDE, position: [MID_X - 6, 9, 22] }],
  [T_A9 + 0.4, { position: [-5, 2.2, 6.5], target: [2, 0, 0], fov: 46 }],
  [T_A9 + 3.6, { position: [END_X - 2, 2.5, 7.5], target: [END_X + 1, 0, 0], fov: 46 }],
  [T_A10, { position: [END_X - 5, 3, 11], target: [END_X + 1.5, 0, 0], fov: 42 }],
];

const archPose = (t: number): Pose => {
  let i = 0;
  while (i < KEYS.length - 1 && t >= KEYS[i + 1][0]) i++;
  const [t0, a] = KEYS[i];
  const next = KEYS[Math.min(KEYS.length - 1, i + 1)];
  const dur = i === KEYS.length - 1 ? 1 : Math.min(2.2, next[0] - t0);
  // move to KEYS[i] over the first `dur` seconds after reaching it, from KEYS[i-1]
  const prev = KEYS[Math.max(0, i - 1)][1];
  const flight = i === 9 ? ease.inOutSine : ease.inOutCubic;
  const k = flight(prog(t, t0, t0 + (i === 10 ? 3.2 : dur)));
  const p = lerpPose(prev, a, k);
  const d = wobble(t * 0.25, 7) * 0.25;
  return { ...p, position: [p.position[0] + d, p.position[1] + wobble(t * 0.2, 3) * 0.15, p.position[2]] };
};

/* ── the scene ─────────────────────────────────────────────────────────── */
const Labels = ({ t, proj }: { t: number; proj: ReturnType<typeof projector> }) => {
  const k = rise(t, T_A1 + 0.5, 0.8) * (1 - rise(t, T_A9 - 0.2, 0.4));
  return (
    <>
      {BLOCKS.map((b, i) => {
        if (b.kind === "pool" && t < T_A4) return null;
        const p = proj(b.x, b.h / 2 + 0.35, b.kind === "fc" ? 0 : b.h / 2);
        if (p.behind) return null;
        const show = rise(t, T_A1 + 0.5 + i * 0.12, 0.4) * k;
        return (
          <div key={b.id} style={{ position: "absolute", left: p.x, top: p.y, transform: "translate(-50%, -100%)", textAlign: "center", opacity: show, whiteSpace: "nowrap" }}>
            <div style={{ fontFamily: FONT_CN, fontSize: b.kind === "pool" ? 15 : 19, color: KIND_COLOR[b.kind] }}>{b.name}</div>
            <div style={{ fontFamily: FONT_MONO, fontSize: b.kind === "pool" ? 12 : 14, color: DIM }}>{b.dims}</div>
          </div>
        );
      })}
    </>
  );
};

const Callouts = ({ t, proj }: { t: number; proj: ReturnType<typeof projector> }) => {
  const c1 = rise(t, T_A3, 0.6) * (1 - rise(t, T_A4, 0.4));
  const c2 = rise(t, T_C2, 0.6) * (1 - rise(t, T_A5, 0.4));
  const c3 = rise(t, T_A5, 0.6) * (1 - rise(t, T_A6, 0.4));
  const see = rise(t, T_SEE, 0.6) * (1 - rise(t, T_A7, 0.4));
  const think = rise(t, T_THINK, 0.6) * (1 - rise(t, T_A7, 0.4));
  const fcK = rise(t, T_A7, 0.6) * (1 - rise(t, T_A8, 0.4));
  const convL = proj(byId("conv1").x - 0.6, -3.2, 2.6);
  const convR = proj(byId("pool5").x + 0.4, -3.2, 2.6);
  const fcL = proj(byId("fc6").x - 0.4, -3.2, 0.2);
  const fcR = proj(byId("fc8").x + 0.4, -3.2, 0.2);
  return (
    <>
      <Panel at={{ x: 1260, y: 640 }} style={{ padding: "22px 28px", width: 520, opacity: c1 }}>
        <Mono size={15} color={AMBER}>
          第一层 · CONV1
        </Mono>
        <Body size={26} style={{ marginTop: 10 }}>
          96 个 <b style={{ color: AMBER }}>11×11</b> 卷积核
        </Body>
        <Body size={26} style={{ opacity: rise(t, T_STRIDE, 0.4) }}>
          步长 <b style={{ color: AMBER }}>4</b>：每次跳 4 个像素
        </Body>
        <Body size={26} style={{ opacity: rise(t, T_55, 0.4) }}>
          224×224 → <b style={{ color: CYAN }}>55×55</b>
        </Body>
      </Panel>
      <Panel at={{ x: 1260, y: 660 }} style={{ padding: "22px 28px", width: 520, opacity: c2 }}>
        <Mono size={15} color={AMBER}>
          第二层 · CONV2
        </Mono>
        <Body size={26} style={{ marginTop: 10 }}>
          256 个 <b style={{ color: AMBER }}>5×5</b> 卷积核
        </Body>
      </Panel>
      <Panel at={{ x: 1260, y: 640 }} style={{ padding: "22px 28px", width: 520, opacity: c3 }}>
        <Mono size={15} color={AMBER}>
          第三 ~ 五层 · CONV3–5
        </Mono>
        <Body size={26} style={{ marginTop: 10 }}>
          都是 <b style={{ color: AMBER }}>3×3</b> 小卷积核
        </Body>
        <Body size={26}>
          通道数 <b style={{ color: AMBER }}>384 → 384 → 256</b>
        </Body>
      </Panel>
      {/* see / think brackets */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <path d={`M ${convL.x} ${convL.y - 14} L ${convL.x} ${convL.y} L ${convR.x} ${convR.y} L ${convR.x} ${convR.y - 14}`} stroke={AMBER} strokeWidth={3} fill="none" opacity={see} />
        <path d={`M ${fcL.x} ${fcL.y - 14} L ${fcL.x} ${fcL.y} L ${fcR.x} ${fcR.y} L ${fcR.x} ${fcR.y - 14}`} stroke={VIOLET} strokeWidth={3} fill="none" opacity={think} />
      </svg>
      <div style={{ position: "absolute", left: (convL.x + convR.x) / 2, top: (convL.y + convR.y) / 2 + 20, transform: "translateX(-50%)", textAlign: "center", opacity: see }}>
        <div style={{ fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 64, color: AMBER }}>看</div>
        <Mono size={15}>5 个卷积层 · 提取特征</Mono>
      </div>
      <div style={{ position: "absolute", left: (fcL.x + fcR.x) / 2, top: (fcL.y + fcR.y) / 2 + 20, transform: "translateX(-50%)", textAlign: "center", opacity: think }}>
        <div style={{ fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 64, color: VIOLET }}>想</div>
        <Mono size={15}>3 个全连接层 · 组合判断</Mono>
      </div>
      <Panel at={{ x: 1260, y: 640 }} style={{ padding: "22px 28px", width: 560, opacity: fcK }} glow={VIOLET}>
        <Mono size={15} color={VIOLET}>
          全连接层 · FC6 – FC8
        </Mono>
        <Body size={26} style={{ marginTop: 10 }}>
          <b style={{ color: VIOLET }}>4096</b> → <b style={{ color: VIOLET }}>4096</b> → <b style={{ color: VIOLET, opacity: 0.4 + 0.6 * rise(t, T_1000, 0.4) }}>1000</b>
        </Body>
        <Body size={26} style={{ opacity: rise(t, T_SOFTMAX, 0.4) }}>
          softmax：变成 1000 个概率，总和为 1
        </Body>
      </Panel>
    </>
  );
};

const ParamsBar = ({ t }: { t: number }) => {
  const k = rise(t, T_A8 + 0.2, 0.6) * (1 - rise(t, T_A9 - 0.3, 0.4));
  const split = rise(t, T_95 - 0.2, 1.0, ease.inOutCubic);
  const W = 1300;
  const convW = (CONV_PARAMS / (CONV_PARAMS + FC_PARAMS)) * W;
  return (
    <div style={{ position: "absolute", left: 310, top: 790, width: W, opacity: k }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 52, fontWeight: 800, color: IVORY }}>{fmtInt((CONV_PARAMS + FC_PARAMS) * rise(t, T_60M - 0.3, 1.0))}</span>
        <span style={{ fontFamily: FONT_CN, fontSize: 26, color: DIM }}>个参数 · 65 万个神经元</span>
      </div>
      <div style={{ display: "flex", height: 40, marginTop: 14, borderRadius: 8, overflow: "hidden", opacity: split }}>
        <div style={{ width: convW, background: AMBER }} />
        <div style={{ flex: 1, background: `linear-gradient(90deg, ${CORAL}, ${VIOLET})` }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, opacity: split }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 18, color: AMBER }}>卷积层 {(CONV_PARAMS / 1e6).toFixed(1)}M · {((CONV_PARAMS / (CONV_PARAMS + FC_PARAMS)) * 100).toFixed(1)}%</span>
        <span style={{ fontFamily: FONT_MONO, fontSize: 18, color: CORAL }}>全连接层 {(FC_PARAMS / 1e6).toFixed(1)}M · {((FC_PARAMS / (CONV_PARAMS + FC_PARAMS)) * 100).toFixed(1)}%</span>
      </div>
    </div>
  );
};

const Result = ({ t }: { t: number }) => {
  const k = rise(t, T_A10 - 0.4, 0.7);
  const hit = rise(t, T_TABBY, 0.5);
  const cam = rise(t, T_FACE - 0.6, 1.0);
  return (
    <AbsoluteFill style={{ opacity: k }}>
      <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(4,6,12,0.92) 0%, rgba(4,6,12,0.75) 55%, transparent 80%)" }} />
      <div style={{ position: "absolute", left: 140, top: 230, width: 460, height: 460, borderRadius: 16, overflow: "hidden", boxShadow: `0 0 0 2px ${hit > 0.5 ? LIME : FAINT}` }}>
        <Img src={asset("cat.jpg")} style={{ width: "100%", height: "100%" }} />
        <Img src={asset("gradcam.png")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: cam * 0.85, mixBlendMode: "screen" }} />
      </div>
      <Mono at={{ x: 140, y: 712 }} size={15} color={AMBER} style={{ opacity: cam }}>
        GRAD-CAM · 网络做判断时最关注的区域
      </Mono>
      <div style={{ position: "absolute", left: 680, top: 240, width: 700 }}>
        <Mono size={16}>训练好的 ALEXNET · 真实输出（TOP-5）</Mono>
        {DATA.preds.map((p, i) => {
          const kk = rise(t, T_A10 + i * 0.18, 0.5);
          const w = p.p * 560 * kk;
          return (
            <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 22 }}>
              <div style={{ width: 170 }}>
                <div style={{ fontFamily: FONT_CN, fontSize: i === 0 ? 34 : 26, color: i === 0 ? (hit > 0.5 ? LIME : IVORY) : DIM }}>{PRED_ZH[p.label]}</div>
                <div style={{ fontFamily: FONT_MONO, fontSize: 14, color: DIM }}>{p.label}</div>
              </div>
              <div style={{ width: Math.max(4, w), height: i === 0 ? 40 : 26, borderRadius: 6, background: i === 0 ? LIME : "rgba(236,241,248,0.3)", boxShadow: i === 0 ? `0 0 ${20 + 40 * hit}px ${LIME}88` : "none" }} />
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: i === 0 ? 40 : 24, fontWeight: 700, color: i === 0 ? LIME : DIM }}>{(p.p * 100 * kk).toFixed(1)}%</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const FACE_URLS = [asset("cat.jpg"), ...BLOCKS.filter((b) => b.fmap).map((b) => asset(b.fmap!))];

/**
 * Mount the 3D network only once its textures exist: ThreeCanvas redraws on frame changes, so a texture
 * that arrives after the first draw would be missing from a single still or a render worker's first frame.
 */
const Network = ({ t }: { t: number }) => {
  const textures = useLoadedTextures(FACE_URLS);
  return textures ? <NetworkScene t={t} textures={textures} /> : null;
};

const NetworkScene = ({ t, textures }: { t: number; textures: Record<string, THREE.Texture> }) => {
  const pose = archPose(t);
  const proj = projector(pose);
  const build = (i: number) => rise(t, S.start + 0.6 + i * 0.22, 0.7);
  const heat = (b: Block) => (b.params ? rise(t, T_95 - 0.2, 1.0) * (b.params / MAX_PARAMS) ** 0.5 : 0) * (1 - rise(t, T_A9 - 0.3, 0.4));
  const streamT0 = T_A9 + 0.3;
  const litAt = (b: Block) => {
    const arrive = streamT0 + b.x / 6.5;
    return t > arrive && t < arrive + 3 ? flash(t, arrive, 0.6) + 0.25 : 0;
  };
  const faceAlpha = (b: Block) => (b.kind === "img" ? 1 : rise(t, T_A9 + 0.3 + b.x / 6.5, 0.4) * 0.95 + (t < T_A9 ? 0.25 : 0));
  return (
    <AbsoluteFill>
      <Stage3D pose={pose} bloom={1.0} threshold={0.55} fog={[26, 60]}>
        {BLOCKS.map((b, i) => (
          <group key={b.id}>
            <Slab b={b} alpha={build(i)} heat={heat(b)} lit={litAt(b)} />
            {b.kind === "fc" && <Neurons b={b} alpha={build(i)} lit={litAt(b)} />}
          </group>
        ))}
        <Face b={byId("input")} tex={textures[asset("cat.jpg")]} alpha={build(0)} />
        {BLOCKS.filter((b) => b.fmap).map((b) => (
          <Face key={b.id} b={b} tex={textures[asset(b.fmap!)]} alpha={faceAlpha(b) * build(1)} />
        ))}
        {t > T_A3 - 0.5 && t < T_A4 + 0.5 && <Frustum k={rise(t, T_A3, 0.6) * (1 - rise(t, T_A4, 0.4))} sweep={prog(t, T_A3, T_A4)} />}
        {t > T_A9 && <Stream t={t} t0={streamT0} alpha={1 - rise(t, T_A11 + 0.5, 1)} />}
      </Stage3D>
      <Labels t={t} proj={proj} />
      <Callouts t={t} proj={proj} />
      <ParamsBar t={t} />
    </AbsoluteFill>
  );
};

export const Arch = ({ t }: { t: number }) => (
  <AbsoluteFill style={{ background: BG }}>
    <Backdrop grid={0.025} />
    <Network t={t} />
    <Heading size={44} at={{ x: 960, y: 140 }} center color={IVORY} style={{ opacity: rise(t, T_A1, 0.6) * (1 - rise(t, T_A2, 0.5)) }}>
      AlexNet · 8 层：5 个卷积层 + 3 个全连接层
    </Heading>
    <Show t={t} from={T_A10 - 0.5} to={S.end} fadeIn={0.5}>
      <Result t={t} />
    </Show>
  </AbsoluteFill>
);

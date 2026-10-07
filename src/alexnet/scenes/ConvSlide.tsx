import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { AbsoluteFill, Img } from "remotion";
import { Pose, Stage3D, projector } from "../components/Stage3D";
import { Heading, Mono, Panel } from "../components/ui";
import { ease, lerp, prog, rise, wobble } from "../lib/anim";
import { asset, gray28 } from "../lib/data";
import { cue } from "../lib/timeline";
import { AMBER, CYAN, DIM, FAINT, FONT_CN, FONT_DISPLAY, FONT_MONO, IVORY, LIME } from "../lib/theme";

const T_C9 = cue("c9");
const T_SLIDE = cue("c9", "一格一格");
const T_C10 = cue("c10");
const T_MULT = cue("c10", "相乘");
const T_ADD = cue("c10", "全部加起来");
const T_C11 = cue("c11");
const T_FMAP = cue("c11", "特征图");
const T_C12 = cue("c12");
const T_OUTLINE = cue("c12", "勾勒");

/** Vertical-edge kernel (Sobel). */
export const KERNEL = [
  [-1, 0, 1],
  [-2, 0, 2],
  [-1, 0, 1],
];
const N = 28;
const M = N - 2;
const OUT = Array.from({ length: M * M }, (_, i) => {
  const x = i % M;
  const y = Math.floor(i / M);
  let s = 0;
  for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) s += KERNEL[dy][dx] * gray28(x + dx, y + dy);
  return s;
});
const OUT_MAX = Math.max(...OUT.map(Math.abs));

/** How many output positions have been computed by time t (slow, then a sweep). */
const stepsAt = (t: number) => {
  if (t < T_SLIDE) return 1;
  const slow = Math.min(t, T_C11) - T_SLIDE;
  const s = 1 + Math.floor(slow / 0.85);
  if (t < T_C11) return Math.min(s, M);
  const sweep = ease.inCubic(prog(t, T_C11, T_FMAP + 1.8));
  return Math.round(lerp(s, M * M, sweep));
};

const SP = 0.32;
const tileXZ = (x: number, y: number, n: number): [number, number] => [(x - (n - 1) / 2) * SP, (y - (n - 1) / 2) * SP];
const OUT_Y = 3.4;

const Grid = ({ steps }: { steps: number }) => {
  const inRef = useRef<THREE.InstancedMesh>(null);
  const outRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const c = useMemo(() => new THREE.Color(), []);
  useLayoutEffect(() => {
    const a = inRef.current;
    if (!a) return;
    for (let i = 0; i < N * N; i++) {
      const v = gray28(i % N, Math.floor(i / N)) / 255;
      const [x, z] = tileXZ(i % N, Math.floor(i / N), N);
      dummy.position.set(x, 0, z);
      dummy.scale.set(SP * 0.9, 0.06, SP * 0.9);
      dummy.updateMatrix();
      a.setMatrixAt(i, dummy.matrix);
      a.setColorAt(i, c.setRGB(v * 0.9, v * 0.9, v * 0.95));
    }
    a.instanceMatrix.needsUpdate = true;
    if (a.instanceColor) a.instanceColor.needsUpdate = true;
  }, [dummy, c]);
  useLayoutEffect(() => {
    const b = outRef.current;
    if (!b) return;
    for (let i = 0; i < M * M; i++) {
      const done = i < steps;
      const v = Math.abs(OUT[i]) / OUT_MAX;
      const [x, z] = tileXZ(i % M, Math.floor(i / M), M);
      dummy.position.set(x, OUT_Y, z);
      const s = done ? SP * 0.9 : SP * 0.3;
      dummy.scale.set(s, done ? 0.06 + v * 0.5 : 0.02, s);
      dummy.position.y = OUT_Y + (done ? (0.06 + v * 0.5) / 2 : 0);
      dummy.updateMatrix();
      b.setMatrixAt(i, dummy.matrix);
      if (done) c.set(CYAN).multiplyScalar(0.08 + 1.3 * v ** 0.8);
      else c.setRGB(0.06, 0.08, 0.14);
      b.setColorAt(i, c);
    }
    b.instanceMatrix.needsUpdate = true;
    if (b.instanceColor) b.instanceColor.needsUpdate = true;
  });
  return (
    <group>
      <instancedMesh ref={inRef} args={[undefined, undefined, N * N]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={outRef} args={[undefined, undefined, M * M]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
};

const Kernel = ({ kx, ky }: { kx: number; ky: number }) => {
  const [cx, cz] = tileXZ(kx + 1, ky + 1, N);
  const [ox, oz] = tileXZ(kx, ky, M);
  const lines = useMemo(() => new THREE.BufferGeometry(), []);
  const pts: number[] = [];
  for (let dy = 0; dy < 3; dy++)
    for (let dx = 0; dx < 3; dx++) {
      const [x, z] = tileXZ(kx + dx, ky + dy, N);
      pts.push(x, 0.05, z, ox, OUT_Y, oz);
    }
  lines.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pts), 3));
  const w = SP * 3;
  return (
    <group>
      {/* frame */}
      {[
        [0, -w / 2, w, 0.04],
        [0, w / 2, w, 0.04],
        [-w / 2, 0, 0.04, w],
        [w / 2, 0, 0.04, w],
      ].map(([x, z, sx, sz], i) => (
        <mesh key={i} position={[cx + x, 0.08, cz + z]}>
          <boxGeometry args={[sx + 0.04, 0.05, sz + 0.04]} />
          <meshBasicMaterial color={AMBER} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[cx, 0.06, cz]}>
        <boxGeometry args={[w, 0.03, w]} />
        <meshBasicMaterial color={AMBER} transparent opacity={0.25} toneMapped={false} />
      </mesh>
      <lineSegments geometry={lines}>
        <lineBasicMaterial color={AMBER} transparent opacity={0.65} toneMapped={false} />
      </lineSegments>
      <mesh position={[ox, OUT_Y + 0.1, oz]} scale={0.12}>
        <sphereGeometry args={[1, 16, 8]} />
        <meshBasicMaterial color={IVORY} toneMapped={false} />
      </mesh>
    </group>
  );
};

const slidePose = (t: number): Pose => {
  const k = ease.inOutCubic(prog(t, T_C9, T_C9 + 3));
  const a = 0.35 + wobble(t * 0.15, 2) * 0.12 - prog(t, T_C9, T_C12) * 0.4;
  const r = lerp(14, 11.5, k);
  return { position: [Math.sin(a) * r, lerp(11, 8.5, k), Math.cos(a) * r], target: [0, 1.5, 0], fov: 40 };
};

export const ConvSlide = ({ t }: { t: number }) => {
  const steps = stepsAt(t);
  const cur = Math.min(M * M - 1, steps - 1);
  const kx = cur % M;
  const ky = Math.floor(cur / M);
  const pose = slidePose(t);
  const proj = projector(pose);
  const hud = rise(t, T_C10 - 0.2, 0.6) * (1 - rise(t, T_FMAP - 0.5, 0.6));
  const mult = rise(t, T_MULT, 0.5);
  const add = rise(t, T_ADD, 0.5);
  const labelIn = proj(-N * SP * 0.5, 0, N * SP * 0.5 + 0.5);
  const labelOut = proj(-M * SP * 0.5, OUT_Y, -M * SP * 0.5 - 0.4);
  const fm = rise(t, T_FMAP, 0.7);
  return (
    <AbsoluteFill>
      <Stage3D pose={pose} bloom={0.9} threshold={0.35}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[4, 10, 6]} intensity={1.4} />
        <Grid steps={steps} />
        {t < T_FMAP + 1.8 && <Kernel kx={kx} ky={ky} />}
      </Stage3D>
      <Mono at={{ x: labelIn.x, y: labelIn.y }} size={18} color={DIM}>
        输入图像 · 28×28
      </Mono>
      <Mono at={{ x: labelOut.x, y: labelOut.y - 30 }} size={18} color={CYAN} style={{ opacity: 0.5 + 0.5 * fm }}>
        特征图 · FEATURE MAP
      </Mono>
      <Heading size={46} at={{ x: 120, y: 150 }} color={AMBER} style={{ opacity: rise(t, T_C9 + 0.6, 0.6) }}>
        卷积 <span style={{ fontFamily: FONT_MONO, fontSize: 22, color: DIM, letterSpacing: 4 }}>CONVOLUTION</span>
      </Heading>
      {/* live multiply-accumulate */}
      <Panel at={{ x: 1300, y: 250 }} style={{ padding: "26px 30px", opacity: hud }} glow={AMBER}>
        <Mono size={14} color={DIM} style={{ marginBottom: 14 }}>
          位置 ({kx}, {ky})
        </Mono>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Mat3 values={[0, 1, 2].map((dy) => [0, 1, 2].map((dx) => gray28(kx + dx, ky + dy)))} color={IVORY} bg="rgba(255,255,255,0.06)" />
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 30, color: AMBER, opacity: mult }}>×</span>
          <Mat3 values={KERNEL} color={AMBER} bg="rgba(255,181,71,0.12)" style={{ opacity: mult }} />
        </div>
        <div style={{ marginTop: 18, fontFamily: FONT_MONO, fontSize: 22, color: IVORY, opacity: add, display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={{ color: LIME }}>Σ =</span>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 44, fontWeight: 800, color: CYAN }}>{OUT[cur]}</span>
        </div>
        <div style={{ fontFamily: FONT_CN, fontSize: 18, color: DIM, marginTop: 6, opacity: add }}>对应相乘，再全部相加</div>
      </Panel>
    </AbsoluteFill>
  );
};

const Mat3 = ({ values, color, bg, style }: { values: number[][]; color: string; bg: string; style?: React.CSSProperties }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 58px)", gap: 4, ...style }}>
    {values.flat().map((v, i) => (
      <div key={i} style={{ height: 46, borderRadius: 6, background: bg, display: "flex", justifyContent: "center", alignItems: "center", fontFamily: FONT_MONO, fontSize: 20, color }}>
        {v}
      </div>
    ))}
  </div>
);

/** c12: the real result of the same kernel on the full-resolution photo. */
export const EdgeReveal = ({ t }: { t: number }) => {
  const wipe = ease.inOutCubic(prog(t, T_C12 + 0.3, T_OUTLINE + 0.6));
  const size = 600;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 960 - size - 130, top: 210, width: size, height: size, borderRadius: 14, overflow: "hidden", boxShadow: `0 0 0 1px ${FAINT}` }}>
        <Img src={asset("cat.jpg")} style={{ width: "100%", height: "100%" }} />
      </div>
      <div style={{ position: "absolute", left: 1090, top: 210, width: size, height: size, borderRadius: 14, overflow: "hidden", boxShadow: `0 0 80px ${CYAN}33, 0 0 0 1px ${CYAN}66`, background: "#000" }}>
        <Img src={asset("edges.png")} style={{ width: "100%", height: "100%", clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0)`, filter: "drop-shadow(0 0 2px #3CE0FF)" }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: `${wipe * 100}%`, width: 3, background: AMBER, boxShadow: `0 0 20px ${AMBER}`, opacity: wipe < 1 ? 1 : 0 }} />
      </div>
      <div style={{ position: "absolute", left: 960 - 90, top: 450, width: 180, textAlign: "center" }}>
        <Mat3 values={KERNEL} color={AMBER} bg="rgba(255,181,71,0.14)" style={{ transform: "scale(0.8)" }} />
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 36, color: AMBER, marginTop: -6 }}>→</div>
      </div>
      <Mono at={{ x: 960 - size - 130, y: 840 }} size={18}>
        原图
      </Mono>
      <Mono at={{ x: 1090, y: 840 }} size={18} color={CYAN}>
        一个 3×3 卷积核的输出 · 竖直边缘
      </Mono>
    </AbsoluteFill>
  );
};

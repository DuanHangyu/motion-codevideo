import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, Img } from "remotion";
import { Pose, Stage3D, projector } from "../components/Stage3D";
import { Heading, Mono, Panel } from "../components/ui";
import { ease, lerp, prog, rise, wobble } from "../lib/anim";
import { asset, gray28 } from "../lib/data";
import { cue } from "../lib/timeline";
import { Gray, Kernel, PRESETS, convolveValid, normalise, windowSum } from "../lib/convolve";
import { explore, useExplore, capturePointer } from "../lib/explore";
import { sfx } from "../lib/sfx";
import { ExploreTask, WorldButton } from "../components/ExploreUI";
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
export const KERNEL: Kernel = [
  [-1, 0, 1],
  [-2, 0, 2],
  [-1, 0, 1],
];
const N = 28;
const M = N - 2;
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
const ZONE = "conv-slide";
const SMALL: Gray = { w: N, h: N, data: Float32Array.from({ length: N * N }, (_, i) => gray28(i % N, Math.floor(i / N))) };
const SCRIPTED_LEVEL = normalise(convolveValid(SMALL, KERNEL), KERNEL);
const SCAN_SEC = 2.4;
const WAVE = 0.018; // s per cell of distance for the re-compute wave

/** What the student has done in the frozen world. */
type Play = {
  kernel: Kernel;
  kx: number;
  ky: number;
  revealed: Set<number>;
  scanAt: number | null;
  /** previous levels + when the kernel last changed, for the outward re-compute wave */
  prevLevel: Float32Array;
  changedAt: number;
  changedFrom: [number, number];
};

const heightOf = (v: number) => 0.06 + v * 0.5;

const Grid = ({ level, done, play, clock, blend, flash }: { level: Float32Array; done: (i: number) => boolean; play: Play | null; clock: number; blend: number; flash: number }) => {
  const inRef = useRef<THREE.InstancedMesh>(null);
  const outRef = useRef<THREE.InstancedMesh>(null);
  const shown = useRef<Float32Array | null>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const c = useMemo(() => new THREE.Color(), []);
  useLayoutEffect(() => {
    const a = inRef.current;
    if (!a) return;
    for (let i = 0; i < N * N; i++) {
      const v = SMALL.data[i] / 255;
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
    if (!shown.current) shown.current = Float32Array.from({ length: M * M }, (_, i) => (done(i) ? heightOf(level[i]) : 0.02));
    const sh = shown.current;
    for (let i = 0; i < M * M; i++) {
      const x = i % M;
      const y = Math.floor(i / M);
      // scripted value
      const sDone = done(i);
      let h = sDone ? heightOf(SCRIPTED_LEVEL[i]) : 0.02;
      let v = sDone ? SCRIPTED_LEVEL[i] : -1;
      if (play) {
        const pDone = play.revealed.has(i);
        const waveAt = play.changedAt + Math.hypot(x - play.changedFrom[0], y - play.changedFrom[1]) * WAVE;
        const pv = clock < waveAt ? play.prevLevel[i] : level[i];
        const target = pDone ? heightOf(pv) : 0.02;
        sh[i] += (target - sh[i]) * 0.22; // springy rise
        h = h + (sh[i] - h) * blend;
        v = pDone ? (v < 0 ? pv : v + (pv - v) * blend) : v < 0 ? -1 : v * (1 - blend);
      } else {
        sh[i] = h;
      }
      const [px, pz] = tileXZ(x, y, M);
      const on = h > 0.03;
      const s = on ? SP * 0.9 : SP * 0.3;
      dummy.position.set(px, OUT_Y + (on ? h / 2 : 0), pz);
      dummy.scale.set(s, Math.max(0.02, h), s);
      dummy.updateMatrix();
      b.setMatrixAt(i, dummy.matrix);
      if (v >= 0 && on) c.set(CYAN).multiplyScalar(0.08 + 1.3 * v ** 0.8 + flash * 0.8);
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

const KernelFrame = ({ kx, ky, glow }: { kx: number; ky: number; glow: number }) => {
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
  const col = new THREE.Color(AMBER).multiplyScalar(1 + glow * 1.2);
  return (
    <group>
      {[
        [0, -w / 2, w, 0.04],
        [0, w / 2, w, 0.04],
        [-w / 2, 0, 0.04, w],
        [w / 2, 0, 0.04, w],
      ].map(([x, z, sx, sz], i) => (
        <mesh key={i} position={[cx + x, 0.08, cz + z]}>
          <boxGeometry args={[sx + 0.04 + glow * 0.04, 0.05 + glow * 0.06, sz + 0.04 + glow * 0.04]} />
          <meshBasicMaterial color={col} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[cx, 0.06, cz]}>
        <boxGeometry args={[w, 0.03, w]} />
        <meshBasicMaterial color={AMBER} transparent opacity={0.25 + glow * 0.2} toneMapped={false} />
      </mesh>
      <lineSegments geometry={lines}>
        <lineBasicMaterial color={AMBER} transparent opacity={0.65} toneMapped={false} />
      </lineSegments>
      <mesh position={[ox, OUT_Y + 0.1, oz]} scale={0.12 + glow * 0.06}>
        <sphereGeometry args={[1, 16, 8]} />
        <meshBasicMaterial color={IVORY} toneMapped={false} />
      </mesh>
    </group>
  );
};

/** Invisible plane over the input image: press anywhere on it to grab the kernel and drag it around. */
const DragPlane = ({ onMove }: { onMove: (kx: number, ky: number) => void }) => {
  const dragging = useRef(false);
  const to = (p: THREE.Vector3) => {
    const cx = Math.round(p.x / SP + (N - 1) / 2) - 1;
    const cy = Math.round(p.z / SP + (N - 1) / 2) - 1;
    onMove(Math.min(M - 1, Math.max(0, cx)), Math.min(M - 1, Math.max(0, cy)));
  };
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.1, 0]}
      onPointerDown={(e) => {
        e.stopPropagation();
        dragging.current = true;
        explore.setDragging(true);
        capturePointer(e.target as Element, e.pointerId);
        to(e.point);
      }}
      onPointerMove={(e) => dragging.current && to(e.point)}
      onPointerUp={() => {
        dragging.current = false;
        explore.setDragging(false);
      }}
      onPointerOver={() => (document.body.style.cursor = "grab")}
      onPointerOut={() => (document.body.style.cursor = "")}
    >
      <planeGeometry args={[N * SP, N * SP]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
};

const slidePose = (t: number): Pose => {
  const k = ease.inOutCubic(prog(t, T_C9, T_C9 + 3));
  const a = 0.35 + wobble(t * 0.15, 2) * 0.12 - prog(t, T_C9, T_C12) * 0.4;
  const r = lerp(14, 11.5, k);
  return { position: [Math.sin(a) * r, lerp(11, 8.5, k), Math.cos(a) * r], target: [0, 1.5, 0], fov: 40 };
};

/** A horizontal-edge detector: rows above and below have opposite signs, every column sums to zero. */
const findsHorizontalEdges = (k: Kernel) => {
  const top = k[0].reduce((a, b) => a + b, 0);
  const bottom = k[2].reduce((a, b) => a + b, 0);
  return top !== 0 && Math.sign(top) === -Math.sign(bottom) && [0, 1, 2].every((c) => k[0][c] + k[1][c] + k[2][c] === 0);
};

const presetOf = (k: Kernel) => PRESETS.find((p) => p.kernel.flat().every((v, i) => v === k.flat()[i]))?.id;

export const ConvSlide = ({ t }: { t: number }) => {
  const steps = stepsAt(t);
  const cur = Math.min(M * M - 1, steps - 1);
  const ex = useExplore(ZONE);
  const [play, setPlay] = useState<Play | null>(null);
  const lastTick = useRef(0);
  const scanDone = useRef(false);

  // enter: start from exactly what the video was showing; leave: forget everything
  useEffect(() => {
    if (ex.active && !play)
      setPlay({ kernel: KERNEL, kx: cur % M, ky: Math.floor(cur / M), revealed: new Set(Array.from({ length: steps }, (_, i) => i)), scanAt: null, prevLevel: SCRIPTED_LEVEL, changedAt: 0, changedFrom: [0, 0] });
    if (!ex.active && play) setPlay(null);
  }, [ex.active, play, cur, steps]);

  const level = useMemo(() => (play ? normalise(convolveValid(SMALL, play.kernel), play.kernel) : SCRIPTED_LEVEL), [play?.kernel]); // eslint-disable-line react-hooks/exhaustive-deps

  // full-image scan: reveal cells faster and faster, ticking, then land with an impact
  let flash = 0;
  if (play?.scanAt != null) {
    const p = Math.min(1, (ex.clock - play.scanAt) / SCAN_SEC);
    const n = Math.floor(M * M * p ** 1.7);
    if (n > play.revealed.size) {
      for (let i = 0; i < n; i++) play.revealed.add(i);
      if (ex.clock - lastTick.current > 0.028) {
        sfx.tick((n % M) / M - 0.5);
        lastTick.current = ex.clock;
      }
    }
    if (p >= 1 && !scanDone.current) {
      scanDone.current = true;
      sfx.impact();
      sfx.chime();
    }
    flash = p >= 1 ? Math.exp(-(ex.clock - play.scanAt - SCAN_SEC) / 0.35) : 0;
  }

  const moveKernel = (kx: number, ky: number) => {
    if (!play || !ex.interactive || (kx === play.kx && ky === play.ky)) return;
    sfx.tick((kx / M - 0.5) * 1.2);
    play.revealed.add(ky * M + kx);
    setPlay({ ...play, kx, ky });
  };
  const setKernel = (kernel: Kernel) => {
    if (!play) return;
    sfx.blip(880 + 40 * kernel.flat().reduce((a, b) => a + b, 0), 0.08);
    setPlay({ ...play, kernel, prevLevel: level, changedAt: ex.clock, changedFrom: [play.kx, play.ky] });
  };
  const bump = (i: number, d: number) => play && setKernel(play.kernel.map((row, r) => row.map((w, c) => (r * 3 + c === i ? Math.max(-9, Math.min(9, w + d)) : w))));
  const scan = () => {
    if (!play) return;
    scanDone.current = false;
    sfx.whoosh(true);
    setPlay({ ...play, revealed: new Set(), scanAt: ex.clock });
  };
  const clear = () => play && setPlay({ ...play, revealed: new Set([play.ky * M + play.kx]), scanAt: null });

  // where things are drawn: the script, the student's world, or a blend while flying back
  const b = ex.blend;
  const kx = play ? Math.round(lerp(cur % M, play.kx, b)) : cur % M;
  const ky = play ? Math.round(lerp(Math.floor(cur / M), play.ky, b)) : Math.floor(cur / M);
  const kernel = play && b > 0.5 ? play.kernel : KERNEL;
  const glow = ex.interactive ? 0.5 + 0.5 * Math.sin(ex.clock * 4) : 0;
  const sum = play ? windowSum(SMALL, play.kernel, play.kx, play.ky) : windowSum(SMALL, KERNEL, kx, ky);

  const pose = slidePose(t);
  const proj = projector(pose);
  const hud = Math.max(rise(t, T_C10 - 0.2, 0.6) * (1 - rise(t, T_FMAP - 0.5, 0.6)), b);
  const mult = Math.max(rise(t, T_MULT, 0.5), b);
  const add = Math.max(rise(t, T_ADD, 0.5), b);
  const labelIn = proj(-N * SP * 0.5, 0, N * SP * 0.5 + 0.5);
  const labelOut = proj(-M * SP * 0.5, OUT_Y, -M * SP * 0.5 - 0.4);
  const fm = rise(t, T_FMAP, 0.7);
  const showKernel = t < T_FMAP + 1.8 || ex.active;
  return (
    <AbsoluteFill>
      <Stage3D pose={pose} bloom={0.9} threshold={0.35} zone={ZONE}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[4, 10, 6]} intensity={1.4} />
        <Grid level={level} done={(i) => i < steps} play={play} clock={ex.clock} blend={b} flash={flash} />
        {showKernel && <KernelFrame kx={kx} ky={ky} glow={glow} />}
        {ex.interactive && <DragPlane onMove={moveKernel} />}
      </Stage3D>
      <Mono at={{ x: labelIn.x, y: labelIn.y }} size={18} color={DIM}>
        输入图像 · 28×28
      </Mono>
      <Mono at={{ x: labelOut.x, y: labelOut.y - 30 }} size={18} color={CYAN} style={{ opacity: 0.5 + 0.5 * fm }}>
        特征图 · FEATURE MAP
      </Mono>
      <Heading size={46} at={{ x: 120, y: 150 }} color={AMBER} style={{ opacity: rise(t, T_C9 + 0.6, 0.6) * (1 - b) }}>
        卷积 <span style={{ fontFamily: FONT_MONO, fontSize: 22, color: DIM, letterSpacing: 4 }}>CONVOLUTION</span>
      </Heading>
      {/* live multiply-accumulate — the same panel becomes the student's kernel editor when time is frozen */}
      <Panel at={{ x: 1300, y: 250 }} style={{ padding: "26px 30px", opacity: hud, boxShadow: ex.interactive ? `0 0 0 2px ${AMBER}88, 0 0 60px ${AMBER}33` : undefined }} glow={AMBER}>
        <Mono size={14} color={DIM} style={{ marginBottom: 14 }}>
          位置 ({play ? play.kx : kx}, {play ? play.ky : ky}){ex.interactive ? " · 点击权重 +1，右键 −1" : ""}
        </Mono>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Mat3 values={[0, 1, 2].map((dy) => [0, 1, 2].map((dx) => gray28((play ? play.kx : kx) + dx, (play ? play.ky : ky) + dy)))} color={IVORY} bg="rgba(255,255,255,0.06)" />
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 30, color: AMBER, opacity: mult }}>×</span>
          <Mat3 values={kernel} color={AMBER} bg="rgba(255,181,71,0.12)" style={{ opacity: mult }} onBump={ex.interactive ? bump : undefined} />
        </div>
        <div style={{ marginTop: 18, fontFamily: FONT_MONO, fontSize: 22, color: IVORY, opacity: add, display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={{ color: LIME }}>Σ =</span>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 44, fontWeight: 800, color: CYAN }}>{Math.round(sum)}</span>
        </div>
        <div style={{ fontFamily: FONT_CN, fontSize: 18, color: DIM, marginTop: 6, opacity: add }}>对应相乘，再全部相加</div>
        {ex.interactive && play && (
          <div style={{ marginTop: 18, display: "grid", gap: 10, width: 380 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {PRESETS.map((p) => (
                <WorldButton key={p.id} on={presetOf(play.kernel) === p.id} onClick={() => setKernel(p.kernel)} style={{ fontSize: 17, padding: "6px 12px" }}>
                  {p.name}
                </WorldButton>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <WorldButton on onClick={scan} color={CYAN} style={{ flex: 1 }}>
                ▶ 扫描整张图
              </WorldButton>
              <WorldButton onClick={clear}>清空</WorldButton>
            </div>
          </div>
        )}
      </Panel>
      <ExploreTask
        zone={ZONE}
        task="按住图像拖动金色卷积核，看特征图一格一格长出来"
        sub={["点权重 +1，右键 −1", "拖动画面旋转视角"]}
        goal="造一个能找“水平边缘”的卷积核，并扫描整张图"
        done={!!play && play.scanAt !== null && scanDone.current && findsHorizontalEdges(play.kernel)}
      />
    </AbsoluteFill>
  );
};

const Mat3 = ({ values, color, bg, style, onBump }: { values: number[][]; color: string; bg: string; style?: React.CSSProperties; onBump?: (i: number, d: number) => void }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 58px)", gap: 4, ...style }}>
    {values.flat().map((v, i) => (
      <div
        key={i}
        onClick={onBump ? () => onBump(i, 1) : undefined}
        onContextMenu={
          onBump
            ? (e) => {
                e.preventDefault();
                onBump(i, -1);
              }
            : undefined
        }
        onWheel={onBump ? (e) => onBump(i, e.deltaY < 0 ? 1 : -1) : undefined}
        style={{
          height: 46,
          borderRadius: 6,
          background: bg,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: FONT_MONO,
          fontSize: 20,
          color: onBump ? (v > 0 ? AMBER : v < 0 ? CYAN : DIM) : color,
          cursor: onBump ? "pointer" : undefined,
          outline: onBump ? `1px solid ${AMBER}55` : undefined,
          userSelect: "none",
        }}
      >
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

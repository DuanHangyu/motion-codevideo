import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { AbsoluteFill, random, useCurrentFrame } from "remotion";
import { CameraPose, CameraRig } from "../components/CameraRig";
import { useInteractive } from "../lib/interactive";
import { EVENTS, FPS, SCENES, ease, lerp, prog, pulse, wordAt } from "../lib/timing";
import { CLAY, CYAN, EMBER, FONT_MONO, INK, IVORY } from "../lib/theme";

const N = 60;
const SPACING = 0.55;
const COUNT = N * N;
const [T_START, T_END] = SCENES.world;
const T_UNFOLD = wordAt("l3", "展开");
const T_WORLD = wordAt("l3", "世界");

const terrain = (x: number, z: number) => {
  const h =
    Math.sin(x * 0.35) * Math.cos(z * 0.3) * 1.3 +
    Math.sin(x * 0.9 + z * 0.6) * 0.5 +
    Math.exp(-(x * x + z * z) / 30) * 3.2;
  return Math.max(0.05, h + 1.2);
};

type Ripple = { x: number; z: number; start: number };
const RIPPLE_SPEED = 7; // world units / s
const RIPPLE_LIFE = 4.5; // s
const CLICK_SLOP = 6; // px of pointer travel still counted as a click, not an orbit drag

/** Height added by viewer-triggered ripples (wall-clock, so they keep moving while paused). */
const rippleAt = (ripples: Ripple[], x: number, z: number, now: number) => {
  let h = 0;
  for (const r of ripples) {
    const age = (now - r.start) / 1000;
    const d = Math.hypot(x - r.x, z - r.z) - age * RIPPLE_SPEED;
    h += 2.6 * Math.exp(-age * 0.8) * Math.exp(-(d * d) / 0.5);
  }
  return h;
};

const Columns = ({ t }: { t: number }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const ripples = useRef<Ripple[]>([]);
  const tRef = useRef(t);
  tRef.current = t;
  const { paused } = useInteractive();
  const cells = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => {
        const x = (i % N) - N / 2 + 0.5;
        const z = Math.floor(i / N) - N / 2 + 0.5;
        const wx = x * SPACING;
        const wz = z * SPACING;
        const r = random(`col${i}`);
        return { wx, wz, h: terrain(wx, wz) * (0.6 + 0.8 * r), dist: Math.hypot(x, z), r };
      }),
    [],
  );

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const color = new THREE.Color();
    cells.forEach((c, i) => {
      const hue = c.r > 0.97 ? CYAN : c.h > 3.2 ? EMBER : c.h > 2 ? CLAY : "#2A2530";
      mesh.setColorAt(i, color.set(hue));
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [cells]);

  const write = (time: number, now: number) => {
    const mesh = ref.current;
    if (!mesh) return;
    const hat = pulse(time, EVENTS.hats, 0.08);
    const live = ripples.current;
    cells.forEach((c, i) => {
      const delay = c.dist / 42;
      const k = ease.outBack(prog(time, T_UNFOLD - 0.1 + delay, T_UNFOLD + 0.7 + delay));
      const breathe = 1 + Math.sin(time * 3 + c.dist * 0.4) * 0.06 + (c.h > 2 ? hat * 0.08 : 0);
      const h = Math.max(0.001, c.h * k * breathe + (live.length ? rippleAt(live, c.wx, c.wz, now) : 0));
      dummy.position.set(c.wx, h / 2, c.wz);
      dummy.scale.set(SPACING * 0.82, h, SPACING * 0.82);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };

  // Scripted animation: a pure function of video time (ripples are always empty in exported renders).
  useLayoutEffect(() => write(t, performance.now()));

  // Viewer ripples animate on wall-clock time so they also move while the video is paused.
  useFrame(() => {
    if (ripples.current.length === 0) return;
    const now = performance.now();
    ripples.current = ripples.current.filter((r) => now - r.start < RIPPLE_LIFE * 1000);
    write(tRef.current, now);
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (!paused || e.instanceId === undefined || e.delta > CLICK_SLOP) return;
    e.stopPropagation();
    const c = cells[e.instanceId];
    ripples.current = [...ripples.current, { x: c.wx, z: c.wz, start: performance.now() }];
  };

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, COUNT]} frustumCulled={false} onClick={onClick}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.35} metalness={0.4} emissive={CLAY} emissiveIntensity={0.08} />
    </instancedMesh>
  );
};

const worldPose = (t: number): CameraPose => {
  const fly = ease.inOutCubic(prog(t, T_START, T_END));
  const rise = ease.inCubic(prog(t, T_WORLD - 0.3, T_END));
  const angle = lerp(-0.1, 0.9, fly) + rise * 0.6;
  const radius = lerp(9, 15, fly) + rise * 6;
  const height = lerp(10.5, 3.2, ease.outCubic(prog(t, T_START, T_WORLD))) + rise * 9;
  return { position: [Math.sin(angle) * radius, height, Math.cos(angle) * radius], target: [0, lerp(0, 1.4, fly), 0] };
};

const Readout = ({ t }: { t: number }) => {
  const k = prog(t, T_UNFOLD, T_UNFOLD + 0.4);
  const risen = Math.round(COUNT * ease.outCubic(prog(t, T_UNFOLD, T_UNFOLD + 1.4)));
  return (
    <div style={{ position: "absolute", left: 76, top: 120, fontFamily: FONT_MONO, color: IVORY, fontSize: 18, letterSpacing: 2, lineHeight: 1.8, opacity: k, pointerEvents: "none" }}>
      <div style={{ color: CLAY }}>▸ SPAWN INSTANCES</div>
      <div>
        {String(risen).padStart(4, "0")} / {COUNT} COLUMNS
      </div>
      <div style={{ opacity: 0.5 }}>1 DRAW CALL · INSTANCED</div>
    </div>
  );
};

export const World = () => {
  const t = useCurrentFrame() / FPS;
  const floor = 1 - prog(t, T_UNFOLD + 0.4, T_UNFOLD + 1.4) * 0.5;
  return (
    <AbsoluteFill style={{ background: INK }}>
      <ThreeCanvas width={1920} height={1080} dpr={1} gl={{ antialias: true, preserveDrawingBuffer: true }} camera={{ fov: 45, near: 0.1, far: 200 }}>
        <color attach="background" args={[INK]} />
        <fog attach="fog" args={[INK, 14, 42]} />
        <CameraRig t={t} pose={worldPose} minDistance={3} maxDistance={30} maxPolarAngle={Math.PI * 0.47} />
        <ambientLight intensity={0.25} />
        <directionalLight position={[6, 12, 4]} intensity={2.2} color={IVORY} />
        <pointLight position={[0, 6, 0]} intensity={40} distance={20} color={EMBER} />
        <pointLight position={[-8, 3, -6]} intensity={30} distance={25} color={CYAN} />
        <gridHelper args={[N * SPACING, N, CLAY, CLAY]} position={[0, 0.002, 0]} material-opacity={0.45 * floor} material-transparent />
        <Columns t={t} />
        <EffectComposer multisampling={0}>
          <Bloom intensity={1.1} luminanceThreshold={0.55} luminanceSmoothing={0.2} mipmapBlur />
        </EffectComposer>
      </ThreeCanvas>
      <Readout t={t} />
    </AbsoluteFill>
  );
};

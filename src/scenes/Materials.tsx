import { useMemo, useState } from "react";
import * as THREE from "three";
import { ThreeEvent } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { Environment, Lightformer } from "@react-three/drei";
import { EffectComposer, Bloom, ChromaticAberration } from "@react-three/postprocessing";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CameraPose, CameraRig } from "../components/CameraRig";
import { useInteractive } from "../lib/interactive";
import { BEAT, EVENTS, FPS, SCENES, ease, lerp, prog, pulse, wordAt } from "../lib/timing";
import { CLAY, CYAN, EMBER, FONT_DISPLAY, FONT_MONO, INK, IVORY } from "../lib/theme";

const [T_START, T_END] = SCENES.materials;
const T_LIGHT = wordAt("l4", "光影");
const T_MAT = wordAt("l4", "材质");
const T_CAM = wordAt("l4", "镜头");
const T_ALL = wordAt("l4", "全部");
const T_WIRE = T_END - 0.55;

type Look = { name: string; color: string; metalness: number; roughness: number; clearcoat: number; iridescence: number; emissive: number; wire: boolean };
const LOOKS: Array<[number, Look]> = [
  [T_START, { name: "CLAY / MATTE", color: CLAY, metalness: 0, roughness: 0.75, clearcoat: 0, iridescence: 0, emissive: 0, wire: false }],
  [T_MAT, { name: "CHROME", color: "#ffffff", metalness: 1, roughness: 0.06, clearcoat: 0, iridescence: 0, emissive: 0, wire: false }],
  [T_MAT + BEAT * 0.5, { name: "THIN-FILM / IRIDESCENT", color: "#d8d8e0", metalness: 1, roughness: 0.14, clearcoat: 1, iridescence: 1, emissive: 0, wire: false }],
  [T_MAT + BEAT, { name: "LACQUER / CLEARCOAT", color: "#141018", metalness: 0.2, roughness: 0.5, clearcoat: 1, iridescence: 0, emissive: 0, wire: false }],
  [T_CAM, { name: "PEARL CHROME", color: "#fff4ea", metalness: 1, roughness: 0.1, clearcoat: 1, iridescence: 0.8, emissive: 0, wire: false }],
  [T_WIRE, { name: "WIREFRAME / COMPILE", color: EMBER, metalness: 0, roughness: 1, clearcoat: 0, iridescence: 0, emissive: 2.5, wire: true }],
];
const scriptedLook = (t: number) => LOOKS.reduce((cur, [at], i) => (t >= at ? i : cur), 0);
const CLICK_SLOP = 6;

/** Viewer choices made while paused; tagged with the pause they belong to so resuming hands control back to the script. */
type Override = { session: number; look: number | null; lightsOff: readonly boolean[] };
type Choice = { look: number; lightsOff: readonly boolean[] };

const LIGHTS = [
  { at: T_LIGHT, name: "KEY", color: "#ffd9bf", pos: [4, 5, 3] },
  { at: T_LIGHT + BEAT / 4, name: "RIM", color: CYAN, pos: [-5, 2, -4] },
  { at: T_LIGHT + BEAT / 2, name: "FILL", color: EMBER, pos: [-4, -1, 4] },
] as const;
const lightOn = (t: number, at: number) => (t < at ? 0 : 1 + 1.6 * Math.exp(-(t - at) / 0.12));

const Hero = ({ t, lookIndex, onPick }: { t: number; lookIndex: number; onPick?: () => void }) => {
  const look = LOOKS[lookIndex][1];
  const material = useMemo(() => new THREE.MeshPhysicalMaterial({ iridescenceIOR: 1.6, iridescenceThicknessRange: [120, 480] }), []);
  material.color.set(look.color);
  material.metalness = look.metalness;
  material.roughness = look.roughness;
  material.clearcoat = look.clearcoat;
  material.iridescence = look.iridescence;
  material.emissive.set(look.wire ? EMBER : "#000");
  material.emissiveIntensity = look.emissive;
  material.wireframe = look.wire;
  const kick = pulse(t, EVENTS.kicks, 0.08);
  const spin = t * 0.7 + ease.outExpo(prog(t, T_CAM, T_CAM + 0.8)) * 1.6 + ease.inCubic(prog(t, T_WIRE, T_END)) * 4;
  const shrink = ease.inExpo(prog(t, T_END - 0.3, T_END));
  return (
    <mesh
      material={material}
      rotation={[spin * 0.5, spin, 0]}
      scale={(1 + kick * 0.035) * (1 - shrink * 0.95)}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (!onPick || e.delta > CLICK_SLOP) return;
        e.stopPropagation();
        onPick();
      }}
    >
      <torusKnotGeometry args={[1.05, 0.34, 360, 56, 2, 3]} />
    </mesh>
  );
};

const materialsPose = (t: number): CameraPose => {
  const whip = ease.inOutCubic(prog(t, T_CAM - 0.05, T_CAM + 0.6));
  const push = ease.inOutCubic(prog(t, T_ALL, T_END));
  const angle = lerp(0.2, 0.5, prog(t, T_START, T_END)) + whip * Math.PI * 0.85;
  const dist = lerp(6.2, 4.6, push) + Math.sin(whip * Math.PI) * 1.5;
  return {
    position: [Math.sin(angle) * dist, lerp(0.8, 1.6, whip) - push * 0.6, Math.cos(angle) * dist],
    target: [0, 0, 0],
    fov: lerp(34, 50, Math.sin(whip * Math.PI) * 0.8 + push * 0.3),
  };
};

const Stage = ({ t, choice, onPick }: { t: number; choice: Choice; onPick?: () => void }) => {
  const env = LIGHTS.map((l, i) => (choice.lightsOff[i] ? 0 : lightOn(t, l.at)));
  return (
    <>
      <color attach="background" args={[INK]} />
      <CameraRig t={t} pose={materialsPose} minDistance={2.5} maxDistance={14} maxPolarAngle={Math.PI * 0.62} />
      <ambientLight intensity={0.03} />
      {LIGHTS.map((l, i) => (
        <spotLight key={l.name} position={l.pos as unknown as [number, number, number]} angle={0.7} penumbra={0.8} intensity={env[i] * 80} color={l.color} distance={20} />
      ))}
      <Environment resolution={256} frames={Infinity}>
        <Lightformer form="rect" intensity={env[0] * 2.6} color="#ffe4d0" position={[4, 4, 3]} scale={[5, 2, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={env[1] * 3.2} color={CYAN} position={[-5, 1, -3]} scale={[1, 6, 1]} target={[0, 0, 0]} />
        <Lightformer form="ring" intensity={env[2] * 2.4} color={EMBER} position={[-3, -2, 4]} scale={3} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={env[0] * 0.5} color={IVORY} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
      </Environment>
      <Hero t={t} lookIndex={choice.look} onPick={onPick} />
      <mesh position={[0, -1.9, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[7, 96]} />
        <meshStandardMaterial color="#0d0c12" roughness={0.25} metalness={0.6} />
      </mesh>
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.55} luminanceThreshold={0.85} luminanceSmoothing={0.25} mipmapBlur />
        <ChromaticAberration offset={new THREE.Vector2(0.0012 + 0.004 * Math.exp(-Math.max(0, t - T_CAM) / 0.2) * (t > T_CAM ? 1 : 0), 0.0008)} radialModulation={false} modulationOffset={0} />
      </EffectComposer>
    </>
  );
};

const Callouts = ({ t, choice, onToggleLight }: { t: number; choice: Choice; onToggleLight?: (i: number) => void }) => {
  const index = choice.look;
  const look = LOOKS[index][1];
  const matK = ease.outCubic(prog(t, T_MAT - 0.1, T_MAT + 0.2));
  const statK = ease.outCubic(prog(t, T_ALL, T_ALL + 0.3));
  const tris = Math.round(360 * 56 * 2 * statK);
  const rows: Array<[string, string]> = [
    ["TRIANGLES", tris.toLocaleString("en-US")],
    ["LIGHTS", `${LIGHTS.filter((l, i) => t >= l.at && !choice.lightsOff[i]).length} + IBL`],
    ["BRDF", "GGX · CLEARCOAT · THIN-FILM"],
    ["CAMERA", `FOV ${Math.round(lerp(34, 50, Math.sin(ease.inOutCubic(prog(t, T_CAM - 0.05, T_CAM + 0.6)) * Math.PI) * 0.8))}°`],
  ];
  return (
    <>
      <div style={{ position: "absolute", left: 76, top: 128, fontFamily: FONT_MONO, color: IVORY }}>
        {LIGHTS.map((l, i) => {
          const k = choice.lightsOff[i] ? 0 : prog(t, l.at, l.at + 0.1);
          return (
            <div
              key={l.name}
              onClick={onToggleLight && (() => onToggleLight(i))}
              style={{ fontSize: 18, letterSpacing: 3, opacity: 0.25 + 0.75 * k, display: "flex", gap: 14, alignItems: "center", lineHeight: 1.9, cursor: onToggleLight ? "pointer" : undefined, padding: onToggleLight ? "2px 10px 2px 0" : undefined }}
            >
              <span style={{ width: 12, height: 12, borderRadius: 6, background: k > 0 ? l.color : "transparent", border: `1.5px solid ${l.color}`, boxShadow: k > 0 ? `0 0 14px ${l.color}` : undefined }} />
              LIGHT · {l.name}
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", right: 76, top: 128, textAlign: "right", color: IVORY, opacity: matK }}>
        <div style={{ fontFamily: FONT_MONO, fontSize: 18, letterSpacing: 3, color: CLAY }}>MATERIAL {String(index).padStart(2, "0")}</div>
        <div key={index} style={{ fontFamily: FONT_DISPLAY, fontSize: 38, fontWeight: 600, letterSpacing: 1, marginTop: 6 }}>
          {look.name}
        </div>
      </div>
      <div style={{ position: "absolute", right: 76, bottom: 200, fontFamily: FONT_MONO, color: IVORY, fontSize: 17, letterSpacing: 2, textAlign: "right", opacity: statK, lineHeight: 1.9 }}>
        {rows.map(([k, v]) => (
          <div key={k}>
            <span style={{ opacity: 0.5 }}>{k}</span> &nbsp;{v}
          </div>
        ))}
      </div>
    </>
  );
};

const NO_LIGHTS_OFF = LIGHTS.map(() => false);

export const Materials = () => {
  const t = useCurrentFrame() / FPS;
  const { paused, resumeCount } = useInteractive();
  const [override, setOverride] = useState<Override | null>(null);
  // Overrides only live for the pause they were made in; on resume the script is in charge again.
  const active = override && override.session === resumeCount ? override : null;
  const choice: Choice = { look: active?.look ?? scriptedLook(t), lightsOff: active?.lightsOff ?? NO_LIGHTS_OFF };
  const base: Override = active ?? { session: resumeCount, look: null, lightsOff: NO_LIGHTS_OFF };

  const pickNext = () => setOverride({ ...base, look: (choice.look + 1) % LOOKS.length });
  const toggleLight = (i: number) => setOverride({ ...base, lightsOff: base.lightsOff.map((off, j) => (j === i ? !off : off)) });

  return (
    <AbsoluteFill style={{ background: INK }}>
      <ThreeCanvas width={1920} height={1080} dpr={1} gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping }} camera={{ fov: 34, near: 0.1, far: 100 }}>
        <Stage t={t} choice={choice} onPick={paused ? pickNext : undefined} />
      </ThreeCanvas>
      <Callouts t={t} choice={choice} onToggleLight={paused ? toggleLight : undefined} />
    </AbsoluteFill>
  );
};

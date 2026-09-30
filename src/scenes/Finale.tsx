import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CameraPose, CameraRig } from "../components/CameraRig";
import { ParticleField, ParticleState } from "../components/ParticleField";
import { useInteractive } from "../lib/interactive";
import { useTextPoints } from "../lib/text-points";
import { EVENTS, FPS, SCENES, ease, lerp, prog, pulse, wordAt } from "../lib/timing";
import { CLAY, EMBER, FONT_CN, FONT_MONO, INK, IVORY } from "../lib/theme";

const [T_START, T_END] = SCENES.finale;
const T_OPUS = wordAt("l7", "Opus");
const T_NEXT = wordAt("l7", "下");
const T_US = wordAt("l7", "我们");
const T_CREATE = wordAt("l7", "创造");
const T_HIT = EVENTS.hits[EVENTS.hits.length - 1];

const particleState = (t: number): ParticleState => {
  const local = t - T_START;
  const burst = ease.outExpo(prog(t, T_START, T_START + 0.9));
  const toText = ease.inOutCubic(prog(t, T_OPUS - 0.35, T_OPUS + 0.55));
  const lift = ease.inOutCubic(prog(t, T_NEXT - 0.3, T_NEXT + 0.4));
  const hit = t >= T_HIT ? Math.exp(-(t - T_HIT) / 0.25) : 0;
  return {
    time: local,
    spread: burst,
    explode: (1 - burst) * 6 * (t > T_START ? 1 : 0) + hit * 0.6,
    swirl: local * 0.9 + (1 - burst) * 3,
    noise: lerp(0.25, 0.04, toText) + hit * 0.3,
    text: toText,
    dissolve: 0,
    pulse: pulse(t, EVENTS.kicks, 0.1) * (1 - lift) + hit * 2,
    hot: hit * 0.6,
    alpha: 1,
  };
};

const finalePose = (t: number): CameraPose => {
  const burst = ease.outCubic(prog(t, T_START, T_START + 1.2));
  const toText = ease.inOutCubic(prog(t, T_OPUS - 0.35, T_OPUS + 0.8));
  const lift = ease.inOutCubic(prog(t, T_NEXT - 0.3, T_NEXT + 0.4));
  const drift = prog(t, T_START, T_END);
  const angle = lerp(0.9, 0, toText) + (1 - burst) * 1.2 + drift * 0.08;
  const dist = lerp(lerp(3, 12, burst), 11.5, toText) - drift * 0.6;
  return { position: [Math.sin(angle) * dist, lerp(2.5, 0, toText) - lift * 0.9, Math.cos(angle) * dist], target: [0, -lift * 0.9, 0] };
};

const Caption = ({ t }: { t: number }) => {
  const a = ease.outCubic(prog(t, T_NEXT - 0.05, T_NEXT + 0.35));
  const b = ease.outCubic(prog(t, T_US - 0.05, T_US + 0.35));
  const c = ease.outBack(prog(t, T_CREATE - 0.05, T_CREATE + 0.3));
  const credit = ease.outCubic(prog(t, T_HIT + 0.35, T_HIT + 0.8));
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 210, pointerEvents: "none" }}>
      <div style={{ fontFamily: FONT_CN, fontSize: 66, fontWeight: 600, color: IVORY, letterSpacing: 8, display: "flex", gap: 6 }}>
        <span style={{ opacity: a, transform: `translateY(${(1 - a) * 24}px)`, display: "inline-block" }}>下一帧，</span>
        <span style={{ opacity: b, transform: `translateY(${(1 - b) * 24}px)`, display: "inline-block" }}>我们一起</span>
        <span style={{ opacity: c > 0 ? 1 : 0, transform: `scale(${0.5 + 0.5 * c})`, display: "inline-block", color: CLAY }}>创造。</span>
      </div>
      <div style={{ marginTop: 34, fontFamily: FONT_MONO, fontSize: 17, letterSpacing: 4, color: IVORY, opacity: credit * 0.7 }}>
        DIRECTED · ANIMATED · SCORED · VOICED — ENTIRELY IN CODE BY <span style={{ color: EMBER }}>OPUS 5.5</span>
      </div>
    </AbsoluteFill>
  );
};

export const Finale = () => {
  const t = useCurrentFrame() / FPS;
  const { paused } = useInteractive();
  const points = useTextPoints("OPUS 5.5", '800 300px "Unbounded"', 9.6, 3);
  const fadeOut = prog(t, T_END - 0.45, T_END);
  const hitRing = prog(t, T_HIT, T_HIT + 0.9);
  if (!points) return null;
  return (
    <AbsoluteFill style={{ background: INK }}>
      <ThreeCanvas width={1920} height={1080} dpr={1} gl={{ antialias: false, preserveDrawingBuffer: true, toneMapping: THREE.NoToneMapping }} camera={{ fov: 40, near: 0.1, far: 100 }}>
        {/* opaque canvas: a transparent one composites bloom alpha differently in browsers vs. the headless renderer */}
        <color attach="background" args={[INK]} />
        <CameraRig t={t} pose={finalePose} minDistance={4} maxDistance={30} />
        <ParticleField state={particleState(t)} textPoints={points} size={0.075} interactive={paused} />
        <EffectComposer multisampling={0}>
          <Bloom intensity={1.3} luminanceThreshold={0.25} luminanceSmoothing={0.3} mipmapBlur />
        </EffectComposer>
      </ThreeCanvas>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 45%, rgba(232,121,74,0.18) 0%, transparent 60%)`, mixBlendMode: "screen", pointerEvents: "none" }} />
      {hitRing > 0 && hitRing < 1 && (
        <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
          <circle cx={960} cy={470} r={10 + ease.outExpo(hitRing) * 1100} fill="none" stroke={CLAY} strokeWidth={4 * (1 - hitRing)} opacity={1 - hitRing} />
        </svg>
      )}
      <Caption t={t} />
      <AbsoluteFill style={{ background: "#000", opacity: fadeOut, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

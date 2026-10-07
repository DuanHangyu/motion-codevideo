import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { GALAXY, TRACKS, TrackId } from "./universe";

/**
 * The backdrop of the knowledge universe: a three-armed spiral galaxy of ~70k points.
 * Arm dust streams slowly outward from the core (AlexNet) along each arm; bulge and disk dust turn slowly.
 * All motion runs in the vertex shader, so the CPU does nothing per frame but set a uniform.
 */

const ARM_POINTS = 15000;
const BULGE_POINTS = 9000;
const DISK_POINTS = 16000;
const FIELD_POINTS = 2500;

const gauss = () => {
  // Box–Muller, clipped to ±3σ
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.max(-3, Math.min(3, Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)));
};

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uScale;
  uniform float uDpr;
  attribute float aKind;   // 0 = arm dust (streams along the arm), 1 = bulge / disk / field (turns about the core)
  attribute float aU;
  attribute float aPhase;
  attribute vec3 aOff;     // arm: radial offset, height, angular jitter
  attribute float aSeed;
  attribute float aSize;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;
  const float R0 = ${GALAXY.R0.toFixed(3)};
  const float R1 = ${GALAXY.R1.toFixed(3)};
  const float WIND = ${GALAXY.WIND.toFixed(3)};
  void main() {
    vec3 p;
    float fade = 1.0;
    if (aKind < 0.5) {
      float u = fract(aU + uTime * 0.0035 * (0.55 + aSeed));
      float r = R0 + (R1 - R0) * u;
      float a = aPhase + WIND * u + aOff.z;
      float rr = r + aOff.x * (0.45 + r * 0.075);
      p = vec3(cos(a) * rr, aOff.y * (0.18 + 0.5 * (1.0 - u)), sin(a) * rr);
      fade = smoothstep(0.0, 0.05, u) * smoothstep(1.0, 0.82, u);
    } else {
      float r = length(position.xz);
      float w = 0.018 / (1.0 + r * 0.07);
      float c = cos(uTime * w);
      float s = sin(uTime * w);
      p = vec3(position.x * c - position.z * s, position.y, position.x * s + position.z * c);
    }
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    // cap so dust that drifts near the camera stays a pin-prick, not a blurry disc
    gl_PointSize = clamp(aSize * uScale / -mv.z, 1.0, 7.0 * uDpr);
    float twinkle = 0.72 + 0.28 * sin(uTime * (0.6 + aSeed * 2.4) + aSeed * 61.0);
    vAlpha = fade * twinkle;
    vColor = aColor;
  }
`;

const fragment = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor, a * a * vAlpha * uOpacity);
  }
`;

const build = () => {
  const n = ARM_POINTS * 3 + BULGE_POINTS + DISK_POINTS + FIELD_POINTS;
  const pos = new Float32Array(n * 3);
  const kind = new Float32Array(n);
  const u = new Float32Array(n);
  const phase = new Float32Array(n);
  const off = new Float32Array(n * 3);
  const seed = new Float32Array(n);
  const size = new Float32Array(n);
  const color = new Float32Array(n * 3);
  const c = new THREE.Color();
  const white = new THREE.Color("#dfe8ff");
  let i = 0;
  const put = (k: number, col: THREE.Color, s: number) => {
    kind[i] = k;
    seed[i] = Math.random();
    size[i] = s;
    color.set([col.r, col.g, col.b], i * 3);
    i++;
  };

  (Object.keys(TRACKS) as TrackId[]).forEach((id) => {
    const tint = new THREE.Color(TRACKS[id].color);
    for (let k = 0; k < ARM_POINTS; k++) {
      u[i] = Math.random();
      phase[i] = TRACKS[id].phase;
      off.set([gauss() * 0.9, gauss() * 0.5, gauss() * 0.05], i * 3);
      const hot = Math.random();
      // mostly faint tinted dust, a few bright white-hot stars
      c.copy(tint).lerp(white, hot * 0.55).multiplyScalar(hot > 0.97 ? 1.4 : 0.35 + Math.random() * 0.45);
      put(0, c, hot > 0.97 ? 0.42 : 0.12 + Math.random() * 0.16);
    }
  });

  const warm = new THREE.Color("#ffd9a8");
  const ember = new THREE.Color("#ff9a5a");
  for (let k = 0; k < BULGE_POINTS; k++) {
    const r = Math.abs(gauss()) * 2.6;
    const a = Math.random() * Math.PI * 2;
    pos.set([Math.cos(a) * r, gauss() * 0.9 * Math.exp(-r / 4), Math.sin(a) * r], i * 3);
    c.copy(warm).lerp(ember, Math.random() * 0.6).multiplyScalar(0.35 + Math.random() * 0.55);
    put(1, c, 0.1 + Math.random() * 0.18);
  }

  const blue = new THREE.Color("#6d84c9");
  for (let k = 0; k < DISK_POINTS; k++) {
    const r = GALAXY.R0 + Math.pow(Math.random(), 0.8) * (GALAXY.R1 + 6 - GALAXY.R0);
    const a = Math.random() * Math.PI * 2;
    pos.set([Math.cos(a) * r, gauss() * 0.35, Math.sin(a) * r], i * 3);
    c.copy(blue).multiplyScalar(0.12 + Math.random() * 0.25);
    put(1, c, 0.1 + Math.random() * 0.12);
  }

  // a sparse far field of stars all around, so the galaxy floats in space
  for (let k = 0; k < FIELD_POINTS; k++) {
    const r = 120 + Math.random() * 120;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pos.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)], i * 3);
    c.copy(white).multiplyScalar(0.25 + Math.random() * 0.5);
    put(1, c, 0.6 + Math.random() * 0.9);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aKind", new THREE.BufferAttribute(kind, 1));
  g.setAttribute("aU", new THREE.BufferAttribute(u, 1));
  g.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
  g.setAttribute("aOff", new THREE.BufferAttribute(off, 3));
  g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  g.setAttribute("aColor", new THREE.BufferAttribute(color, 3));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 200);
  return g;
};

/* ── soft sprite textures, drawn once ─────────────────────────────────── */
const canvasTexture = (size: number, draw: (g: CanvasRenderingContext2D, s: number) => void) => {
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  draw(cv.getContext("2d")!, size);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

let cache: { glow: THREE.Texture; spikes: THREE.Texture; ring: THREE.Texture } | null = null;
export const textures = () => {
  if (cache) return cache;
  const glow = canvasTexture(128, (g, s) => {
    const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r.addColorStop(0, "rgba(255,255,255,1)");
    r.addColorStop(0.12, "rgba(255,255,255,0.75)");
    r.addColorStop(0.35, "rgba(255,255,255,0.18)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, s, s);
  });
  const spikes = canvasTexture(256, (g, s) => {
    g.translate(s / 2, s / 2);
    for (const rot of [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4]) {
      g.save();
      g.rotate(rot);
      const long = rot === 0 || rot === Math.PI / 2;
      const lg = g.createLinearGradient(-s / 2, 0, s / 2, 0);
      lg.addColorStop(0, "rgba(255,255,255,0)");
      lg.addColorStop(0.5, `rgba(255,255,255,${long ? 0.9 : 0.35})`);
      lg.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = lg;
      const len = long ? s / 2 : s / 4;
      g.fillRect(-len, -1, len * 2, 2);
      g.restore();
    }
  });
  const ring = canvasTexture(128, (g, s) => {
    g.strokeStyle = "rgba(255,255,255,0.9)";
    g.lineWidth = 3;
    g.beginPath();
    g.arc(s / 2, s / 2, s / 2 - 4, 0, Math.PI * 2);
    g.stroke();
  });
  cache = { glow, spikes, ring };
  return cache;
};

/** Faint coloured nebulae drifting along the arms, for atmosphere. */
const Nebulae = ({ opacity }: { opacity: { current: number } }) => {
  const items = useMemo(
    () =>
      (Object.keys(TRACKS) as TrackId[]).flatMap((id) =>
        Array.from({ length: 16 }, () => {
          const u = 0.08 + Math.random() * 0.85;
          const r = GALAXY.R0 + (GALAXY.R1 - GALAXY.R0) * u + gauss() * 1.5;
          const a = TRACKS[id].phase + GALAXY.WIND * u;
          return { p: [Math.cos(a) * r, gauss() * 0.3, Math.sin(a) * r] as const, s: 5 + Math.random() * 8, color: TRACKS[id].color, o: 0.05 + Math.random() * 0.06 };
        }),
      ),
    [],
  );
  const mats = useRef<Array<THREE.SpriteMaterial | null>>([]);
  useFrame(() => mats.current.forEach((m, k) => m && (m.opacity = items[k].o * opacity.current)));
  const { glow } = textures();
  return (
    <>
      {items.map((n, k) => (
        <sprite key={k} position={n.p as unknown as THREE.Vector3Tuple} scale={[n.s, n.s * 0.6, 1]}>
          <spriteMaterial ref={(m) => void (mats.current[k] = m)} map={glow} color={n.color} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
        </sprite>
      ))}
    </>
  );
};

export const Galaxy = ({ dim }: { dim: { current: number } }) => {
  const geo = useMemo(build, []);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: { uTime: { value: 0 }, uScale: { value: 1 }, uOpacity: { value: 1 }, uDpr: { value: 1 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  const opacity = useRef(1);
  const heart = useRef<THREE.SpriteMaterial>(null);
  const haze = useRef<THREE.SpriteMaterial>(null);
  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = clock.elapsedTime + 40;
    // world-space point sizes: pixels per world unit at distance 1
    mat.uniforms.uScale.value = (size.height * dpr) / (2 * Math.tan((42 / 2) * (Math.PI / 180)));
    mat.uniforms.uDpr.value = dpr;
    opacity.current = 1 - 0.7 * dim.current;
    if (heart.current) heart.current.opacity = 0.55 * (1 - 0.75 * dim.current);
    if (haze.current) haze.current.opacity = 0.12 * (1 - 0.75 * dim.current);
    mat.uniforms.uOpacity.value = opacity.current;
  });
  const { glow } = textures();
  return (
    <group rotation={[0, 0, 0]}>
      <points geometry={geo} material={mat} frustumCulled={false} />
      <Nebulae opacity={opacity} />
      {/* the bright heart of the galaxy */}
      <sprite scale={[16, 16, 1]}>
        <spriteMaterial ref={heart} map={glow} color="#ffcf92" transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
      <sprite scale={[40, 22, 1]}>
        <spriteMaterial ref={haze} map={glow} color="#ff9a5a" transparent opacity={0.12} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
    </group>
  );
};

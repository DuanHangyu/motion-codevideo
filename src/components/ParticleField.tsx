import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { random } from "remotion";
import { CLAY, CYAN, IVORY } from "../lib/theme";

export type ParticleState = {
  time: number;
  spread: number; // 0 = collapsed to a point, 1 = full sphere
  explode: number; // radial push outward
  swirl: number; // accumulated rotation angle
  noise: number; // flow-field turbulence amplitude
  text: number; // 0 = sphere, 1 = text glyphs
  dissolve: number; // 0 = intact, 1 = blown away
  pulse: number; // beat-reactive size boost
  hot: number; // additive white-hot boost
  alpha: number;
};

const COUNT = 70000;

const vertex = /* glsl */ `
uniform float uTime, uSpread, uExplode, uSwirl, uNoise, uText, uDissolve, uPulse, uSize, uPixelRatio, uPush;
uniform vec3 uMouse;
attribute vec3 aSphere;
attribute vec3 aText;
attribute vec4 aRand;
varying float vAlpha;
varying float vTone;

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

void main() {
  vec3 dir = normalize(aSphere + 1e-4);
  vec3 p = aSphere * uSpread;
  float t = uTime;
  vec3 flow = vec3(
    sin(p.y * 1.7 + t * 0.9 + aRand.x * 6.283),
    sin(p.z * 1.9 + t * 1.1 + aRand.y * 6.283),
    sin(p.x * 1.5 + t * 0.7 + aRand.z * 6.283));
  p += flow * uNoise * (0.4 + aRand.w);
  p.xz = rot(uSwirl * (0.6 + 0.5 * aRand.x)) * p.xz;
  p.xy = rot(uSwirl * 0.18) * p.xy;
  p += dir * uExplode * (0.4 + 1.6 * aRand.y);

  vec3 tp = aText + vec3(
    sin(t * 1.3 + aRand.x * 20.0) * 0.012,
    cos(t * 1.1 + aRand.y * 20.0) * 0.012,
    (aRand.z - 0.5) * 0.18);
  float k = clamp(uText * 1.7 - aRand.w * 0.7, 0.0, 1.0);
  k = k * k * (3.0 - 2.0 * k);
  p = mix(p, tp, k);

  p += (dir + vec3(0.0, 0.6, 0.0)) * uDissolve * (1.0 + 4.0 * aRand.x);

  // viewer's cursor pushes particles away (web player only; uPush is 0 in exported renders)
  // push stays in the text plane: shoving points toward the camera would blow them up into huge discs
  vec2 away = p.xy - uMouse.xy;
  float falloff = exp(-dot(away, away) / 0.9);
  p.xy += normalize(away + 1e-4) * uPush * falloff * (0.8 + 1.4 * aRand.y);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float size = uSize * (0.35 + aRand.z * aRand.z * 1.7) * (1.0 + uPulse * 0.7);
  gl_PointSize = size * uPixelRatio * (260.0 / -mv.z);
  vAlpha = (0.45 + 0.55 * aRand.x) * (1.0 - uDissolve);
  vTone = aRand.y;
}`;

const fragment = /* glsl */ `
uniform vec3 uColA, uColB, uColC;
uniform float uAlpha, uHot;
varying float vAlpha;
varying float vTone;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  a *= a;
  vec3 col = mix(uColA, uColB, smoothstep(0.35, 0.95, vTone));
  col = mix(col, uColC, step(0.95, vTone));
  col += uHot;
  gl_FragColor = vec4(col, a * vAlpha * uAlpha);
}`;

const fibonacciSphere = (i: number, n: number) => {
  const y = 1 - (2 * (i + 0.5)) / n;
  const r = Math.sqrt(1 - y * y);
  const phi = i * Math.PI * (3 - Math.sqrt(5));
  return [Math.cos(phi) * r, y, Math.sin(phi) * r];
};

const buildGeometry = (textPoints: Float32Array) => {
  const sphere = new Float32Array(COUNT * 3);
  const text = new Float32Array(COUNT * 3);
  const rand = new Float32Array(COUNT * 4);
  const textCount = textPoints.length / 3;
  for (let i = 0; i < COUNT; i++) {
    const r = [0, 1, 2, 3].map((k) => random(`p${i}-${k}`));
    rand.set(r, i * 4);
    if (i % 5 === 0) {
      // a tilted planetary ring around the core
      const a = r[0] * Math.PI * 2;
      const rad = 3.1 + r[1] * 1.3;
      const x = Math.cos(a) * rad;
      const z = Math.sin(a) * rad;
      const tilt = 0.42;
      sphere.set([x, z * Math.sin(tilt) + (r[2] - 0.5) * 0.05, z * Math.cos(tilt)], i * 3);
    } else {
      const [x, y, z] = fibonacciSphere(i, COUNT);
      const rad = 2.1 * (0.82 + 0.3 * Math.sqrt(r[2]));
      sphere.set([x * rad, y * rad, z * rad], i * 3);
    }
    const j = Math.floor(r[3] * textCount) * 3;
    text.set([textPoints[j], textPoints[j + 1], textPoints[j + 2]], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(sphere.slice(), 3));
  g.setAttribute("aSphere", new THREE.BufferAttribute(sphere, 3));
  g.setAttribute("aText", new THREE.BufferAttribute(text, 3));
  g.setAttribute("aRand", new THREE.BufferAttribute(rand, 4));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50);
  return g;
};

const EMPTY_TEXT = new Float32Array([0, 0, 0]);

const PUSH_PLANE = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const hit = new THREE.Vector3();

export const ParticleField = ({ state, textPoints = EMPTY_TEXT, size = 0.09, interactive = false }: { state: ParticleState; textPoints?: Float32Array; size?: number; interactive?: boolean }) => {
  const geometry = useMemo(() => buildGeometry(textPoints), [textPoints]);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uSpread: { value: 1 },
          uExplode: { value: 0 },
          uSwirl: { value: 0 },
          uNoise: { value: 0 },
          uText: { value: 0 },
          uDissolve: { value: 0 },
          uPulse: { value: 0 },
          uHot: { value: 0 },
          uAlpha: { value: 1 },
          uSize: { value: size },
          uPixelRatio: { value: 1 },
          uPush: { value: 0 },
          uMouse: { value: new THREE.Vector3(0, 0, 100) },
          uColA: { value: new THREE.Color(CLAY) },
          uColB: { value: new THREE.Color(IVORY) },
          uColC: { value: new THREE.Color(CYAN) },
        },
      }),
    [size],
  );

  const u = material.uniforms;
  u.uTime.value = state.time;
  u.uSpread.value = state.spread;
  u.uExplode.value = state.explode;
  u.uSwirl.value = state.swirl;
  u.uNoise.value = state.noise;
  u.uText.value = state.text;
  u.uDissolve.value = state.dissolve;
  u.uPulse.value = state.pulse;
  u.uHot.value = state.hot;
  u.uAlpha.value = state.alpha;

  // R3F reports the pointer at screen centre until the mouse actually moves, so track real hover ourselves.
  const dom = useThree((s) => s.gl.domElement);
  const hovering = useRef(false);
  useEffect(() => {
    const enter = () => (hovering.current = true);
    const leave = () => (hovering.current = false);
    dom.addEventListener("pointermove", enter);
    dom.addEventListener("pointerleave", leave);
    return () => {
      dom.removeEventListener("pointermove", enter);
      dom.removeEventListener("pointerleave", leave);
    };
  }, [dom]);

  // Cursor tracking runs on wall-clock frames so it also responds while the video is paused.
  useFrame(({ raycaster, pointer, camera }) => {
    const active = interactive && hovering.current;
    const push = material.uniforms.uPush;
    push.value += ((active ? 1 : 0) - push.value) * 0.12;
    if (!active) return;
    raycaster.setFromCamera(pointer, camera);
    if (raycaster.ray.intersectPlane(PUSH_PLANE, hit)) material.uniforms.uMouse.value.lerp(hit, 0.35);
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
};

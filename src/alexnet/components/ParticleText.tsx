import { useMemo } from "react";
import * as THREE from "three";
import { random } from "remotion";

const vertex = /* glsl */ `
uniform float uTime, uMix, uScatter, uSize, uSwirl;
attribute vec3 aA;
attribute vec3 aB;
attribute vec4 aRand;
varying float vAlpha;
varying float vTone;

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

void main() {
  // staggered morph so the glyphs dissolve and re-form instead of sliding as one block
  float k = clamp(uMix * 1.6 - aRand.w * 0.6, 0.0, 1.0);
  k = k * k * (3.0 - 2.0 * k);
  vec3 formed = mix(aA, aB, k);
  float arc = sin(k * 3.14159);
  formed.z += arc * (aRand.x - 0.5) * 3.0;
  formed.y += arc * (aRand.y - 0.5) * 1.2;

  vec3 dir = normalize(vec3(aRand.x - 0.5, aRand.y - 0.5, aRand.z - 0.5) + 1e-4);
  vec3 cloud = dir * (3.0 + 9.0 * aRand.z);
  cloud.xz = rot(uSwirl * (0.5 + aRand.x)) * cloud.xz;
  float s = clamp(uScatter * 1.5 - aRand.y * 0.5, 0.0, 1.0);
  vec3 p = mix(formed, cloud, s * s);
  p += vec3(sin(uTime * 1.3 + aRand.x * 40.0), cos(uTime * 1.1 + aRand.y * 40.0), sin(uTime + aRand.z * 40.0)) * (0.012 + 0.25 * s);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (0.4 + aRand.z * aRand.z * 1.6) * (260.0 / -mv.z);
  vAlpha = 0.5 + 0.5 * aRand.x;
  vTone = aRand.y;
}`;

const fragment = /* glsl */ `
uniform vec3 uColA, uColB;
uniform float uAlpha, uHot;
varying float vAlpha;
varying float vTone;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  a *= a;
  vec3 col = mix(uColA, uColB, smoothstep(0.55, 1.0, vTone)) + uHot;
  gl_FragColor = vec4(col, a * vAlpha * uAlpha);
}`;

export type ParticleTextState = { time: number; mix: number; scatter: number; swirl: number; alpha: number; hot?: number };

export const ParticleText = ({
  a,
  b,
  state,
  count = 45000,
  size = 0.06,
  colors = ["#3CE0FF", "#ECF1F8"],
}: {
  a: Float32Array;
  b: Float32Array;
  state: ParticleTextState;
  count?: number;
  size?: number;
  colors?: [string, string];
}) => {
  const geometry = useMemo(() => {
    const pa = new Float32Array(count * 3);
    const pb = new Float32Array(count * 3);
    const rnd = new Float32Array(count * 4);
    const na = a.length / 3;
    const nb = b.length / 3;
    for (let i = 0; i < count; i++) {
      const r = [0, 1, 2, 3].map((k) => random(`pt${i}-${k}`));
      rnd.set(r, i * 4);
      const ia = Math.floor(random(`pa${i}`) * na) * 3;
      const ib = Math.floor(random(`pb${i}`) * nb) * 3;
      pa.set([a[ia], a[ia + 1], a[ia + 2]], i * 3);
      pb.set([b[ib], b[ib + 1], b[ib + 2]], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pa.slice(), 3));
    g.setAttribute("aA", new THREE.BufferAttribute(pa, 3));
    g.setAttribute("aB", new THREE.BufferAttribute(pb, 3));
    g.setAttribute("aRand", new THREE.BufferAttribute(rnd, 4));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 60);
    return g;
  }, [a, b, count]);

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
          uMix: { value: 0 },
          uScatter: { value: 0 },
          uSwirl: { value: 0 },
          uSize: { value: size },
          uAlpha: { value: 1 },
          uHot: { value: 0 },
          uColA: { value: new THREE.Color(colors[0]) },
          uColB: { value: new THREE.Color(colors[1]) },
        },
      }),
    [size, colors],
  );
  const u = material.uniforms;
  u.uTime.value = state.time;
  u.uMix.value = state.mix;
  u.uScatter.value = state.scatter;
  u.uSwirl.value = state.swirl;
  u.uAlpha.value = state.alpha;
  u.uHot.value = state.hot ?? 0;
  return <points geometry={geometry} material={material} frustumCulled={false} />;
};

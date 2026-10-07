import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

/** Slowly drifting dust of points — the shared backdrop of home and map. */
export const Starfield = ({ count = 2500, radius = 60 }: { count?: number; radius?: number }) => {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = radius * Math.cbrt(Math.random());
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      p.set([r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th) * 0.5, r * Math.cos(ph)], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    return g;
  }, [count, radius]);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.01;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.08} color="#9fb6ff" transparent opacity={0.55} depthWrite={false} />
    </points>
  );
};

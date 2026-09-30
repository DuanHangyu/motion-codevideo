import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useInteractive } from "../lib/interactive";
import { ease, prog } from "../lib/timing";

export type Vec3 = [number, number, number];
export type CameraPose = { position: Vec3; target: Vec3; fov?: number };

/** Seconds of video time used to fly from the viewer's angle back onto the scripted path. */
const BLEND_SEC = 0.7;

type Blend = { from: THREE.Vector3; fromTarget: THREE.Vector3; t0: number };

type Limits = { minDistance: number; maxDistance: number; maxPolarAngle: number };

const PausedControls = ({ target, minDistance, maxDistance, maxPolarAngle }: Limits & { target: THREE.Vector3 }) => {
  const ref = useRef<OrbitControlsImpl>(null);
  useLayoutEffect(() => {
    const controls = ref.current;
    if (!controls) return;
    controls.target = target; // shared vector: panning while paused is remembered for the resume blend
    controls.update();
  }, [target]);
  return <OrbitControls ref={ref} enableDamping dampingFactor={0.08} minDistance={minDistance} maxDistance={maxDistance} maxPolarAngle={maxPolarAngle} rotateSpeed={0.7} />;
};

/**
 * Scripted camera while playing; free orbit while paused; smooth hand-back on resume.
 * `pose` must be a pure function of time so exported renders stay deterministic.
 */
export const CameraRig = ({
  t,
  pose,
  minDistance = 2,
  maxDistance = 40,
  maxPolarAngle = Math.PI,
}: { t: number; pose: (t: number) => CameraPose } & Partial<Limits>) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const { paused, resumeCount } = useInteractive();
  const target = useRef(new THREE.Vector3());
  const blend = useRef<Blend | null>(null);
  const seenResume = useRef(resumeCount);
  const placed = useRef(false);

  if (resumeCount !== seenResume.current) {
    seenResume.current = resumeCount;
    blend.current = { from: camera.position.clone(), fromTarget: target.current.clone(), t0: t };
  }

  // While paused the viewer owns the camera — except on first mount (e.g. seeking into this scene while paused).
  if (!paused || !placed.current) {
    const p = pose(t);
    const pos = new THREE.Vector3(...p.position);
    const tgt = new THREE.Vector3(...p.target);
    const b = blend.current;
    if (b && !paused) {
      const k = prog(t, b.t0, b.t0 + BLEND_SEC);
      if (t < b.t0 || k >= 1) {
        blend.current = null;
      } else {
        const e = ease.inOutCubic(k);
        pos.lerpVectors(b.from, pos, e);
        tgt.lerpVectors(b.fromTarget, tgt, e);
      }
    }
    camera.position.copy(pos);
    camera.lookAt(tgt);
    target.current.copy(tgt);
    if (p.fov !== undefined && camera.fov !== p.fov) {
      camera.fov = p.fov;
      camera.updateProjectionMatrix();
    }
    placed.current = true;
  }

  return paused ? <PausedControls target={target.current} minDistance={minDistance} maxDistance={maxDistance} maxPolarAngle={maxPolarAngle} /> : null;
};

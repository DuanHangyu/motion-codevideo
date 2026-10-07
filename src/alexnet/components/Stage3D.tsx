import { ReactNode } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { BG, H, W } from "../lib/theme";

export type V3 = [number, number, number];
export type Pose = { position: V3; target: V3; fov?: number };

/** Places the camera from a pure function of time — every frame is deterministic. */
const Camera = ({ pose }: { pose: Pose }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  camera.position.set(...pose.position);
  camera.lookAt(...pose.target);
  const fov = pose.fov ?? 40;
  if (camera.fov !== fov) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
  return null;
};

export const Stage3D = ({
  pose,
  children,
  bloom = 0.9,
  threshold = 0.4,
  bg = BG,
  fog,
}: {
  pose: Pose;
  children: ReactNode;
  bloom?: number;
  threshold?: number;
  bg?: string;
  fog?: [number, number];
}) => (
  <ThreeCanvas
    width={W}
    height={H}
    dpr={1}
    gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.NoToneMapping }}
    camera={{ fov: pose.fov ?? 40, near: 0.05, far: 600 }}
  >
    <color attach="background" args={[bg]} />
    {fog && <fog attach="fog" args={[bg, fog[0], fog[1]]} />}
    <Camera pose={pose} />
    {children}
    {bloom > 0 && (
      <EffectComposer multisampling={0}>
        <Bloom intensity={bloom} luminanceThreshold={threshold} luminanceSmoothing={0.25} mipmapBlur />
      </EffectComposer>
    )}
  </ThreeCanvas>
);

const scratch = new THREE.PerspectiveCamera(40, W / H, 0.05, 600);
const v = new THREE.Vector3();

/** Project a world point to screen pixels for DOM labels that track 3D objects. */
export const projector = (pose: Pose) => {
  scratch.fov = pose.fov ?? 40;
  scratch.position.set(...pose.position);
  scratch.lookAt(...pose.target);
  scratch.updateProjectionMatrix();
  scratch.updateMatrixWorld(true);
  const m = scratch.matrixWorldInverse.clone();
  const p = scratch.projectionMatrix.clone();
  return (x: number, y: number, z: number) => {
    v.set(x, y, z).applyMatrix4(m);
    const behind = v.z > 0;
    v.applyMatrix4(p);
    return { x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H, behind };
  };
};

export const lerpPose = (a: Pose, b: Pose, k: number): Pose => {
  const l = (x: V3, y: V3): V3 => [x[0] + (y[0] - x[0]) * k, x[1] + (y[1] - x[1]) * k, x[2] + (y[2] - x[2]) * k];
  return { position: l(a.position, b.position), target: l(a.target, b.target), fov: (a.fov ?? 40) + ((b.fov ?? 40) - (a.fov ?? 40)) * k };
};

/** Camera on a circle around `target`. */
export const orbit = (target: V3, radius: number, angle: number, height: number, fov = 40): Pose => ({
  position: [target[0] + Math.sin(angle) * radius, target[1] + height, target[2] + Math.cos(angle) * radius],
  target,
  fov,
});

import { ReactNode, useRef } from "react";
import * as THREE from "three";
import { events as domEvents, useFrame, useThree } from "@react-three/fiber";
import type { EventManager, RootState } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { ThreeCanvas } from "@remotion/three";
import { blendNow, explore, useExplore } from "../lib/explore";
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

/**
 * Scripted camera while playing. When this stage's zone is frozen: a short dolly-in, then the student
 * orbits freely (dragging an object pauses the orbit), and on return the camera flies back to the script.
 */
const ExploreCamera = ({ pose, zone }: { pose: Pose; zone: string }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const ex = useExplore(zone);
  const controls = useRef<OrbitControlsImpl>(null);
  const from = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const target = useRef(new THREE.Vector3(...pose.target));

  const scripted = new THREE.Vector3(...pose.position);
  const look = new THREE.Vector3(...pose.target);

  useFrame(() => {
    const c = controls.current;
    if (c) c.enabled = ex.phase === "on" && !explore.isDragging();
  });

  if (!ex.active) {
    from.current = null;
    camera.position.copy(scripted);
    camera.lookAt(look);
  } else if (ex.phase === "entering") {
    // lean into the frozen world: 12 % closer
    const k = blendNow();
    camera.position.copy(scripted).lerp(look, 0.12 * k);
    camera.lookAt(look);
    target.current.copy(look);
  } else if (ex.phase === "returning") {
    if (!from.current) from.current = { pos: camera.position.clone(), target: (controls.current?.target ?? target.current).clone() };
    const k = 1 - blendNow();
    camera.position.lerpVectors(from.current.pos, scripted, k);
    camera.lookAt(new THREE.Vector3().lerpVectors(from.current.target, look, k));
  }
  const fov = pose.fov ?? 40;
  if (camera.fov !== fov) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
  return ex.phase === "on" ? (
    <OrbitControls ref={controls} target={target.current} enableDamping dampingFactor={0.08} rotateSpeed={0.6} minDistance={3} maxDistance={60} maxPolarAngle={Math.PI * 0.49} />
  ) : null;
};

/**
 * The player scales the 1920×1080 frame with a CSS transform, which breaks R3F's offsetX-based pointer math.
 * Compute the pointer from client coordinates and the canvas's on-screen rectangle instead.
 */
const scaledEvents = (store: Parameters<typeof domEvents>[0]): EventManager<HTMLElement> => ({
  ...domEvents(store),
  compute(event: { clientX: number; clientY: number }, state: RootState) {
    const r = state.gl.domElement.getBoundingClientRect();
    state.pointer.set(((event.clientX - r.left) / r.width) * 2 - 1, -((event.clientY - r.top) / r.height) * 2 + 1);
    state.raycaster.setFromCamera(state.pointer, state.camera);
  },
});

export const Stage3D = ({
  pose,
  children,
  bloom = 0.9,
  threshold = 0.4,
  bg = BG,
  fog,
  zone,
}: {
  pose: Pose;
  /** explore zone id: lets the student take the camera while this zone is frozen */
  zone?: string;
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
    events={scaledEvents}
  >
    <color attach="background" args={[bg]} />
    {fog && <fog attach="fog" args={[bg, fog[0], fog[1]]} />}
    {zone ? <ExploreCamera pose={pose} zone={zone} /> : <Camera pose={pose} />}
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

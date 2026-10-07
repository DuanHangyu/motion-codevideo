import { MutableRefObject, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Progress, Status, get, status } from "../progress/mastery";
import type { KnowledgeNode } from "./graph";
import { CHAPTERS, Chapter, GALAXY, TRACKS, chapterPos } from "./universe";
import { Galaxy, textures } from "./Galaxy";

export const STATUS_COLOR: Record<Status, string> = { new: "#8fa0c8", learning: "#3ce0ff", review: "#ff5470", mastered: "#a8ff60" };
const TAN = Math.tan((42 / 2) * (Math.PI / 180));
const ELEV_UNIVERSE = 1.0; // radians above the galactic plane
const ELEV_SYSTEM = 0.62;

type Expand = MutableRefObject<Record<string, number>>;
const smooth = (x: number) => x * x * (3 - 2 * x);
const POS = Object.fromEntries(CHAPTERS.map((c) => [c.id, new THREE.Vector3(...chapterPos(c))]));
const isCore = (c: Chapter) => c.along === 0;
/** radius of a chapter's planet orbit once it is opened */
const ringRadius = (c: Chapter) => 3 + c.children.length * 0.5;
/** radius of the tight satellite orbit while closed */
const satRadius = (c: Chapter) => (isCore(c) ? 2.4 : 1.5);

export const nodeStatus = (p: Progress, n: KnowledgeNode): Status | "locked" => (n.span ? status(get(p, n.id)) : "locked");

const fromElevation = (target: THREE.Vector3, d: number, elev: number) => target.clone().add(new THREE.Vector3(0, Math.sin(elev) * d, Math.cos(elev) * d));

/**
 * Camera rest pose for the window shape: the whole galaxy fitted right of the title column,
 * or one star system with the star left of centre (the card sits on the right).
 */
const viewOf = (c: Chapter | undefined, aspect: number) => {
  if (!c) {
    const w = (GALAXY.R1 + 5) * 2;
    const h = w * Math.sin(ELEV_UNIVERSE) + 6;
    const d = Math.max(w / 0.62 / (2 * TAN * aspect), h / 0.8 / (2 * TAN));
    const visW = 2 * d * TAN * aspect;
    const target = new THREE.Vector3(-0.17 * visW, 0, 0);
    return { pos: fromElevation(target, d, ELEV_UNIVERSE), target };
  }
  const span = ringRadius(c) * 2 + 7;
  const d = Math.max(span / 0.58 / (2 * TAN * aspect), (span * Math.sin(ELEV_SYSTEM) + 6) / 0.75 / (2 * TAN), 13);
  const visW = 2 * d * TAN * aspect;
  const target = POS[c.id].clone().add(new THREE.Vector3(0.15 * visW, 0, 0));
  return { pos: fromElevation(target, d, ELEV_SYSTEM), target };
};

/** Planet i of chapter c: a tight satellite (k = 0) or spread on the chapter's wide orbit (k = 1). */
const planetPos = (c: Chapter, i: number, k: number, time: number, out: THREE.Vector3) => {
  const n = c.children.length;
  const e = smooth(k);
  const r = satRadius(c) + (ringRadius(c) - satRadius(c)) * e;
  // satellites spin quickly; opened, the system turns slowly so labels stay readable
  const spin = time * (0.3 - 0.29 * e);
  const a = -Math.PI / 2 - (i / n) * Math.PI * 2 + spin * (1 - e) + time * 0.01 * e + (1 - e) * c.along * 9;
  const p = POS[c.id];
  return out.set(p.x + Math.cos(a) * r, p.y + Math.sin(a * 2 + i) * 0.12 * (1 - e), p.z + Math.sin(a) * r);
};

/* ── camera ──────────────────────────────────────────────────────────── */
const CameraRig = ({ focus }: { focus: Chapter | undefined }) => {
  const camera = useThree((s) => s.camera);
  const clock = useThree((s) => s.clock);
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const controls = useRef<OrbitControlsImpl>(null);
  const fly = useRef<{ t0: number; from: { pos: THREE.Vector3; target: THREE.Vector3 }; to: ReturnType<typeof viewOf>; dur: number } | null>(null);
  const first = useRef(true);
  useEffect(() => {
    const c = controls.current;
    const to = viewOf(focus, aspect);
    if (first.current) {
      // arrive from deep space: a slow descent onto the galaxy
      first.current = false;
      fly.current = { t0: clock.elapsedTime, from: { pos: fromElevation(to.target, to.pos.distanceTo(to.target) * 1.9, 1.35), target: to.target.clone() }, to, dur: 3.2 };
      return;
    }
    fly.current = { t0: clock.elapsedTime, from: { pos: camera.position.clone(), target: c ? c.target.clone() : new THREE.Vector3() }, to, dur: 1.8 };
  }, [focus, camera, clock, aspect]);
  useFrame(({ clock: cl }) => {
    const f = fly.current;
    const c = controls.current;
    if (!f || !c) return;
    const k = Math.min(1, (cl.elapsedTime - f.t0) / f.dur);
    const e = k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2;
    camera.position.lerpVectors(f.from.pos, f.to.pos, e);
    c.target.lerpVectors(f.from.target, f.to.target, e);
    c.enabled = k >= 1;
    c.update();
    if (k >= 1) fly.current = null;
  });
  return <OrbitControls ref={controls} enableDamping dampingFactor={0.07} rotateSpeed={0.5} minDistance={6} maxDistance={260} minPolarAngle={0.12} maxPolarAngle={1.42} enablePan={false} />;
};

/** Eases each chapter's "opened" amount toward its goal; `__any` is the strongest of them. */
const ExpandDriver = ({ focus, expand }: { focus: string | null; expand: Expand }) => {
  useFrame((_, dt) => {
    const a = 1 - Math.exp(-dt * 2.6);
    let any = 0;
    for (const c of CHAPTERS) {
      const k = expand.current[c.id] ?? 0;
      const goal = focus === c.id ? 1 : 0;
      const next = k + (goal - k) * a;
      expand.current[c.id] = Math.abs(next - goal) < 1e-3 ? goal : next;
      any = Math.max(any, expand.current[c.id]);
    }
    expand.current.__any = any;
  });
  return null;
};

/* ── prerequisite arcs: barely there, lit when a connected star is hovered ── */
const Arcs = ({ hover, expand }: { hover: string | null; expand: Expand }) => {
  const arcs = useMemo(
    () =>
      CHAPTERS.flatMap((c) =>
        c.needs.map((id) => {
          const a = POS[id];
          const b = POS[c.id];
          const mid = a.clone().add(b).multiplyScalar(0.5).add(new THREE.Vector3(0, a.distanceTo(b) * 0.22, 0));
          const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
          const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(curve.getPoints(64)),
            new THREE.LineBasicMaterial({ color: TRACKS[c.track].color, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false }),
          );
          return { from: id, to: c.id, curve, line };
        }),
      ),
    [],
  );
  const sparks = useRef<Array<THREE.Sprite | null>>([]);
  const lit = useRef<number[]>(arcs.map(() => 0));
  const { glow } = textures();
  useFrame(({ clock }, dt) => {
    const away = 1 - (expand.current.__any ?? 0);
    arcs.forEach((arc, k) => {
      const goal = hover && (arc.from === hover || arc.to === hover) ? 1 : 0;
      lit.current[k] += (goal - lit.current[k]) * (1 - Math.exp(-dt * 6));
      const l = lit.current[k];
      (arc.line.material as THREE.LineBasicMaterial).opacity = (0.08 + 0.6 * l) * away;
      const s = sparks.current[k];
      if (s) {
        s.position.copy(arc.curve.getPoint((clock.elapsedTime * 0.22 + k * 0.31) % 1));
        (s.material as THREE.SpriteMaterial).opacity = (0.15 + 0.85 * l) * away;
      }
    });
  });
  return (
    <>
      {arcs.map((arc, k) => (
        <group key={`${arc.from}-${arc.to}`}>
          <primitive object={arc.line} />
          <sprite ref={(s) => void (sparks.current[k] = s)} scale={[0.9, 0.9, 1]}>
            <spriteMaterial map={glow} color="#ffffff" transparent blending={THREE.AdditiveBlending} depthWrite={false} />
          </sprite>
        </group>
      ))}
    </>
  );
};

const circle = (r: number, n: number, from = 0, to = Math.PI * 2) =>
  new THREE.BufferGeometry().setFromPoints(Array.from({ length: n + 1 }, (_, i) => {
    const a = from + ((to - from) * i) / n;
    return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
  }));

/* ── a star: one big node ────────────────────────────────────────────── */
const Star = ({
  c,
  index,
  expand,
  mastered,
  recommended,
  hovered,
  onHover,
  onPick,
}: {
  c: Chapter;
  index: number;
  expand: Expand;
  mastered: number;
  recommended: boolean;
  hovered: boolean;
  onHover: (on: boolean) => void;
  onPick: () => void;
}) => {
  const { glow, spikes, ring } = textures();
  const group = useRef<THREE.Group>(null);
  const halo = useRef<THREE.SpriteMaterial>(null);
  const core = useRef<THREE.SpriteMaterial>(null);
  const spike = useRef<THREE.Sprite>(null);
  const beacon = useRef<THREE.Sprite>(null);
  const label = useRef<HTMLDivElement>(null);
  const open = !!c.lesson;
  const color = useMemo(() => new THREE.Color(isCore(c) ? "#ffe2b0" : TRACKS[c.track].color).lerp(new THREE.Color("#ffffff"), 0.25), [c]);
  const size = isCore(c) ? 1.6 : open ? 1.25 : 0.85;
  const frac = mastered / c.children.length;
  // the satellites' orbit, with the mastered share traced in green
  const orbit = useMemo(
    () => new THREE.Line(circle(satRadius(c), 96), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false })),
    [c, color],
  );
  const done = useMemo(
    () => (frac ? new THREE.Line(circle(satRadius(c), 64, -Math.PI / 2, -Math.PI / 2 - Math.PI * 2 * frac), new THREE.LineBasicMaterial({ color: STATUS_COLOR.mastered, transparent: true, opacity: 0.85, toneMapped: false })) : null),
    [c, frac],
  );

  useFrame(({ clock, camera }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const mine = expand.current[c.id] ?? 0;
    const others = Math.max(0, (expand.current.__any ?? 0) - mine);
    // the stars ignite one after another while the camera descends
    const ignite = Math.min(1, Math.max(0, (t - 0.9 - index * 0.12) / 0.8));
    const breathe = 1 + Math.sin(t * 1.3 + index) * 0.04;
    g.scale.setScalar(Math.max(0.001, size * ignite * breathe * (hovered && mine < 0.5 ? 1.18 : 1)));
    const fade = 1 - 0.82 * others;
    if (halo.current) halo.current.opacity = (open ? 0.95 : 0.55) * fade;
    if (core.current) core.current.opacity = fade;
    if (spike.current) {
      const m = spike.current.material as THREE.SpriteMaterial;
      m.rotation = t * 0.04 + index;
      m.opacity = Math.min(1, (open ? 0.55 : 0.18) * fade * (hovered ? 1.8 : 1));
    }
    if (beacon.current) {
      const p = (t * 0.45) % 1;
      beacon.current.scale.setScalar(2.2 + p * 3.5);
      (beacon.current.material as THREE.SpriteMaterial).opacity = (1 - p) * 0.55 * (1 - mine) * fade;
    }
    (orbit.material as THREE.LineBasicMaterial).opacity = 0.16 * (1 - smooth(mine)) * fade;
    if (done) (done.material as THREE.LineBasicMaterial).opacity = 0.85 * (1 - smooth(mine)) * fade;
    if (label.current) {
      const dist = camera.position.distanceTo(POS[c.id]);
      label.current.style.opacity = String(fade * (1 - smooth(mine)) * Math.min(1, 150 / dist));
    }
  });

  return (
    <group position={POS[c.id]}>
      <group ref={group}>
        <sprite scale={[5.5, 5.5, 1]}>
          <spriteMaterial ref={halo} map={glow} color={color} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </sprite>
        <sprite scale={[1.1, 1.1, 1]}>
          <spriteMaterial ref={core} map={glow} color="#ffffff" transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </sprite>
        <sprite ref={spike} scale={[9, 9, 1]}>
          <spriteMaterial map={spikes} color={color} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </sprite>
        <mesh
          onClick={(e) => {
            e.stopPropagation();
            onPick();
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHover(true);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            onHover(false);
            document.body.style.cursor = "";
          }}
        >
          <sphereGeometry args={[1.6, 12, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
      </group>
      <primitive object={orbit} />
      {done && <primitive object={done} />}
      {recommended && (
        <sprite ref={beacon}>
          <spriteMaterial map={ring} color="#ffb547" transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </sprite>
      )}
      <Html center zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
        <div ref={label} className={`star-label${open ? " open" : ""}${isCore(c) ? " core" : ""}${hovered ? " hover" : ""}`} style={{ ["--track" as string]: TRACKS[c.track].color, opacity: 0 }}>
          <div className="t">{c.title}</div>
          <div className="e">
            {c.year}
            {recommended ? <b> · 从这里开始</b> : !open ? " · 筹备中" : ""}
          </div>
          <div className="s">{c.blurb}</div>
        </div>
      </Html>
    </group>
  );
};

/* ── planets: the sub-nodes ──────────────────────────────────────────── */
const Planet = ({
  c,
  i,
  expand,
  st,
  selected,
  recommended,
  onPick,
}: {
  c: Chapter;
  i: number;
  expand: Expand;
  st: Status | "locked";
  selected: boolean;
  recommended: boolean;
  onPick: () => void;
}) => {
  const node = c.children[i];
  const { glow, ring } = textures();
  const group = useRef<THREE.Group>(null);
  const halo = useRef<THREE.SpriteMaterial>(null);
  const mark = useRef<THREE.Sprite>(null);
  const label = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const locked = st === "locked";
  const color = locked ? TRACKS[c.track].color : STATUS_COLOR[st];
  const v = useMemo(() => new THREE.Vector3(), []);
  // planets only become clickable once their system has opened
  const live = () => (expand.current[c.id] ?? 0) > 0.6;

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const k = expand.current[c.id] ?? 0;
    const others = Math.max(0, (expand.current.__any ?? 0) - k);
    planetPos(c, i, k, clock.elapsedTime, v);
    g.position.copy(v);
    g.scale.setScalar(Math.max(0.001, (0.32 + 0.68 * smooth(k)) * (hover || selected ? 1.3 : 1) * (1 - 0.7 * others)));
    if (halo.current) halo.current.opacity = (locked ? 0.35 : st === "new" ? 0.6 : 0.95) * (1 - 0.8 * others);
    if (mark.current) {
      const m = mark.current.material as THREE.SpriteMaterial;
      m.rotation = -clock.elapsedTime * 0.8;
      m.opacity = smooth(k);
    }
    if (label.current) label.current.style.opacity = String(Math.max(0, (k - 0.55) / 0.45));
  });

  return (
    <group ref={group}>
      <sprite scale={[2.2, 2.2, 1]}>
        <spriteMaterial ref={halo} map={glow} color={color} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      <sprite scale={[0.42, 0.42, 1]}>
        <spriteMaterial map={glow} color="#ffffff" transparent opacity={locked ? 0.4 : 1} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      {(selected || recommended) && (
        <sprite ref={mark} scale={[2.4, 2.4, 1]}>
          <spriteMaterial map={ring} color={selected ? "#ffffff" : "#ffb547"} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </sprite>
      )}
      <mesh
        onClick={(e) => {
          if (!live()) return;
          e.stopPropagation();
          onPick();
        }}
        onPointerOver={(e) => {
          if (!live()) return;
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = "";
        }}
      >
        <sphereGeometry args={[0.8, 10, 6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      <Html center zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
        <div ref={label} className={`planet-label${locked ? " locked" : ""}${selected ? " selected" : ""}`} style={{ opacity: 0 }}>
          <div className="t">{node.title}</div>
          <div className="e" style={{ color: recommended && !selected ? "#ffb547" : undefined }}>
            {recommended && !selected ? "▲ 下一步" : `${String(i + 1).padStart(2, "0")} · ${node.en}`}
          </div>
        </div>
      </Html>
    </group>
  );
};

/** The learning-order orbit of an opened system, fading in as it opens. */
const SystemOrbit = ({ c, expand }: { c: Chapter; expand: Expand }) => {
  const line = useMemo(
    () => new THREE.Line(circle(ringRadius(c), 160), new THREE.LineBasicMaterial({ color: TRACKS[c.track].color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })),
    [c],
  );
  const disc = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(() => {
    const k = smooth(expand.current[c.id] ?? 0);
    (line.material as THREE.LineBasicMaterial).opacity = 0.4 * k;
    if (disc.current) disc.current.opacity = 0.022 * k;
  });
  return (
    <group position={POS[c.id]}>
      <primitive object={line} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[ringRadius(c) - 0.9, ringRadius(c) + 0.9, 96]} />
        <meshBasicMaterial ref={disc} color={TRACKS[c.track].color} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

/* ── the scene ───────────────────────────────────────────────────────── */
export const Universe3D = ({
  focus,
  selected,
  progress,
  recommendedChapter,
  recommendedNode,
  onPickChapter,
  onPickNode,
}: {
  focus: Chapter | undefined;
  selected: string | null;
  progress: Progress;
  recommendedChapter: string | null;
  recommendedNode: string | null;
  onPickChapter: (id: string) => void;
  onPickNode: (id: string) => void;
}) => {
  const expand = useRef<Record<string, number>>({});
  const dim = useRef(0);
  const [hover, setHover] = useState<string | null>(null);
  useFrame(() => {
    dim.current = expand.current.__any ?? 0;
  });
  return (
    <>
      <CameraRig focus={focus} />
      <ExpandDriver focus={focus?.id ?? null} expand={expand} />
      <Galaxy dim={dim} />
      <Arcs hover={focus ? null : hover} expand={expand} />
      {CHAPTERS.map((c, ci) => {
        const mastered = c.children.filter((n) => n.span && status(get(progress, n.id)) === "mastered").length;
        return (
          <group key={c.id}>
            <Star
              c={c}
              index={ci}
              expand={expand}
              mastered={mastered}
              recommended={!focus && recommendedChapter === c.id}
              hovered={!focus && hover === c.id}
              onHover={(on) => setHover((h) => (on ? c.id : h === c.id ? null : h))}
              onPick={() => onPickChapter(c.id)}
            />
            <SystemOrbit c={c} expand={expand} />
            {c.children.map((n, i) => (
              <Planet
                key={n.id}
                c={c}
                i={i}
                expand={expand}
                st={nodeStatus(progress, n)}
                selected={selected === n.id}
                recommended={focus?.id === c.id && !selected && recommendedNode === n.id}
                onPick={() => onPickNode(n.id)}
              />
            ))}
          </group>
        );
      })}
    </>
  );
};

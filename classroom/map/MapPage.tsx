import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { go } from "../router";
import { Starfield } from "../Starfield";
import { useProgress } from "../progress/store";
import { Progress, STATUS_LABEL, Status, get, status } from "../progress/mastery";
import { KnowledgeNode, LEARNABLE, NODES, TOPIC, nodeById } from "./graph";

export const STATUS_COLOR: Record<Status, string> = { new: "#7d8db3", learning: "#3ce0ff", review: "#ff5470", mastered: "#a8ff60" };
const LOCKED = "#2a3350";
const CENTER = new THREE.Vector3(6, 3.2, 0);

const nodeStatus = (p: Progress, n: KnowledgeNode): Status | "locked" => (n.span ? status(get(p, n.id)) : "locked");

/** First learnable node that is not mastered yet; once all are mastered, the first locked node the student is now ready for. */
const recommend = (p: Progress) =>
  LEARNABLE.find((n) => status(get(p, n.id)) !== "mastered") ?? NODES.find((n) => !n.span && n.needs.every((id) => nodeById(id).span)) ?? LEARNABLE[0];

/* ── 3D pieces ─────────────────────────────────────────────────────────── */
const Edges = ({ progress }: { progress: Progress }) => {
  const pulses = useRef<THREE.Points>(null);
  const pairs = useMemo(() => NODES.flatMap((n) => n.needs.map((id) => [nodeById(id), n] as const)), []);
  const lines = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pairs.flatMap(([a, b]) => [...a.pos, ...b.pos])), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(pairs.length * 6), 3));
    return g;
  }, [pairs]);
  const pulseGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pairs.length * 3), 3));
    return g;
  }, [pairs]);

  const col = lines.getAttribute("color") as THREE.BufferAttribute;
  const c = new THREE.Color();
  pairs.forEach(([a, b], k) => {
    const live = a.span && b.span;
    const done = live && status(get(progress, a.id)) === "mastered";
    c.set(done ? "#a8ff60" : live ? "#3ce0ff" : LOCKED).multiplyScalar(live ? 0.55 : 0.8);
    col.setXYZ(k * 2, c.r, c.g, c.b);
    col.setXYZ(k * 2 + 1, c.r, c.g, c.b);
  });
  col.needsUpdate = true;

  // a spark travels along every learnable edge, from prerequisite to dependant
  useFrame(({ clock }) => {
    const pos = pulseGeo.getAttribute("position") as THREE.BufferAttribute;
    pairs.forEach(([a, b], k) => {
      const u = (clock.elapsedTime * 0.35 + k * 0.137) % 1;
      if (!(a.span && b.span)) return pos.setXYZ(k, 0, 0, -999);
      pos.setXYZ(k, a.pos[0] + (b.pos[0] - a.pos[0]) * u, a.pos[1] + (b.pos[1] - a.pos[1]) * u, a.pos[2] + (b.pos[2] - a.pos[2]) * u);
    });
    pos.needsUpdate = true;
  });

  return (
    <>
      <lineSegments geometry={lines}>
        <lineBasicMaterial vertexColors transparent opacity={0.9} toneMapped={false} />
      </lineSegments>
      <points ref={pulses} geometry={pulseGeo} frustumCulled={false}>
        <pointsMaterial size={0.22} color="#ecf1f8" transparent opacity={0.9} toneMapped={false} depthWrite={false} />
      </points>
    </>
  );
};

const Node = ({ node, st, selected, recommended, index, onPick }: { node: KnowledgeNode; st: Status | "locked"; selected: boolean; recommended: boolean; index: number; onPick: () => void }) => {
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const [hover, setHover] = useState(false);
  const locked = st === "locked";
  const color = locked ? LOCKED : STATUS_COLOR[st];

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const g = group.current;
    if (!g) return;
    // staggered entrance: the map "grows" left to right
    const k = Math.min(1, Math.max(0, (t - 0.2 - index * 0.09) / 0.6));
    const e = 1 - (1 - k) ** 3;
    const s = e * (hover || selected ? 1.25 : 1);
    g.scale.setScalar(Math.max(0.001, s));
    g.position.set(node.pos[0], node.pos[1] + Math.sin(t * 0.8 + index) * 0.12, node.pos[2]);
    if (ring.current) ring.current.rotation.z = t * 0.8;
  });

  return (
    <group ref={group}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onPick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = "";
        }}
      >
        <sphereGeometry args={[locked ? 0.42 : 0.6, 32, 16]} />
        {locked ? <meshBasicMaterial color={color} wireframe /> : <meshBasicMaterial color={st === "new" ? "#56658a" : color} toneMapped={false} />}
      </mesh>
      {!locked && (
        <mesh scale={1.45}>
          <sphereGeometry args={[0.6, 24, 12]} />
          <meshBasicMaterial color={color} transparent opacity={st === "new" ? 0.03 : 0.07} depthWrite={false} />
        </mesh>
      )}
      {(selected || recommended) && (
        <mesh ref={ring}>
          <torusGeometry args={[1.15, 0.035, 8, 64, Math.PI * 1.6]} />
          <meshBasicMaterial color={selected ? "#ecf1f8" : "#ffb547"} toneMapped={false} />
        </mesh>
      )}
      <Html center zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
        <div className={`node-label${locked ? " locked" : ""}${selected ? " selected" : ""}`}>
          <div className="t">{node.title}</div>
          <div className="e">{recommended && !selected ? "▲ 推荐下一步" : node.en}</div>
        </div>
      </Html>
    </group>
  );
};

/* ── page ─────────────────────────────────────────────────────────────── */
const NodeCard = ({ node, progress, onClose }: { node: KnowledgeNode; progress: Progress; onClose: () => void }) => {
  const st = nodeStatus(progress, node);
  const p = get(progress, node.id);
  if (st === "locked")
    return (
      <aside className="panel node-card">
        <div className="mono">{node.en}</div>
        <h2>{node.title}</h2>
        <p className="goal">这一节点的虚拟课堂还在制作中。先修：{node.needs.map((id) => nodeById(id).title).join("、")}</p>
        <div className="actions">
          <button className="btn ghost small" onClick={onClose}>
            关闭
          </button>
        </div>
      </aside>
    );
  const mins = Math.round((node.span![1] - node.span![0]) / 60);
  return (
    <aside className="panel node-card">
      <div className="mono" style={{ color: STATUS_COLOR[st] }}>
        {node.en}
      </div>
      <h2>{node.title}</h2>
      <span className={`status-chip status-${st}`}>{STATUS_LABEL[st]}</span>
      <p className="goal">学完你将能：{node.goal}</p>
      <div className="row">
        <span>掌握度</span>
        <span>{Math.round(p.score * 100)}%</span>
      </div>
      <div className="meter">
        <div style={{ width: `${p.score * 100}%`, background: STATUS_COLOR[st] }} />
      </div>
      <div className="row">
        <span>课堂片段约 {Math.max(1, mins)} 分钟</span>
        <span>
          答题 {p.correct}/{p.answered}
        </span>
      </div>
      {node.needs.length > 0 && (
        <div className="needs">
          {node.needs.map((id) => (
            <span key={id}>先修 · {nodeById(id).title}</span>
          ))}
        </div>
      )}
      <div className="actions">
        <button className="btn primary" onClick={() => go(`/lesson/${TOPIC.lesson}?node=${node.id}`)}>
          {st === "new" ? "进入课堂" : st === "review" ? "去复习" : "继续学习"} →
        </button>
        <button className="btn ghost small" onClick={onClose}>
          关闭
        </button>
      </div>
    </aside>
  );
};

export const MapPage = () => {
  const progress = useProgress();
  const next = recommend(progress);
  const [selected, setSelected] = useState<string | null>(null);
  const mastered = LEARNABLE.filter((n) => status(get(progress, n.id)) === "mastered").length;
  const started = LEARNABLE.filter((n) => status(get(progress, n.id)) !== "new").length;
  const avg = LEARNABLE.reduce((s, n) => s + get(progress, n.id).score, 0) / LEARNABLE.length;

  return (
    <main className="map">
      <div className="map-canvas">
        <Canvas camera={{ position: [CENTER.x - 3, CENTER.y + 2, 38], fov: 42 }} dpr={[1, 2]} onPointerMissed={() => setSelected(null)}>
          <color attach="background" args={["#04060c"]} />
          <Starfield count={1800} radius={70} />
          <Edges progress={progress} />
          {NODES.map((n, i) => (
            <Node key={n.id} node={n} index={i} st={nodeStatus(progress, n)} selected={selected === n.id} recommended={!selected && n.id === next.id} onPick={() => setSelected(n.id)} />
          ))}
          <OrbitControls target={CENTER} enableDamping dampingFactor={0.08} minDistance={10} maxDistance={55} minAzimuthAngle={-0.9} maxAzimuthAngle={0.9} />
          <EffectComposer multisampling={0}>
            <Bloom intensity={0.9} luminanceThreshold={0.45} luminanceSmoothing={0.3} mipmapBlur />
          </EffectComposer>
        </Canvas>
      </div>

      <header className="topbar">
        <button className="brand" onClick={() => go("/")}>
          知识<span>宇宙</span>
        </button>
        <span className="crumb">
          我想学 · <b>{TOPIC.title}</b>
        </span>
        <span className="spacer" />
        <button className="btn small" onClick={() => go(`/lesson/${TOPIC.lesson}`)}>
          从头上课
        </button>
        <button className="btn primary small" onClick={() => setSelected(next.id)}>
          {next.span ? `推荐下一步：${next.title}` : `已全部掌握 · 下一站：${next.title}`}
        </button>
      </header>

      <div className="map-title">
        <div className="mono">KNOWLEDGE MAP · 知识地图</div>
        <h1>{TOPIC.title}</h1>
        <p>
          {NODES.length} 个知识节点，{LEARNABLE.length} 个已开放虚拟课堂。连线表示先修关系，点击节点开始学习。
        </p>
        <div className="map-stats">
          <div>
            <b>{started}</b>已开始
          </div>
          <div>
            <b style={{ color: "#a8ff60" }}>{mastered}</b>已掌握
          </div>
          <div>
            <b>{Math.round(avg * 100)}%</b>平均掌握度
          </div>
        </div>
      </div>

      {selected && <NodeCard node={nodeById(selected)} progress={progress} onClose={() => setSelected(null)} />}

      <div className="legend">
        {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
          <span key={s} className={`status-chip status-${s}`}>
            {STATUS_LABEL[s]}
          </span>
        ))}
        <span className="status-chip" style={{ color: "#4a5578" }}>
          即将开放
        </span>
        <span className="hint">拖动旋转 · 滚轮缩放</span>
      </div>
    </main>
  );
};

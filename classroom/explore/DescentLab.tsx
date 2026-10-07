import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { loss } from "../../src/alexnet/lib/loss";
import { BOUND, P, START, grad, outside, step, verdict, VERDICT_TEXT } from "./descent";
import { LabBody, TryList } from "./Lab";

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const LR_PRESETS = [
  { lr: 0.2, name: "小步慢走" },
  { lr: 0.6, name: "刚刚好" },
  { lr: 2, name: "步子太大" },
  { lr: 10, name: "冲出山谷" },
];

const Terrain = ({ onPick }: { onPick: (p: P) => void }) => {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(BOUND * 2, BOUND * 2, 140, 140);
    g.rotateX(-Math.PI / 2);
    const pos = g.getAttribute("position") as THREE.BufferAttribute;
    const col = new Float32Array(pos.count * 3);
    const lo = new THREE.Color("#0A3A66");
    const mid = new THREE.Color("#9B7BFF");
    const hi = new THREE.Color("#FF5470");
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const y = loss(pos.getX(i), pos.getZ(i));
      pos.setY(i, y);
      const h = clamp01(y / 4.2);
      c.copy(lo).lerp(mid, clamp01(h * 2)).lerp(hi, clamp01(h * 2 - 1));
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <group>
      <mesh
        geometry={geo}
        onClick={(e) => {
          e.stopPropagation();
          if (e.delta < 6) onPick([e.point.x, e.point.z]);
        }}
        onPointerOver={() => (document.body.style.cursor = "crosshair")}
        onPointerOut={() => (document.body.style.cursor = "")}
      >
        <meshStandardMaterial vertexColors roughness={0.55} metalness={0.15} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geo} position={[0, 0.01, 0]}>
        <meshBasicMaterial color="#3CE0FF" wireframe transparent opacity={0.07} />
      </mesh>
    </group>
  );
};

const Trail = ({ path }: { path: P[] }) => {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const inside = path.filter((p) => !outside(p));
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(inside.flatMap(([x, z]) => [x, loss(x, z) + 0.06, z])), 3));
    return g;
  }, [path]);
  const line = useMemo(() => new THREE.Line(geo, new THREE.LineBasicMaterial({ color: "#FFB547", toneMapped: false })), [geo]);
  const last = path[path.length - 1];
  const shown = outside(last) ? path.filter((p) => !outside(p)).pop() ?? last : last;
  return (
    <group>
      <primitive object={line} />
      <points geometry={geo}>
        <pointsMaterial color="#FFB547" size={0.14} toneMapped={false} />
      </points>
      <mesh position={[shown[0], loss(shown[0], shown[1]) + 0.24, shown[1]]} scale={0.24}>
        <sphereGeometry args={[1, 32, 16]} />
        <meshBasicMaterial color={outside(last) ? "#FF5470" : "#FFB547"} toneMapped={false} />
      </mesh>
    </group>
  );
};

export const DescentLab = () => {
  const [lr, setLr] = useState(0.6);
  const [path, setPath] = useState<P[]>([START]);
  const [auto, setAuto] = useState(false);
  const pathRef = useRef(path);
  pathRef.current = path;

  const doStep = () => {
    const last = pathRef.current[pathRef.current.length - 1];
    if (outside(last)) return setAuto(false);
    const next = step(last, lr);
    setPath([...pathRef.current, next]);
  };

  useEffect(() => {
    if (!auto) return;
    const id = window.setInterval(doStep, 140);
    return () => window.clearInterval(id);
  });

  const v = verdict(path);
  useEffect(() => {
    if (v === "converged" || v === "diverged") setAuto(false);
  }, [v]);

  const last = path[path.length - 1];
  const [gx, gz] = grad(last);
  const restart = (p: P) => {
    setPath([p]);
    setAuto(false);
  };

  const main = (
    <div style={{ position: "absolute", inset: 0 }}>
      <Canvas camera={{ position: [13, 12, 14], fov: 40 }} dpr={[1, 2]}>
        <color attach="background" args={["#04060c"]} />
        <fog attach="fog" args={["#04060c", 26, 48]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[6, 10, 4]} intensity={2} />
        <Terrain onPick={restart} />
        <Trail path={path} />
        <OrbitControls target={[0, 1, 0]} enableDamping maxPolarAngle={Math.PI * 0.48} minDistance={8} maxDistance={40} />
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.8} luminanceThreshold={0.5} mipmapBlur />
        </EffectComposer>
      </Canvas>
      <div style={{ position: "absolute", left: 28, top: 22, pointerEvents: "none" }}>
        <div className="title" style={{ fontSize: 30 }}>
          损失的山地
        </div>
        <div className="note">高度 = 损失 · 位置 = 两个权重的取值 · 点击地面放下小球 · 拖动旋转</div>
      </div>
    </div>
  );

  const aside = (
    <>
      <h4>学习率 η（每一步迈多大）</h4>
      <div className="slider">
        <label>
          η <b>{lr.toFixed(2)}</b>
        </label>
        <input type="range" min={0.05} max={12} step={0.05} value={lr} onChange={(e) => setLr(Number(e.target.value))} />
      </div>
      <div className="seg">
        {LR_PRESETS.map((p) => (
          <button key={p.lr} className={Math.abs(p.lr - lr) < 1e-6 ? "on" : ""} onClick={() => setLr(p.lr)}>
            {p.name}
          </button>
        ))}
      </div>
      <h4>下山</h4>
      <div className="seg">
        <button onClick={doStep}>走一步</button>
        <button className={auto ? "on" : ""} onClick={() => setAuto(!auto)}>
          {auto ? "暂停" : "连续走"}
        </button>
        <button onClick={() => restart(START)}>回到起点</button>
        <button onClick={() => restart([(Math.random() * 2 - 1) * 6, (Math.random() * 2 - 1) * 6])}>随机起点</button>
      </div>
      <h4>读数</h4>
      <div className="readouts">
        <div className="readout">
          <b>{path.length - 1}</b>
          <span>已走步数</span>
        </div>
        <div className="readout">
          <b style={{ color: "var(--coral)" }}>{outside(last) ? "—" : loss(last[0], last[1]).toFixed(3)}</b>
          <span>当前损失</span>
        </div>
      </div>
      <div className="readout" style={{ marginTop: 10 }}>
        <b style={{ fontSize: 20, color: v === "converged" ? "var(--lime)" : v === "running" ? "var(--ivory)" : "var(--coral)" }}>{VERDICT_TEXT[v]}</b>
        <span style={{ fontFamily: "var(--font-mono)" }}>
          梯度 ∇L = ({gx.toFixed(2)}, {gz.toFixed(2)})
        </span>
      </div>
      <p className="note" style={{ marginTop: 14, fontFamily: "var(--font-mono)" }}>
        w ← w − η · ∂L/∂w
      </p>
      <TryList
        items={[
          "选“刚刚好”，连续走：小球沿着最陡的下坡走到了哪里？",
          "换成“步子太大”：为什么小球会在山谷两边来回跳？",
          "试试“冲出山谷”：学习率太大，梯度下降就失败了。",
          "从不同的地方放下小球：它们都会到达同一个谷底吗？（局部最小值）",
        ]}
      />
    </>
  );

  return <LabBody main={main} aside={aside} />;
};

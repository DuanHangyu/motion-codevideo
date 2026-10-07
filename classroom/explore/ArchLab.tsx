import { Suspense, useMemo, useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls, useTexture } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { BLOCKS, Block, CONV_PARAMS, FC_PARAMS, Kind, MID_X } from "../../src/alexnet/lib/arch";
import { LabBody, TryList } from "./Lab";

const KIND_COLOR: Record<Kind, string> = { img: "#ECF1F8", conv: "#FFB547", pool: "#3CE0FF", fc: "#9B7BFF" };
const TOTAL = CONV_PARAMS + FC_PARAMS;

const DETAIL: Record<string, string> = {
  input: "一张 224×224 的彩色图像：224 × 224 × 3 = 150,528 个数字。",
  conv1: "96 个 11×11×3 的大卷积核，步长 4，一下子把图像压缩到 55×55。负责捕捉边缘、颜色这些最基础的图案。",
  pool1: "3×3 窗口、步长 2 的重叠最大池化。没有任何参数，只是把特征图缩小一半。",
  conv2: "256 个 5×5 卷积核，在第一层的边缘基础上组合出纹理和简单形状。",
  pool2: "再次重叠最大池化：27×27 → 13×13。",
  conv3: "384 个 3×3 小卷积核。感受野越来越大，开始组合出眼睛、耳朵这样的部件。",
  conv4: "384 个 3×3 卷积核，继续加深抽象。",
  conv5: "256 个 3×3 卷积核。这一层的神经元已经能“看到”接近整只猫的范围。",
  pool5: "最后一次池化：6×6×256 = 9,216 个数，被拉平送进全连接层。",
  fc6: "9,216 → 4,096。一层就有约 3,775 万个参数，占全网 60% 以上。训练时用 Dropout 随机关掉一半神经元。",
  fc7: "4,096 → 4,096，约 1,678 万个参数，同样使用 Dropout。",
  fc8: "4,096 → 1,000，对应 1000 个类别，再经过 softmax 变成概率。",
};

const Face = ({ b, url }: { b: Block; url: string }) => {
  const tex = useTexture(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  return (
    <mesh position={[b.x - b.w / 2 - 0.01, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
      <planeGeometry args={[b.h * 0.98, b.h * 0.98]} />
      <meshBasicMaterial map={tex} color="#9a9a9a" toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
};

const Slab = ({ b, selected, hovered, onPick, onHover }: { b: Block; selected: boolean; hovered: boolean; onPick: () => void; onHover: (on: boolean) => void }) => {
  const geo = useMemo(() => new THREE.BoxGeometry(b.w, b.h, b.kind === "fc" ? 0.22 : b.h), [b]);
  const edges = useMemo(() => new THREE.EdgesGeometry(geo), [geo]);
  const color = KIND_COLOR[b.kind];
  const lit = selected ? 1 : hovered ? 0.6 : 0;
  return (
    <group position={[b.x, 0, 0]}>
      <mesh
        geometry={geo}
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
        <meshBasicMaterial color={color} transparent opacity={0.08 + 0.25 * lit} depthWrite={false} toneMapped={false} />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={selected ? "#ffffff" : color} transparent opacity={0.6 + 0.4 * lit} toneMapped={false} />
      </lineSegments>
      <Html position={[0, b.h / 2 + 0.45, b.kind === "fc" ? 0 : b.h / 2]} center zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
        <div style={{ pointerEvents: "none", textAlign: "center", whiteSpace: "nowrap", opacity: b.kind === "pool" && !selected ? 0.6 : 1 }}>
          <div style={{ fontSize: b.kind === "pool" ? 12 : 15, color: selected ? "#fff" : color }}>{b.name}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--dim)" }}>{b.dims}</div>
        </div>
      </Html>
    </group>
  );
};

export const ArchLab = () => {
  const [sel, setSel] = useState("conv1");
  const [hover, setHover] = useState<string | null>(null);
  const b = BLOCKS.find((x) => x.id === sel)!;
  const params = b.params ?? 0;
  const maxParams = Math.max(...BLOCKS.map((x) => x.params ?? 0));

  const main = (
    <div style={{ position: "absolute", inset: 0 }}>
      <Canvas camera={{ position: [MID_X - 7, 7.5, 21], fov: 40 }} dpr={[1, 2]} onPointerMissed={() => setHover(null)}>
        <color attach="background" args={["#04060c"]} />
        {BLOCKS.map((x) => (
          <Slab key={x.id} b={x} selected={x.id === sel} hovered={x.id === hover} onPick={() => setSel(x.id)} onHover={(on) => setHover(on ? x.id : null)} />
        ))}
        <Suspense fallback={null}>
          <Face b={BLOCKS[0]} url="/alexnet/cat.jpg" />
          {BLOCKS.filter((x) => x.fmap).map((x) => (
            <Face key={x.id} b={x} url={`/alexnet/${x.fmap}`} />
          ))}
        </Suspense>
        <OrbitControls target={[MID_X, 0, 0]} enableDamping minDistance={5} maxDistance={40} />
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.9} luminanceThreshold={0.55} mipmapBlur />
        </EffectComposer>
      </Canvas>
      <div className="note" style={{ position: "absolute", left: 28, top: 22, pointerEvents: "none" }}>
        拖动旋转 · 滚轮缩放 · 点击任意一层查看详情
      </div>
    </div>
  );

  const aside = (
    <>
      <div className="mono" style={{ color: KIND_COLOR[b.kind] }}>
        {b.kind === "conv" ? "卷积层" : b.kind === "pool" ? "池化层" : b.kind === "fc" ? "全连接层" : "输入"} · {b.dims}
      </div>
      <div className="title" style={{ fontSize: 32, margin: "8px 0 12px" }}>
        {b.name}
      </div>
      <p className="note" style={{ fontSize: 15, color: "var(--ivory)" }}>
        {DETAIL[b.id]}
      </p>
      <div className="readouts" style={{ marginTop: 14 }}>
        <div className="readout">
          <b style={{ color: KIND_COLOR[b.kind], fontSize: 24 }}>{params.toLocaleString()}</b>
          <span>参数</span>
        </div>
        <div className="readout">
          <b style={{ fontSize: 24 }}>{((params / TOTAL) * 100).toFixed(1)}%</b>
          <span>占全网参数</span>
        </div>
      </div>
      {b.fmap && (
        <>
          <h4>这只猫在这一层的真实特征图</h4>
          <img src={`/alexnet/${b.fmap}`} alt={`${b.name} 特征图`} className="canvas-frame" style={{ width: "100%", imageRendering: "pixelated" }} />
          <div className="cap">激活最强的 16 个通道 · torchvision 预训练 AlexNet</div>
        </>
      )}
      <h4>每一层的参数量</h4>
      <div style={{ display: "grid", gap: 5 }}>
        {BLOCKS.filter((x) => x.params).map((x) => (
          <button key={x.id} onClick={() => setSel(x.id)} style={{ display: "grid", gridTemplateColumns: "72px 1fr", alignItems: "center", gap: 10, background: "none", border: "none", padding: 0, textAlign: "left" }}>
            <span style={{ fontSize: 12, color: x.id === sel ? "#fff" : "var(--dim)" }}>{x.name}</span>
            <span style={{ height: 12, borderRadius: 3, width: `${Math.max(1.5, ((x.params ?? 0) / maxParams) * 100)}%`, background: KIND_COLOR[x.kind], opacity: x.id === sel ? 1 : 0.55 }} />
          </button>
        ))}
      </div>
      <p className="note" style={{ marginTop: 10 }}>
        卷积层合计 {(CONV_PARAMS / 1e6).toFixed(1)}M（{((CONV_PARAMS / TOTAL) * 100).toFixed(1)}%）· 全连接层合计 {(FC_PARAMS / 1e6).toFixed(1)}M（{((FC_PARAMS / TOTAL) * 100).toFixed(1)}%）
      </p>
      <TryList
        items={[
          "依次点开卷积 1 → 卷积 5：特征图从清晰的猫脸轮廓，变成了什么？",
          "比较“卷积 1”和“全连接 6”的参数量：差了多少倍？",
          "池化层为什么参数是 0？",
          "如果要缩小这个网络，你会先砍哪一部分？（后来的 GoogLeNet、ResNet 就是这么做的）",
        ]}
      />
    </>
  );

  return <LabBody main={main} aside={aside} />;
};

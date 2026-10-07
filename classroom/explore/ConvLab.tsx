import { PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { DATA } from "../../src/alexnet/lib/data";
import { Gray, Kernel, PRESETS, convolveSame, convolveValid, heat, normalise, windowSum } from "./convolve";
import { LabBody, TryList } from "./Lab";
import { paint, useImagePixels } from "./useImage";

const N = 28;
const M = N - 2;
const SMALL: Gray = { w: N, h: N, data: Float32Array.from(DATA.gray28) };

const sameKernel = (a: Kernel, b: Kernel) => a.flat().every((v, i) => v === b.flat()[i]);

const InputGrid = ({ kx, ky, cell: CELL, onMove }: { kx: number; ky: number; cell: number; onMove: (x: number, y: number) => void }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    c.width = N * CELL;
    c.height = N * CELL;
    for (let i = 0; i < N * N; i++) {
      const v = Math.round(SMALL.data[i]);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect((i % N) * CELL, Math.floor(i / N) * CELL, CELL - 1, CELL - 1);
    }
    ctx.fillStyle = "rgba(255,181,71,0.22)";
    ctx.fillRect(kx * CELL, ky * CELL, CELL * 3, CELL * 3);
    ctx.strokeStyle = "#FFB547";
    ctx.lineWidth = 3;
    ctx.strokeRect(kx * CELL + 1.5, ky * CELL + 1.5, CELL * 3 - 3, CELL * 3 - 3);
  }, [kx, ky, CELL]);
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const cx = Math.floor(((e.clientX - r.left) / r.width) * N);
    const cy = Math.floor(((e.clientY - r.top) / r.height) * N);
    onMove(Math.min(M - 1, Math.max(0, cx - 1)), Math.min(M - 1, Math.max(0, cy - 1)));
  };
  return (
    <canvas
      ref={ref}
      className="canvas-frame"
      style={{ width: N * CELL, height: N * CELL, cursor: "grab", touchAction: "none" }}
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={(e) => dragging.current && move(e)}
      onPointerUp={() => (dragging.current = false)}
    />
  );
};

const FeatureMap = ({ map, k, kx, ky, cell: CELL }: { map: Gray; k: Kernel; kx: number; ky: number; cell: number }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const n = normalise(map, k);
    c.width = M * CELL;
    c.height = M * CELL;
    ctx.fillStyle = "#04060c";
    ctx.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < M * M; i++) {
      const [r, g, b] = heat(n[i]);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect((i % M) * CELL, Math.floor(i / M) * CELL, CELL - 1, CELL - 1);
    }
    ctx.strokeStyle = "#ECF1F8";
    ctx.lineWidth = 2;
    ctx.strokeRect(kx * CELL + 1, ky * CELL + 1, CELL - 2, CELL - 2);
  }, [map, k, kx, ky, CELL]);
  return <canvas ref={ref} className="canvas-frame" style={{ width: M * CELL, height: M * CELL }} />;
};

const Mat = ({ values, color, bg }: { values: number[]; color: string; bg: string }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 44px)", gap: 3 }}>
    {values.map((v, i) => (
      <div key={i} style={{ height: 36, display: "grid", placeItems: "center", borderRadius: 5, background: bg, color, fontFamily: "var(--font-mono)", fontSize: 14 }}>
        {Number.isInteger(v) ? v : v.toFixed(1)}
      </div>
    ))}
  </div>
);

const FullPhoto = ({ k }: { k: Kernel }) => {
  const img = useImagePixels("/alexnet/cat.jpg", 400);
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!img) return;
    const map = convolveSame(img.gray, k);
    const n = normalise(map, k);
    paint(ref.current, img.w, img.h, (i) => {
      const v = Math.round(n[i] * 255);
      return [v, v, v];
    });
  }, [img, k]);
  return (
    <div style={{ display: "flex", gap: 22, alignItems: "flex-start" }}>
      <div>
        <img src="/alexnet/cat.jpg" alt="原图" className="canvas-frame" style={{ width: 400, height: 400 }} />
        <div className="cap">原图</div>
      </div>
      <div>
        <canvas ref={ref} className="canvas-frame" style={{ width: 400, height: 400, background: "#000" }} />
        <div className="cap" style={{ color: "var(--cyan)" }}>
          同一组 9 个权重滑过每个位置
        </div>
      </div>
    </div>
  );
};

export const ConvLab = () => {
  const [k, setK] = useState<Kernel>(PRESETS[0].kernel);
  const [pos, setPos] = useState({ x: 6, y: 7 });
  const [full, setFull] = useState(false);
  // two 28-cell grids + the readout column must fit next to the 380px side panel
  const [cell] = useState(() => Math.max(10, Math.min(18, Math.floor((window.innerWidth - 380 - 52 - 250) / 54))));
  const map = useMemo(() => convolveValid(SMALL, k), [k]);
  const patch = [0, 1, 2].flatMap((dy) => [0, 1, 2].map((dx) => Math.round(SMALL.data[(pos.y + dy) * N + pos.x + dx])));
  const sum = windowSum(SMALL, k, pos.x, pos.y);
  const setWeight = (i: number, v: number) => setK(k.map((row, r) => row.map((w, c) => (r * 3 + c === i ? v : w))));

  const main = full ? (
    <FullPhoto k={k} />
  ) : (
    <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
      <div>
        <InputGrid kx={pos.x} ky={pos.y} cell={cell} onMove={(x, y) => setPos({ x, y })} />
        <div className="cap">输入 · 28×28 · 拖动橙色窗口</div>
      </div>
      <div style={{ display: "grid", gap: 12, justifyItems: "center" }}>
        <Mat values={patch} color="var(--ivory)" bg="rgba(255,255,255,0.07)" />
        <div style={{ fontFamily: "var(--font-display)", color: "var(--amber)" }}>×</div>
        <Mat values={k.flat()} color="var(--amber)" bg="rgba(255,181,71,0.14)" />
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--dim)", marginTop: 6 }}>对应相乘再相加</div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 38, fontWeight: 800, color: "var(--cyan)" }}>Σ = {Math.round(sum)}</div>
      </div>
      <div>
        <FeatureMap map={map} k={k} kx={pos.x} ky={pos.y} cell={cell} />
        <div className="cap" style={{ color: "var(--cyan)" }}>
          特征图 · 26×26 · 越亮响应越强
        </div>
      </div>
    </div>
  );

  const aside = (
    <>
      <h4>卷积核 · 9 个权重（可直接修改）</h4>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
        {k.flat().map((w, i) => (
          <input
            key={i}
            type="number"
            step={1}
            value={w}
            aria-label={`权重 ${i + 1}`}
            onChange={(e) => setWeight(i, Number(e.target.value) || 0)}
            style={{ width: "100%", minWidth: 0, height: 44, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 18, color: w > 0 ? "var(--amber)" : w < 0 ? "var(--cyan)" : "var(--dim)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--line)", borderRadius: 8 }}
          />
        ))}
      </div>
      <h4>常用卷积核</h4>
      <div className="seg">
        {PRESETS.map((p) => (
          <button key={p.id} className={sameKernel(p.kernel, k) ? "on" : ""} onClick={() => setK(p.kernel)}>
            {p.name}
          </button>
        ))}
      </div>
      <h4>视角</h4>
      <div className="seg">
        <button className={!full ? "on" : ""} onClick={() => setFull(false)}>
          28×28 逐格计算
        </button>
        <button className={full ? "on" : ""} onClick={() => setFull(true)}>
          应用到整张猫图
        </button>
      </div>
      <TryList
        items={[
          "把橙色窗口拖到猫耳朵的边缘，再拖到平坦的背景上：Σ 为什么差这么多？",
          "从“竖直边缘”换成“水平边缘”，再看整张猫图：哪些线条亮了，哪些消失了？",
          "把 9 个权重全改成 1：得到的是什么效果？为什么？",
          "注意：不管窗口在哪，用的都是同一组 9 个权重——这就是“权重共享”。",
        ]}
      />
      <p className="note" style={{ marginTop: 18 }}>
        AlexNet 第一层有 96 个这样的卷积核（11×11×3），而且它们的数值不是人设计的，是从数据中学出来的。
      </p>
    </>
  );

  return <LabBody main={main} aside={aside} />;
};

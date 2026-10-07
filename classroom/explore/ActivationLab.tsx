import { PointerEvent, useState } from "react";
import { LabBody, TryList } from "./Lab";

type Fn = { id: string; name: string; color: string; f: (x: number) => number; d: (x: number) => number; y: [number, number]; note: string };
const sig = (x: number) => 1 / (1 + Math.exp(-x));

const FNS: Fn[] = [
  { id: "sigmoid", name: "sigmoid", color: "#FFB547", f: sig, d: (x) => sig(x) * (1 - sig(x)), y: [-0.3, 1.2], note: "输出 0~1，最大梯度只有 0.25" },
  { id: "tanh", name: "tanh", color: "#9B7BFF", f: Math.tanh, d: (x) => 1 - Math.tanh(x) ** 2, y: [-1.3, 1.3], note: "输出 −1~1，两端同样饱和" },
  { id: "relu", name: "ReLU", color: "#A8FF60", f: (x) => Math.max(0, x), d: (x) => (x > 0 ? 1 : 0), y: [-1, 6], note: "x>0 时梯度恒为 1；x<0 时为 0" },
  { id: "linear", name: "无激活", color: "#3CE0FF", f: (x) => x, d: () => 1, y: [-6, 6], note: "梯度是 1，但叠多少层都只是一条直线" },
];

const W = 720;
const H = 400;
const XR = 6;

export const ActivationLab = () => {
  const [fn, setFn] = useState(FNS[0]);
  const [x, setX] = useState(1.5);
  const [layers, setLayers] = useState(8);
  const [y0, y1] = fn.y;
  const sx = (v: number) => ((v + XR) / (2 * XR)) * W;
  const sy = (v: number) => H - ((v - y0) / (y1 - y0)) * H;
  const curve = (g: (v: number) => number) =>
    Array.from({ length: 241 }, (_, i) => {
      const v = -XR + (2 * XR * i) / 240;
      return `${i ? "L" : "M"} ${sx(v)} ${sy(Math.min(y1 + 1, Math.max(y0 - 1, g(v))))}`;
    }).join(" ");
  const fx = fn.f(x);
  const dx = fn.d(x);
  // tangent line through (x, f(x)) with slope f'(x)
  const t0 = x - 1.6;
  const t1 = x + 1.6;
  const remaining = dx ** layers;

  const drag = (e: PointerEvent<SVGSVGElement>) => {
    if (e.buttons !== 1 && e.type !== "pointerdown") return;
    const r = e.currentTarget.getBoundingClientRect();
    setX(Math.round((((e.clientX - r.left) / r.width) * 2 * XR - XR) * 10) / 10);
  };

  const main = (
    <div style={{ display: "grid", gap: 30, justifyItems: "center" }}>
      <div>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ background: "rgba(14,20,36,0.6)", borderRadius: 14, border: "1px solid var(--line)", cursor: "ew-resize", touchAction: "none" }} onPointerDown={drag} onPointerMove={drag}>
          {[-4, -2, 2, 4].map((v) => (
            <line key={v} x1={sx(v)} y1={0} x2={sx(v)} y2={H} stroke="rgba(255,255,255,0.04)" />
          ))}
          <line x1={0} y1={sy(0)} x2={W} y2={sy(0)} stroke="rgba(236,241,248,0.25)" strokeWidth={1.5} />
          <line x1={sx(0)} y1={0} x2={sx(0)} y2={H} stroke="rgba(236,241,248,0.25)" strokeWidth={1.5} />
          {fn.id !== "linear" && fn.id !== "relu" && (
            <>
              <rect x={0} y={0} width={sx(-3)} height={H} fill="#FF5470" opacity={0.07} />
              <rect x={sx(3)} y={0} width={W - sx(3)} height={H} fill="#FF5470" opacity={0.07} />
              <text x={14} y={22} fill="#FF5470" fontSize={13} fontFamily="var(--font-cn)">
                饱和区：几乎是平的
              </text>
            </>
          )}
          <path d={curve(fn.d)} stroke="#FF5470" strokeWidth={2.5} strokeDasharray="7 6" fill="none" />
          <path d={curve(fn.f)} stroke={fn.color} strokeWidth={5} fill="none" style={{ filter: `drop-shadow(0 0 8px ${fn.color})` }} />
          <line x1={sx(t0)} y1={sy(fx + dx * (t0 - x))} x2={sx(t1)} y2={sy(fx + dx * (t1 - x))} stroke="#ECF1F8" strokeWidth={2} opacity={0.8} />
          <line x1={sx(x)} y1={0} x2={sx(x)} y2={H} stroke="#ECF1F8" strokeOpacity={0.25} strokeDasharray="4 6" />
          <circle cx={sx(x)} cy={sy(fx)} r={9} fill="#ECF1F8" />
          <circle cx={sx(x)} cy={sy(dx)} r={6} fill="#FF5470" />
        </svg>
        <div className="cap">
          <span style={{ color: fn.color }}>━ {fn.name}(x)</span> &nbsp; <span style={{ color: "#FF5470" }}>┅ 梯度 f′(x)</span> &nbsp; ⟋ 切线 · 在图上拖动来改变 x
        </div>
      </div>
      <div style={{ width: W }}>
        <div className="mono" style={{ marginBottom: 12 }}>
          误差信号从输出向前传 {layers} 层 · 每层乘以 f′(x) = {dx.toFixed(3)}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
          {Array.from({ length: layers + 1 }, (_, i) => {
            const g = dx ** (layers - i);
            const h = Math.max(2, Math.min(1, Math.max(0, (Math.log10(Math.max(g, 1e-12)) + 12) / 12)) * 110);
            return <div key={i} title={g.toExponential(2)} style={{ flex: 1, height: h, borderRadius: 4, background: g > 0.1 ? "#A8FF60" : g > 0.001 ? "#FFB547" : "#FF5470", opacity: 0.35 + 0.65 * Math.min(1, h / 110) }} />;
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--dim)", marginTop: 8 }}>
          <span>← 第 1 层（最前面）</span>
          <span>输出层（误差从这里出发） →</span>
        </div>
      </div>
    </div>
  );

  const aside = (
    <>
      <h4>激活函数</h4>
      <div className="seg">
        {FNS.map((f) => (
          <button key={f.id} className={f.id === fn.id ? "on" : ""} onClick={() => setFn(f)}>
            {f.name}
          </button>
        ))}
      </div>
      <p className="note" style={{ marginTop: 10 }}>
        {fn.note}
      </p>
      <div className="slider" style={{ marginTop: 14 }}>
        <label>
          输入 x <b>{x.toFixed(1)}</b>
        </label>
        <input type="range" min={-6} max={6} step={0.1} value={x} onChange={(e) => setX(Number(e.target.value))} />
      </div>
      <div className="readouts">
        <div className="readout">
          <b style={{ color: fn.color }}>{fx.toFixed(3)}</b>
          <span>输出 f(x)</span>
        </div>
        <div className="readout">
          <b style={{ color: "var(--coral)" }}>{dx.toFixed(3)}</b>
          <span>梯度 f′(x)</span>
        </div>
      </div>
      <h4>网络有多深？</h4>
      <div className="slider">
        <label>
          层数 <b>{layers}</b>
        </label>
        <input type="range" min={1} max={20} step={1} value={layers} onChange={(e) => setLayers(Number(e.target.value))} />
      </div>
      <div className="readout">
        <b style={{ color: remaining > 0.1 ? "var(--lime)" : remaining > 0.001 ? "var(--amber)" : "var(--coral)" }}>{remaining >= 0.01 ? `${(remaining * 100).toFixed(1)}%` : remaining.toExponential(1)}</b>
        <span>传到第 1 层时，误差信号还剩下</span>
      </div>
      <TryList
        items={[
          "选 sigmoid，把 x 拖到 0：梯度最大也只有多少？叠 8 层后还剩多少？",
          "把 x 拖到 5（饱和区）：梯度几乎为 0，前面的层还学得动吗？",
          "换成 ReLU、x 放在正数区域：不管叠多少层，信号都完好无损。",
          "把 ReLU 的 x 拖到负数：梯度变成 0——这就是“神经元死亡”问题，后来有了 Leaky ReLU。",
        ]}
      />
    </>
  );

  return <LabBody main={main} aside={aside} />;
};

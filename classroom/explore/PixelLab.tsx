import { useEffect, useMemo, useRef, useState } from "react";
import { changedRatio, transform } from "./convolve";
import { LabBody, TryList } from "./Lab";
import { paint, useImagePixels } from "./useImage";

// same resolution as ml/extract.py, so a 6 px shift reproduces the lesson's "70.7 %" exactly
const SIZE = 448;
const VIEW = 330;
const SCALE = VIEW / SIZE;

export const PixelLab = () => {
  const img = useImagePixels("/alexnet/cat.jpg", SIZE);
  const [hover, setHover] = useState({ x: 184, y: 208 });
  const [shift, setShift] = useState(0);
  const [gain, setGain] = useState(1);
  const diffRef = useRef<HTMLCanvasElement>(null);

  const moved = useMemo(() => (img ? transform(img.gray, shift, gain) : null), [img, shift, gain]);
  const ratio = img && moved ? changedRatio(img.gray, moved) : 0;

  useEffect(() => {
    if (!img || !moved) return;
    paint(diffRef.current, SIZE, SIZE, (i) => {
      const d = Math.abs(img.gray.data[i] - moved.data[i]);
      if (d <= 2) return [8, 10, 18];
      const k = Math.min(1, d / 60);
      return [255 * (0.35 + 0.65 * k), 84 * k + 20, 112 * k + 25];
    });
  }, [img, moved]);

  const px = (x: number, y: number) => {
    if (!img) return [0, 0, 0];
    const i = (Math.min(SIZE - 1, Math.max(0, y)) * SIZE + Math.min(SIZE - 1, Math.max(0, x))) * 4;
    return [img.rgba[i], img.rgba[i + 1], img.rgba[i + 2]];
  };
  const center = px(hover.x, hover.y);

  const main = (
    <div style={{ display: "grid", gridTemplateColumns: "auto auto", gap: "28px 36px", alignItems: "start" }}>
      <div>
        <div
          style={{ position: "relative", width: VIEW, height: VIEW, cursor: "crosshair" }}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setHover({ x: Math.floor((e.clientX - r.left) / SCALE), y: Math.floor((e.clientY - r.top) / SCALE) });
          }}
        >
          <img src="/alexnet/cat.jpg" alt="猫" className="canvas-frame" style={{ width: VIEW, height: VIEW, imageRendering: "pixelated" }} draggable={false} />
          <div style={{ position: "absolute", left: (hover.x - 2) * SCALE, top: (hover.y - 2) * SCALE, width: 5 * SCALE, height: 5 * SCALE, border: "2px solid var(--amber)", boxShadow: "0 0 0 2000px rgba(0,0,0,0.25)", pointerEvents: "none" }} />
        </div>
        <div className="cap">你看到的：一只猫 · 移动鼠标</div>
      </div>
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 62px)", gap: 3 }}>
          {Array.from({ length: 25 }, (_, k) => {
            const [r, g, b] = px(hover.x - 2 + (k % 5), hover.y - 2 + Math.floor(k / 5));
            return (
              <div key={k} style={{ height: 62, background: `rgb(${r},${g},${b})`, display: "grid", placeItems: "center", borderRadius: 4, outline: k === 12 ? "2px solid var(--amber)" : "none" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1.25, textAlign: "center", textShadow: "0 0 4px #000, 0 0 2px #000" }}>
                  <div style={{ color: "#FF8C8C" }}>{r}</div>
                  <div style={{ color: "#8CFF8C" }}>{g}</div>
                  <div style={{ color: "#8CC8FF" }}>{b}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="cap">计算机看到的：({hover.x}, {hover.y}) 周围 5×5 个像素</div>
        <div className="readout" style={{ marginTop: 16 }}>
          <span>当前像素 = 三个 0–255 的数</span>
          <b>
            <span style={{ color: "#FF8C8C" }}>{center[0]}</span> · <span style={{ color: "#8CFF8C" }}>{center[1]}</span> · <span style={{ color: "#8CC8FF" }}>{center[2]}</span>
          </b>
        </div>
      </div>
      <div>
        <div style={{ width: VIEW, height: VIEW, overflow: "hidden", borderRadius: 10, boxShadow: "0 0 0 1px var(--line)" }}>
          <img src="/alexnet/cat.jpg" alt="变换后的猫" style={{ width: VIEW, height: VIEW, transform: `translateX(${shift * SCALE}px)`, filter: `brightness(${gain})` }} draggable={false} />
        </div>
        <div className="cap" style={{ color: "var(--amber)" }}>
          同一只猫 · 右移 {shift}px · 亮度 ×{gain.toFixed(2)}
        </div>
      </div>
      <div>
        <canvas ref={diffRef} className="canvas-frame" style={{ width: VIEW, height: VIEW }} />
        <div className="cap" style={{ color: "var(--coral)" }}>
          和原图相比，数字变了的像素
        </div>
      </div>
    </div>
  );

  const aside = (
    <>
      <h4>这张图有多少个数？</h4>
      <div className="readout">
        <b style={{ color: "var(--amber)" }}>150,528</b>
        <span>224 × 224 个像素 × 3（红、绿、蓝）</span>
      </div>
      <h4>动一动这只猫</h4>
      <div className="slider">
        <label>
          向右平移 <b>{shift} px</b>
        </label>
        <input type="range" min={0} max={30} step={1} value={shift} onChange={(e) => setShift(Number(e.target.value))} />
      </div>
      <div className="slider">
        <label>
          亮度（换个光线） <b>×{gain.toFixed(2)}</b>
        </label>
        <input type="range" min={0.4} max={1.6} step={0.05} value={gain} onChange={(e) => setGain(Number(e.target.value))} />
      </div>
      <div className="readout">
        <b style={{ color: "var(--coral)" }}>{(ratio * 100).toFixed(1)}%</b>
        <span>的像素值变了 · 约 {Math.round(ratio * SIZE * SIZE).toLocaleString()} / {(SIZE * SIZE).toLocaleString()} 个像素</span>
      </div>
      <TryList
        items={[
          "鼠标移到猫的蓝眼睛上：哪个通道的数字最大？",
          "只往右挪 6 个像素，看看变了多少——视频里说的“七成”是真的吗？",
          "把亮度调暗一点点：在你眼里还是同一只猫，但数字呢？",
          "想一想：如果只比较数字，计算机要怎样才能认出“这都是同一只猫”？",
        ]}
      />
    </>
  );

  return <LabBody main={main} aside={aside} />;
};

import { useEffect, useState } from "react";
import { useDelayRender } from "remotion";
import { loadFonts } from "./fonts";

const cache = new Map<string, Float32Array>();

/** Rasterises `text` and returns glyph pixels as world-space xyz points, `worldWidth` units across. */
const sample = (text: string, font: string, worldWidth: number, step: number) => {
  const W = 2000;
  const H = 520;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable for text sampling");
  ctx.fillStyle = "#fff";
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, W / 2, H / 2);
  const { data } = ctx.getImageData(0, 0, W, H);
  const pts: number[] = [];
  const scale = worldWidth / W;
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      if (data[(y * W + x) * 4 + 3] > 140) pts.push((x - W / 2) * scale, -(y - H / 2) * scale, 0);
    }
  }
  if (pts.length === 0) throw new Error(`text sampling produced no points for "${text}"`);
  return new Float32Array(pts);
};

export const useTextPoints = (text: string, font: string, worldWidth: number, step = 3) => {
  const key = `${text}|${font}|${worldWidth}|${step}`;
  const [points, setPoints] = useState<Float32Array | null>(() => cache.get(key) ?? null);
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => (cache.has(key) ? null : delayRender(`sampling text "${text}"`)));

  useEffect(() => {
    if (handle === null) return;
    loadFonts()
      .then(() => {
        const pts = sample(text, font, worldWidth, step);
        cache.set(key, pts);
        setPoints(pts);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }, [handle, key, text, font, worldWidth, step, continueRender, cancelRender]);

  return points;
};

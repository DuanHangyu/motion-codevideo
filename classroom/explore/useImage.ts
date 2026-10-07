import { useEffect, useState } from "react";
import { Gray, grayFromRGBA } from "./convolve";

export type LoadedImage = { w: number; h: number; rgba: Uint8ClampedArray; gray: Gray };

const cache = new Map<string, LoadedImage>();

/** Decode an image from /public into pixels at size×size. Returns null while loading. */
export const useImagePixels = (src: string, size: number): LoadedImage | null => {
  const key = `${src}@${size}`;
  const [img, setImg] = useState<LoadedImage | null>(() => cache.get(key) ?? null);
  useEffect(() => {
    if (cache.has(key)) return setImg(cache.get(key)!);
    let alive = true;
    const el = new Image();
    el.onload = () => {
      const c = document.createElement("canvas");
      c.width = size;
      c.height = size;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx) return console.error("2D canvas unavailable");
      ctx.drawImage(el, 0, 0, size, size);
      const rgba = ctx.getImageData(0, 0, size, size).data;
      const loaded = { w: size, h: size, rgba, gray: grayFromRGBA(rgba, size, size) };
      cache.set(key, loaded);
      if (alive) setImg(loaded);
    };
    el.onerror = () => console.error(`could not load ${src}`);
    el.src = src;
    return () => {
      alive = false;
    };
  }, [key, src, size]);
  return img;
};

/** Paint a 0..1 map (or grey 0..255 when `raw`) onto a canvas with a colour function. */
export const paint = (canvas: HTMLCanvasElement | null, w: number, h: number, value: (i: number) => [number, number, number]) => {
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return;
  canvas.width = w;
  canvas.height = h;
  const out = ctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const [r, g, b] = value(i);
    out.data.set([r, g, b, 255], i * 4);
  }
  ctx.putImageData(out, 0, 0);
};

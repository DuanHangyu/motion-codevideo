/** AlexNet layer table + 3D layout shared by chapter 07 and the architecture explorer. */
export type Kind = "img" | "conv" | "pool" | "fc";
export type Block = { id: string; name: string; dims: string; s: number; c: number; kind: Kind; fmap?: string; params?: number; x: number; w: number; h: number };

const RAW: Array<Omit<Block, "x" | "w" | "h">> = [
  { id: "input", name: "输入", dims: "224×224×3", s: 224, c: 3, kind: "img" },
  { id: "conv1", name: "卷积 1", dims: "55×55×96", s: 55, c: 96, kind: "conv", fmap: "fmap_conv1.png", params: 34944 },
  { id: "pool1", name: "池化", dims: "27×27×96", s: 27, c: 96, kind: "pool" },
  { id: "conv2", name: "卷积 2", dims: "27×27×256", s: 27, c: 256, kind: "conv", fmap: "fmap_conv2.png", params: 307456 },
  { id: "pool2", name: "池化", dims: "13×13×256", s: 13, c: 256, kind: "pool" },
  { id: "conv3", name: "卷积 3", dims: "13×13×384", s: 13, c: 384, kind: "conv", fmap: "fmap_conv3.png", params: 885120 },
  { id: "conv4", name: "卷积 4", dims: "13×13×384", s: 13, c: 384, kind: "conv", fmap: "fmap_conv4.png", params: 663936 },
  { id: "conv5", name: "卷积 5", dims: "13×13×256", s: 13, c: 256, kind: "conv", fmap: "fmap_conv5.png", params: 442624 },
  { id: "pool5", name: "池化", dims: "6×6×256", s: 6, c: 256, kind: "pool" },
  { id: "fc6", name: "全连接 6", dims: "4096", s: 4096, c: 0, kind: "fc", params: 37752832 },
  { id: "fc7", name: "全连接 7", dims: "4096", s: 4096, c: 0, kind: "fc", params: 16781312 },
  { id: "fc8", name: "全连接 8", dims: "1000", s: 1000, c: 0, kind: "fc", params: 4097000 },
];

export const BLOCKS: Block[] = (() => {
  let x = 0;
  return RAW.map((b, i) => {
    const h = b.kind === "fc" ? 1.2 + Math.sqrt(b.s / 4096) * 4.2 : 0.8 + (b.s / 224) ** 0.7 * 4.4;
    const w = b.kind === "fc" ? 0.22 : b.kind === "img" ? 0.12 : 0.14 + (b.c / 384) * 1.5;
    const gap = i === 0 ? 0 : RAW[i - 1].kind === "fc" || b.kind === "fc" ? 1.5 : b.kind === "pool" ? 0.7 : 1.2;
    x += gap;
    const out = { ...b, x: x + w / 2, w, h };
    x += w;
    return out;
  });
})();
export const byId = (id: string) => BLOCKS.find((b) => b.id === id)!;
export const END_X = BLOCKS[BLOCKS.length - 1].x;
export const MID_X = END_X / 2;
export const CONV_PARAMS = BLOCKS.filter((b) => b.kind === "conv").reduce((s, b) => s + (b.params ?? 0), 0);
export const FC_PARAMS = BLOCKS.filter((b) => b.kind === "fc").reduce((s, b) => s + (b.params ?? 0), 0);
export const MAX_PARAMS = 37752832;

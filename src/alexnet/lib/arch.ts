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

/** One-paragraph explanation of each layer, shown when the student opens it. */
export const LAYER_DETAIL: Record<string, string> = {
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

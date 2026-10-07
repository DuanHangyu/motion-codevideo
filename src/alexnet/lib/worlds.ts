import { cue, lineEnd } from "./timeline";

/**
 * Stretches of the lesson whose world the student can step into by freezing time.
 * Windows are kept clear of each scene's fade in/out. `node` is the knowledge node a completed challenge counts for.
 */
export type WorldId = "pixels" | "neuron" | "descent" | "hubel" | "conv-slide" | "activation" | "pooling" | "arch" | "augment" | "dropout";
export type World = { id: WorldId; from: number; to: number; title: string; hint: string; node: string };

export const WORLDS: World[] = [
  { id: "pixels", node: "pixels", from: cue("p3") + 2.6, to: lineEnd("p4") + 0.2, title: "像素山脉", hint: "摸一摸每个像素的 RGB，把猫挪一挪" },
  { id: "neuron", node: "neuron", from: cue("n3"), to: cue("n4", "排成一层") - 0.6, title: "一个神经元", hint: "亲手拧权重旋钮，看输出怎么变" },
  { id: "descent", node: "descent", from: cue("n6"), to: lineEnd("n6") + 0.4, title: "损失山地", hint: "抓起小球放到山坡上，调学习率，看它怎么下山" },
  { id: "hubel", node: "conv", from: cue("c6", "1959"), to: lineEnd("c6") + 0.3, title: "猫的视觉皮层", hint: "亲手转动光条，听神经元放电" },
  { id: "conv-slide", node: "conv", from: cue("c9") + 0.6, to: lineEnd("c11") + 0.25, title: "卷积工作台", hint: "拖动卷积核、改权重，扫描整张图" },
  { id: "activation", node: "activation", from: cue("r6", "每穿过一层") + 0.4, to: lineEnd("r6") + 0.2, title: "梯度传送带", hint: "换激活函数、拖动输入，看误差信号能不能传回去" },
  { id: "pooling", node: "pooling", from: cue("f1", "只保留") + 3.4, to: lineEnd("f2") + 0.3, title: "池化窗口", hint: "改数字、挪特征，看最大池化留下了什么" },
  { id: "arch", node: "arch", from: cue("a6") + 1.6, to: lineEnd("a8") + 0.4, title: "AlexNet 内部", hint: "点开任意一层，把猫送进网络" },
  { id: "augment", node: "training", from: cue("k9", "随机裁剪") + 0.4, to: lineEnd("k9") + 0.3, title: "数据增强工坊", hint: "裁剪、翻转、调色，一张图变出很多张" },
  { id: "dropout", node: "training", from: cue("k10", "休息") + 0.2, to: lineEnd("k11") + 0.3, title: "Dropout 训练场", hint: "调丢弃率，一步步训练出不同的“瘦”网络" },
].sort((a, b) => a.from - b.from) as World[];

export const worldAt = (t: number) => WORLDS.find((w) => t >= w.from && t < w.to);
export const worldById = (id: string | null | undefined) => WORLDS.find((w) => w.id === id);

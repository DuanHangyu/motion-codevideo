import { LINES, cue, lineEnd, scene } from "../../src/alexnet/lib/timeline";

export type NodeId = string;

export type KnowledgeNode = {
  id: NodeId;
  title: string;
  en: string;
  /** one-line "what you'll be able to explain" */
  goal: string;
  /** prerequisite node ids */
  needs: NodeId[];
  /** 3D layout position in the map */
  pos: [number, number, number];
  /** where this node is taught in the AlexNet lesson; absent = locked ("即将开放") */
  span?: [number, number];
};

const sceneSpan = (id: string): [number, number] => {
  const s = scene(id);
  return [s.start, s.end];
};

export const TOPIC = { id: "deep-learning", title: "深度学习入门", lesson: "alexnet", lessonTitle: "AlexNet：一次让机器学会“看”的革命" };

export const NODES: KnowledgeNode[] = [
  { id: "pixels", title: "图像的数字表示", en: "PIXELS", goal: "说清一张照片在计算机里是什么，以及为什么识别很难", needs: [], pos: [-12, 2.2, 0], span: sceneSpan("pixels") },
  { id: "neuron", title: "人工神经元", en: "NEURON", goal: "写出加权求和 + 偏置，理解权重的作用", needs: [], pos: [-12, -2.6, 1.5], span: [scene("neuron").start, cue("n5")] },
  { id: "features", title: "手工特征", en: "HAND-CRAFTED", goal: "知道 HOG、SIFT 的思路，以及“人来设计”的瓶颈", needs: ["pixels"], pos: [-7.5, 3.6, -1.5], span: sceneSpan("hand") },
  { id: "descent", title: "损失与梯度下降", en: "GRADIENT DESCENT", goal: "理解损失、梯度下降与反向传播如何让网络学习", needs: ["neuron"], pos: [-7.5, -2.0, -0.5], span: [cue("n5"), scene("neuron").end] },
  { id: "conv", title: "卷积", en: "CONVOLUTION", goal: "解释局部连接与权重共享，能手算一次卷积", needs: ["features", "descent"], pos: [-2.5, 2.0, 1], span: sceneSpan("conv") },
  { id: "activation", title: "激活函数与 ReLU", en: "ACTIVATION", goal: "说明为什么需要非线性，以及 ReLU 如何缓解梯度消失", needs: ["descent"], pos: [-2.5, -3.0, -1], span: sceneSpan("relu") },
  { id: "pooling", title: "池化与层级特征", en: "HIERARCHY", goal: "理解池化的作用，以及深层网络如何从边缘组合出物体", needs: ["conv", "activation"], pos: [2.2, -0.2, 0.8], span: sceneSpan("hier") },
  { id: "arch", title: "AlexNet 网络结构", en: "ARCHITECTURE", goal: "说出 5 个卷积层 + 3 个全连接层的设计与参数分布", needs: ["pooling"], pos: [6.6, 2.4, -0.6], span: sceneSpan("arch") },
  { id: "training", title: "数据 · 算力 · 正则化", en: "DATA · GPU · DROPOUT", goal: "解释 ImageNet、GPU、数据增强与 Dropout 各自解决了什么", needs: ["arch"], pos: [6.6, -2.8, 1.2], span: sceneSpan("keys") },
  { id: "paradigm", title: "深度学习的范式转变", en: "PARADIGM", goal: "说出从“设计特征”到“设计结构、数据决定特征”的转变", needs: ["arch", "training"], pos: [11, 0, 0], span: [scene("impact").start, scene("legacy").end] },
  // not yet available: keeps the map honest about where the journey goes next
  { id: "resnet", title: "残差网络", en: "RESNET", goal: "", needs: ["paradigm"], pos: [15, 3.4, -1.5] },
  { id: "rnn", title: "循环神经网络", en: "RNN", goal: "", needs: ["paradigm"], pos: [15, -3.4, 1.5] },
  { id: "attention", title: "注意力机制", en: "ATTENTION", goal: "", needs: ["rnn"], pos: [19, -1.8, 0] },
  { id: "generative", title: "生成模型", en: "GENERATIVE", goal: "", needs: ["resnet"], pos: [19, 4.2, 1] },
  { id: "transformer", title: "Transformer", en: "TRANSFORMER", goal: "", needs: ["attention", "resnet"], pos: [23, 0.6, -0.8] },
  { id: "llm", title: "大语言模型", en: "LLM", goal: "", needs: ["transformer"], pos: [27, 0, 0] },
];

/** When a node counts as watched: the end of the last voice-over line inside its span (before any quiz pause). */
export const watchedAt = (n: KnowledgeNode): number => {
  const [a, b] = n.span!;
  const inside = LINES.filter((l) => l.start >= a && l.end <= b);
  return inside.length ? inside[inside.length - 1].end : b - 0.4;
};

export const nodeById = (id: NodeId) => {
  const n = NODES.find((x) => x.id === id);
  if (!n) throw new Error(`unknown knowledge node ${id}`);
  return n;
};

export const LEARNABLE = NODES.filter((n) => n.span);

/** The learnable node whose lesson span contains time t. */
export const nodeAt = (t: number) => LEARNABLE.find((n) => t >= n.span![0] && t < n.span![1]);

export const LESSON_END = lineEnd("e8");

import { KnowledgeNode, NODES } from "./graph";

/**
 * The top level of the knowledge map: big nodes ("chapters"), each a model or idea that changed deep learning.
 * A chapter opens into its own sub-node graph. Only AlexNet has a lesson so far; the others list what their
 * lesson will cover, so the map is honest about the road ahead.
 */
export type TrackId = "vision" | "sequence" | "generative";

export type Chapter = {
  id: string;
  title: string;
  en: string;
  year: string;
  /** one line: what changed */
  blurb: string;
  track: TrackId;
  needs: string[];
  /** how far out along its track's spiral arm, 0 = the galactic core … 1 = the rim */
  along: number;
  /** sub-nodes; their `pos` is local to the chapter */
  children: KnowledgeNode[];
  /** lesson route id when a virtual lesson exists */
  lesson?: string;
};

/** Each track is one spiral arm of the galaxy; `phase` is the angle (radians) at which the arm leaves the core. */
export const TRACKS: Record<TrackId, { title: string; en: string; color: string; phase: number }> = {
  vision: { title: "视觉 · 卷积网络", en: "VISION", color: "#ffb547", phase: 0.35 },
  sequence: { title: "序列 · 语言", en: "SEQUENCE", color: "#3ce0ff", phase: 0.35 + (Math.PI * 2) / 3 },
  generative: { title: "生成", en: "GENERATIVE", color: "#b28cff", phase: 0.35 + (Math.PI * 4) / 3 },
};

/* galaxy geometry: arms are spirals r(u) = R0 + (R1 − R0)·u, θ(u) = phase + WIND·u, lying in the x–z plane */
export const GALAXY = { R0: 3.2, R1: 31, WIND: 3.9 };
export const armRadius = (u: number) => GALAXY.R0 + (GALAXY.R1 - GALAXY.R0) * u;
export const armAngle = (phase: number, u: number) => phase + GALAXY.WIND * u;
export const armPoint = (phase: number, u: number): [number, number, number] => {
  const r = armRadius(u);
  const a = armAngle(phase, u);
  return [Math.cos(a) * r, 0, Math.sin(a) * r];
};
/** World position of a big node: AlexNet is the core; every other star sits on its arm. */
export const chapterPos = (c: Chapter): [number, number, number] => (c.along === 0 ? [0, 0, 0] : armPoint(TRACKS[c.track].phase, c.along));

/** Planned sub-topics of a chapter without a lesson: a gently zig-zagging chain, each step needing the previous one. */
const planned = (chapter: string, topics: Array<[string, string]>): KnowledgeNode[] =>
  topics.map(([title, en], i) => ({
    id: `${chapter}-${i}`,
    title,
    en,
    goal: "",
    needs: i ? [`${chapter}-${i - 1}`] : [],
    pos: [(i - (topics.length - 1) / 2) * 5.2, i % 2 ? -2 : 2, 0],
  }));

export const CHAPTERS: Chapter[] = [
  {
    id: "alexnet",
    title: "AlexNet",
    en: "ALEXNET · 2012",
    year: "2012",
    blurb: "深度学习的起点：第一次让机器从数据里自己学会“看”，ImageNet 错误率一夜下降 10 个百分点。",
    track: "vision",
    needs: [],
    along: 0,
    children: NODES,
    lesson: "alexnet",
  },
  {
    id: "vgg",
    title: "VGG",
    en: "VGG · 2014",
    year: "2014",
    blurb: "只用 3×3 小卷积核一层层堆深：简单的结构，证明“深度”本身就是力量。",
    track: "vision",
    needs: ["alexnet"],
    along: 0.26,
    children: planned("vgg", [
      ["3×3 小卷积核", "SMALL KERNELS"],
      ["感受野的叠加", "RECEPTIVE FIELD"],
      ["深度与参数量", "DEPTH VS PARAMS"],
      ["特征复用与迁移学习", "TRANSFER"],
    ]),
  },
  {
    id: "googlenet",
    title: "GoogLeNet",
    en: "INCEPTION · 2014",
    year: "2014",
    blurb: "让网络自己选尺度：Inception 模块并行多种卷积，用 1×1 卷积把计算量压下来。",
    track: "vision",
    needs: ["alexnet"],
    along: 0.44,
    children: planned("googlenet", [
      ["1×1 卷积", "1×1 CONV"],
      ["Inception 模块", "INCEPTION"],
      ["多尺度特征", "MULTI-SCALE"],
      ["全局平均池化", "GAP"],
      ["辅助分类器", "AUX HEADS"],
    ]),
  },
  {
    id: "resnet",
    title: "残差网络",
    en: "RESNET · 2015",
    year: "2015",
    blurb: "加一条“抄近路”的连接，网络从 20 层一下深到 152 层，还更好训练。",
    track: "vision",
    needs: ["vgg", "googlenet"],
    along: 0.64,
    children: planned("resnet", [
      ["退化问题", "DEGRADATION"],
      ["残差连接", "SKIP CONNECTION"],
      ["恒等映射与梯度", "IDENTITY"],
      ["批归一化", "BATCH NORM"],
      ["瓶颈结构", "BOTTLENECK"],
    ]),
  },
  {
    id: "vit",
    title: "视觉 Transformer",
    en: "VIT · 2020",
    year: "2020",
    blurb: "把图片切成小块当成“单词”，不用卷积也能看懂图像。",
    track: "vision",
    needs: ["resnet", "transformer"],
    along: 0.9,
    children: planned("vit", [
      ["图像切块", "PATCHES"],
      ["块嵌入与位置", "PATCH EMBEDDING"],
      ["归纳偏置：卷积 vs 注意力", "INDUCTIVE BIAS"],
      ["大规模预训练", "PRETRAINING"],
    ]),
  },
  {
    id: "rnn",
    title: "循环神经网络",
    en: "RNN · LSTM",
    year: "1997",
    blurb: "给网络加上“记忆”，让它能读句子、听语音——一次只看一个词，把前文装进隐藏状态。",
    track: "sequence",
    needs: ["alexnet"],
    along: 0.28,
    children: planned("rnn", [
      ["序列与时间步", "SEQUENCES"],
      ["隐藏状态", "HIDDEN STATE"],
      ["时间反向传播", "BPTT"],
      ["梯度消失与爆炸", "VANISHING"],
      ["LSTM 与门控", "LSTM GATES"],
    ]),
  },
  {
    id: "attention",
    title: "注意力机制",
    en: "ATTENTION · 2014",
    year: "2014",
    blurb: "翻译每个词时，回头去“看”原句里最相关的部分，而不是只靠一个压缩的记忆。",
    track: "sequence",
    needs: ["rnn"],
    along: 0.5,
    children: planned("attention", [
      ["Seq2Seq 的瓶颈", "BOTTLENECK"],
      ["对齐与加权求和", "ALIGNMENT"],
      ["Query · Key · Value", "QKV"],
      ["自注意力", "SELF-ATTENTION"],
    ]),
  },
  {
    id: "transformer",
    title: "Transformer",
    en: "TRANSFORMER · 2017",
    year: "2017",
    blurb: "“注意力就是你所需要的一切”：扔掉循环，所有词同时互相看，训练可以大规模并行。",
    track: "sequence",
    needs: ["attention", "resnet"],
    along: 0.7,
    children: planned("transformer", [
      ["多头注意力", "MULTI-HEAD"],
      ["位置编码", "POSITIONAL"],
      ["残差与层归一化", "RESIDUAL · LN"],
      ["编码器与解码器", "ENCODER-DECODER"],
      ["掩码与自回归", "MASKING"],
    ]),
  },
  {
    id: "llm",
    title: "大语言模型",
    en: "LLM",
    year: "2018–",
    blurb: "只做一件事——预测下一个词，但把模型和数据放大一万倍，能力开始“涌现”。",
    track: "sequence",
    needs: ["transformer"],
    along: 0.93,
    children: planned("llm", [
      ["词元与嵌入", "TOKENS"],
      ["下一词预测预训练", "PRETRAINING"],
      ["规模定律", "SCALING LAWS"],
      ["指令微调与人类反馈", "RLHF"],
      ["上下文学习", "IN-CONTEXT"],
    ]),
  },
  {
    id: "generative",
    title: "生成模型",
    en: "VAE · GAN",
    year: "2014",
    blurb: "不只认图，还要画图：自编码器学会压缩，GAN 让两个网络互相较劲。",
    track: "generative",
    needs: ["alexnet"],
    along: 0.36,
    children: planned("generative", [
      ["自编码器", "AUTOENCODER"],
      ["变分自编码器与潜空间", "VAE"],
      ["生成对抗网络", "GAN"],
      ["模式崩溃", "MODE COLLAPSE"],
    ]),
  },
  {
    id: "diffusion",
    title: "扩散模型",
    en: "DIFFUSION · 2020",
    year: "2020",
    blurb: "从一团噪声开始，一步步去噪“雕刻”出图像——今天文生图的核心。",
    track: "generative",
    needs: ["generative", "resnet"],
    along: 0.74,
    children: planned("diffusion", [
      ["加噪与去噪", "NOISING"],
      ["去噪网络 U-Net", "U-NET"],
      ["采样步数", "SAMPLING"],
      ["文本条件引导", "GUIDANCE"],
    ]),
  },
];

export const chapterById = (id: string | null | undefined) => CHAPTERS.find((c) => c.id === id);

/** The chapter a sub-node belongs to. */
export const chapterOf = (nodeId: string) => CHAPTERS.find((c) => c.children.some((n) => n.id === nodeId));

export const OPEN_CHAPTERS = CHAPTERS.filter((c) => c.lesson);
export const SUBNODE_COUNT = CHAPTERS.reduce((s, c) => s + c.children.length, 0);

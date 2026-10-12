import { KnowledgeNode, NODES } from "./graph";

/**
 * The top level of the knowledge graph: big nodes ("chapters"), each a model or idea that changed deep learning,
 * on five tracks that read left → right roughly in historical order. A chapter expands into its own sub-topics.
 * Only AlexNet has a lesson so far; the others list what their lesson will cover.
 */
export type TrackId = "foundation" | "vision" | "sequence" | "generative" | "rl";

export type Chapter = {
  id: string;
  title: string;
  en: string;
  year: string;
  /** one line: what changed */
  blurb: string;
  track: TrackId;
  needs: string[];
  /** relation shown on the arrow from each prerequisite, keyed by prerequisite id */
  rel: Record<string, string>;
  /** node colour (a shade of its track) */
  color: string;
  /** hand layout on the graph, in graph pixels: x ≈ time, y = track lane */
  at: [number, number];
  /** sub-topics */
  children: KnowledgeNode[];
  /** lesson route id when a virtual lesson exists */
  lesson?: string;
};

export const TRACKS: Record<TrackId, { title: string; en: string; color: string }> = {
  foundation: { title: "神经网络基础", en: "FOUNDATION", color: "#f97316" },
  vision: { title: "视觉 · 卷积网络", en: "VISION", color: "#3b82f6" },
  sequence: { title: "序列 · 语言", en: "SEQUENCE", color: "#10b981" },
  generative: { title: "生成 · 多模态", en: "GENERATIVE", color: "#a855f7" },
  rl: { title: "强化学习", en: "REINFORCEMENT", color: "#eab308" },
};

/** Planned sub-topics of a chapter without a lesson: a chain, each step needing the previous one. */
const planned = (chapter: string, topics: Array<[string, string]>): KnowledgeNode[] =>
  topics.map(([title, en], i) => ({ id: `${chapter}-${i}`, title, en, goal: "", needs: i ? [`${chapter}-${i - 1}`] : [], pos: [0, 0, 0] }));

type Def = Omit<Chapter, "children" | "needs"> & { topics?: Array<[string, string]>; children?: KnowledgeNode[] };

const DEFS: Def[] = [
  /* ── foundations ── */
  { id: "perceptron", title: "感知机", en: "PERCEPTRON", year: "1958", track: "foundation", color: "#f97316", at: [-560, 20], rel: {},
    blurb: "第一个会“学习”的人工神经元：加权求和、过阈值就输出 1。", topics: [["加权求和与阈值", "WEIGHTED SUM"], ["感知机学习规则", "LEARNING RULE"], ["线性可分", "LINEAR SEPARABILITY"], ["异或难题", "XOR PROBLEM"]] },
  { id: "backprop", title: "反向传播", en: "BACKPROPAGATION", year: "1986", track: "foundation", color: "#fb923c", at: [-390, -40], rel: { perceptron: "多层化" },
    blurb: "用链式法则把误差一层层传回去，多层网络从此可以训练。", topics: [["多层感知机", "MLP"], ["链式法则", "CHAIN RULE"], ["计算图", "COMPUTATION GRAPH"], ["自动求导", "AUTODIFF"]] },
  { id: "optim", title: "优化算法", en: "OPTIMIZERS", year: "1951–2014", track: "foundation", color: "#f59e0b", at: [-360, 120], rel: { backprop: "如何下降" },
    blurb: "梯度给出方向，优化器决定怎么走：SGD、动量、Adam。", topics: [["随机梯度下降", "SGD"], ["动量法", "MOMENTUM"], ["自适应学习率", "ADAGRAD · RMSPROP"], ["Adam", "ADAM"], ["学习率调度", "SCHEDULES"]] },
  { id: "regular", title: "正则化与归一化", en: "REGULARIZATION", year: "2012–2015", track: "foundation", color: "#ea580c", at: [-200, 170], rel: { optim: "训练更稳" },
    blurb: "让大网络不死记硬背、训练不发散：Dropout、权重衰减、BatchNorm。", topics: [["过拟合与泛化", "OVERFITTING"], ["权重衰减", "WEIGHT DECAY"], ["Dropout", "DROPOUT"], ["批归一化", "BATCH NORM"], ["层归一化", "LAYER NORM"]] },

  /* ── vision ── */
  { id: "lenet", title: "LeNet", en: "LENET · 1998", year: "1998", track: "vision", color: "#60a5fa", at: [-230, -170], rel: { backprop: "用于图像" },
    blurb: "第一个成功的卷积网络，认出了支票上的手写数字。", topics: [["卷积与权重共享", "WEIGHT SHARING"], ["下采样", "SUBSAMPLING"], ["手写数字识别", "MNIST"]] },
  { id: "alexnet", title: "AlexNet", en: "ALEXNET · 2012", year: "2012", track: "vision", color: "#2563eb", at: [-40, -120], rel: { lenet: "放大规模", backprop: "端到端训练" },
    blurb: "深度学习的起点：第一次让机器从数据里自己学会“看”，ImageNet 错误率一夜下降 10 个百分点。", children: NODES, lesson: "alexnet" },
  { id: "vgg", title: "VGG", en: "VGG · 2014", year: "2014", track: "vision", color: "#0ea5e9", at: [130, -270], rel: { alexnet: "加深网络" },
    blurb: "只用 3×3 小卷积核一层层堆深：简单的结构，证明“深度”本身就是力量。", topics: [["3×3 小卷积核", "SMALL KERNELS"], ["感受野的叠加", "RECEPTIVE FIELD"], ["深度与参数量", "DEPTH VS PARAMS"], ["迁移学习", "TRANSFER"]] },
  { id: "googlenet", title: "GoogLeNet", en: "INCEPTION · 2014", year: "2014", track: "vision", color: "#6366f1", at: [200, -150], rel: { alexnet: "多尺度改进" },
    blurb: "让网络自己选尺度：Inception 模块并行多种卷积，用 1×1 卷积压下计算量。", topics: [["1×1 卷积", "1×1 CONV"], ["Inception 模块", "INCEPTION"], ["全局平均池化", "GAP"], ["辅助分类器", "AUX HEADS"]] },
  { id: "detection", title: "目标检测", en: "R-CNN · YOLO", year: "2014–2016", track: "vision", color: "#38bdf8", at: [150, -390], rel: { alexnet: "定位物体" },
    blurb: "不只说“有猫”，还要框出猫在哪：R-CNN 到 YOLO 的一次看全图。", topics: [["候选框与 IoU", "BOX · IOU"], ["两阶段检测", "R-CNN"], ["单阶段检测", "YOLO · SSD"], ["非极大值抑制", "NMS"]] },
  { id: "resnet", title: "残差网络", en: "RESNET · 2015", year: "2015", track: "vision", color: "#1d4ed8", at: [320, -220], rel: { vgg: "更深", googlenet: "结构改进", regular: "批归一化" },
    blurb: "加一条“抄近路”的连接，网络从 20 层一下深到 152 层，还更好训练。", topics: [["退化问题", "DEGRADATION"], ["残差连接", "SKIP CONNECTION"], ["恒等映射与梯度", "IDENTITY"], ["瓶颈结构", "BOTTLENECK"]] },
  { id: "segmentation", title: "图像分割", en: "FCN · U-NET", year: "2015", track: "vision", color: "#0284c7", at: [330, -350], rel: { detection: "逐像素", vgg: "全卷积" },
    blurb: "给每个像素贴标签：全卷积网络与 U-Net，医学影像的主力。", topics: [["全卷积网络", "FCN"], ["编码器-解码器", "ENCODER-DECODER"], ["U-Net 跳跃连接", "U-NET"], ["实例分割", "MASK R-CNN"]] },
  { id: "mobilenet", title: "轻量网络", en: "MOBILENET", year: "2017", track: "vision", color: "#4f46e5", at: [560, -380], rel: { resnet: "压缩加速" },
    blurb: "把网络塞进手机：深度可分离卷积与模型压缩。", topics: [["深度可分离卷积", "DEPTHWISE"], ["剪枝与量化", "PRUNE · QUANT"], ["知识蒸馏", "DISTILLATION"]] },
  { id: "vit", title: "视觉 Transformer", en: "VIT · 2020", year: "2020", track: "vision", color: "#3b82f6", at: [700, -230], rel: { resnet: "替代卷积", transformer: "用于视觉" },
    blurb: "把图片切成小块当成“单词”，不用卷积也能看懂图像。", topics: [["图像切块", "PATCHES"], ["块嵌入与位置", "PATCH EMBEDDING"], ["卷积 vs 注意力", "INDUCTIVE BIAS"], ["大规模预训练", "PRETRAINING"]] },

  /* ── sequence & language ── */
  { id: "rnn", title: "循环神经网络", en: "RNN", year: "1986", track: "sequence", color: "#14b8a6", at: [-200, 320], rel: { backprop: "按时间展开" },
    blurb: "给网络加上“记忆”：一次读一个词，把前文装进隐藏状态。", topics: [["序列与时间步", "SEQUENCES"], ["隐藏状态", "HIDDEN STATE"], ["时间反向传播", "BPTT"], ["梯度消失与爆炸", "VANISHING"]] },
  { id: "lstm", title: "LSTM", en: "LSTM · GRU", year: "1997", track: "sequence", color: "#0d9488", at: [-30, 400], rel: { rnn: "门控记忆" },
    blurb: "用遗忘门、输入门、输出门控制记忆，长句子也记得住。", topics: [["细胞状态", "CELL STATE"], ["三个门", "GATES"], ["GRU", "GRU"]] },
  { id: "wordvec", title: "词向量", en: "WORD2VEC · 2013", year: "2013", track: "sequence", color: "#22c55e", at: [-20, 250], rel: { backprop: "表示语义" },
    blurb: "把词变成向量，“国王 − 男人 + 女人 ≈ 女王”。", topics: [["独热编码的问题", "ONE-HOT"], ["分布式表示", "EMBEDDING"], ["Skip-gram", "SKIP-GRAM"], ["向量类比", "ANALOGY"]] },
  { id: "seq2seq", title: "Seq2Seq", en: "SEQ2SEQ · 2014", year: "2014", track: "sequence", color: "#059669", at: [150, 360], rel: { lstm: "编码-解码", wordvec: "输入表示" },
    blurb: "一个网络读完原句，另一个网络写出译文：机器翻译的新范式。", topics: [["编码器与解码器", "ENCODER · DECODER"], ["上下文向量", "CONTEXT VECTOR"], ["束搜索", "BEAM SEARCH"]] },
  { id: "attention", title: "注意力机制", en: "ATTENTION · 2014", year: "2014", track: "sequence", color: "#06b6d4", at: [320, 300], rel: { seq2seq: "解决记忆瓶颈" },
    blurb: "翻译每个词时，回头去“看”原句里最相关的部分。", topics: [["对齐与加权求和", "ALIGNMENT"], ["Query · Key · Value", "QKV"], ["自注意力", "SELF-ATTENTION"], ["注意力可视化", "ATTENTION MAPS"]] },
  { id: "transformer", title: "Transformer", en: "TRANSFORMER · 2017", year: "2017", track: "sequence", color: "#0891b2", at: [490, 220], rel: { attention: "完全基于", resnet: "残差连接" },
    blurb: "“注意力就是你所需要的一切”：扔掉循环，所有词同时互相看，训练可以大规模并行。", topics: [["多头注意力", "MULTI-HEAD"], ["位置编码", "POSITIONAL"], ["残差与层归一化", "RESIDUAL · LN"], ["掩码与自回归", "MASKING"]] },
  { id: "bert", title: "BERT", en: "BERT · 2018", year: "2018", track: "sequence", color: "#16a34a", at: [660, 140], rel: { transformer: "双向编码" },
    blurb: "先在海量文本上做“完形填空”，再微调到各种理解任务。", topics: [["掩码语言模型", "MLM"], ["预训练与微调", "FINE-TUNING"], ["句向量", "SENTENCE EMBEDDING"]] },
  { id: "gpt", title: "GPT", en: "GPT · 2018", year: "2018", track: "sequence", color: "#10b981", at: [670, 330], rel: { transformer: "只用解码器" },
    blurb: "只做一件事——预测下一个词，越大越会写。", topics: [["自回归语言模型", "AUTOREGRESSIVE"], ["词元化", "TOKENIZATION"], ["采样与温度", "SAMPLING"], ["零样本与少样本", "FEW-SHOT"]] },
  { id: "llm", title: "大语言模型", en: "LLM", year: "2020–", track: "sequence", color: "#047857", at: [850, 250], rel: { gpt: "规模化", bert: "预训练范式" },
    blurb: "把模型和数据放大一万倍，推理、写代码等能力开始“涌现”。", topics: [["规模定律", "SCALING LAWS"], ["涌现能力", "EMERGENCE"], ["上下文学习", "IN-CONTEXT"], ["思维链", "CHAIN OF THOUGHT"], ["检索增强", "RAG"]] },
  { id: "rlhf", title: "对齐与 RLHF", en: "ALIGNMENT", year: "2022", track: "sequence", color: "#2dd4bf", at: [1010, 340], rel: { llm: "听懂人话", ppo: "强化学习微调" },
    blurb: "用人类反馈教模型“好好说话”：指令微调、奖励模型、RLHF。", topics: [["指令微调", "SFT"], ["奖励模型", "REWARD MODEL"], ["人类反馈强化学习", "RLHF"], ["安全与对齐", "SAFETY"]] },

  /* ── generative & multimodal ── */
  { id: "autoencoder", title: "自编码器", en: "AUTOENCODER", year: "2006", track: "generative", color: "#a855f7", at: [-180, 40], rel: { backprop: "学会压缩" },
    blurb: "把输入压成一小段编码再还原回来，网络学会了数据的精华。", topics: [["编码与解码", "ENCODE · DECODE"], ["瓶颈层", "BOTTLENECK"], ["去噪自编码器", "DENOISING"]] },
  { id: "vae", title: "变分自编码器", en: "VAE · 2013", year: "2013", track: "generative", color: "#9333ea", at: [10, 60], rel: { autoencoder: "概率化" },
    blurb: "让编码服从一个分布，从里面随便取一点就能生成新样本。", topics: [["潜空间", "LATENT SPACE"], ["重参数化技巧", "REPARAMETERIZATION"], ["KL 散度", "KL DIVERGENCE"]] },
  { id: "gan", title: "生成对抗网络", en: "GAN · 2014", year: "2014", track: "generative", color: "#ec4899", at: [270, 0], rel: { alexnet: "卷积生成器", vae: "另一条路" },
    blurb: "一个网络造假、一个网络鉴别，两者较劲中画出以假乱真的图。", topics: [["生成器与判别器", "G · D"], ["对抗训练", "MINIMAX"], ["模式崩溃", "MODE COLLAPSE"], ["StyleGAN", "STYLEGAN"]] },
  { id: "diffusion", title: "扩散模型", en: "DIFFUSION · 2020", year: "2020", track: "generative", color: "#d946ef", at: [560, 40], rel: { vae: "逐步生成", segmentation: "U-Net 去噪" },
    blurb: "从一团噪声开始，一步步去噪“雕刻”出图像。", topics: [["加噪与去噪", "NOISING"], ["去噪网络", "DENOISER"], ["采样步数", "SAMPLING"], ["潜空间扩散", "LATENT DIFFUSION"]] },
  { id: "clip", title: "CLIP", en: "CLIP · 2021", year: "2021", track: "generative", color: "#c026d3", at: [790, -60], rel: { vit: "图像编码", transformer: "文本编码" },
    blurb: "把图片和文字放进同一个空间，“一只橘猫”能直接找到橘猫的照片。", topics: [["对比学习", "CONTRASTIVE"], ["图文对齐", "ALIGNMENT"], ["零样本分类", "ZERO-SHOT"]] },
  { id: "t2i", title: "文生图", en: "TEXT-TO-IMAGE", year: "2022", track: "generative", color: "#f43f5e", at: [880, 60], rel: { diffusion: "去噪生成", clip: "文本引导" },
    blurb: "输入一句话，画出一幅画：Stable Diffusion、DALL·E。", topics: [["文本条件", "CONDITIONING"], ["无分类器引导", "CFG"], ["图像编辑", "EDITING"]] },
  { id: "mllm", title: "多模态大模型", en: "MULTIMODAL LLM", year: "2023–", track: "generative", color: "#8b5cf6", at: [1030, 140], rel: { llm: "语言大脑", clip: "视觉眼睛" },
    blurb: "让大语言模型长出眼睛和耳朵，看图、听声、再回答。", topics: [["视觉编码器接入", "VISION ENCODER"], ["图文指令微调", "VISUAL INSTRUCT"], ["多模态推理", "REASONING"]] },

  /* ── reinforcement learning ── */
  { id: "rl", title: "强化学习基础", en: "REINFORCEMENT", year: "1989", track: "rl", color: "#eab308", at: [-380, 470], rel: {},
    blurb: "在试错中学习：做动作、拿奖励、学会长远的策略。", topics: [["智能体与环境", "AGENT · ENV"], ["马尔可夫决策过程", "MDP"], ["Q 学习", "Q-LEARNING"], ["探索与利用", "EXPLORATION"]] },
  { id: "dqn", title: "深度 Q 网络", en: "DQN · 2013", year: "2013", track: "rl", color: "#ca8a04", at: [80, 520], rel: { rl: "深度化", alexnet: "卷积看屏幕" },
    blurb: "用卷积网络看游戏画面，一个程序学会了几十款雅达利游戏。", topics: [["Q 函数逼近", "FUNCTION APPROX"], ["经验回放", "REPLAY"], ["目标网络", "TARGET NET"]] },
  { id: "alphago", title: "AlphaGo", en: "ALPHAGO · 2016", year: "2016", track: "rl", color: "#f59e0b", at: [360, 500], rel: { dqn: "策略与价值", resnet: "深层网络" },
    blurb: "策略网络 + 价值网络 + 蒙特卡洛树搜索，击败了围棋世界冠军。", topics: [["策略网络", "POLICY NET"], ["价值网络", "VALUE NET"], ["蒙特卡洛树搜索", "MCTS"], ["自我对弈", "SELF-PLAY"]] },
  { id: "ppo", title: "策略梯度", en: "PPO", year: "2017", track: "rl", color: "#facc15", at: [720, 470], rel: { alphago: "直接优化策略" },
    blurb: "直接沿着“更多奖励”的方向调整策略，PPO 稳定又好用。", topics: [["策略梯度定理", "POLICY GRADIENT"], ["演员-评论家", "ACTOR-CRITIC"], ["PPO 裁剪", "PPO CLIP"]] },
];

export const CHAPTERS: Chapter[] = DEFS.map(({ topics, children, ...d }) => ({
  ...d,
  needs: Object.keys(d.rel),
  children: children ?? planned(d.id, topics ?? []),
}));

export const chapterById = (id: string | null | undefined) => CHAPTERS.find((c) => c.id === id);

/** The chapter a sub-node belongs to. */
export const chapterOf = (nodeId: string) => CHAPTERS.find((c) => c.children.some((n) => n.id === nodeId));

export const OPEN_CHAPTERS = CHAPTERS.filter((c) => c.lesson);
export const SUBNODE_COUNT = CHAPTERS.reduce((s, c) => s + c.children.length, 0);

/** Relations between the AlexNet sub-topics (prerequisite → topic). */
const SUB_REL: Record<string, string> = {
  "pixels>features": "从像素提取",
  "neuron>descent": "如何学习",
  "features>conv": "让网络自己学",
  "descent>conv": "训练卷积核",
  "descent>activation": "梯度要流动",
  "conv>pooling": "逐层压缩",
  "activation>pooling": "逐层堆叠",
  "pooling>arch": "组成网络",
  "arch>training": "训练它",
  "arch>paradigm": "带来改变",
  "training>paradigm": "规模效应",
};
/** Label for the arrow from sub-topic `from` to sub-topic `to`. */
export const subRel = (from: string, to: string) => SUB_REL[`${from}>${to}`] ?? "下一步";

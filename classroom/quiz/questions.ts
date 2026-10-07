import { cue } from "../../src/alexnet/lib/timeline";
import type { LabId } from "../lesson/zones";
import type { NodeId } from "../map/graph";
import { stepFor } from "../progress/mastery";

export type Option = { text: string; img?: string; imgStyle?: string };
export type Question = {
  id: string;
  nodes: NodeId[];
  kind: "choice" | "truefalse" | "predict";
  prompt: string;
  /** optional figure shown with the prompt */
  figure?: { kernel?: number[][]; img?: string };
  options: Option[];
  answer: number;
  explain: string;
  /** where to go when the student wants to revisit this */
  review: { at: number; lab?: LabId };
};

const TF = [{ text: "正确" }, { text: "错误" }];

export const QUESTIONS: Question[] = [
  {
    id: "q-fc-params",
    nodes: ["conv"],
    kind: "choice",
    prompt: "一张 224×224 的彩色图片（15 万多个数）全连接到 1000 个神经元，大约需要多少个权重？",
    options: [{ text: "约 15 万" }, { text: "约 150 万" }, { text: "约 1.5 亿" }, { text: "约 1500 亿" }],
    answer: 2,
    explain: "150,528 × 1,000 ≈ 1.5 亿。每个输入都要和每个神经元相连，参数随两者相乘暴涨。",
    review: { at: cue("c2") },
  },
  {
    id: "q-share",
    nodes: ["conv"],
    kind: "choice",
    prompt: "“权重共享”指的是什么？",
    options: [
      { text: "不同的卷积层使用同一组权重" },
      { text: "同一个卷积核在图像的每个位置都使用同一组权重" },
      { text: "两块 GPU 共用一份权重" },
      { text: "所有神经元的权重都相等" },
    ],
    answer: 1,
    explain: "一个能发现竖直边缘的检测器在左上角有用、在右下角也一样有用，所以让同一组 9 个权重滑过整张图。",
    review: { at: cue("c8"), lab: "conv" },
  },
  {
    id: "q-kernel-predict",
    nodes: ["conv"],
    kind: "predict",
    prompt: "把下面这个卷积核滑过整张猫图，得到的特征图最可能是哪一张？",
    figure: {
      kernel: [
        [-1, 0, 1],
        [-2, 0, 2],
        [-1, 0, 1],
      ],
    },
    options: [
      { text: "A", img: "alexnet/edges.png" },
      { text: "B", img: "alexnet/cat.jpg", imgStyle: "blur(6px)" },
      { text: "C", img: "alexnet/cat.jpg", imgStyle: "invert(1) grayscale(1)" },
      { text: "D", img: "alexnet/hog.png" },
    ],
    answer: 0,
    explain: "左边是 −、右边是 +：它在左右亮度突变的地方响应最大，也就是竖直方向的边缘。去卷积实验台换几个核试试看。",
    review: { at: cue("c12"), lab: "conv" },
  },
  {
    id: "q-linear",
    nodes: ["activation"],
    kind: "truefalse",
    prompt: "如果去掉所有激活函数，把 100 个线性层叠起来，效果等价于只有 1 个线性层。",
    options: TF,
    answer: 0,
    explain: "线性变换的组合仍然是线性变换：W₁₀₀···W₂W₁ 可以合并成一个矩阵 W。没有非线性，网络只能画直线。",
    review: { at: cue("r2"), lab: "activation" },
  },
  {
    id: "q-vanish",
    nodes: ["activation", "descent"],
    kind: "choice",
    prompt: "sigmoid 的梯度最大只有 0.25。误差信号向前穿过 8 层后，最多还剩原来的多少？",
    options: [{ text: "约 25%" }, { text: "约 2%" }, { text: "约 0.0015%" }, { text: "还是 100%" }],
    answer: 2,
    explain: "0.25⁸ ≈ 0.0000153，也就是约 0.0015%。层数一多，前面的层几乎收不到信号——这就是梯度消失。",
    review: { at: cue("r6"), lab: "activation" },
  },
  {
    id: "q-relu-grad",
    nodes: ["activation"],
    kind: "choice",
    prompt: "当 ReLU 的输入 x = 3 时，它的输出和梯度分别是？",
    options: [{ text: "输出 3，梯度 1" }, { text: "输出 1，梯度 3" }, { text: "输出 0，梯度 0" }, { text: "输出 3，梯度 0.25" }],
    answer: 0,
    explain: "ReLU(x) = max(0, x)，x > 0 时原样输出、斜率恒为 1，误差可以畅通无阻地传回去。",
    review: { at: cue("r7"), lab: "activation" },
  },
  {
    id: "q-params-where",
    nodes: ["arch"],
    kind: "choice",
    prompt: "AlexNet 的 6000 万参数主要集中在哪里？",
    options: [{ text: "第一层卷积（11×11 的大卷积核）" }, { text: "5 个卷积层平均分布" }, { text: "最后 3 个全连接层" }, { text: "池化层" }],
    answer: 2,
    explain: "全连接层占了超过 95% 的参数（仅 FC6 就有约 3775 万）。卷积层负责“看”，参数却很省。",
    review: { at: cue("a8"), lab: "arch" },
  },
  {
    id: "q-pool",
    nodes: ["pooling"],
    kind: "choice",
    prompt: "对 [[1, 3], [8, 2]] 做 2×2 最大池化，结果是？",
    options: [{ text: "1" }, { text: "3.5" }, { text: "8" }, { text: "14" }],
    answer: 2,
    explain: "最大池化只保留窗口里最大的值：8。它让特征图变小，也让网络对微小位移不再那么敏感。",
    review: { at: cue("f1") },
  },
  {
    id: "q-first-layer",
    nodes: ["pooling", "arch"],
    kind: "predict",
    prompt: "下面哪一张，是训练好的 AlexNet 第一层真实学到的卷积核？",
    options: [
      { text: "A", img: "alexnet/fmap_conv5.png" },
      { text: "B", img: "alexnet/filters.png" },
      { text: "C", img: "alexnet/gradcam.png" },
      { text: "D", img: "alexnet/shift_diff.png" },
    ],
    answer: 1,
    explain: "第一层学到的是各种方向的边缘、条纹和色块——和休伯尔、威泽尔在猫视觉皮层里看到的感受野惊人地相似。",
    review: { at: cue("f4") },
  },
  {
    id: "q-pixels",
    nodes: ["pixels"],
    kind: "choice",
    prompt: "为什么“直接比较像素数字”很难认出同一只猫？",
    options: [
      { text: "像素数字太少了" },
      { text: "猫稍微挪动、换个光线，大部分像素值都会改变" },
      { text: "计算机无法读取彩色图片" },
      { text: "像素值只有 0 和 1" },
    ],
    answer: 1,
    explain: "只往旁边挪 6 个像素，就有约七成的像素值变了。同一个概念对应着千变万化的数字。",
    review: { at: cue("p5"), lab: "pixel" },
  },
  {
    id: "q-features",
    nodes: ["features"],
    kind: "choice",
    prompt: "2012 年之前，HOG + SVM 这类方法的主要瓶颈是什么？",
    options: [{ text: "计算机太慢" }, { text: "特征要靠人来设计，人能想到的规则有限" }, { text: "没有分类器" }, { text: "图片分辨率太低" }],
    answer: 1,
    explain: "瓶颈在“人”。于是有了更大胆的想法：不告诉机器看什么，让它从数据里自己学。",
    review: { at: cue("h6") },
  },
  {
    id: "q-neuron",
    nodes: ["neuron"],
    kind: "choice",
    prompt: "一个神经元有输入 x = [1, 2]、权重 w = [0.5, −1]、偏置 b = 3。它的加权求和结果是？",
    options: [{ text: "0.5" }, { text: "1.5" }, { text: "4.5" }, { text: "−1.5" }],
    answer: 1,
    explain: "0.5×1 + (−1)×2 + 3 = 0.5 − 2 + 3 = 1.5。权重决定每个输入有多重要，偏置整体平移。",
    review: { at: cue("n2") },
  },
  {
    id: "q-descent",
    nodes: ["descent"],
    kind: "truefalse",
    prompt: "梯度下降的每一步，都沿着让损失下降最快的方向（最陡的下坡）走一小步。",
    options: TF,
    answer: 0,
    explain: "w ← w − η·∂L/∂w：沿负梯度方向走，步子大小由学习率 η 决定。在实验台里把学习率调大，看看会发生什么。",
    review: { at: cue("n6"), lab: "descent" },
  },
  {
    id: "q-dropout",
    nodes: ["training"],
    kind: "choice",
    prompt: "Dropout 在训练时做了什么？",
    options: [
      { text: "删掉一半训练图片" },
      { text: "随机让全连接层里一半的神经元暂时“休息”" },
      { text: "把学习率减半" },
      { text: "去掉一半网络层" },
    ],
    answer: 1,
    explain: "每个神经元都不能依赖特定伙伴，只能学更稳健的特征；相当于训练许多不同的小网络再集合起来。",
    review: { at: cue("k10") },
  },
  {
    id: "q-why-2012",
    nodes: ["training", "paradigm"],
    kind: "choice",
    prompt: "卷积网络 1989 年就有了，为什么直到 2012 年才爆发？",
    options: [
      { text: "2012 年才发明了反向传播" },
      { text: "大规模标注数据、GPU 算力和对抗过拟合的技巧同时到位" },
      { text: "以前的论文没人看" },
      { text: "2012 年的照片分辨率更高" },
    ],
    answer: 1,
    explain: "三把钥匙：ImageNet 的 120 万张训练图、两块 GTX 580 的并行算力、数据增强与 Dropout。",
    review: { at: cue("k1") },
  },
  {
    id: "q-paradigm",
    nodes: ["paradigm"],
    kind: "choice",
    prompt: "AlexNet 带来的最根本的改变是？",
    options: [
      { text: "发明了卷积" },
      { text: "从“人来设计特征”变成“人设计结构，让数据决定特征”" },
      { text: "第一次使用了 GPU 玩游戏" },
      { text: "证明了网络越小越好" },
    ],
    answer: 1,
    explain: "它的大多数零件都不是新发明，真正改变的是思维方式——以及“数据 × 算力 × 结构”这个至今有效的配方。",
    review: { at: cue("e3") },
  },
];

export const questionById = (id: string) => {
  const q = QUESTIONS.find((x) => x.id === id);
  if (!q) throw new Error(`unknown question ${id}`);
  return q;
};

/** Per-node score step: nodes covered by fewer questions move more per answer. */
export const NODE_STEPS: Record<NodeId, number> = (() => {
  const count: Record<NodeId, number> = {};
  QUESTIONS.forEach((q) => q.nodes.forEach((n) => (count[n] = (count[n] ?? 0) + 1)));
  return Object.fromEntries(Object.entries(count).map(([n, c]) => [n, stepFor(c)]));
})();

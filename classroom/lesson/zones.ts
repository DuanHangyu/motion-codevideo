import { cue, lineEnd } from "../../src/alexnet/lib/timeline";

export type Checkpoint = { id: string; at: number; title: string; questions: string[] };

/** Playback pauses itself here and shows quiz cards. */
export const CHECKPOINTS: Checkpoint[] = [
  { id: "cp-conv", at: lineEnd("c15") + 0.4, title: "小测 · 卷积", questions: ["q-fc-params", "q-share", "q-kernel-predict"] },
  { id: "cp-relu", at: lineEnd("r10") + 0.4, title: "小测 · 激活函数", questions: ["q-linear", "q-vanish", "q-relu-grad"] },
  { id: "cp-arch", at: lineEnd("a11") + 0.3, title: "小测 · 网络结构", questions: ["q-params-where", "q-pool", "q-first-layer"] },
  { id: "cp-final", at: lineEnd("e8") + 0.6, title: "结课测验", questions: ["q-pixels", "q-features", "q-neuron", "q-descent", "q-dropout", "q-why-2012", "q-paradigm"] },
];

/** Checkpoints crossed when playback moves from `prev` to `now` (forward playback only). */
export const crossed = (prev: number, now: number): Checkpoint[] =>
  now > prev && now - prev < 1.5 ? CHECKPOINTS.filter((c) => c.at > prev && c.at <= now) : [];

/** "Guess first, then watch": playback pauses at `at`, the student guesses, and the lesson reveals the answer at `reveal`. */
export type Prediction = { id: string; at: number; reveal: number; prompt: string; options: string[]; answer: number };

export const PREDICTIONS: Prediction[] = [
  { id: "pr-winner", at: cue("o4") - 0.15, reveal: cue("o4", "15.3"), prompt: "第二名是 26.2%。你猜，第一名的错误率是多少？", options: ["25.1%", "22.0%", "15.3%", "9.8%"], answer: 2 },
  { id: "pr-shift", at: cue("p5", "只要") - 0.1, reveal: cue("p5", "七成"), prompt: "把猫往旁边挪 6 个像素，你猜大约多少像素值会改变？", options: ["约 5%", "约 30%", "约 70%", "100%"], answer: 2 },
  { id: "pr-edge", at: lineEnd("c11") + 0.35, reveal: cue("c12", "勾勒"), prompt: "这个竖直边缘卷积核扫过整张猫图，会得到什么？", options: ["猫的轮廓和胡须亮起来", "整张图变模糊", "颜色全部反转", "只剩下猫的眼睛"], answer: 0 },
  { id: "pr-relu", at: cue("r9") - 0.1, reveal: cue("r9", "六倍"), prompt: "换成 ReLU 之后，训练速度是 tanh 的几倍？", options: ["1.5 倍", "2 倍", "6 倍", "60 倍"], answer: 2 },
  { id: "pr-cat", at: lineEnd("a9") + 0.4, reveal: cue("a10", "虎斑猫"), prompt: "训练好的 AlexNet 会怎么回答？", options: ["虎斑猫 · 91%", "虎斑猫 · 51%", "狐狸 · 60%", "老虎 · 80%"], answer: 0 },
  { id: "pr-resnet", at: cue("i3") - 0.1, reveal: cue("i3", "2015年"), prompt: "2015 年的冠军 ResNet 有多少层？", options: ["8 层", "22 层", "152 层", "1000 层"], answer: 2 },
];

/** Generic "playback stepped across a time" test shared by checkpoints and predictions. */
export const steppedOver = (at: number, prev: number, now: number) => now > prev && now - prev < 1.5 && at > prev && at <= now;

import { cue, lineEnd } from "../../src/alexnet/lib/timeline";

export type LabId = "pixel" | "descent" | "conv" | "activation" | "arch";

export type ExploreZone = { lab: LabId; from: number; to: number; title: string; hint: string };

/** Stretches of the lesson where pausing opens a hands-on lab. Times follow the voice-over via cue(). */
export const ZONES: ExploreZone[] = [
  { lab: "pixel", from: cue("p2"), to: lineEnd("p7"), title: "像素实验台", hint: "看看每个像素的数字，再把猫挪几个像素" },
  { lab: "descent", from: cue("n5"), to: lineEnd("n7"), title: "梯度下降实验台", hint: "自己选起点、调学习率，看小球怎么下山" },
  { lab: "conv", from: cue("c7"), to: lineEnd("c13"), title: "卷积实验台", hint: "拖动卷积核、改权重，实时看特征图" },
  { lab: "activation", from: cue("r1"), to: lineEnd("r9"), title: "激活函数实验台", hint: "对比 sigmoid / tanh / ReLU，亲眼看梯度消失" },
  { lab: "arch", from: cue("a1"), to: lineEnd("a8"), title: "AlexNet 结构实验台", hint: "旋转网络，点开每一层看参数和特征图" },
];

export const zoneAt = (t: number): ExploreZone | undefined => ZONES.find((z) => t >= z.from && t < z.to);

export const zoneFor = (lab: LabId): ExploreZone => {
  const z = ZONES.find((x) => x.lab === lab);
  if (!z) throw new Error(`no zone for lab ${lab}`);
  return z;
};

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

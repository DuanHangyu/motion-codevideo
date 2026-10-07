import { staticFile } from "remotion";
import raw from "../../../public/alexnet/data.json";

/** Real numbers exported from a pretrained AlexNet by ml/extract.py. */
export type Pred = { label: string; p: number };
export const DATA = raw as {
  rgb64: number[][];
  gray28: number[];
  eyePatch: number[][];
  shiftChanged: number;
  filterSaturation: number[];
  preds: Pred[];
  fmaps: Record<string, { channels: number; size: number }>;
  params: Record<string, number>;
  classes: string[];
};

export const asset = (name: string) => staticFile(`alexnet/${name}`);

/** Chinese names for the real top-5 predictions. */
export const PRED_ZH: Record<string, string> = {
  tabby: "虎斑猫",
  "Egyptian cat": "埃及猫",
  "tiger cat": "虎猫",
  lynx: "猞猁",
  "Persian cat": "波斯猫",
};

/** The 5×5 Sobel-style demo uses the 28×28 grey thumbnail; values 0..255. */
export const gray28 = (x: number, y: number) => DATA.gray28[Math.min(27, Math.max(0, y)) * 28 + Math.min(27, Math.max(0, x))];

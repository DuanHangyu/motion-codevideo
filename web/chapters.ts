import { FPS, SCENES, SceneName } from "../src/lib/timing";

export type Chapter = {
  id: SceneName;
  label: string;
  from: number; // frame
  to: number; // frame
  /** What the viewer can do while paused here; null = watch-only chapter. */
  hint: string | null;
};

const META: Record<SceneName, { label: string; hint: string | null }> = {
  opener: { label: "开场", hint: "点击任意一格，跳到那一帧" },
  genesis: { label: "点 · 线 · 面", hint: null },
  world: { label: "立体世界", hint: "拖拽旋转 · 滚轮缩放 · 右键平移 · 点击柱子激起波纹" },
  materials: { label: "光影材质", hint: "拖拽旋转 · 点击物体切换材质 · 点击左上角开关灯光" },
  code: { label: "只有代码", hint: null },
  cuts: { label: "节拍转场", hint: null },
  finale: { label: "署名", hint: "拖拽旋转 · 滚轮缩放 · 移动鼠标拨开粒子" },
};

/** The opener grid only exists on screen for part of the chapter. */
export const OPENER_GRID_FROM = Math.round(3.3 * FPS);

export const CHAPTERS: Chapter[] = (Object.keys(SCENES) as SceneName[]).map((id) => ({
  id,
  label: META[id].label,
  hint: META[id].hint,
  from: Math.round(SCENES[id][0] * FPS),
  to: Math.round(SCENES[id][1] * FPS),
}));

export const chapterAt = (frame: number): Chapter => CHAPTERS.find((c) => frame >= c.from && frame < c.to) ?? CHAPTERS[CHAPTERS.length - 1];

export const hintAt = (frame: number): string | null => {
  const c = chapterAt(frame);
  if (c.id === "opener" && frame < OPENER_GRID_FROM) return null;
  return c.hint;
};

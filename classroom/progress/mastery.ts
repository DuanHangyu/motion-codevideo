/** Pure mastery model: every node keeps a score in [0, 1]. No I/O here, so it is easy to test. */
export type NodeProgress = { score: number; watched: boolean; answered: number; correct: number; lastWrong: boolean };
export type Progress = Record<string, NodeProgress>;
export type Status = "new" | "learning" | "review" | "mastered";

export const WATCH_SCORE = 0.35;
export const RIGHT = 0.25;
export const WRONG = 0.15;
export const MASTERED = 0.8;

const EMPTY: NodeProgress = { score: 0, watched: false, answered: 0, correct: 0, lastWrong: false };
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export const get = (p: Progress, id: string): NodeProgress => p[id] ?? EMPTY;

export const markWatched = (p: Progress, id: string): Progress => {
  const n = get(p, id);
  if (n.watched) return p;
  // additive, so the result does not depend on whether the quiz or the end of the segment came first
  return { ...p, [id]: { ...n, watched: true, score: clamp01(n.score + WATCH_SCORE) } };
};

/**
 * How much one answer moves a node. A node checked by few questions moves more per answer, so that
 * watching its segment and answering its questions correctly is always enough to master it.
 */
export const stepFor = (questionCount: number) => Math.max(RIGHT, (1 - WATCH_SCORE) / Math.max(1, questionCount));

export const recordAnswer = (p: Progress, ids: string[], isCorrect: boolean, steps: Record<string, number> = {}): Progress =>
  ids.reduce<Progress>((acc, id) => {
    const n = get(acc, id);
    const step = steps[id] ?? RIGHT;
    return {
      ...acc,
      [id]: {
        ...n,
        answered: n.answered + 1,
        correct: n.correct + (isCorrect ? 1 : 0),
        lastWrong: !isCorrect,
        score: clamp01(n.score + (isCorrect ? step : -Math.min(step, WRONG))),
      },
    };
  }, p);

export const status = (n: NodeProgress): Status => {
  if (n.score >= MASTERED) return "mastered";
  if (n.lastWrong) return "review";
  if (n.score > 0 || n.watched) return "learning";
  return "new";
};

export const STATUS_LABEL: Record<Status, string> = { new: "未学习", learning: "学习中", review: "待复习", mastered: "已掌握" };

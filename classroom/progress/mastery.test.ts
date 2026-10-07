import { describe, expect, it } from "vitest";
import { MASTERED, RIGHT, WATCH_SCORE, get, markWatched, recordAnswer, status, stepFor } from "./mastery";
import { NODE_STEPS, QUESTIONS } from "../quiz/questions";
import { LEARNABLE } from "../map/graph";

describe("mastery", () => {
  it("starts new and becomes learning after watching", () => {
    expect(status(get({}, "conv"))).toBe("new");
    const p = markWatched({}, "conv");
    expect(get(p, "conv").score).toBe(WATCH_SCORE);
    expect(status(get(p, "conv"))).toBe("learning");
  });

  it("does not mutate the previous state", () => {
    const before = {};
    markWatched(before, "conv");
    recordAnswer(before, ["conv"], true);
    expect(before).toEqual({});
  });

  it("watching twice does not add score twice", () => {
    const p = markWatched(markWatched({}, "conv"), "conv");
    expect(get(p, "conv").score).toBe(WATCH_SCORE);
  });

  it("reaches mastered after watching and enough correct answers", () => {
    let p = markWatched({}, "conv");
    const needed = Math.ceil((MASTERED - WATCH_SCORE) / RIGHT);
    for (let i = 0; i < needed; i++) p = recordAnswer(p, ["conv"], true);
    expect(status(get(p, "conv"))).toBe("mastered");
  });

  it("watching and answering give the same score in either order", () => {
    const a = recordAnswer(markWatched({}, "conv"), ["conv"], true);
    const b = markWatched(recordAnswer({}, ["conv"], true), "conv");
    expect(get(a, "conv").score).toBeCloseTo(get(b, "conv").score);
  });

  it("a wrong answer marks the node for review and never goes below 0", () => {
    const p = recordAnswer({}, ["conv", "relu"], false);
    expect(get(p, "conv").score).toBe(0);
    expect(status(get(p, "relu"))).toBe("review");
  });

  it("every learnable node can be mastered by watching it and answering its questions correctly", () => {
    for (const node of LEARNABLE) {
      let p = markWatched({}, node.id);
      for (const q of QUESTIONS.filter((x) => x.nodes.includes(node.id))) p = recordAnswer(p, q.nodes, true, NODE_STEPS);
      expect(status(get(p, node.id)), node.id).toBe("mastered");
    }
  });

  it("nodes with few questions move more per answer", () => {
    expect(stepFor(1)).toBeGreaterThan(stepFor(3));
    expect(stepFor(10)).toBe(RIGHT);
  });
});

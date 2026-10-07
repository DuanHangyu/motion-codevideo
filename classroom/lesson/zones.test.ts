import { describe, expect, it } from "vitest";
import { CHECKPOINTS, PREDICTIONS, crossed } from "./zones";
import { WORLDS } from "../../src/alexnet/lib/worlds";
import { LEARNABLE, nodeAt, watchedAt } from "../map/graph";
import { QUESTIONS, questionById } from "../quiz/questions";
import { DURATION_SEC } from "../../src/alexnet/lib/timeline";

describe("worlds", () => {
  it("are ordered, non-overlapping, at least 3 s long and inside the lesson", () => {
    WORLDS.forEach((w, i) => {
      expect(w.to - w.from, w.id).toBeGreaterThan(3);
      if (i) expect(w.from, w.id).toBeGreaterThanOrEqual(WORLDS[i - 1].to);
    });
    expect(WORLDS[WORLDS.length - 1].to).toBeLessThan(DURATION_SEC);
  });

  it("count toward learnable nodes", () => {
    const ids = new Set(LEARNABLE.map((n) => n.id));
    WORLDS.forEach((w) => expect(ids.has(w.node), w.id).toBe(true));
  });
});

describe("predictions", () => {
  it("pause before they are revealed, with a valid answer", () => {
    PREDICTIONS.forEach((p) => {
      expect(p.reveal, p.id).toBeGreaterThan(p.at);
      expect(p.answer).toBeLessThan(p.options.length);
    });
  });
});

describe("checkpoints", () => {
  it("fire once when playback steps across them", () => {
    const c = CHECKPOINTS[0];
    expect(crossed(c.at - 0.05, c.at + 0.02).map((x) => x.id)).toEqual([c.id]);
    expect(crossed(c.at + 0.02, c.at + 0.05)).toEqual([]);
  });

  it("do not fire on large seeks or backwards", () => {
    const c = CHECKPOINTS[0];
    expect(crossed(c.at - 30, c.at + 1)).toEqual([]);
    expect(crossed(c.at + 0.1, c.at - 0.1)).toEqual([]);
  });

  it("only reference existing questions, all ending before the video ends", () => {
    CHECKPOINTS.forEach((c) => {
      c.questions.forEach((q) => expect(() => questionById(q)).not.toThrow());
      expect(c.at).toBeLessThan(DURATION_SEC);
    });
  });
});

describe("knowledge graph", () => {
  it("every question targets a learnable node and every learnable node has a question", () => {
    const ids = new Set(LEARNABLE.map((n) => n.id));
    QUESTIONS.forEach((q) => q.nodes.forEach((n) => expect(ids.has(n)).toBe(true)));
    LEARNABLE.forEach((n) => expect(QUESTIONS.some((q) => q.nodes.includes(n.id))).toBe(true));
  });

  it("a node is marked watched before any quiz in its segment pauses playback", () => {
    for (const n of LEARNABLE) {
      const w = watchedAt(n);
      expect(w).toBeGreaterThan(n.span![0]);
      CHECKPOINTS.filter((c) => c.at > n.span![0] && c.at <= n.span![1]).forEach((c) => expect(w, `${n.id} vs ${c.id}`).toBeLessThan(c.at));
    }
  });

  it("nodeAt maps lesson time to the node being taught", () => {
    const conv = LEARNABLE.find((n) => n.id === "conv")!;
    expect(nodeAt(conv.span![0] + 1)?.id).toBe("conv");
  });
});

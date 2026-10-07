import { describe, expect, it } from "vitest";
import { CHECKPOINTS, ZONES, crossed, zoneAt } from "./zones";
import { LEARNABLE, nodeAt, watchedAt } from "../map/graph";
import { QUESTIONS, questionById } from "../quiz/questions";
import { DURATION_SEC } from "../../src/alexnet/lib/timeline";

describe("explore zones", () => {
  it("are ordered, non-overlapping and inside the lesson", () => {
    ZONES.forEach((z, i) => {
      expect(z.to).toBeGreaterThan(z.from);
      if (i) expect(z.from).toBeGreaterThanOrEqual(ZONES[i - 1].to);
    });
    expect(ZONES[ZONES.length - 1].to).toBeLessThan(DURATION_SEC);
  });

  it("zoneAt finds the zone containing a time and nothing outside", () => {
    const z = ZONES[2];
    expect(zoneAt((z.from + z.to) / 2)?.lab).toBe(z.lab);
    expect(zoneAt(0)).toBeUndefined();
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

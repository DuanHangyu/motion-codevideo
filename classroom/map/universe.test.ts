import { describe, expect, it } from "vitest";
import { LEARNABLE } from "./graph";
import { CHAPTERS, chapterById, chapterOf } from "./universe";

describe("knowledge universe", () => {
  it("chapter and sub-node ids are unique across the whole universe", () => {
    const ids = [...CHAPTERS.map((c) => c.id), ...CHAPTERS.flatMap((c) => c.children.map((n) => n.id))];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("chapter prerequisites exist and form no cycle", () => {
    const seen = new Set<string>();
    const visit = (id: string, path: string[]) => {
      expect(path, `cycle through ${id}`).not.toContain(id);
      const c = chapterById(id);
      expect(c, `unknown chapter ${id}`).toBeDefined();
      if (seen.has(id)) return;
      c!.needs.forEach((n) => visit(n, [...path, id]));
      seen.add(id);
    };
    CHAPTERS.forEach((c) => visit(c.id, []));
  });

  it("sub-node prerequisites stay inside their own chapter", () => {
    for (const c of CHAPTERS) {
      const local = new Set(c.children.map((n) => n.id));
      c.children.forEach((n) => n.needs.forEach((id) => expect(local.has(id), `${n.id} needs ${id}`).toBe(true)));
    }
  });

  it("the AlexNet chapter holds exactly the sub-nodes its lesson teaches", () => {
    const alexnet = chapterById("alexnet")!;
    expect(alexnet.lesson).toBe("alexnet");
    expect(alexnet.children.map((n) => n.id)).toEqual(LEARNABLE.map((n) => n.id));
    LEARNABLE.forEach((n) => expect(chapterOf(n.id)?.id).toBe("alexnet"));
  });

  it("chapters without a lesson list their planned topics but nothing learnable", () => {
    CHAPTERS.filter((c) => !c.lesson).forEach((c) => {
      expect(c.children.length).toBeGreaterThanOrEqual(3);
      expect(c.children.every((n) => !n.span)).toBe(true);
    });
  });
});

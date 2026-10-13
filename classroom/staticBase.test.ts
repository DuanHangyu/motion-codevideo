import { describe, expect, it } from "vitest";
import { staticBaseFor } from "./staticBase";

describe("staticBaseFor", () => {
  it("is empty when the classroom is served from the site root", () => {
    expect(staticBaseFor("http://127.0.0.1:5180/#/map/alexnet")).toBe("");
  });

  it("uses the directory the classroom is deployed under", () => {
    expect(staticBaseFor("https://47.104.158.24:8443/ai-course-demo/#/lesson/alexnet?t=326")).toBe(
      "/ai-course-demo",
    );
    expect(staticBaseFor("https://example.test/a/b/index.html?x=1#/map")).toBe("/a/b");
  });
});

import { describe, expect, it } from "vitest";
import { createTutorReply, CHAT_PROMPTS } from "./lessonChat";
import { LEARNABLE } from "../map/graph";

describe("offline lesson tutor", () => {
  it("ignores empty or whitespace-only questions", () => {
    expect(createTutorReply("   ", LEARNABLE[0])).toBe("");
  });
  it("offers explanation, example and quiz shortcuts", () => {
    expect(CHAT_PROMPTS).toEqual(["解释当前知识点", "举个生活例子", "出一道小测"]);
  });
  it.each(LEARNABLE)("explains $title using the selected lesson context", (node) => {
    expect(createTutorReply(CHAT_PROMPTS[0], node)).toContain(node.title);
    expect(createTutorReply(CHAT_PROMPTS[0], node).length).toBeGreaterThan(70);
  });
  it.each(LEARNABLE)("has an example and a question for $title", (node) => {
    expect(createTutorReply(CHAT_PROMPTS[1], node)).toContain("例子");
    expect(createTutorReply(CHAT_PROMPTS[2], node)).toContain("？");
    expect(createTutorReply(CHAT_PROMPTS[2], node)).not.toEqual(createTutorReply(CHAT_PROMPTS[0], node));
  });
  it("falls back safely when no knowledge node is active", () => {
    expect(createTutorReply("帮我总结", undefined)).toContain("AlexNet");
  });
  it("treats arbitrary input as plain text and returns an offline contextual reply", () => {
    const reply = createTutorReply("<script>alert(1)</script>", LEARNABLE[0]);
    expect(reply).toContain(LEARNABLE[0].goal);
    expect(reply).not.toContain("<script>");
  });
});

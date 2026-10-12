import { describe, expect, it } from "vitest";
import { createTutorReply, CHAT_PROMPTS } from "./lessonChat";
import { LEARNABLE } from "../map/graph";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LessonChat } from "./TutorPanel";

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
  it("supports an unknown future node without crashing", () => {
    const future = { ...LEARNABLE[0], id: "future", title: "未来课程", goal: "理解新的知识" };
    for (const question of CHAT_PROMPTS) expect(createTutorReply(question, future)).toContain("未来课程");
  });
  it("renders the tutor context, mock disclosure and an initially disabled send button", () => {
    const html = renderToStaticMarkup(createElement(LessonChat, { node: LEARNABLE[0], onClose: () => {} }));
    expect(html).toContain(LEARNABLE[0].title);
    expect(html).toContain("模拟回复 · 未连接模型");
    expect(html).toContain('aria-label="发送消息" disabled=""');
    expect(html).toContain('role="log"');
    expect(html).toMatch(/maxlength="2000"/i);
  });
  it("renders the general lesson introduction when no node is selected", () => {
    const html = renderToStaticMarkup(createElement(LessonChat, { onClose: () => {} }));
    expect(html).toContain("AlexNet · 深度学习入门");
  });
});

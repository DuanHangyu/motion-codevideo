import { FormEvent, useEffect, useRef, useState } from "react";
import type { KnowledgeNode } from "../map/graph";
import { CHAT_PROMPTS, createTutorReply } from "./lessonChat";

type Message = { id: number; role: "user" | "assistant"; text: string; topic?: string };

export const LessonChat = ({ node, onClose, hidden = false }: { node?: KnowledgeNode; onClose: () => void; hidden?: boolean }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const timer = useRef<number | null>(null);
  const sequence = useRef(0);
  const scroll = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);
  useEffect(() => {
    if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [messages, pending]);

  const send = (text = draft) => {
    const question = text.trim();
    if (!question || timer.current !== null) return;
    const reply = createTutorReply(question, node);
    setMessages((ms) => [...ms, { id: ++sequence.current, role: "user", text: question, topic: node?.title }]);
    setDraft("");
    setPending(true);
    timer.current = window.setTimeout(() => {
      setMessages((ms) => [...ms, { id: ++sequence.current, role: "assistant", text: reply }]);
      timer.current = null;
      setPending(false);
    }, 650);
  };
  const reset = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    setPending(false);
    setMessages([]);
    setDraft("");
    input.current?.focus();
  };
  const submit = (e: FormEvent) => { e.preventDefault(); send(); };

  return (
    <aside className="lesson-chat" aria-label="AI 学习助手" aria-hidden={hidden}>
      <header className="chat-header">
        <span className="chat-logo" aria-hidden="true">P<span>✦</span></span>
        <div className="chat-brand"><b>PolyPilot</b><span>你的 AI 学习搭子</span></div>
        <button className="chat-icon" onClick={reset} aria-label="新建对话" title="新建对话">＋</button>
        <button className="chat-icon" onClick={onClose} aria-label="收起 AI 助手" title="收起 AI 助手">×</button>
      </header>
      <div className="chat-demo"><i />前端演示<span>模拟回复 · 未连接模型</span></div>
      <div className="chat-context"><span>正在学习</span><b>{node?.title ?? "AlexNet · 深度学习入门"}</b></div>
      <div className="chat-scroll" ref={scroll}>
        {messages.length === 0 && (
          <div className="chat-welcome">
            <div className="chat-eyebrow">LEARN TOGETHER</div>
            <h3>不是只看完，<br />而是真的学懂<span>。</span></h3>
            <p>你好，我是 PolyPilot。看课时遇到不懂的地方，就在这里问我，我们一起把问题拆开。</p>
            <div className="chat-feature-title">✦ 这堂课，你可以这样学</div>
            <ul>
              <li>左侧选知识点，按自己的节奏学习</li>
              <li>暂停画面，走进去动手探索</li>
              <li>用生活例子理解抽象概念</li>
              <li>做一道小测，检查是否真的理解</li>
            </ul>
            <div className="chat-goal"><span>这一节的小目标</span><p>{node?.goal ?? "理解 AlexNet 如何从数据中学会识别图像。"}</p></div>
            <p className="chat-welcome-note">不用担心问得太基础。学习，从一个好奇的问题开始。</p>
          </div>
        )}
        <div className="chat-messages" role="log" aria-label="对话记录" aria-live="polite" aria-relevant="additions">
          {messages.map((message) => (
            <div className={`chat-message ${message.role}`} key={message.id}>
              {message.role === "assistant" && <div className="chat-speaker"><span>✦</span> PolyPilot <small>模拟回复</small></div>}
              {message.role === "user" && message.topic && <div className="chat-message-topic">关于「{message.topic}」</div>}
              <div className="chat-bubble">{message.text}</div>
            </div>
          ))}
          {pending && <div className="chat-thinking" role="status"><i /><i /><i /><span>正在组织模拟回复…</span></div>}
        </div>
      </div>
      <div className="chat-bottom">
        <div className="chat-prompts">
          {CHAT_PROMPTS.map((prompt) => <button key={prompt} onClick={() => send(prompt)} disabled={pending}>{prompt}</button>)}
        </div>
        <form className="chat-composer" onSubmit={submit}>
          <textarea ref={input} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={2000} aria-label="向 AI 学习助手提问" placeholder="有什么想问的，尽管告诉 PolyPilot" rows={3} onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); }
          }} />
          <div className="chat-composer-tools"><span>✦ 课堂助手 <small>· Demo</small></span><button type="submit" aria-label="发送消息" disabled={!draft.trim() || pending}>↑</button></div>
        </form>
        <div className="chat-disclaimer">Enter 发送 · Shift + Enter 换行<br />当前为模拟对话，内容仅作界面演示</div>
      </div>
    </aside>
  );
};

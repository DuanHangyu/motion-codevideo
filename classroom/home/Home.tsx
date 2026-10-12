import { FormEvent, useEffect, useState } from "react";
import { go } from "../router";
import { useProgress } from "../progress/store";
import { get } from "../progress/mastery";
import { Icon, Prefs } from "../shell/TopNav";
import { LEARNABLE, TOPIC } from "../map/graph";

const EXAMPLES = ["从零学 Python，30 分钟写出第一个程序", "用白板给我讲解傅里叶变换", "阿瓦隆桌游怎么玩", "帮我制定本周的学习计划", "解释一下什么是 Transformer", "总结这篇论文的核心观点"];

const DOMAINS = ["深度学习", "编程入门", "数学", "通识"];

const STEPS = ["理解你的学习目标", "拆分大节点与知识点", "建立先修关系", "匹配虚拟课堂"];

/** MVP: only the deep-learning course exists, so anything about it is accepted; everything else is told so plainly. */
const isSupported = (q: string) => /深度|神经|卷积|cnn|alexnet|deep|机器学习|ai|人工智能|transformer|注意力|大模型|llm/i.test(q);

type Course = { id: string; title: string; desc: string; date: string; lessons: number; tone: string; art: JSX.Element; open?: boolean };

const ART = {
  python: (
    <svg viewBox="0 0 64 64" width="52" height="52">
      <path d="M31.5 6c-12.8 0-12 5.6-12 5.6v5.8h12.2v1.7H14.6S6 18.1 6 31.2s7.5 12.6 7.5 12.6H18v-6.1s-.2-7.5 7.4-7.5h12.6s7.1.1 7.1-6.9V12.1S46.2 6 31.5 6zm-6.9 4a2.3 2.3 0 1 1 0 4.5 2.3 2.3 0 0 1 0-4.5z" fill="#3776ab" />
      <path d="M32.5 58c12.8 0 12-5.6 12-5.6v-5.8H32.3v-1.7h17.1S58 45.9 58 32.8 50.5 20.2 50.5 20.2H46v6.1s.2 7.5-7.4 7.5H26s-7.1-.1-7.1 6.9v11.2S17.8 58 32.5 58zm6.9-4a2.3 2.3 0 1 1 0-4.5 2.3 2.3 0 0 1 0 4.5z" fill="#ffd43b" />
    </svg>
  ),
  network: (
    <svg viewBox="0 0 64 64" width="54" height="54" fill="none" stroke="#a78bfa" strokeWidth="2">
      {[
        [12, 18],
        [12, 32],
        [12, 46],
        [32, 12],
        [32, 26],
        [32, 40],
        [32, 52],
        [52, 24],
        [52, 40],
      ].map(([x, y], i, a) => (
        <g key={i}>
          {x < 52 && a.filter(([x2]) => x2 === x + 20).map(([x2, y2], j) => <line key={j} x1={x} y1={y} x2={x2} y2={y2} strokeOpacity="0.45" strokeWidth="1.2" />)}
          <circle cx={x} cy={y} r="4" fill="#c4b5fd" stroke="#8b5cf6" />
        </g>
      ))}
    </svg>
  ),
  doc: (
    <svg viewBox="0 0 64 64" width="48" height="48">
      <path d="M16 6h22l12 12v36a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4z" fill="#34d399" />
      <path d="M38 6v8a4 4 0 0 0 4 4h8z" fill="#a7f3d0" />
      <path d="M20 30h20M20 38h20M20 46h12" stroke="#ecfdf5" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 64 64" width="52" height="52">
      <rect x="10" y="38" width="10" height="16" rx="2" fill="#fb923c" />
      <rect x="27" y="26" width="10" height="28" rx="2" fill="#fb923c" />
      <rect x="44" y="12" width="10" height="42" rx="2" fill="#fb923c" />
    </svg>
  ),
};

export const Home = () => {
  const [q, setQ] = useState("");
  const [domain, setDomain] = useState(DOMAINS[0]);
  const [note, setNote] = useState("");
  const [generating, setGenerating] = useState(false);
  const progress = useProgress();
  const watched = LEARNABLE.filter((n) => get(progress, n.id).watched || get(progress, n.id).answered > 0).length;

  useEffect(() => {
    if (!generating) return;
    const id = window.setTimeout(() => go("/map"), STEPS.length * 420 + 500);
    return () => window.clearTimeout(id);
  }, [generating]);

  const submit = (e?: FormEvent, text = q) => {
    e?.preventDefault();
    const t = text.trim() || domain;
    if (!isSupported(t) && !(domain === "深度学习" && !text.trim())) return setNote(`当前版本先开放了「${TOPIC.title}」，“${t}”的课程正在路上。`);
    setNote("");
    setGenerating(true);
  };

  const courses: Course[] = [
    { id: "dl", title: "深度学习基础", desc: "理解神经网络的核心原理与典型模型", date: "2026-10-08", lessons: LEARNABLE.length, tone: "violet", art: ART.network, open: true },
    { id: "py", title: "Python 入门教程", desc: "从基础语法到项目实践，零基础也能轻松上手", date: "2026-09-07", lessons: 12, tone: "blue", art: ART.python },
    { id: "paper", title: "论文阅读与写作", desc: "从阅读方法到论文结构，系统提升科研能力", date: "2026-09-03", lessons: 6, tone: "green", art: ART.doc },
    { id: "data", title: "数据分析实战", desc: "使用真实数据，掌握数据分析全流程", date: "2026-08-28", lessons: 10, tone: "orange", art: ART.chart },
  ];

  return (
    <main className="light home2">
      <div className="home2-prefs">
        <Prefs />
      </div>
      <section className="home2-hero">
        <div className="hero-art" aria-hidden>
          <span className="spark s1">✦</span>
          <span className="spark s2">✦</span>
          <span className="spark s3">✦</span>
          <div className="glass g1" />
          <div className="glass g2" />
          <div className="glass g3">
            <svg viewBox="0 0 24 24" width="40" height="40" fill="#2563eb">
              <path d="M12 3L1 8.5l11 5.5 9-4.5V16h2V8.5z" />
              <path d="M5 12.2v4.3c0 1.9 3.1 3.5 7 3.5s7-1.6 7-3.5v-4.3l-7 3.5z" />
            </svg>
          </div>
        </div>
        <h1>PolyPilot Learning Space</h1>
        <p className="home2-sub">用 AI 陪你探索知识，让学习更高效、更有趣</p>

        <form className={`ask2${generating ? " busy" : ""}`} onSubmit={submit}>
          <span className="ico">{Icon.search}</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="你想学懂什么?" disabled={generating} aria-label="学习目标" />
          <button type="button" className="clip" title="上传资料（即将支持）">
            {Icon.clip}
          </button>
          <select value={domain} onChange={(e) => setDomain(e.target.value)} disabled={generating} aria-label="领域">
            {DOMAINS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <button className="send" type="submit" disabled={generating} aria-label="生成课程">
            {Icon.send}
          </button>
        </form>

        {generating ? (
          <div className="gen2">
            {STEPS.map((s, i) => (
              <div key={s} style={{ animationDelay: `${i * 0.42}s` }}>
                <i />
                {s}
              </div>
            ))}
          </div>
        ) : (
          <>
            {note && <div className="home2-note">{note}</div>}
            <div className="examples">
              <div className="lbl">试试这些例子：</div>
              <div className="chips">
                {EXAMPLES.map((x) => (
                  <button key={x} type="button" onClick={() => setQ(x)}>
                    {x}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </section>

      <section className="history">
        <div className="history-head">
          <span>{Icon.clock}我的 AI 生成课程记录</span>
          <button onClick={() => go("/map")}>查看全部 →</button>
        </div>
        <div className="course-grid">
          {courses.map((c) => (
            <button
              key={c.id}
              className={`course tone-${c.tone}${c.open ? "" : " sample"}`}
              onClick={() => (c.open ? go("/map") : setNote(`「${c.title}」是示例记录，当前版本先开放了「${TOPIC.title}」。`))}
            >
              <div className="art">
                {c.art}
                <span className="more">{Icon.dots}</span>
              </div>
              <div className="info">
                <h3>{c.title}</h3>
                <p>{c.desc}</p>
                <div className="meta">
                  <span>{c.date}</span>
                  <span className="badge">{c.open && watched ? `${watched}/${c.lessons} 节课` : `${c.lessons} 节课`}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
};

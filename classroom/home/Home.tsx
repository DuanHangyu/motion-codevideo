import { FormEvent, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { go } from "../router";
import { Starfield } from "../Starfield";
import { TOPIC } from "../map/graph";

const SUGGESTIONS = [
  { text: "深度学习入门", ok: true },
  { text: "卷积神经网络", ok: true },
  { text: "Transformer", ok: false },
  { text: "强化学习", ok: false },
];

const STEPS = ["理解你的学习目标", "铺开 11 个大节点：从 AlexNet 到大语言模型", "把每个大节点拆成子知识点", "建立先修关系，匹配虚拟课堂"];

/** MVP: only the deep-learning map exists, so anything mentioning it is accepted; everything else is told so plainly. */
const isSupported = (q: string) => /深度|神经|卷积|cnn|alexnet|deep|机器学习|ai|人工智能/i.test(q);

export const Home = () => {
  const [q, setQ] = useState(TOPIC.title);
  const [note, setNote] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!generating) return;
    const id = window.setTimeout(() => go("/map"), STEPS.length * 450 + 500);
    return () => window.clearTimeout(id);
  }, [generating]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const text = q.trim();
    if (!text) return setNote("先写下你想学的东西");
    if (!isSupported(text)) return setNote(`MVP 版本暂时只开放“${TOPIC.title}”，“${text}”正在路上`);
    setNote("");
    setGenerating(true);
  };

  return (
    <main className="home">
      <div className="home-canvas">
        <Canvas camera={{ position: [0, 0, 30], fov: 50 }} dpr={[1, 2]}>
          <color attach="background" args={["#04060c"]} />
          <Starfield />
        </Canvas>
      </div>
      <div className="home-inner">
        <div className="mono home-eyebrow">知识宇宙 · 可暂停探索的虚拟课堂</div>
        <h1>
          想学什么，就<em>走进去</em>
        </h1>
        <p className="home-sub">输入一个学习目标，生成一片知识宇宙：每个大节点是一个改变了这门学科的模型或思想，点开是一组子知识点和一堂有声有色的虚拟课堂——随时暂停，就能走进画面里动手探索。</p>
        <form className="ask" onSubmit={submit}>
          <span className="ask-prefix">我想学</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} disabled={generating} aria-label="学习目标" />
          <button className="btn primary" type="submit" disabled={generating}>
            生成知识地图 →
          </button>
        </form>
        {!generating && (
          <div className="suggest">
            {SUGGESTIONS.map((s) => (
              <button key={s.text} className={s.ok ? "" : "soon"} onClick={() => setQ(s.text)} type="button">
                {s.text}
              </button>
            ))}
          </div>
        )}
        <div className="home-note">{note}</div>
        {generating ? (
          <div className="gen">
            {STEPS.map((s, i) => (
              <div key={s} className="gen-step" style={{ animationDelay: `${i * 0.45}s` }}>
                <b>{String(i + 1).padStart(2, "0")}</b> {s}
              </div>
            ))}
          </div>
        ) : (
          <div className="home-features">
            <span>
              <b>知识宇宙</b>大节点 · 子知识点
            </span>
            <span>
              <b>虚拟课堂</b>配音 · 动画 · 3D
            </span>
            <span>
              <b>暂停即探索</b>走进画面动手做
            </span>
            <span>
              <b>卡片测验</b>掌握度点亮地图
            </span>
          </div>
        )}
      </div>
    </main>
  );
};

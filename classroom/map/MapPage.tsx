import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { go, useRoute } from "../router";
import { useProgress } from "../progress/store";
import { Progress, STATUS_LABEL, Status, get, status } from "../progress/mastery";
import { KnowledgeNode, LEARNABLE, TOPIC } from "./graph";
import { CHAPTERS, Chapter, OPEN_CHAPTERS, SUBNODE_COUNT, TRACKS, chapterById } from "./universe";
import { STATUS_COLOR, Universe3D, nodeStatus } from "./Universe3D";

export { STATUS_COLOR };

/** Inside a chapter: its first learnable sub-node that is not mastered yet. */
const recommendNode = (p: Progress, c: Chapter) => c.children.find((n) => n.span && status(get(p, n.id)) !== "mastered") ?? null;
/** In the universe: the first open chapter with work left; once all are done, the first chapter whose prerequisites are open. */
const recommendChapter = (p: Progress) =>
  OPEN_CHAPTERS.find((c) => recommendNode(p, c)) ?? CHAPTERS.find((c) => !c.lesson && c.needs.every((id) => chapterById(id)?.lesson)) ?? CHAPTERS[0];

const titleOf = (c: Chapter, id: string) => c.children.find((n) => n.id === id)?.title ?? id;

/* ── cards ───────────────────────────────────────────────────────────── */
const NodeCard = ({ chapter, node, progress, onClose }: { chapter: Chapter; node: KnowledgeNode; progress: Progress; onClose: () => void }) => {
  const st = nodeStatus(progress, node);
  const p = get(progress, node.id);
  if (st === "locked")
    return (
      <aside className="panel node-card">
        <div className="mono" style={{ color: TRACKS[chapter.track].color }}>
          {chapter.title} · {node.en}
        </div>
        <h2>{node.title}</h2>
        <p className="goal">「{chapter.title}」的虚拟课堂还在制作中，这是它将要讲到的知识点之一。</p>
        {node.needs.length > 0 && (
          <div className="needs">
            {node.needs.map((id) => (
              <span key={id}>先修 · {titleOf(chapter, id)}</span>
            ))}
          </div>
        )}
        <div className="actions">
          <button className="btn ghost small" onClick={onClose}>
            ← 返回 {chapter.title}
          </button>
        </div>
      </aside>
    );
  const mins = Math.round((node.span![1] - node.span![0]) / 60);
  return (
    <aside className="panel node-card">
      <div className="mono" style={{ color: STATUS_COLOR[st] }}>
        {chapter.title} · {node.en}
      </div>
      <h2>{node.title}</h2>
      <span className={`status-chip status-${st}`}>{STATUS_LABEL[st]}</span>
      <p className="goal">学完你将能：{node.goal}</p>
      <div className="row">
        <span>掌握度</span>
        <span>{Math.round(p.score * 100)}%</span>
      </div>
      <div className="meter">
        <div style={{ width: `${p.score * 100}%`, background: STATUS_COLOR[st] }} />
      </div>
      <div className="row">
        <span>课堂片段约 {Math.max(1, mins)} 分钟</span>
        <span>
          答题 {p.correct}/{p.answered}
        </span>
      </div>
      {node.needs.length > 0 && (
        <div className="needs">
          {node.needs.map((id) => (
            <span key={id}>先修 · {titleOf(chapter, id)}</span>
          ))}
        </div>
      )}
      <div className="actions">
        <button className="btn primary" onClick={() => go(`/lesson/${chapter.lesson}?node=${node.id}`)}>
          {st === "new" ? "进入课堂" : st === "review" ? "去复习" : "继续学习"} →
        </button>
        <button className="btn ghost small" onClick={onClose}>
          ← 返回 {chapter.title}
        </button>
      </div>
    </aside>
  );
};

const ChapterCard = ({ chapter, progress, onPickNode }: { chapter: Chapter; progress: Progress; onPickNode: (id: string) => void }) => {
  const color = TRACKS[chapter.track].color;
  const next = recommendNode(progress, chapter);
  const learnable = chapter.children.filter((n) => n.span);
  const mastered = learnable.filter((n) => status(get(progress, n.id)) === "mastered").length;
  const started = learnable.some((n) => status(get(progress, n.id)) !== "new");
  return (
    <aside className="panel node-card chapter-card" style={{ ["--track" as string]: color }}>
      <div className="mono" style={{ color }}>
        {TRACKS[chapter.track].title} · {chapter.year}
      </div>
      <h2>{chapter.title}</h2>
      <p className="goal">{chapter.blurb}</p>
      {chapter.needs.length > 0 && (
        <div className="needs">
          {chapter.needs.map((id) => (
            <button key={id} onClick={() => go(`/map/${id}`)}>
              先修 · {chapterById(id)!.title}
            </button>
          ))}
        </div>
      )}
      <div className="row">
        <span>{chapter.children.length} 个子知识点</span>
        <span>{chapter.lesson ? `已掌握 ${mastered}/${learnable.length}` : "课堂制作中"}</span>
      </div>
      <ol className="topic-list">
        {chapter.children.map((n) => {
          const st = nodeStatus(progress, n);
          return (
            <li key={n.id}>
              <button onClick={() => onPickNode(n.id)} className={st === "locked" ? "locked" : ""}>
                <i style={{ background: st === "locked" ? "transparent" : STATUS_COLOR[st], borderColor: st === "locked" ? color : "transparent" }} />
                {n.title}
                {n.id === next?.id && <em>下一步</em>}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="actions">
        {chapter.lesson ? (
          <button className="btn primary" onClick={() => go(next ? `/lesson/${chapter.lesson}?node=${next.id}` : `/lesson/${chapter.lesson}`)}>
            {!next ? "▶ 再上一遍" : started ? `继续：${next.title}` : "▶ 进入虚拟课堂"} →
          </button>
        ) : (
          <button className="btn small" disabled>
            课堂制作中
          </button>
        )}
        <button className="btn ghost small" onClick={() => go("/map")}>
          ← 知识宇宙
        </button>
      </div>
    </aside>
  );
};

/* ── page ────────────────────────────────────────────────────────────── */
export const MapPage = () => {
  const route = useRoute();
  const focus = chapterById(route.path[1]);
  const progress = useProgress();
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => setSelected(null), [focus]);

  const nextChapter = recommendChapter(progress);
  const nextNode = focus ? recommendNode(progress, focus) : null;
  const mastered = LEARNABLE.filter((n) => status(get(progress, n.id)) === "mastered").length;
  const avg = LEARNABLE.reduce((s, n) => s + get(progress, n.id).score, 0) / LEARNABLE.length;
  const selectedNode = focus && selected ? focus.children.find((n) => n.id === selected) : undefined;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (selected) setSelected(null);
      else if (focus) go("/map");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, focus]);

  return (
    <main className={`map${focus ? " focused" : ""}`}>
      <div className="map-canvas">
        <Canvas camera={{ position: [0, 160, 90], fov: 42, near: 0.1, far: 900 }} dpr={[1, 2]} onPointerMissed={() => setSelected(null)}>
          <color attach="background" args={["#020309"]} />
          <Universe3D
            focus={focus}
            selected={selected}
            progress={progress}
            recommendedChapter={nextChapter.id}
            recommendedNode={nextNode?.id ?? null}
            onPickChapter={(id) => go(`/map/${id}`)}
            onPickNode={setSelected}
          />
          <EffectComposer multisampling={0}>
            <Bloom intensity={1.15} luminanceThreshold={0.32} luminanceSmoothing={0.4} mipmapBlur />
          </EffectComposer>
        </Canvas>
      </div>

      <header className="topbar">
        <button className="brand" onClick={() => go("/")}>
          知识<span>宇宙</span>
        </button>
        <span className="crumb">
          <button className="crumb-link" onClick={() => go("/map")}>
            {TOPIC.title}
          </button>
          {focus && (
            <>
              {" "}
              › <b>{focus.title}</b>
            </>
          )}
          {selectedNode && <> › {selectedNode.title}</>}
        </span>
        <span className="spacer" />
        {focus ? (
          <button className="btn ghost small" onClick={() => go("/map")}>
            ← 返回星系 <kbd>Esc</kbd>
          </button>
        ) : (
          <button className="btn primary small" onClick={() => go(`/map/${nextChapter.id}`)}>
            {nextChapter.lesson ? `飞往 ${nextChapter.title} →` : `下一站：${nextChapter.title}`}
          </button>
        )}
      </header>

      {!focus && (
        <div className="map-title">
          <div className="mono">KNOWLEDGE UNIVERSE</div>
          <h1>{TOPIC.title}</h1>
          <p>
            从 AlexNet 出发，三条旋臂通向今天的人工智能。
            <br />
            每颗恒星是一个改变了这门学科的模型或思想，环绕它的行星是要掌握的知识点。
          </p>
          <div className="map-stats">
            <div>
              <b>{CHAPTERS.length}</b>颗恒星
            </div>
            <div>
              <b>{SUBNODE_COUNT}</b>颗行星
            </div>
            <div>
              <b style={{ color: "#a8ff60" }}>
                {mastered}
                <small>/{LEARNABLE.length}</small>
              </b>
              已点亮
            </div>
            <div>
              <b>{Math.round(avg * 100)}%</b>掌握度
            </div>
          </div>
          <div className="arms">
            {Object.values(TRACKS).map((t) => (
              <div key={t.en} style={{ ["--track" as string]: t.color }}>
                <i />
                <span>{t.en}</span>
                {t.title}
              </div>
            ))}
          </div>
        </div>
      )}

      {focus && !selectedNode && <ChapterCard key={focus.id} chapter={focus} progress={progress} onPickNode={setSelected} />}
      {focus && selectedNode && <NodeCard key={selectedNode.id} chapter={focus} node={selectedNode} progress={progress} onClose={() => setSelected(null)} />}

      <div className="legend">
        {focus &&
          (Object.keys(STATUS_LABEL) as Status[]).map((st) => (
            <span key={st} className="legend-dot" style={{ ["--c" as string]: STATUS_COLOR[st] }}>
              {STATUS_LABEL[st]}
            </span>
          ))}
        {focus && (
          <span className="legend-dot" style={{ ["--c" as string]: TRACKS[focus.track].color, opacity: 0.6 }}>
            筹备中
          </span>
        )}
        <span className="hint">{focus ? "点击行星查看 · 拖动环绕 · Esc 返回星系" : "悬停恒星看它的来路 · 点击飞入 · 拖动环绕 · 滚轮缩放"}</span>
      </div>
    </main>
  );
};

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { go, useRoute } from "../router";
import { useProgress } from "../progress/store";
import { Progress, STATUS_LABEL, Status, get, status } from "../progress/mastery";
import { Icon, TopNav } from "../shell/TopNav";
import { KnowledgeNode, LEARNABLE, TOPIC } from "./graph";
import { GraphApi, KnowledgeGraph } from "./KnowledgeGraph";
import { STATUS_COLOR, STATUS_COLOR_LIGHT, nodeStatus } from "./status";
import { CHAPTERS, Chapter, OPEN_CHAPTERS, SUBNODE_COUNT, TRACKS, TrackId, chapterById, chapterOf } from "./universe";

export { STATUS_COLOR };

type Level = "default" | "chapters" | "all";

/** Inside a chapter: its first learnable sub-topic that is not mastered yet. */
const recommendNode = (p: Progress, c: Chapter) => c.children.find((n) => n.span && status(get(p, n.id)) !== "mastered") ?? null;
/** Overall: the first open chapter with work left; once all are done, the first chapter whose prerequisites are open. */
const recommendChapter = (p: Progress) =>
  OPEN_CHAPTERS.find((c) => recommendNode(p, c)) ?? CHAPTERS.find((c) => !c.lesson && c.needs.every((id) => chapterById(id)?.lesson)) ?? CHAPTERS[0];

/* ── side panel ──────────────────────────────────────────────────────── */
const Overview = ({ progress, onPick }: { progress: Progress; onPick: (id: string) => void }) => {
  const next = recommendChapter(progress);
  const mastered = LEARNABLE.filter((n) => status(get(progress, n.id)) === "mastered").length;
  const avg = LEARNABLE.reduce((s, n) => s + get(progress, n.id).score, 0) / LEARNABLE.length;
  return (
    <>
      <div className="kg-kicker">课程概览</div>
      <h2>{TOPIC.title}</h2>
      <p className="kg-desc">从感知机和反向传播出发，沿视觉、序列、生成、强化学习几条主线走到今天的大模型。鼠标悬停看节点之间的关系，点击大节点展开它的知识点。</p>
      <div className="kg-stats">
        <div>
          <b>{CHAPTERS.length}</b>大节点
        </div>
        <div>
          <b>{SUBNODE_COUNT}</b>知识点
        </div>
        <div>
          <b className="ok">
            {mastered}
            <small>/{LEARNABLE.length}</small>
          </b>
          已掌握
        </div>
        <div>
          <b>{Math.round(avg * 100)}%</b>掌握度
        </div>
      </div>
      <div className="kg-sub">{Object.keys(TRACKS).length} 条主线</div>
      <div className="kg-tracks">
        {(Object.keys(TRACKS) as TrackId[]).map((t) => (
          <div key={t}>
            <i style={{ background: TRACKS[t].color }} />
            {TRACKS[t].title}
            <span>{CHAPTERS.filter((c) => c.track === t).length} 个大节点</span>
          </div>
        ))}
      </div>
      <button className="lt-btn primary block" onClick={() => onPick(next.id)}>
        {next.lesson ? `推荐从「${next.title}」开始` : `下一站：${next.title}`} →
      </button>
    </>
  );
};

const ChapterPanel = ({ chapter, progress, expanded, onToggle, onPickTopic }: { chapter: Chapter; progress: Progress; expanded: boolean; onToggle: () => void; onPickTopic: (id: string) => void }) => {
  const next = recommendNode(progress, chapter);
  const learnable = chapter.children.filter((n) => n.span);
  const mastered = learnable.filter((n) => status(get(progress, n.id)) === "mastered").length;
  const started = learnable.some((n) => status(get(progress, n.id)) !== "new");
  return (
    <>
      <div className="kg-kicker" style={{ color: chapter.color }}>
        {TRACKS[chapter.track].title} · {chapter.year}
      </div>
      <h2>{chapter.title}</h2>
      <p className="kg-desc">{chapter.blurb}</p>
      {chapter.needs.length > 0 && (
        <div className="kg-chips">
          {chapter.needs.map((id) => (
            <button key={id} onClick={() => go(`/map/${id}`)}>
              {chapter.rel[id]} ← {chapterById(id)!.title}
            </button>
          ))}
        </div>
      )}
      <div className="kg-row">
        <span>{chapter.children.length} 个知识点</span>
        <span>{chapter.lesson ? `已掌握 ${mastered}/${learnable.length}` : "课堂筹备中"}</span>
      </div>
      <ol className="kg-topics">
        {chapter.children.map((n) => {
          const st = nodeStatus(progress, n);
          return (
            <li key={n.id}>
              <button onClick={() => onPickTopic(n.id)}>
                <i style={{ background: st === "locked" ? "#e2e8f0" : STATUS_COLOR_LIGHT[st] }} />
                {n.title}
                {n.id === next?.id && <em>下一步</em>}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="kg-actions">
        {chapter.lesson ? (
          <button className="lt-btn primary" onClick={() => go(next ? `/lesson/${chapter.lesson}?node=${next.id}` : `/lesson/${chapter.lesson}`)}>
            {!next ? "再上一遍" : started ? `继续：${next.title}` : "进入虚拟课堂"} →
          </button>
        ) : (
          <button className="lt-btn" disabled>
            课堂筹备中
          </button>
        )}
        <button className="lt-btn ghost" onClick={onToggle}>
          {expanded ? "收起知识点" : "展开知识点"}
        </button>
      </div>
    </>
  );
};

const TopicPanel = ({ chapter, node, progress, onBack }: { chapter: Chapter; node: KnowledgeNode; progress: Progress; onBack: () => void }) => {
  const st = nodeStatus(progress, node);
  const p = get(progress, node.id);
  const title = (id: string) => chapter.children.find((n) => n.id === id)?.title ?? id;
  return (
    <>
      <div className="kg-kicker" style={{ color: chapter.color }}>
        {chapter.title} · {node.en}
      </div>
      <h2>{node.title}</h2>
      {st === "locked" ? (
        <p className="kg-desc">「{chapter.title}」的虚拟课堂还在筹备中，这是它将要讲到的知识点之一。</p>
      ) : (
        <>
          <span className="kg-status" style={{ ["--c" as string]: STATUS_COLOR_LIGHT[st] }}>
            {STATUS_LABEL[st]}
          </span>
          <p className="kg-desc">学完你将能：{node.goal}</p>
          <div className="kg-row">
            <span>掌握度</span>
            <span>{Math.round(p.score * 100)}%</span>
          </div>
          <div className="kg-meter">
            <div style={{ width: `${p.score * 100}%`, background: STATUS_COLOR_LIGHT[st] }} />
          </div>
          <div className="kg-row">
            <span>课堂片段约 {Math.max(1, Math.round((node.span![1] - node.span![0]) / 60))} 分钟</span>
            <span>
              答题 {p.correct}/{p.answered}
            </span>
          </div>
        </>
      )}
      {node.needs.length > 0 && (
        <div className="kg-chips static">
          {node.needs.map((id) => (
            <span key={id}>先修 · {title(id)}</span>
          ))}
        </div>
      )}
      <div className="kg-actions">
        {st !== "locked" && (
          <button className="lt-btn primary" onClick={() => go(`/lesson/${chapter.lesson}?node=${node.id}`)}>
            {st === "new" ? "进入课堂" : st === "review" ? "去复习" : "继续学习"} →
          </button>
        )}
        <button className="lt-btn ghost" onClick={onBack}>
          ← 返回 {chapter.title}
        </button>
      </div>
    </>
  );
};

/* ── page ────────────────────────────────────────────────────────────── */
export const MapPage = () => {
  const route = useRoute();
  const focusChapter = chapterById(route.path[1]);
  const progress = useProgress();
  const api = useRef<GraphApi>(null);

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(focusChapter ? [focusChapter.id] : []));
  const [level, setLevel] = useState<Level>("default");
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<Set<TrackId>>(() => new Set(Object.keys(TRACKS) as TrackId[]));
  const [openOnly, setOpenOnly] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [topic, setTopic] = useState<string | null>(null);

  const shownExpanded = useMemo(() => (level === "chapters" ? new Set<string>() : level === "all" ? new Set(CHAPTERS.map((c) => c.id)) : expanded), [level, expanded]);
  const visible = useCallback((c: Chapter) => tracks.has(c.track) && (!openOnly || !!c.lesson), [tracks, openOnly]);

  // the route names the selected chapter; make sure it is shown and opened
  useEffect(() => {
    setTopic(null);
    if (!focusChapter) return;
    setExpanded((e) => (e.has(focusChapter.id) ? e : new Set(e).add(focusChapter.id)));
    const id = window.setTimeout(() => api.current?.focus(focusChapter.id), 1300);
    return () => window.clearTimeout(id);
  }, [focusChapter]);

  // searching a topic of a closed chapter opens that chapter
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const hit = CHAPTERS.flatMap((c) => c.children).find((n) => n.title.toLowerCase().includes(q) || n.en.toLowerCase().includes(q));
    const c = hit && chapterOf(hit.id);
    if (c && !expanded.has(c.id)) setExpanded((e) => new Set(e).add(c.id));
  }, [query, expanded]);

  const pick = (id: string, kind: "chapter" | "topic") => {
    if (kind === "chapter") {
      if (focusChapter?.id === id) {
        setTopic(null);
        if (level === "default") setExpanded((e) => new Set(e).add(id));
        return;
      }
      return go(`/map/${id}`);
    }
    const c = chapterOf(id)!;
    if (focusChapter?.id !== c.id) go(`/map/${c.id}`);
    window.setTimeout(() => setTopic(id), 0);
  };
  const toggle = (id: string) => {
    setLevel("default");
    setExpanded((e) => {
      const n = new Set(e);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const topicNode = focusChapter && topic ? focusChapter.children.find((n) => n.id === topic) : undefined;
  const nextChapter = recommendChapter(progress);
  const recommended = focusChapter ? recommendNode(progress, focusChapter)?.id ?? null : nextChapter.id;
  const searchHits = query.trim() ? CHAPTERS.flatMap((c) => [c, ...c.children]).filter((n) => n.title.toLowerCase().includes(query.trim().toLowerCase())).length : 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.target instanceof HTMLInputElement) return;
      if (topic) setTopic(null);
      else if (focusChapter) go("/map");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [topic, focusChapter]);

  return (
    <main className="light kg-page">
      <TopNav>
        <button onClick={() => go("/map")}>{TOPIC.title}</button>
        {focusChapter && (
          <>
            <i>/</i>
            <button onClick={() => setTopic(null)}>{focusChapter.title}</button>
          </>
        )}
        {topicNode && (
          <>
            <i>/</i>
            <b>{topicNode.title}</b>
          </>
        )}
      </TopNav>

      <div className="kg-wrap">
        <div className="kg-title">
          <h1>知识图谱</h1>
          <p>可视化知识结构，助力高效学习</p>
        </div>

        <div className="kg-body">
          <section className="kg-card">
            <div className="kg-toolbar">
              <label className="kg-search">
                {Icon.search}
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索知识点…" onKeyDown={(e) => e.key === "Escape" && setQuery("")} />
                {query && <span className="hits">{searchHits} 个结果</span>}
              </label>
              <div className="kg-filter">
                <button className={`kg-tool${filterOpen || openOnly || tracks.size < Object.keys(TRACKS).length ? " on" : ""}`} onClick={() => setFilterOpen((o) => !o)}>
                  {Icon.filter} 筛选
                </button>
                {filterOpen && (
                  <div className="kg-pop" onMouseLeave={() => setFilterOpen(false)}>
                    <div className="kg-sub">主线</div>
                    {(Object.keys(TRACKS) as TrackId[]).map((t) => (
                      <label key={t}>
                        <input
                          type="checkbox"
                          checked={tracks.has(t)}
                          onChange={() =>
                            setTracks((s) => {
                              const n = new Set(s);
                              if (n.has(t)) n.delete(t);
                              else n.add(t);
                              // keep the course's starting point reachable
                              return n.size ? n : s;
                            })
                          }
                        />
                        <i style={{ background: TRACKS[t].color }} />
                        {TRACKS[t].title}
                      </label>
                    ))}
                    <div className="kg-sub">课堂</div>
                    <label>
                      <input type="checkbox" checked={openOnly} onChange={() => setOpenOnly((v) => !v)} />
                      只看已开放的课堂
                    </label>
                  </div>
                )}
              </div>
              <select className="kg-tool" value={level} onChange={(e) => setLevel(e.target.value as Level)}>
                <option value="default">全部层级</option>
                <option value="chapters">只看大节点</option>
                <option value="all">展开全部知识点</option>
              </select>
            </div>

            <div className="kg-zoom">
              <button onClick={() => api.current?.zoomBy(1.25)} aria-label="放大">
                {Icon.plus}
              </button>
              <button onClick={() => api.current?.zoomBy(0.8)} aria-label="缩小">
                {Icon.minus}
              </button>
              <button onClick={() => api.current?.fit()} aria-label="适应画布">
                {Icon.fit}
              </button>
            </div>

            <KnowledgeGraph ref={api} progress={progress} expanded={shownExpanded} visible={visible} query={query} selected={topic ?? focusChapter?.id ?? null} recommended={recommended} onPick={pick} />

            <div className="kg-legend">
              {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
                <span key={s} style={{ ["--c" as string]: STATUS_COLOR_LIGHT[s] }}>
                  {STATUS_LABEL[s]}
                </span>
              ))}
              <span className="hint">悬停看关系 · 拖动画布平移 · 滚轮缩放 · 拖动节点重新摆放</span>
            </div>
          </section>

          <aside className="kg-side">
            {!focusChapter && <Overview progress={progress} onPick={(id) => go(`/map/${id}`)} />}
            {focusChapter && !topicNode && <ChapterPanel key={focusChapter.id} chapter={focusChapter} progress={progress} expanded={shownExpanded.has(focusChapter.id)} onToggle={() => toggle(focusChapter.id)} onPickTopic={(id) => pick(id, "topic")} />}
            {focusChapter && topicNode && <TopicPanel key={topicNode.id} chapter={focusChapter} node={topicNode} progress={progress} onBack={() => setTopic(null)} />}
          </aside>
        </div>
      </div>
    </main>
  );
};

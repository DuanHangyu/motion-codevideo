import { useCallback, useEffect, useRef, useState } from "react";
import { Player, PlayerRef } from "@remotion/player";
import { Lesson } from "../../src/alexnet/Lesson";
import { DURATION, DURATION_SEC, FPS, sceneAt } from "../../src/alexnet/lib/timeline";
import { go } from "../router";
import { useProgress, progress as store } from "../progress/store";
import { STATUS_LABEL, get, status } from "../progress/mastery";
import { LEARNABLE, TOPIC, nodeAt, nodeById, watchedAt } from "../map/graph";
import { STATUS_COLOR } from "../map/MapPage";
import { QuizSession } from "../quiz/QuizSession";
import { Lab } from "../explore/Lab";
import { CHECKPOINTS, Checkpoint, LabId, crossed, zoneAt, zoneFor } from "./zones";
import { LessonTimeline } from "./LessonTimeline";

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const toFrame = (t: number) => Math.min(DURATION - 1, Math.max(0, Math.round(t * FPS)));
const LABS = new Set<LabId>(["pixel", "descent", "conv", "activation", "arch"]);

export const LessonPage = ({ query }: { query: URLSearchParams }) => {
  const player = useRef<PlayerRef>(null);
  const prevT = useRef(0);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [lab, setLab] = useState<LabId | null>(null);
  const [quiz, setQuiz] = useState<Checkpoint | null>(null);
  const [done, setDone] = useState<Set<string>>(() => new Set());
  const progress = useProgress();
  const overlayOpen = useRef(false);

  const seek = useCallback((sec: number) => {
    prevT.current = sec; // a seek is not "playback crossing" a checkpoint
    player.current?.seekTo(toFrame(sec));
    setT(sec);
  }, []);
  const play = useCallback(() => {
    const p = player.current;
    if (!p) return;
    if (p.getCurrentFrame() >= DURATION - 1) seek(0);
    p.play();
  }, [seek]);
  const pause = useCallback(() => player.current?.pause(), []);

  // deep links: ?node=conv jumps to that part of the lesson, &lab=conv opens a lab right away
  const node = query.get("node");
  const labParam = query.get("lab") as LabId | null;
  useEffect(() => {
    const target = node && LEARNABLE.some((n) => n.id === node) ? nodeById(node).span![0] : Number(query.get("t") ?? 0);
    const at = labParam && LABS.has(labParam) ? Math.max(target, zoneFor(labParam).from + 0.5) : target;
    seek(Number.isFinite(at) ? at : 0);
    if (labParam && LABS.has(labParam)) setLab(labParam);
  }, [node, labParam, query, seek]);

  useEffect(() => {
    const p = player.current;
    if (!p) return;
    const onPlay = () => {
      setPlaying(true);
      setStarted(true);
    };
    const onPause = () => setPlaying(false);
    const onFrame = (e: { detail: { frame: number } }) => {
      const now = e.detail.frame / FPS;
      const prev = prevT.current;
      prevT.current = now;
      setT(now);
      if (!p.isPlaying() || overlayOpen.current) return;
      // finishing a node's segment during playback counts as having watched it
      for (const n of LEARNABLE) {
        const w = watchedAt(n);
        if (prev < w && now >= w && now - prev < 1.5) store.watched(n.id);
      }
      const hit = crossed(prev, now)[0];
      if (hit) {
        p.pause();
        setQuiz(hit);
      }
    };
    p.addEventListener("play", onPlay);
    p.addEventListener("pause", onPause);
    p.addEventListener("ended", onPause);
    p.addEventListener("frameupdate", onFrame);
    return () => {
      p.removeEventListener("play", onPlay);
      p.removeEventListener("pause", onPause);
      p.removeEventListener("ended", onPause);
      p.removeEventListener("frameupdate", onFrame);
    };
  }, []);

  const zone = zoneAt(t);
  const overlay = lab !== null || quiz !== null;
  // the lesson never keeps playing underneath a lab or a quiz, however it was opened (button, deep link, review)
  useEffect(() => {
    overlayOpen.current = overlay;
    if (overlay) player.current?.pause();
  }, [overlay]);
  const paused = started && !playing;

  const openLab = useCallback(
    (id: LabId) => {
      pause();
      setLab(id);
    },
    [pause],
  );
  const closeLab = (resume: boolean) => {
    setLab(null);
    if (resume) play();
  };
  const finishQuiz = () => {
    if (quiz) setDone((d) => new Set(d).add(quiz.id));
    setQuiz(null);
    if (quiz?.id !== "cp-final") play();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "Escape" && lab) return closeLab(false);
      if (overlay) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (player.current?.isPlaying()) pause();
        else play();
      } else if (e.key === "ArrowRight") seek(Math.min(DURATION_SEC - 0.1, t + 5));
      else if (e.key === "ArrowLeft") seek(Math.max(0, t - 5));
      else if ((e.key === "e" || e.key === "E") && zone) openLab(zone.lab);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const current = nodeAt(t);
  const chapter = sceneAt(t);

  return (
    <main className="lesson">
      <header className="topbar">
        <button className="brand" onClick={() => go("/")}>
          知识<span>宇宙</span>
        </button>
        <button className="btn ghost small" onClick={() => go("/map")}>
          ← 知识地图
        </button>
        <span className="crumb">
          {TOPIC.title} · <b>{TOPIC.lessonTitle}</b>
        </span>
        <span className="spacer" />
        <span className="mono">
          {chapter.num ? `${chapter.num} · ` : ""}
          {chapter.title}
        </span>
      </header>

      <div className="stage-wrap">
        <section className={`stage${zone ? " in-zone" : ""}${paused ? " paused" : ""}`}>
          <Player
            ref={player}
            component={Lesson}
            durationInFrames={DURATION}
            fps={FPS}
            compositionWidth={1920}
            compositionHeight={1080}
            controls={false}
            clickToPlay={false}
            doubleClickToFullscreen={false}
            spaceKeyToPlayOrPause={false}
            moveToBeginningWhenEnded={false}
            acknowledgeRemotionLicense
            style={{ width: "100%", height: "100%" }}
          />
          <div className="stage-click" onClick={() => (playing ? pause() : play())} />
          {!started && (
            <div className="start-cover">
              <div className="inner">
                <div className="mono" style={{ color: "var(--amber)" }}>
                  虚拟课堂 · {fmt(DURATION_SEC)}
                </div>
                <h2>{node ? `从「${nodeById(node).title}」开始` : TOPIC.lessonTitle}</h2>
                <p>时间轴上的金色区段可以暂停探索 · 紫色菱形是课中小测</p>
                <button className="btn primary" onClick={play}>
                  ▶ 开始上课
                </button>
              </div>
            </div>
          )}
          {started && zone && (
            <div className="pause-tag">{paused ? "已暂停 · 这里可以探索" : "◆ 可探索片段 · 按空格暂停"}</div>
          )}
          {paused && zone && !overlay && (
            <div className="panel explore-cta">
              <div className="txt">
                <b>◆ {zone.title}</b>
                {zone.hint}
              </div>
              <button className="btn amber" onClick={() => openLab(zone.lab)}>
                进入探索 <kbd>E</kbd>
              </button>
            </div>
          )}
        </section>
      </div>

      <footer className="controls">
        <button className="play" onClick={() => (playing ? pause() : play())} aria-label={playing ? "暂停" : "播放"}>
          {playing ? <span className="icon-pause" /> : <span className="icon-play" />}
        </button>
        <div className="clock">
          {fmt(t)} <span>/ {fmt(DURATION_SEC)}</span>
        </div>
        <LessonTimeline t={t} total={DURATION_SEC} done={done} onSeek={seek} />
      </footer>

      <aside className="side">
        <div className="mono">本课知识节点</div>
        <h3>{LEARNABLE.length} 个节点</h3>
        {LEARNABLE.map((n) => {
          const p = get(progress, n.id);
          const st = status(p);
          return (
            <button key={n.id} className={`side-node${current?.id === n.id ? " current" : ""}`} onClick={() => seek(n.span![0])}>
              <div className="top">
                <span className="name">{n.title}</span>
                <span className={`status-chip status-${st}`}>{STATUS_LABEL[st]}</span>
              </div>
              <div className="meter">
                <div style={{ width: `${p.score * 100}%`, background: STATUS_COLOR[st] }} />
              </div>
            </button>
          );
        })}
        <div className="side-legend">
          <div>
            <i style={{ background: "rgba(255,181,71,0.3)", border: "1px solid var(--amber)" }} />
            可暂停探索的片段 · {LABS.size} 个实验台
          </div>
          <div>
            <i style={{ background: "var(--violet)", width: 10, transform: "rotate(45deg)" }} />
            {CHECKPOINTS.length} 组测验 · 自动弹出
          </div>
        </div>
        <div className="side-keys">
          <kbd>空格</kbd> 播放 / 暂停 &nbsp; <kbd>←</kbd> <kbd>→</kbd> ±5 秒 &nbsp; <kbd>E</kbd> 进入探索 &nbsp; <kbd>Esc</kbd> 退出实验台
        </div>
      </aside>

      {lab && (
        <div className="overlay">
          <Lab id={lab} onResume={() => closeLab(true)} onBack={() => closeLab(false)} />
        </div>
      )}
      {quiz && (
        <div className="overlay">
          <QuizSession
            key={quiz.id}
            title={quiz.title}
            questionIds={quiz.questions}
            isFinal={quiz.id === "cp-final"}
            onClose={finishQuiz}
            onMap={() => go("/map")}
            onReview={(q) => {
              setDone((d) => new Set(d).add(quiz.id));
              setQuiz(null);
              seek(q.review.at);
              if (q.review.lab) setLab(q.review.lab);
              else play();
            }}
          />
        </div>
      )}
    </main>
  );
};

import { useCallback, useEffect, useRef, useState } from "react";
import { Player, PlayerRef } from "@remotion/player";
import { Lesson } from "../../src/alexnet/Lesson";
import { DURATION, DURATION_SEC, FPS, sceneAt } from "../../src/alexnet/lib/timeline";
import { WORLDS, WorldId, worldAt, worldById } from "../../src/alexnet/lib/worlds";
import { explore, useExplore } from "../../src/alexnet/lib/explore";
import { sfx } from "../../src/alexnet/lib/sfx";
import { go } from "../router";
import { useProgress, progress as store } from "../progress/store";
import { STATUS_LABEL, get, status } from "../progress/mastery";
import { LEARNABLE, TOPIC, nodeAt, nodeById, watchedAt } from "../map/graph";
import { STATUS_COLOR } from "../map/MapPage";
import { QuizSession } from "../quiz/QuizSession";
import { CHECKPOINTS, Checkpoint, PREDICTIONS, Prediction, crossed, steppedOver } from "./zones";
import { LessonTimeline } from "./LessonTimeline";
import { PredictCard, PredictResult } from "./Predict";

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const toFrame = (t: number) => Math.min(DURATION - 1, Math.max(0, Math.round(t * FPS)));

type Guess = { id: string; pick: number; revealed: boolean };
const predictionById = (id: string) => PREDICTIONS.find((x) => x.id === id)!;

export const LessonPage = ({ query }: { query: URLSearchParams }) => {
  const player = useRef<PlayerRef>(null);
  const prevT = useRef(0);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [quiz, setQuiz] = useState<Checkpoint | null>(null);
  const [predict, setPredict] = useState<Prediction | null>(null);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [done, setDone] = useState<Set<string>>(() => new Set());
  const [sideOpen, setSideOpen] = useState(true);
  const progress = useProgress();
  const blocking = useRef(false);

  const ex = useExplore();
  const exploring = ex.active;

  /** Freeze time and step into the world on screen. */
  const enterWorld = useCallback((id: WorldId) => {
    player.current?.pause();
    explore.enter(id);
    sfx.freeze();
    sfx.droneStart();
  }, []);
  /** Let time flow again: the world blends back to the script, then (optionally) playback resumes. */
  const leaveWorld = useCallback(async (resume: boolean) => {
    sfx.unfreeze();
    sfx.droneStop();
    await explore.exit();
    if (resume) player.current?.play();
  }, []);
  useEffect(
    () => () => {
      explore.reset();
      sfx.droneStop();
    },
    [],
  );
  // a completed in-world challenge counts as a correct answer for that world's knowledge node
  useEffect(
    () =>
      explore.onComplete((zone) => {
        const w = worldById(zone);
        if (w) store.answer([w.node], true);
      }),
    [],
  );

  const seek = useCallback((sec: number) => {
    explore.reset();
    sfx.droneStop();
    prevT.current = sec; // a seek is not "playback crossing" a checkpoint
    setPredict(null); // an unanswered guess belongs to the moment we just left
    player.current?.seekTo(toFrame(sec));
    setT(sec);
  }, []);
  const play = useCallback(() => {
    const p = player.current;
    if (!p) return;
    if (explore.get().phase !== "off") return void leaveWorld(true);
    if (p.getCurrentFrame() >= DURATION - 1) seek(0);
    p.play();
  }, [seek, leaveWorld]);
  const pause = useCallback(() => player.current?.pause(), []);

  // deep links: ?node=conv starts at that node, ?world=conv-slide steps straight into a world, ?t=326 seeks
  const node = query.get("node");
  const worldParam = worldById(query.get("world"));
  useEffect(() => {
    const target = node && LEARNABLE.some((n) => n.id === node) ? nodeById(node).span![0] : Number(query.get("t") ?? 0);
    const at = worldParam ? worldParam.from + 1 : target;
    seek(Number.isFinite(at) ? at : 0);
    if (worldParam) {
      setStarted(true);
      const id = window.setTimeout(() => enterWorld(worldParam.id), 600);
      return () => window.clearTimeout(id);
    }
  }, [node, worldParam, query, seek, enterWorld]);

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
      if (!p.isPlaying() || blocking.current) return;
      // finishing a node's segment during playback counts as having watched it
      for (const n of LEARNABLE) {
        const w = watchedAt(n);
        if (prev < w && now >= w && now - prev < 1.5) store.watched(n.id);
      }
      // a guess is revealed when the lesson says the answer
      setGuesses((gs) => (gs.some((g) => !g.revealed && steppedOver(predictionById(g.id).reveal, prev, now)) ? gs.map((g) => (!g.revealed && steppedOver(predictionById(g.id).reveal, prev, now) ? { ...g, revealed: true } : g)) : gs));
      const pr = PREDICTIONS.find((x) => steppedOver(x.at, prev, now));
      if (pr) {
        p.pause();
        setPredict(pr);
        return;
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

  const world = worldAt(t);
  const overlay = quiz !== null || predict !== null;
  // the lesson never keeps playing underneath a quiz or a guess
  useEffect(() => {
    blocking.current = overlay;
    if (overlay) player.current?.pause();
  }, [overlay]);
  const paused = started && !playing;

  const finishQuiz = () => {
    if (quiz) setDone((d) => new Set(d).add(quiz.id));
    setQuiz(null);
    if (quiz?.id !== "cp-final") play();
  };
  const guess = (pick: number) => {
    if (!predict) return;
    sfx.blip(880, 0.1);
    setGuesses((gs) => [...gs.filter((g) => g.id !== predict.id), { id: predict.id, pick, revealed: false }]);
    setPredict(null);
    window.setTimeout(play, 250);
  };
  const reviewInWorld = (id: WorldId) => {
    const w = worldById(id)!;
    seek(w.from + 1);
    setStarted(true);
    window.setTimeout(() => enterWorld(w.id), 400);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (overlay) return;
      if (exploring) {
        if (e.code === "Space") {
          e.preventDefault();
          void leaveWorld(true);
        } else if (e.key === "Escape") void leaveWorld(false);
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        if (player.current?.isPlaying()) pause();
        else play();
      } else if (e.key === "ArrowRight") seek(Math.min(DURATION_SEC - 0.1, t + 5));
      else if (e.key === "ArrowLeft") seek(Math.max(0, t - 5));
      else if ((e.key === "e" || e.key === "E") && world) enterWorld(world.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const current = nodeAt(t);
  const chapter = sceneAt(t);
  const shownGuess = guesses.find((g) => {
    const p = predictionById(g.id);
    return t >= p.at - 0.5 && t < p.reveal + 5;
  });
  const completedWorlds = WORLDS.filter((w) => explore.isCompleted(w.id)).length;

  return (
    <main className={`lesson${exploring ? " exploring" : ""}${sideOpen ? "" : " side-closed"}`}>
      <header className="topbar">
        <button className="brand" onClick={() => go("/")}>
          知识<span>宇宙</span>
        </button>
        <button className="btn ghost small" onClick={() => go(`/map/${TOPIC.chapter}`)}>
          ← 知识地图
        </button>
        <span className="crumb">
          {TOPIC.title} › {TOPIC.chapterTitle} · <b>{TOPIC.lessonTitle}</b>
        </span>
        <span className="spacer" />
        <span className="mono">
          {chapter.num ? `${chapter.num} · ` : ""}
          {chapter.title}
        </span>
      </header>

      <div className="stage-wrap">
        <section className={`stage${world ? " in-zone is-world" : ""}${paused ? " paused" : ""}`}>
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
          {!exploring && <div className="stage-click" onClick={() => (playing ? pause() : play())} />}
          {!started && (
            <div className="start-cover">
              <div className="inner">
                <div className="mono" style={{ color: "var(--amber)" }}>
                  虚拟课堂 · {fmt(DURATION_SEC)}
                </div>
                <h2>{node ? `从「${nodeById(node).title}」开始` : TOPIC.lessonTitle}</h2>
                <p>
                  {WORLDS.length} 处画面可以暂停、走进去动手 · {PREDICTIONS.length} 次先猜后看 · {CHECKPOINTS.length} 组小测
                </p>
                <button className="btn primary" onClick={play}>
                  ▶ 开始上课
                </button>
              </div>
            </div>
          )}
          {started && world && !exploring && !overlay && (
            <div className="pause-tag">
              {paused ? "时间可以在这里停住" : "◆ 这个画面可以走进去 · 按空格暂停"}
              {explore.isCompleted(world.id) && <span style={{ color: "var(--lime)" }}> · ✓ 挑战已完成</span>}
            </div>
          )}
          {paused && world && !overlay && !exploring && (
            <div className="panel explore-cta world">
              <div className="txt">
                <b>◆ {world.title}</b>
                {world.hint}
              </div>
              <button className="btn amber" onClick={() => enterWorld(world.id)}>
                走进画面 <kbd>E</kbd>
              </button>
            </div>
          )}
          {exploring && (
            <div className={`resume-bar${ex.phase === "returning" ? " leaving" : ""}`}>
              <button className="btn ghost small" onClick={() => leaveWorld(false)}>
                退出探索 <kbd>Esc</kbd>
              </button>
              <button className="btn primary" onClick={() => leaveWorld(true)}>
                ▶ 继续听讲 <kbd>空格</kbd>
              </button>
            </div>
          )}
          {predict && <PredictCard prediction={predict} onPick={guess} />}
          {shownGuess && !predict && !exploring && <PredictResult prediction={predictionById(shownGuess.id)} pick={shownGuess.pick} revealed={shownGuess.revealed} />}
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

      {!sideOpen && !exploring && (
        <button className="side-open" onClick={() => setSideOpen(true)} aria-label="展开知识节点">
          ‹ 知识节点
        </button>
      )}
      <aside className="side">
        <button className="side-close" onClick={() => setSideOpen(false)} aria-label="收起">
          收起 ›
        </button>
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
            <i style={{ background: "rgba(255,181,71,0.35)", border: "1px solid var(--amber)" }} />
            可走进的画面 · 挑战 {completedWorlds}/{WORLDS.length}
          </div>
          <div>
            <i style={{ background: "var(--cyan)", width: 10, borderRadius: 5 }} />
            {PREDICTIONS.length} 次先猜后看
          </div>
          <div>
            <i style={{ background: "var(--violet)", width: 10, transform: "rotate(45deg)" }} />
            {CHECKPOINTS.length} 组测验 · 自动弹出
          </div>
        </div>
        <div className="side-keys">
          <kbd>空格</kbd> 播放 / 暂停 &nbsp; <kbd>←</kbd> <kbd>→</kbd> ±5 秒 &nbsp; <kbd>E</kbd> 走进画面 &nbsp; <kbd>Esc</kbd> 退出
        </div>
      </aside>

      {quiz && (
        <div className="overlay">
          <QuizSession
            key={quiz.id}
            title={quiz.title}
            questionIds={quiz.questions}
            isFinal={quiz.id === "cp-final"}
            onClose={finishQuiz}
            onMap={() => go(`/map/${TOPIC.chapter}`)}
            onReview={(q) => {
              setDone((d) => new Set(d).add(quiz.id));
              setQuiz(null);
              if (q.review.world) return reviewInWorld(q.review.world);
              seek(q.review.at);
              play();
            }}
          />
        </div>
      )}
    </main>
  );
};

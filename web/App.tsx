import { useCallback, useEffect, useRef, useState } from "react";
import { Player, PlayerRef } from "@remotion/player";
import { Reel } from "../src/Reel";
import { setPaused, setSeek } from "../src/lib/interactive";
import { DURATION, FPS } from "../src/lib/timing";
import { CHAPTERS, chapterAt, hintAt } from "./chapters";
import { Timeline } from "./Timeline";

const fmt = (frame: number) => {
  const s = frame / FPS;
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${(s % 60).toFixed(2).padStart(5, "0")}`;
};

const clampFrame = (f: number) => Math.min(DURATION - 1, Math.max(0, Math.round(f)));

export const App = () => {
  const player = useRef<PlayerRef>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);

  // Mirror the player into the shared interaction store the scenes read from.
  useEffect(() => {
    const p = player.current;
    if (import.meta.env.DEV) Object.assign(window, { __player: p });
    if (!p) return;
    const onPlay = () => {
      setPlaying(true);
      setStarted(true);
      setPaused(false);
    };
    const onPause = () => {
      setPlaying(false);
      setPaused(true);
    };
    const onFrame = (e: { detail: { frame: number } }) => setFrame(e.detail.frame);
    p.addEventListener("play", onPlay);
    p.addEventListener("pause", onPause);
    p.addEventListener("ended", onPause);
    p.addEventListener("frameupdate", onFrame);
    p.addEventListener("seeked", onFrame);
    setSeek((f) => p.seekTo(clampFrame(f)));
    return () => {
      p.removeEventListener("play", onPlay);
      p.removeEventListener("pause", onPause);
      p.removeEventListener("ended", onPause);
      p.removeEventListener("frameupdate", onFrame);
      p.removeEventListener("seeked", onFrame);
    };
  }, []);

  const toggle = useCallback(() => {
    const p = player.current;
    if (!p) return;
    if (p.isPlaying()) {
      p.pause();
      return;
    }
    if (p.getCurrentFrame() >= DURATION - 1) p.seekTo(0);
    p.play();
  }, []);

  const seek = useCallback((f: number) => player.current?.seekTo(clampFrame(f)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const p = player.current;
      if (!p) return;
      const step = { ArrowLeft: -FPS, ArrowRight: FPS, ",": -1, ".": 1 }[e.key];
      if (e.code === "Space") {
        e.preventDefault();
        toggle();
      } else if (step !== undefined) {
        e.preventDefault();
        p.seekTo(clampFrame(p.getCurrentFrame() + step));
      } else if (e.key === "f") {
        stage.current?.requestFullscreen?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  const chapter = chapterAt(frame);
  const hint = hintAt(frame);
  const isPaused = started && !playing;

  return (
    <main className="room">
      <header className="bar">
        <div className="brand">
          OPUS 5.5 <span>// INTERACTIVE CUT</span>
        </div>
        <div className="keys">
          <kbd>空格</kbd> 播放 / 暂停 <kbd>←</kbd>
          <kbd>→</kbd> ±1 秒 <kbd>,</kbd>
          <kbd>.</kbd> 逐帧 <kbd>F</kbd> 全屏
        </div>
      </header>

      <section ref={stage} className={`stage${isPaused ? " is-paused" : ""}${isPaused && hint ? " is-live" : ""}`}>
        <Player
          ref={player}
          component={Reel}
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

        {!started && (
          <button className="start" onClick={toggle}>
            <span className="start-ring" />
            <span className="start-label">播放</span>
            <span className="start-sub">30 秒 · 暂停后可以进入画面</span>
          </button>
        )}

        {isPaused && (
          <div className="pause-chip">
            <span className="dot" />
            <span>
              已暂停 · 第 {frame} 帧 · {chapter.label}
            </span>
            <span className="sep" />
            <span className={hint ? "hint" : "hint muted"}>{hint ?? "这一段只能观看 · 3D 场景在 10s、14s 和 25s 之后"}</span>
          </div>
        )}
      </section>

      <footer className="controls">
        <button className="play" onClick={toggle} aria-label={playing ? "暂停" : "播放"}>
          {playing ? <span className="icon-pause" /> : <span className="icon-play" />}
        </button>
        <div className="time">
          {fmt(frame)} <span>/ {fmt(DURATION)}</span>
        </div>
        <Timeline chapters={CHAPTERS} frame={frame} total={DURATION} onSeek={seek} />
      </footer>
    </main>
  );
};

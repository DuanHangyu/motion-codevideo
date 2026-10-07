import { PointerEvent, useRef } from "react";
import { SCENES } from "../../src/alexnet/lib/timeline";
import { CHECKPOINTS, ZONES } from "./zones";

type Props = { t: number; total: number; done: Set<string>; onSeek: (t: number) => void };

const pct = (x: number, total: number) => `${(x / total) * 100}%`;

/** Chapter scrubber with explore zones (amber bands) and quiz checkpoints (violet diamonds). */
export const LessonTimeline = ({ t, total, done, onSeek }: Props) => {
  const track = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const seekFrom = (e: PointerEvent) => {
    const r = track.current?.getBoundingClientRect();
    if (r) onSeek(Math.min(total - 0.05, Math.max(0, ((e.clientX - r.left) / r.width) * total)));
  };
  return (
    <div
      ref={track}
      className="timeline"
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        seekFrom(e);
      }}
      onPointerMove={(e) => dragging.current && seekFrom(e)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      <div className="tl-track">
        {SCENES.map((s) => {
          const k = Math.min(1, Math.max(0, (t - s.start) / (s.end - s.start)));
          return (
            <div key={s.id} className={`tl-chapter${t >= s.start && t < s.end ? " current" : ""}`} style={{ flex: s.end - s.start }} title={s.title}>
              <div style={{ transform: `scaleX(${k})` }} />
            </div>
          );
        })}
      </div>
      {ZONES.map((z) => (
        <div key={z.lab} className="tl-zone" style={{ left: pct(z.from, total), width: pct(z.to - z.from, total) }} title={z.title} />
      ))}
      {CHECKPOINTS.map((c) => (
        <div key={c.id} className={`tl-cp${done.has(c.id) ? " done" : ""}`} style={{ left: pct(c.at, total) }} title={c.title} />
      ))}
      <div className="tl-head" style={{ left: pct(t, total) }} />
      {SCENES.filter((s) => s.num).map((s) => (
        <div key={s.id} className={`tl-label${t >= s.start && t < s.end ? " current" : ""}`} style={{ left: pct(s.start, total), width: pct(s.end - s.start, total) }}>
          {s.num} {s.title.split("：")[0]}
        </div>
      ))}
    </div>
  );
};

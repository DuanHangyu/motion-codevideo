import { PointerEvent, useRef } from "react";
import type { Chapter } from "./chapters";

type Props = { chapters: Chapter[]; frame: number; total: number; onSeek: (frame: number) => void };

/** Chapter-segmented scrubber; ◆ marks chapters you can step into while paused. */
export const Timeline = ({ chapters, frame, total, onSeek }: Props) => {
  const track = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const seekFromPointer = (e: PointerEvent) => {
    const rect = track.current?.getBoundingClientRect();
    if (!rect) return;
    onSeek(((e.clientX - rect.left) / rect.width) * total);
  };

  return (
    <div
      ref={track}
      className="timeline"
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        seekFromPointer(e);
      }}
      onPointerMove={(e) => dragging.current && seekFromPointer(e)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      {chapters.map((c, i) => {
        const fill = Math.min(1, Math.max(0, (frame - c.from) / (c.to - c.from)));
        const current = frame >= c.from && frame < c.to;
        return (
          <div key={c.id} className={`chapter${current ? " is-current" : ""}${c.hint ? " is-interactive" : ""}`} style={{ flexGrow: c.to - c.from }}>
            <div className="chapter-track">
              <div className="chapter-fill" style={{ transform: `scaleX(${fill})` }} />
            </div>
            <div className="chapter-label">
              <span className="num">{String(i + 1).padStart(2, "0")}</span>
              {c.label}
              {c.hint && <span className="diamond" title="暂停后可交互">◆</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

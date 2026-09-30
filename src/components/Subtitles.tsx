import { AbsoluteFill, useCurrentFrame } from "remotion";
import { FPS, LINES, SCENES, Word, prog, ease } from "../lib/timing";
import { FONT_CN, IVORY } from "../lib/theme";

type Segment = { words: Word[]; start: number; end: number };

/** Break long lines after the word "5.5" so each subtitle stays one row. */
const SEGMENTS: Segment[] = LINES.flatMap((line) => {
  const cut = line.words.findIndex((w) => w.text === "5.5");
  const groups = cut >= 0 && cut < line.words.length - 1 ? [line.words.slice(0, cut + 1), line.words.slice(cut + 1)] : [line.words];
  return groups.map((words) => ({ words, start: words[0].start, end: words[words.length - 1].end }));
});

// Scenes where the words themselves are the visuals.
const HIDDEN: Array<[number, number]> = [SCENES.cuts, SCENES.finale];

const spaced = (w: Word) => (/^[A-Za-z0-9.]+$/.test(w.text) ? ` ${w.text} ` : w.text);

export const Subtitles = () => {
  const t = useCurrentFrame() / FPS;
  if (HIDDEN.some(([a, b]) => t >= a && t < b)) return null;
  const seg = SEGMENTS.find((s, i) => t >= s.start - 0.12 && t < Math.min(s.end + 0.5, SEGMENTS[i + 1]?.start - 0.12 || Infinity));
  if (!seg) return null;
  const enter = ease.outCubic(prog(t, seg.start - 0.12, seg.start + 0.1));

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 118, pointerEvents: "none" }}>
      <div
        style={{
          fontFamily: FONT_CN,
          fontWeight: 500,
          fontSize: 42,
          letterSpacing: 3,
          color: IVORY,
          transform: `translateY(${(1 - enter) * 14}px)`,
          opacity: enter,
          textShadow: "0 2px 18px rgba(0,0,0,0.85)",
          whiteSpace: "pre",
        }}
      >
        {seg.words.map((w, i) => {
          const lit = prog(t, w.start - 0.02, w.start + 0.08);
          return (
            <span key={i} style={{ opacity: 0.32 + 0.68 * lit, display: "inline-block", transform: `translateY(${(1 - lit) * 4}px)` }}>
              {spaced(w)}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

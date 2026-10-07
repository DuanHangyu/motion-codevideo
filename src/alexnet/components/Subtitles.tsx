import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease, prog } from "../lib/anim";
import { FPS, LINES, Line } from "../lib/timeline";
import { FONT_CN, IVORY } from "../lib/theme";

type Seg = { text: string; from: number; to: number; start: number; end: number; line: Line };

const MAX_CHARS = 24;
const BREAK = /[，。？！：；]/;

/** Split each line into subtitle-sized clauses, merging short clauses up to MAX_CHARS. */
const split = (l: Line): Seg[] => {
  const clauses: Array<[number, number]> = [];
  let s = 0;
  for (let i = 0; i < l.text.length; i++) {
    if (BREAK.test(l.text[i])) {
      clauses.push([s, i + 1]);
      s = i + 1;
    }
  }
  if (s < l.text.length) clauses.push([s, l.text.length]);
  const merged: Array<[number, number]> = [];
  for (const c of clauses) {
    const last = merged[merged.length - 1];
    if (last && c[1] - last[0] <= MAX_CHARS) last[1] = c[1];
    else merged.push([...c]);
  }
  const timeAt = (idx: number) => {
    let w = l.words[0];
    for (const cand of l.words) if (cand.i <= idx) w = cand;
    return w.t;
  };
  return merged.map(([from, to], k) => {
    const lastWord = [...l.words].reverse().find((w) => w.i < to) ?? l.words[l.words.length - 1];
    return {
      text: l.text.slice(from, to).replace(/[，。；：]$/, ""),
      from,
      to,
      start: timeAt(from),
      end: k === merged.length - 1 ? l.end : lastWord.t + lastWord.d,
      line: l,
    };
  });
};

const SEGS: Seg[] = LINES.flatMap(split);

/** Time each character of a segment lights up (when its word starts). */
const charTime = (seg: Seg, k: number) => {
  const idx = seg.from + k;
  let w = seg.line.words[0];
  for (const cand of seg.line.words) if (cand.i <= idx) w = cand;
  return w.t;
};

export const Subtitles = ({ hidden = [] }: { hidden?: Array<[number, number]> }) => {
  const t = useCurrentFrame() / FPS;
  if (hidden.some(([a, b]) => t >= a && t < b)) return null;
  const i = SEGS.findIndex((s, k) => t >= s.start - 0.15 && t < Math.min(s.end + 0.6, (SEGS[k + 1]?.start ?? Infinity) - 0.15));
  if (i < 0) return null;
  const seg = SEGS[i];
  const enter = ease.outCubic(prog(t, seg.start - 0.15, seg.start + 0.12));
  const exit = 1 - prog(t, seg.end + 0.35, seg.end + 0.6);
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 64, pointerEvents: "none" }}>
      <div
        style={{
          fontFamily: FONT_CN,
          fontWeight: 500,
          fontSize: 40,
          letterSpacing: 2.5,
          color: IVORY,
          padding: "10px 30px",
          borderRadius: 10,
          background: "rgba(3, 5, 10, 0.55)",
          backdropFilter: "blur(6px)",
          opacity: enter * exit,
          transform: `translateY(${(1 - enter) * 12}px)`,
          whiteSpace: "pre",
        }}
      >
        {[...seg.text].map((ch, k) => {
          const lit = prog(t, charTime(seg, k) - 0.04, charTime(seg, k) + 0.1);
          return (
            <span key={k} style={{ opacity: 0.4 + 0.6 * lit }}>
              {ch}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

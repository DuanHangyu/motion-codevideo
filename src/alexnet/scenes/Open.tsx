import { AbsoluteFill, Img } from "remotion";
import { useTextPoints } from "../../lib/text-points";
import { Backdrop } from "../components/Frame";
import { ParticleText } from "../components/ParticleText";
import { Show } from "../components/Show";
import { Stage3D } from "../components/Stage3D";
import { Body, Heading, Mono, Panel, Reveal } from "../components/ui";
import { ease, flash, lerp, prog, rise, wobble } from "../lib/anim";
import { DATA, PRED_ZH, asset } from "../lib/data";
import { cue, scene } from "../lib/timeline";
import { AMBER, BG, CORAL, CYAN, DIM, FAINT, FONT_CN, FONT_DISPLAY, FONT_MONO, FONT_TITLE, IVORY, LIME } from "../lib/theme";

const S = scene("open");
const T_2012 = S.start;
const T_ILSVRC = cue("o1", "图像识别");
const T_TASK = cue("o2");
const T_THOUSAND = cue("o2", "一千个");
const T_GUESS = cue("o2", "猜出");
const T_FIVE = cue("o2", "允许");
const T_HIT = cue("o2", "猜中");
const T_BOARD = cue("o3");
const T_SECOND = cue("o3", "26.2");
const T_FIRST = cue("o4", "15.3");
const T_GAP = cue("o5", "11个");
const T_YEAR = cue("o5", "一年");
const T_TEAM = cue("o6");
const T_NAME = cue("o6", "AlexNet");
const T_Q = cue("o7");
const T_Q1 = cue("o7", "为什么会");
const T_Q2 = cue("o7", "为什么要");
const T_Q3 = cue("o7", "改变");

/* ── beat A: "2012" → "ILSVRC" in particles ─────────────────────────────── */
const Year = ({ t }: { t: number }) => {
  const a = useTextPoints("2012", '800 300px "Unbounded"', 9, 3);
  const b = useTextPoints("ILSVRC", '800 260px "Unbounded"', 11, 3);
  if (!a || !b) return null;
  const form = 1 - ease.outCubic(prog(t, T_2012 + 0.1, T_2012 + 2.2));
  const leave = ease.inCubic(prog(t, T_TASK - 0.6, T_TASK + 0.5));
  const k = prog(t, T_2012, T_TASK + 0.5);
  return (
    <Stage3D pose={{ position: [wobble(t * 0.3, 1) * 0.4, wobble(t * 0.3, 2) * 0.3, lerp(13, 11, ease.inOutSine(k))], target: [0, 0, 0], fov: 42 }} bloom={1.1} threshold={0.2}>
      <ParticleText
        a={a}
        b={b}
        state={{ time: t, mix: ease.inOutCubic(prog(t, T_ILSVRC - 0.2, T_ILSVRC + 1.4)), scatter: Math.max(form, leave), swirl: t * 0.2 + form * 2, alpha: 1 - leave * 0.6 }}
        colors={[CYAN, IVORY]}
        size={0.085}
      />
    </Stage3D>
  );
};

const YearCaption = ({ t }: { t: number }) => {
  const k = rise(t, T_ILSVRC + 0.9, 0.7);
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 230, pointerEvents: "none" }}>
      <Mono size={18} color={AMBER} style={{ opacity: k, letterSpacing: 8 }}>
        IMAGENET LARGE SCALE VISUAL RECOGNITION CHALLENGE
      </Mono>
      <Body size={30} color={DIM} style={{ opacity: k, marginTop: 14, letterSpacing: 10 }}>
        ImageNet 大规模视觉识别挑战赛
      </Body>
    </AbsoluteFill>
  );
};

/* ── beat B: one photo, a thousand classes, five guesses ─────────────────── */
const ClassWall = ({ t }: { t: number }) => {
  const cols = 25;
  const scroll = (t - T_TASK) * 14;
  const lit = rise(t, T_THOUSAND, 1.2);
  return (
    <AbsoluteFill style={{ perspective: 1400, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: -200,
          right: -200,
          top: -100,
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          rowGap: 12,
          columnGap: 10,
          transform: `rotateX(52deg) translateY(${-scroll}px) translateZ(-120px)`,
          transformOrigin: "50% 0%",
          fontFamily: FONT_MONO,
          fontSize: 15,
          color: IVORY,
        }}
      >
        {DATA.classes.map((c, i) => {
          const flick = (Math.sin(i * 12.9898) * 43758.5453) % 1;
          return (
            <div key={i} style={{ opacity: (0.1 + 0.35 * Math.abs(flick)) * lit, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {c}
            </div>
          );
        })}
      </div>
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${BG} 0%, transparent 30%, transparent 60%, ${BG} 100%)` }} />
    </AbsoluteFill>
  );
};

const Guesses = ({ t }: { t: number }) => {
  const photo = rise(t, T_TASK + 0.3, 0.8);
  const count = rise(t, T_THOUSAND, 0.6);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 300,
          top: 250,
          width: 460,
          height: 460,
          borderRadius: 16,
          overflow: "hidden",
          opacity: photo,
          transform: `translateY(${(1 - photo) * 30}px) scale(${0.96 + 0.04 * photo})`,
          boxShadow: `0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px ${FAINT}`,
        }}
      >
        <Img src={asset("cat.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div style={{ position: "absolute", left: 300, top: 730, opacity: count, display: "flex", alignItems: "baseline", gap: 14 }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 64, fontWeight: 700, color: AMBER }}>1000</span>
        <span style={{ fontFamily: FONT_CN, fontSize: 30, color: IVORY }}>个类别中选一个</span>
      </div>
      <Panel at={{ x: 900, y: 270 }} style={{ width: 720, padding: "34px 40px" }} glow={CYAN}>
        <Mono color={CYAN} size={16} style={{ marginBottom: 22, opacity: rise(t, T_GUESS, 0.5) }}>
          TOP-5 · 允许猜五次
        </Mono>
        {DATA.preds.map((p, i) => {
          const k = rise(t, T_FIVE + i * 0.32, 0.45);
          const correct = i === 0 && t >= T_HIT;
          const hit = correct ? rise(t, T_HIT, 0.4) : 0;
          return (
            <div
              key={p.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 22,
                height: 64,
                opacity: k,
                transform: `translateX(${(1 - k) * 40}px)`,
                borderRadius: 10,
                padding: "0 18px",
                background: `rgba(168,255,96,${0.12 * hit})`,
                border: `1px solid rgba(168,255,96,${0.6 * hit})`,
              }}
            >
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: DIM, width: 30 }}>{i + 1}</span>
              <span style={{ fontFamily: FONT_CN, fontSize: 32, color: IVORY, width: 150 }}>{PRED_ZH[p.label]}</span>
              <span style={{ fontFamily: FONT_MONO, fontSize: 20, color: DIM, flex: 1 }}>{p.label}</span>
              <span style={{ fontFamily: FONT_CN, fontSize: 28, color: LIME, opacity: hit, transform: `scale(${0.6 + 0.4 * ease.outBack(hit)})` }}>✓ 答对</span>
            </div>
          );
        })}
      </Panel>
    </AbsoluteFill>
  );
};

/* ── beat C: the leaderboard ─────────────────────────────────────────────── */
const TEAMS = [
  { name: "SuperVision", sub: "Krizhevsky · Sutskever · Hinton", err: 15.3, first: true },
  { name: "ISI", sub: "东京大学", err: 26.2 },
  { name: "OXFORD_VGG", sub: "牛津大学", err: 27.0 },
  { name: "XRCE / INRIA", sub: "施乐欧洲研究中心", err: 27.1 },
  { name: "UvA", sub: "阿姆斯特丹大学", err: 29.6 },
];
const BAR_X = 640;
const BAR_PX = 30; // px per percentage point
const ROW_H = 104;

const Board = ({ t }: { t: number }) => {
  const firstIn = rise(t, T_FIRST - 0.15, 0.9, ease.outExpo);
  const shift = ease.inOutCubic(prog(t, T_FIRST - 0.3, T_FIRST + 0.4));
  const gap = rise(t, T_GAP, 0.8);
  const hist = rise(t, T_YEAR, 0.8);
  const boom = flash(t, T_FIRST, 0.35);
  return (
    <AbsoluteFill>
      <Heading size={44} at={{ x: 160, y: 120 }} style={{ opacity: rise(t, T_BOARD, 0.6) }}>
        ILSVRC 2012 · 图像分类成绩
      </Heading>
      <Mono at={{ x: 162, y: 190 }} size={16} style={{ opacity: rise(t, T_BOARD + 0.2, 0.6) }}>
        TOP-5 ERROR RATE · 错误率越低越好
      </Mono>
      {TEAMS.map((team, i) => {
        const isFirst = !!team.first;
        const enter = isFirst ? firstIn : rise(t, T_BOARD + 0.2 + (i - 1) * 0.18, 0.7);
        const row = isFirst ? 0 : i - 1 + shift;
        const y = 270 + row * ROW_H;
        const w = team.err * BAR_PX * (isFirst ? firstIn : rise(t, T_BOARD + 0.4 + (i - 1) * 0.18, 1.1));
        const hl = team.name === "ISI" ? rise(t, T_SECOND, 0.4) : 0;
        const col = isFirst ? CYAN : hl > 0 ? CORAL : "rgba(236,241,248,0.32)";
        return (
          <div key={team.name} style={{ position: "absolute", left: 0, top: y, height: ROW_H, width: 1920, opacity: enter }}>
            <div style={{ position: "absolute", right: 1920 - BAR_X + 40, top: 18, textAlign: "right" }}>
              <div style={{ fontFamily: FONT_MONO, fontSize: 26, color: isFirst ? CYAN : IVORY, fontWeight: 600 }}>{team.name}</div>
              <div style={{ fontFamily: FONT_CN, fontSize: 18, color: DIM, marginTop: 4 }}>{team.sub}</div>
            </div>
            <div
              style={{
                position: "absolute",
                left: BAR_X,
                top: 26,
                height: 50,
                width: w,
                borderRadius: 6,
                background: isFirst ? `linear-gradient(90deg, ${CYAN}55, ${CYAN})` : col,
                boxShadow: isFirst ? `0 0 ${30 + boom * 80}px ${CYAN}` : hl ? `0 0 30px ${CORAL}88` : "none",
              }}
            />
            <div style={{ position: "absolute", left: BAR_X + w + 22, top: 26, fontFamily: FONT_DISPLAY, fontSize: 40, fontWeight: 700, color: isFirst ? CYAN : hl ? CORAL : IVORY }}>
              {team.err.toFixed(1)}%
            </div>
          </div>
        );
      })}
      {/* the gap */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: gap }}>
        <line x1={BAR_X + 15.3 * BAR_PX} y1={250} x2={BAR_X + 15.3 * BAR_PX} y2={790} stroke={CYAN} strokeDasharray="6 8" strokeWidth={2} />
        <line x1={BAR_X + 26.2 * BAR_PX} y1={250} x2={BAR_X + 26.2 * BAR_PX} y2={790} stroke={CORAL} strokeDasharray="6 8" strokeWidth={2} />
        <line x1={BAR_X + 15.3 * BAR_PX} y1={820} x2={BAR_X + (15.3 + 10.9 * gap) * BAR_PX} y2={820} stroke={AMBER} strokeWidth={4} />
      </svg>
      <div style={{ position: "absolute", left: BAR_X + 15.3 * BAR_PX, width: 10.9 * BAR_PX, top: 836, textAlign: "center", opacity: gap }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 46, fontWeight: 800, color: AMBER }}>−10.9</span>
        <span style={{ fontFamily: FONT_CN, fontSize: 24, color: AMBER, marginLeft: 10 }}>个百分点</span>
      </div>
      <Panel at={{ x: 1440, y: 790 }} style={{ padding: "20px 28px", opacity: hist, transform: `translateY(${(1 - hist) * 20}px)` }} glow={CORAL}>
        <Mono size={14} style={{ marginBottom: 10 }}>此前的冠军</Mono>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, color: IVORY }}>
          2010 <span style={{ color: DIM }}>28.2%</span> → 2011 <span style={{ color: DIM }}>25.8%</span>
        </div>
        <div style={{ fontFamily: FONT_CN, fontSize: 22, color: CORAL, marginTop: 8 }}>一年只进步了 2.4 个百分点</div>
      </Panel>
    </AbsoluteFill>
  );
};

/* ── beat D/E: AlexNet title + the three questions ───────────────────────── */
const Title3D = ({ t }: { t: number }) => {
  const pts = useTextPoints("AlexNet", '800 250px "Unbounded"', 13, 3);
  if (!pts) return null;
  const form = 1 - ease.outCubic(prog(t, T_NAME - 0.9, T_NAME + 1.2));
  const up = ease.inOutCubic(prog(t, T_Q - 0.4, T_Q + 1.2));
  return (
    <Stage3D pose={{ position: [wobble(t * 0.25, 4) * 0.5, lerp(0, -3.4, up), lerp(12, 15, up)], target: [0, lerp(0, -3.2, up), 0], fov: 40 }} bloom={1.3} threshold={0.15}>
      <ParticleText a={pts} b={pts} state={{ time: t, mix: 0, scatter: form, swirl: form * 3 + t * 0.05, alpha: 1, hot: flash(t, T_NAME + 0.4, 0.5) * 0.5 }} colors={[CYAN, IVORY]} size={0.09} count={60000} />
    </Stage3D>
  );
};

const Team = ({ t }: { t: number }) => {
  const names = ["Alex Krizhevsky", "Ilya Sutskever", "Geoffrey Hinton"];
  const out = ease.inCubic(prog(t, T_NAME - 1.0, T_NAME - 0.2));
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "row", gap: 120, opacity: 1 - out }}>
      {names.map((n, i) => {
        const k = rise(t, T_TEAM + 1.3 + i * 0.25, 0.6);
        return (
          <div key={n} style={{ textAlign: "center", opacity: k, transform: `translateY(${(1 - k) * 30}px)` }}>
            <div style={{ width: 150, height: 150, borderRadius: "50%", margin: "0 auto", border: `2px solid ${AMBER}`, boxShadow: `0 0 40px ${AMBER}44`, position: "relative" }}>
              <div style={{ position: "absolute", left: 50, top: 28, width: 50, height: 50, borderRadius: "50%", background: AMBER, opacity: 0.85 }} />
              <div style={{ position: "absolute", left: 28, top: 88, width: 94, height: 46, borderRadius: "47px 47px 8px 8px", background: AMBER, opacity: 0.85 }} />
            </div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 24, color: IVORY, marginTop: 26 }}>{n}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Questions = ({ t }: { t: number }) => {
  const sub = rise(t, T_NAME + 0.9, 0.8);
  const qs: Array<[number, string, string]> = [
    [T_Q1, "为什么这样想？", "WHY THINK"],
    [T_Q2, "为什么这样设计？", "WHY DESIGN"],
    [T_Q3, "改变了什么？", "WHAT CHANGED"],
  ];
  const up = ease.inOutCubic(prog(t, T_Q - 0.4, T_Q + 1.2));
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: lerp(720, 330, up), width: "100%", textAlign: "center", opacity: sub }}>
        <Mono size={18} color={DIM} style={{ letterSpacing: 6 }}>
          ImageNet Classification with Deep Convolutional Neural Networks · NIPS 2012
        </Mono>
      </div>
      <div style={{ position: "absolute", top: 520, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 60 }}>
        {qs.map(([at, zh, en], i) => {
          const k = rise(t, at - 0.1, 0.7);
          return (
            <div key={en} style={{ width: 520, opacity: k, transform: `translateY(${(1 - k) * 40}px)`, borderTop: `2px solid ${i === 2 ? CYAN : AMBER}`, paddingTop: 26 }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: i === 2 ? CYAN : AMBER, letterSpacing: 4 }}>
                0{i + 1} · {en}
              </div>
              <div style={{ fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 54, color: IVORY, marginTop: 18, letterSpacing: 4, whiteSpace: "nowrap" }}>
                <Reveal t={t} at={at} text={zh} per={0.06} />
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const Open = ({ t }: { t: number }) => (
  <AbsoluteFill style={{ background: BG }}>
    <Backdrop grid={0.035} />
    <Show t={t} from={S.start} to={T_TASK + 0.6} fadeIn={0}>
      <Year t={t} />
      <YearCaption t={t} />
    </Show>
    <Show t={t} from={T_TASK - 0.2} to={T_BOARD + 0.2}>
      <ClassWall t={t} />
      <Guesses t={t} />
    </Show>
    <Show t={t} from={T_BOARD - 0.2} to={T_TEAM + 0.3}>
      <Board t={t} />
    </Show>
    <Show t={t} from={T_TEAM - 0.1} to={T_NAME}>
      <Team t={t} />
    </Show>
    <Show t={t} from={T_NAME - 1.2} to={S.end} fadeIn={0.3}>
      <Title3D t={t} />
      <Questions t={t} />
    </Show>
  </AbsoluteFill>
);

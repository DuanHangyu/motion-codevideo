import { AbsoluteFill } from "remotion";
import { Backdrop } from "../components/Frame";
import { Show } from "../components/Show";
import { Body, Heading, Mono } from "../components/ui";
import { flash, hash, lerp, rise } from "../lib/anim";
import { cue, scene } from "../lib/timeline";
import { AMBER, BG, CORAL, CYAN, DIM, FAINT, FONT_CN, FONT_DISPLAY, FONT_MONO, FONT_TITLE, IVORY, LIME, VIOLET } from "../lib/theme";

const S = scene("impact");
const T_I1 = cue("i1");
const T_WIN = cue("i1", "15.3%");
const T_I2 = cue("i2");
const T_NEXT = cue("i2", "第二年");
const T_I3 = cue("i3");
const T_VGG = cue("i3", "19层");
const T_GOOG = cue("i3", "22层");
const T_RES = cue("i3", "2015年");
const T_36 = cue("i3", "3.6%");
const T_HUMAN = cue("i3", "比人类");
const T_I4 = cue("i4");
const T_SPEECH = cue("i4", "语音识别");
const T_MT = cue("i4", "机器翻译");
const T_LLM = cue("i4", "大语言模型");

/* ── i1–i2: the win, and everyone switching ────────────────────────────── */
const TEAMS_2013 = [
  ["Clarifai", 11.7],
  ["NUS", 13.0],
  ["ZF", 13.5],
  ["Andrew Howard", 13.6],
  ["OverFeat · NYU", 14.2],
  ["UvA-Euvision", 14.3],
  ["Adobe", 15.2],
  ["VGG", 15.2],
] as const;

const Win = ({ t }: { t: number }) => {
  const k = rise(t, T_WIN - 0.3, 0.6);
  const boom = flash(t, T_WIN, 0.5);
  const next = rise(t, T_NEXT - 0.2, 0.6);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: lerp(330, 150, next), textAlign: "center", transform: `scale(${lerp(1, 0.6, next)})` }}>
        <div style={{ fontFamily: FONT_MONO, fontSize: 22, color: CYAN, letterSpacing: 8, opacity: k }}>ILSVRC 2012 冠军 · SUPERVISION</div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 220, fontWeight: 800, color: CYAN, opacity: k, textShadow: `0 0 ${60 + boom * 120}px ${CYAN}`, lineHeight: 1.1 }}>15.3%</div>
        <div style={{ fontFamily: FONT_CN, fontSize: 34, color: DIM, opacity: k }}>
          第二名 <span style={{ color: CORAL, fontFamily: FONT_DISPLAY }}>26.2%</span>
        </div>
      </div>
      <div style={{ position: "absolute", left: 220, right: 220, top: 520, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 22, opacity: next }}>
        {TEAMS_2013.map(([name, err], i) => {
          const kk = rise(t, T_NEXT + 0.2 + i * 0.12, 0.5);
          return (
            <div key={name} style={{ padding: "18px 22px", borderRadius: 14, border: `1px solid ${AMBER}66`, background: `${AMBER}10`, opacity: kk, transform: `translateY(${(1 - kk) * 24}px)` }}>
              <div style={{ fontFamily: FONT_MONO, fontSize: 20, color: IVORY }}>{name}</div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 30, color: AMBER, marginTop: 6 }}>{err}%</div>
            </div>
          );
        })}
      </div>
      <Heading size={44} at={{ x: 960, y: 860 }} center color={AMBER} style={{ opacity: rise(t, T_NEXT + 1.4, 0.6), whiteSpace: "nowrap" }}>
        2013 年的前几名：几乎都转向了深度卷积网络
      </Heading>
    </AbsoluteFill>
  );
};

/* ── i3: deeper and deeper ─────────────────────────────────────────────── */
const YEARS = [
  { y: 2010, err: 28.2, who: "NEC", layers: 0, note: "传统方法" },
  { y: 2011, err: 25.8, who: "XRCE", layers: 0, note: "传统方法" },
  { y: 2012, err: 15.3, who: "AlexNet", layers: 8, note: "8 层" },
  { y: 2013, err: 11.7, who: "Clarifai", layers: 8, note: "卷积网络" },
  { y: 2014, err: 6.7, who: "GoogLeNet", layers: 22, note: "22 层 · VGG 19 层" },
  { y: 2015, err: 3.6, who: "ResNet", layers: 152, note: "152 层" },
];

const Deeper = ({ t }: { t: number }) => {
  const X0 = 260;
  const DX = 250;
  const BASE = 820;
  const PX = 15; // px per percentage point
  const human = rise(t, T_HUMAN - 0.2, 0.6);
  const at = (i: number) => [T_I3 - 0.4, T_I3 - 0.2, T_I3, T_I3 + 0.3, T_GOOG - 0.2, T_RES][i];
  return (
    <AbsoluteFill>
      <Mono at={{ x: X0, y: 170 }} size={16}>
        ILSVRC 历年冠军 · TOP-5 错误率
      </Mono>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <line x1={X0 - 40} y1={BASE} x2={X0 + DX * 6} y2={BASE} stroke={FAINT} strokeWidth={2} />
        <g opacity={human}>
          <line x1={X0 - 40} y1={BASE - 5.1 * PX} x2={X0 + DX * 6} y2={BASE - 5.1 * PX} stroke={LIME} strokeWidth={3} strokeDasharray="10 8" />
          <text x={X0 + DX * 6} y={BASE - 5.1 * PX - 14} fill={LIME} fontFamily={FONT_CN} fontSize={24} textAnchor="end">
            人类 ≈ 5.1%
          </text>
        </g>
      </svg>
      {YEARS.map((d, i) => {
        const k = rise(t, at(i), 0.7);
        const h = d.err * PX * k;
        const x = X0 + i * DX;
        const col = d.layers === 0 ? DIM : d.y === 2012 ? CYAN : d.y === 2015 ? LIME : AMBER;
        const stack = Math.min(40, Math.round(d.layers / 4));
        return (
          <div key={d.y}>
            <div style={{ position: "absolute", left: x, top: BASE - h, width: 120, height: h, borderRadius: "8px 8px 0 0", background: d.layers === 0 ? "rgba(236,241,248,0.18)" : `linear-gradient(180deg, ${col}, ${col}55)`, boxShadow: d.y === 2012 ? `0 0 40px ${CYAN}66` : "none" }} />
            <div style={{ position: "absolute", left: x, width: 120, top: BASE - h - 52, textAlign: "center", fontFamily: FONT_DISPLAY, fontSize: 30, fontWeight: 700, color: col, opacity: k }}>{d.err}%</div>
            <div style={{ position: "absolute", left: x - 30, width: 180, top: BASE + 14, textAlign: "center", opacity: k }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: IVORY }}>{d.y}</div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 17, color: col === DIM ? DIM : col }}>{d.who}</div>
              <div style={{ fontFamily: FONT_CN, fontSize: 16, color: DIM }}>{d.note}</div>
            </div>
            {/* the depth, stacked as layers to the right of each bar */}
            {Array.from({ length: stack }, (_, j) => (
              <div key={j} style={{ position: "absolute", left: x + 128, top: BASE - 8 - j * 10, width: 24, height: 7, borderRadius: 2, background: col, opacity: k * rise(t, at(i) + 0.3 + j * 0.02, 0.2) }} />
            ))}
          </div>
        );
      })}
      <Body size={30} at={{ x: 1450, y: 300 }} color={LIME} style={{ opacity: rise(t, T_36, 0.6), whiteSpace: "nowrap" }}>
        2015：机器的错误率低于人类
      </Body>
    </AbsoluteFill>
  );
};

/* ── i4: it spread everywhere ──────────────────────────────────────────── */
const RINGS = [
  { zh: "图像识别", en: "VISION", at: () => T_I4, color: CYAN },
  { zh: "语音识别", en: "SPEECH", at: () => T_SPEECH, color: AMBER },
  { zh: "机器翻译", en: "TRANSLATION", at: () => T_MT, color: VIOLET },
  { zh: "大语言模型", en: "LLM", at: () => T_LLM, color: LIME },
];

const Spread = ({ t }: { t: number }) => (
  <AbsoluteFill>
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      {RINGS.map((r, i) => {
        const k = rise(t, r.at() - 0.2, 1.0);
        const R = 110 + i * 125;
        return (
          <g key={r.en} opacity={k}>
            <circle cx={960} cy={540} r={R * (0.8 + 0.2 * k)} fill="none" stroke={r.color} strokeWidth={2} strokeOpacity={0.6} />
            {Array.from({ length: 18 + i * 10 }, (_, j) => {
              const a = (j / (18 + i * 10)) * Math.PI * 2 + t * (0.05 + i * 0.02);
              return <circle key={j} cx={960 + Math.cos(a) * R} cy={540 + Math.sin(a) * R} r={2 + hash(j * 7 + i) * 2.5} fill={r.color} opacity={0.7} />;
            })}
          </g>
        );
      })}
    </svg>
    {RINGS.map((r, i) => {
      const k = rise(t, r.at() - 0.1, 0.6);
      const R = 110 + i * 125;
      const ang = [-Math.PI / 2, -0.45, Math.PI + 0.45, 0.25][i];
      return (
        <div key={r.en} style={{ position: "absolute", left: 960 + Math.cos(ang) * R, top: 540 + Math.sin(ang) * R, transform: "translate(-50%, -50%)", textAlign: "center", opacity: k, whiteSpace: "nowrap", background: "rgba(4,6,12,0.85)", padding: "6px 14px", borderRadius: 10 }}>
          <div style={{ fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 34, color: r.color }}>{r.zh}</div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 13, color: DIM }}>{r.en}</div>
        </div>
      );
    })}
    <div style={{ position: "absolute", left: 960, top: 540, transform: "translate(-50%, -50%)", fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 800, color: IVORY }}>2012</div>
  </AbsoluteFill>
);

export const Impact = ({ t }: { t: number }) => (
  <AbsoluteFill style={{ background: BG }}>
    <Backdrop grid={0.03} />
    <Show t={t} from={S.start} to={T_I3 + 0.1} fadeIn={0.3}>
      <Win t={t} />
    </Show>
    <Show t={t} from={T_I3 - 0.6} to={T_I4 + 0.1}>
      <Deeper t={t} />
    </Show>
    <Show t={t} from={T_I4 - 0.1} to={S.end}>
      <Spread t={t} />
    </Show>
    <Mono at={{ x: 960, y: 1040 }} center size={11} color={FAINT} style={{ opacity: rise(t, T_I3, 0.5) * (1 - rise(t, T_I4, 0.5)) }}>
      {`人类水平为 Karpathy 2014 年的估计；2013 年冠军为 Clarifai，2014 年亚军 VGG 7.3%`}
    </Mono>
  </AbsoluteFill>
);

import { AbsoluteFill } from "remotion";
import { useTextPoints } from "../../lib/text-points";
import { Backdrop } from "../components/Frame";
import { ParticleText } from "../components/ParticleText";
import { Show } from "../components/Show";
import { Stage3D } from "../components/Stage3D";
import { Heading, Mono, Reveal } from "../components/ui";
import { ease, lerp, prog, rise, wobble } from "../lib/anim";
import { cue, lineEnd, scene } from "../lib/timeline";
import { AMBER, BG, CORAL, CYAN, DIM, FAINT, FONT_CN, FONT_DISPLAY, FONT_MONO, FONT_TITLE, IVORY, LIME, VIOLET } from "../lib/theme";

const S = scene("legacy");
const T_E1 = cue("e1");
const T_E2 = cue("e2");
const T_PARTS = cue("e2", "卷积");
const T_SHADOW = cue("e2", "都能找到");
const T_E3 = cue("e3");
const T_OLD = cue("e3", "从");
const T_NEW = cue("e3", "变成了");
const T_DATA_DECIDES = cue("e3", "让数据");
const T_E4 = cue("e4");
const T_D = cue("e4", "足够多的数据");
const T_C = cue("e4", "足够强的算力");
const T_A = cue("e4", "合适的网络结构");
const T_E5 = cue("e5");
const T_E6 = cue("e6");
const T_ALEX = cue("e6", "Alex Krizhevsky");
const T_ILYA = cue("e6", "Ilya");
const T_HINTON = cue("e6", "Geoffrey");
const T_NOBEL = cue("e6", "诺贝尔");
const T_E7 = cue("e7");
const T_KEEP = cue("e7", "你会保留什么");
const T_CHANGE = cue("e7", "又会改变什么");
const T_E8 = cue("e8");
const T_END = lineEnd("e8");

/* ── e1–e2: none of the parts were new ─────────────────────────────────── */
const PARTS = [
  { zh: "卷积网络", year: "1980 / 1989", who: "福岛邦彦 · 杨立昆", color: AMBER, x: -560, y: -170 },
  { zh: "反向传播", year: "1986", who: "Rumelhart · Hinton · Williams", color: CYAN, x: 0, y: -260 },
  { zh: "ReLU", year: "2010", who: "Nair & Hinton", color: LIME, x: 560, y: -170 },
  { zh: "GPU 计算", year: "2000s", who: "为游戏而生的显卡", color: VIOLET, x: -380, y: 190 },
  { zh: "ImageNet", year: "2009", who: "李飞飞团队", color: CYAN, x: 380, y: 190 },
];

const Parts = ({ t }: { t: number }) => {
  const gather = ease.inOutCubic(prog(t, T_SHADOW, T_SHADOW + 1.6));
  return (
    <AbsoluteFill>
      <Heading size={64} at={{ x: 960, y: lerp(540, 150, rise(t, T_E2 - 0.3, 0.8)) }} center color={IVORY}>
        AlexNet 真正改变的，到底是什么？
      </Heading>
      {PARTS.map((p, i) => {
        const k = rise(t, T_PARTS + i * 0.3, 0.6);
        const x = 960 + p.x * (1 - gather * 0.55);
        const y = 560 + p.y * (1 - gather * 0.55);
        return (
          <div key={p.zh} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${0.8 + 0.2 * k})`, opacity: k, textAlign: "center", padding: "18px 28px", borderRadius: 16, border: `2px solid ${p.color}`, background: `${p.color}12`, minWidth: 260 }}>
            <div style={{ fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 40, color: IVORY }}>{p.zh}</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: p.color, marginTop: 4 }}>{p.year}</div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 14, color: DIM, marginTop: 4 }}>{p.who}</div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 960, top: 560, transform: "translate(-50%, -50%)", opacity: gather, textAlign: "center" }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 56, fontWeight: 800, color: IVORY, textShadow: `0 0 40px ${CYAN}` }}>AlexNet</div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 18, color: DIM }}>2012 · 第一次把它们组合到一起</div>
      </div>
    </AbsoluteFill>
  );
};

/* ── e3: the shift in thinking ─────────────────────────────────────────── */
const Shift = ({ t }: { t: number }) => {
  const old = rise(t, T_OLD, 0.6);
  const strike = rise(t, T_NEW - 0.3, 0.6);
  const neu = rise(t, T_NEW, 0.7);
  const data = rise(t, T_DATA_DECIDES, 0.6);
  const Chip = ({ children, color }: { children: string; color: string }) => (
    <span style={{ display: "inline-block", padding: "12px 26px", borderRadius: 12, border: `2px solid ${color}`, background: `${color}14`, fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 46, color: IVORY }}>{children}</span>
  );
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 70 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 26, opacity: old * (1 - strike * 0.55), position: "relative" }}>
        <Mono size={18} style={{ width: 140 }}>
          2012 年以前
        </Mono>
        <Chip color={AMBER}>人</Chip>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 40, color: DIM }}>→</span>
        <Chip color={AMBER}>设计特征</Chip>
        <div style={{ position: "absolute", left: 160, right: 0, top: "50%", height: 4, background: CORAL, transform: `scaleX(${strike})`, transformOrigin: "0 50%" }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 26, opacity: neu, transform: `translateY(${(1 - neu) * 30}px)` }}>
        <Mono size={18} color={CYAN} style={{ width: 140 }}>
          AlexNet 之后
        </Mono>
        <Chip color={CYAN}>人</Chip>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 40, color: DIM }}>→</span>
        <Chip color={CYAN}>设计结构</Chip>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 40, color: DIM, opacity: data }}>＋</span>
        <span style={{ opacity: data }}>
          <Chip color={LIME}>数据决定特征</Chip>
        </span>
      </div>
    </AbsoluteFill>
  );
};

/* ── e4–e5: the recipe, and it still works ─────────────────────────────── */
const Recipe = ({ t }: { t: number }) => {
  const items: Array<[number, string, string, string]> = [
    [T_D, "数据", "DATA", CYAN],
    [T_C, "算力", "COMPUTE", AMBER],
    [T_A, "结构", "ARCHITECTURE", LIME],
  ];
  const result = rise(t, T_A + 1.6, 0.7);
  const today = rise(t, T_E5, 0.7);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: lerp(380, 250, today), display: "flex", justifyContent: "center", alignItems: "center", gap: 34 }}>
        {items.map(([at, zh, en, c], i) => {
          const k = rise(t, at, 0.6);
          return (
            <div key={en} style={{ display: "flex", alignItems: "center", gap: 34 }}>
              {i > 0 && <span style={{ fontFamily: FONT_DISPLAY, fontSize: 60, color: DIM, opacity: k }}>×</span>}
              <div style={{ width: 260, padding: "30px 0", textAlign: "center", borderRadius: 20, border: `2px solid ${c}`, background: `${c}14`, opacity: k, transform: `scale(${0.85 + 0.15 * ease.outBack(k)})` }}>
                <div style={{ fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 64, color: IVORY }}>{zh}</div>
                <div style={{ fontFamily: FONT_MONO, fontSize: 16, color: c, letterSpacing: 4, marginTop: 6 }}>{en}</div>
              </div>
            </div>
          );
        })}
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 60, color: DIM, opacity: result }}>=</span>
        <div style={{ fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 52, color: IVORY, opacity: result, width: 280, lineHeight: 1.3 }}>学会过去学不会的东西</div>
      </div>
      {/* the same recipe, scaled up ever since */}
      <div style={{ position: "absolute", left: 260, right: 260, top: 640, opacity: today }}>
        <svg width={1400} height={260}>
          <line x1={0} y1={200} x2={1400} y2={200} stroke={FAINT} strokeWidth={2} />
          {[
            [0, "2012", "AlexNet", "6 千万参数", 0.06],
            [380, "2015", "ResNet", "152 层", 0.12],
            [760, "2017", "Transformer", "注意力机制", 0.3],
            [1140, "2020s", "大语言模型", "数千亿参数", 1],
          ].map(([x, y, name, note, s], i) => {
            const k = rise(t, T_E5 + 0.3 + i * 0.35, 0.5);
            const h = 20 + (s as number) * 150;
            return (
              <g key={y as string} opacity={k}>
                <rect x={(x as number) + 40} y={200 - h * k} width={120} height={h * k} rx={8} fill={[CYAN, AMBER, VIOLET, LIME][i]} opacity={0.75} />
                <text x={(x as number) + 100} y={234} textAnchor="middle" fill={IVORY} fontFamily={FONT_DISPLAY} fontSize={22}>
                  {y}
                </text>
                <text x={(x as number) + 200} y={200 - h * k + 20} fill={IVORY} fontFamily={FONT_MONO} fontSize={20}>
                  {name}
                </text>
                <text x={(x as number) + 200} y={200 - h * k + 46} fill={DIM} fontFamily={FONT_CN} fontSize={18}>
                  {note}
                </text>
              </g>
            );
          })}
        </svg>
        <Mono size={15} color={DIM}>
          同一个配方：更多数据 · 更强算力 · 更好的结构（柱高示意，非比例）
        </Mono>
      </div>
    </AbsoluteFill>
  );
};

/* ── e6: the authors ───────────────────────────────────────────────────── */
const AUTHORS = [
  { name: "Alex Krizhevsky", role: "论文第一作者", at: () => T_ALEX, color: CYAN, init: "AK" },
  { name: "Ilya Sutskever", role: "后来联合创办了 OpenAI", at: () => T_ILYA, color: VIOLET, init: "IS" },
  { name: "Geoffrey Hinton", role: "导师 · 2018 图灵奖", at: () => T_HINTON, color: AMBER, init: "GH" },
];

const Authors = ({ t }: { t: number }) => {
  const nobel = rise(t, T_NOBEL - 0.2, 0.8);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", gap: 90, marginTop: -80 }}>
        {AUTHORS.map((a, i) => {
          const k = rise(t, a.at() - 0.2, 0.6);
          return (
            <div key={a.name} style={{ textAlign: "center", width: 380, opacity: k, transform: `translateY(${(1 - k) * 30}px)` }}>
              <div style={{ width: 190, height: 190, borderRadius: "50%", margin: "0 auto", border: `3px solid ${a.color}`, background: `radial-gradient(circle at 50% 35%, ${a.color}55, ${a.color}08 70%)`, display: "flex", justifyContent: "center", alignItems: "center", fontFamily: FONT_DISPLAY, fontSize: 56, fontWeight: 800, color: IVORY, boxShadow: i === 2 ? `0 0 ${30 + nobel * 60}px ${AMBER}88` : "none" }}>
                {a.init}
              </div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 28, color: IVORY, marginTop: 28 }}>{a.name}</div>
              <div style={{ fontFamily: FONT_CN, fontSize: 22, color: DIM, marginTop: 8 }}>{a.role}</div>
              {i === 2 && (
                <div style={{ marginTop: 22, opacity: nobel, transform: `scale(${0.8 + 0.2 * nobel})` }}>
                  <div style={{ display: "inline-block", padding: "10px 22px", borderRadius: 30, border: `2px solid ${AMBER}`, background: `${AMBER}1A`, fontFamily: FONT_CN, fontSize: 24, color: AMBER }}>🏅 2024 诺贝尔物理学奖</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ── e7–e8: the question, and the end card ─────────────────────────────── */
const Finale = ({ t }: { t: number }) => {
  const pts = useTextPoints("AlexNet", '800 250px "Unbounded"', 13, 3);
  if (!pts) return null;
  const form = 1 - ease.inOutCubic(prog(t, T_E8 + 0.3, T_E8 + 3.2));
  const q = rise(t, T_E7, 0.8) * (1 - rise(t, T_E8 - 0.4, 0.6));
  const answer = rise(t, T_E8, 0.8);
  const credits = rise(t, T_END + 0.6, 1.0);
  return (
    <AbsoluteFill>
      <Stage3D pose={{ position: [wobble(t * 0.2, 2) * 0.8, lerp(0.5, 0, 1 - form), lerp(18, 14, 1 - form)], target: [0, 0, 0], fov: 42 }} bloom={1.2} threshold={0.15}>
        <ParticleText a={pts} b={pts} state={{ time: t, mix: 0, scatter: 0.15 + 0.85 * form, swirl: t * 0.08, alpha: 0.85 }} colors={[CYAN, AMBER]} size={0.08} count={50000} />
      </Stage3D>
      <div style={{ position: "absolute", left: 0, right: 0, top: 360, textAlign: "center", opacity: q }}>
        <Mono size={18} color={AMBER} style={{ letterSpacing: 8 }}>
          留给你的问题
        </Mono>
        <div style={{ fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 60, color: IVORY, marginTop: 30, lineHeight: 1.6 }}>
          如果今天重新设计 AlexNet
          <br />
          <span style={{ color: CYAN, opacity: rise(t, T_KEEP, 0.5) }}>你会保留什么？</span>
          <span style={{ color: CORAL, opacity: rise(t, T_CHANGE, 0.5) }}> 又会改变什么？</span>
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 690, textAlign: "center", opacity: answer * (1 - credits * 0.3) }}>
        <div style={{ fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 46, color: IVORY, letterSpacing: 6 }}>
          <Reveal t={t} at={T_E8} text="也许，下一次改变，就从你的答案开始。" per={0.08} />
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 70, textAlign: "center", opacity: credits, fontFamily: FONT_MONO, fontSize: 14, color: DIM, lineHeight: 2, letterSpacing: 2 }}>
        <div>参考：Krizhevsky, Sutskever & Hinton. ImageNet Classification with Deep Convolutional Neural Networks. NIPS 2012.</div>
        <div>猫的照片：Pixabay / Wikimedia Commons（CC0）· 卷积核、特征图与预测：torchvision 预训练 AlexNet 真实计算</div>
        <div>配音：Microsoft Xiaoxiao 神经网络语音 · 音乐与音效：程序合成 · 动画：React · Remotion · Three.js</div>
      </div>
    </AbsoluteFill>
  );
};

export const Legacy = ({ t }: { t: number }) => (
  <AbsoluteFill style={{ background: BG }}>
    <Backdrop grid={0.03} />
    <Show t={t} from={S.start} to={T_E3 + 0.1} fadeIn={0.3}>
      <Parts t={t} />
    </Show>
    <Show t={t} from={T_E3 - 0.1} to={T_E4 + 0.1}>
      <Shift t={t} />
    </Show>
    <Show t={t} from={T_E4 - 0.1} to={T_E6 + 0.1}>
      <Recipe t={t} />
    </Show>
    <Show t={t} from={T_E6 - 0.1} to={T_E7 + 0.1}>
      <Authors t={t} />
    </Show>
    <Show t={t} from={T_E7 - 0.3} to={S.end + 1} fadeIn={0.8} fadeOut={0}>
      <Finale t={t} />
    </Show>
  </AbsoluteFill>
);

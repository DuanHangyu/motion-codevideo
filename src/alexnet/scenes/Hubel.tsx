import { PointerEvent, useEffect, useRef, useState } from "react";
import { AbsoluteFill } from "remotion";
import { ExploreTask, WorldButton } from "../components/ExploreUI";
import { Body, Heading, Mono } from "../components/ui";
import { hash, lerp, rise } from "../lib/anim";
import { explore, useExplore, capturePointer } from "../lib/explore";
import { sfx } from "../lib/sfx";
import { cue } from "../lib/timeline";
import { AMBER, CORAL, CYAN, DIM, FAINT, FONT_CN, FONT_DISPLAY, FONT_MONO, IVORY, LIME } from "../lib/theme";

const ZONE = "hubel";
const T_C6 = cue("c6");
const T_1959 = cue("c6", "1959");
const T_SMALL = cue("c6", "一小块");
const T_ORIENT = cue("c6", "特定方向");

/** Scripted bar: swings ±85° around vertical. */
export const barAngle = (t: number) => Math.sin((t - T_C6) * 0.9) * (Math.PI / 2) * 0.95;
/** Orientation tuning of a simple cell: sharp peak at its preferred angle (bars are symmetric, so period π). */
const tuning = (ang: number, pref: number) => Math.abs(Math.cos(ang - pref)) ** 6;
export const firingRate = (t: number) => tuning(barAngle(t), 0);
const BIN = 1 / 90;
const spikeAt = (bin: number) => hash(bin * 0.731 + 17) < firingRate(bin * BIN) * 0.55 + 0.01;

const SW = 640;
const SH = 470;
const SX = 160;
const SY = 300;
const FIELD_R = 150;
const MAX_HZ = 55;
const WINDOW = 3;

const NEURONS = [
  { id: "A", pref: 0, name: "神经元 A" },
  { id: "B", pref: Math.PI / 4, name: "神经元 B" },
  { id: "C", pref: Math.PI / 2, name: "神经元 C" },
];

type Play = { ang: number; x: number; y: number; neuron: number; spikes: number[]; samples: Array<[number, number]> };

/** Receptive field: full response inside, fading to nothing a bar-length outside. */
const inField = (x: number, y: number) => Math.max(0, Math.min(1, 1 - (Math.hypot(x, y) - FIELD_R * 0.6) / (FIELD_R * 0.8)));

export const Hubel = ({ t }: { t: number }) => {
  const ex = useExplore(ZONE);
  const [play, setPlay] = useState<Play | null>(null);
  const drag = useRef<"rotate" | "move" | null>(null);
  const last = useRef(ex.clock);

  useEffect(() => {
    if (ex.active && !play) setPlay({ ang: barAngle(t), x: 0, y: 0, neuron: 0, spikes: [], samples: [] });
    if (!ex.active && play) setPlay(null);
  }, [ex.active, play, t]);

  const rateOf = (p: Play) => tuning(p.ang, NEURONS[p.neuron].pref) * inField(p.x, p.y);

  // live neuron: Poisson spikes on wall-clock time, each one audible
  useEffect(() => {
    const dt = Math.min(0.1, ex.clock - last.current);
    last.current = ex.clock;
    if (!play || !ex.interactive) return;
    const hz = rateOf(play) * MAX_HZ + 0.6;
    if (Math.random() < hz * dt) {
      play.spikes.push(ex.clock);
      sfx.spike();
    }
    while (play.spikes.length && play.spikes[0] < ex.clock - WINDOW) play.spikes.shift();
  });

  const b = ex.blend;
  const scriptedAng = barAngle(t);
  const ang = play ? lerp(scriptedAng, play.ang, b) : scriptedAng;
  const bx = play ? play.x * b : 0;
  const by = play ? play.y * b : 0;
  const rate = play && b > 0.5 ? rateOf(play) : firingRate(t);
  const recent = play ? play.spikes.filter((s) => s > ex.clock - 0.25).length : 0;
  const pulse = play && play.spikes.length ? Math.exp(-(ex.clock - play.spikes[play.spikes.length - 1]) / 0.06) : 0;

  const onPointer = (e: PointerEvent<HTMLDivElement>) => {
    if (!play || !ex.interactive) return;
    const r = e.currentTarget.getBoundingClientRect();
    // composition pixels (the player scales the 1920×1080 frame)
    const x = ((e.clientX - r.left) / r.width) * SW - SW / 2;
    const y = ((e.clientY - r.top) / r.height) * SH - SH / 2;
    if (e.type === "pointerdown") {
      capturePointer(e.currentTarget, e.pointerId);
      explore.setDragging(true);
      drag.current = Math.hypot(x - play.x, y - play.y) < 46 ? "move" : "rotate";
    }
    if (!drag.current) return;
    let next = play;
    if (drag.current === "move") next = { ...play, x: Math.max(-SW / 2 + 30, Math.min(SW / 2 - 30, x)), y: Math.max(-SH / 2 + 30, Math.min(SH / 2 - 30, y)) };
    else next = { ...play, ang: Math.atan2(x - play.x, -(y - play.y)) };
    // the student measures the tuning curve themselves: keep one sample per 5° bin
    if (inField(next.x, next.y) > 0.9) {
      const deg = (((next.ang * 180) / Math.PI) % 180 + 180) % 180;
      const bin = Math.round(deg / 5) * 5;
      next = { ...next, samples: [...next.samples.filter(([d]) => d !== bin), [bin, rateOf(next)]] };
    }
    setPlay(next);
  };
  const stopDrag = () => {
    drag.current = null;
    explore.setDragging(false);
  };

  const field = Math.max(rise(t, T_SMALL, 0.6), b);
  const orient = rise(t, T_ORIENT, 0.6) * (1 - b);
  const now = Math.floor(t / BIN);
  const scriptedSpikes: number[] = [];
  for (let k = now - Math.floor(WINDOW / BIN); k <= now; k++) if (k * BIN > T_C6 && spikeAt(k)) scriptedSpikes.push(k);
  const scopeX = (age: number) => 880 - (age / WINDOW) * 880;
  const spikeXs = play && b > 0.5 ? play.spikes.map((s) => ({ x: scopeX(ex.clock - s), seed: s * 997 })) : scriptedSpikes.map((k) => ({ x: scopeX((now - k) * BIN), seed: k }));
  const glow = 0.4 + 0.6 * Math.min(1, rate * 1.2) + pulse * 0.8;

  return (
    <AbsoluteFill>
      <Heading size={44} at={{ x: 160, y: 140 }} style={{ opacity: rise(t, T_1959, 0.6) * (1 - b) }}>
        1959 · 休伯尔与威泽尔的实验
      </Heading>
      <Mono at={{ x: 162, y: 210 }} size={16} style={{ opacity: rise(t, T_1959 + 0.3, 0.6) * (1 - b) }}>
        HUBEL & WIESEL · 1981 年诺贝尔生理学或医学奖
      </Mono>
      {/* the stimulus screen the cat is looking at — in explore mode the student holds the light bar */}
      <div
        onPointerDown={onPointer}
        onPointerMove={onPointer}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        style={{
          position: "absolute",
          left: SX,
          top: SY,
          width: SW,
          height: SH,
          borderRadius: 16,
          background: "#05070B",
          border: `1px solid ${ex.interactive ? AMBER : FAINT}`,
          boxShadow: ex.interactive ? `0 0 0 1px ${AMBER}55, 0 0 ${40 + pulse * 60}px rgba(236,241,248,${0.08 + pulse * 0.2})` : undefined,
          overflow: "hidden",
          cursor: ex.interactive ? (drag.current ? "grabbing" : "grab") : undefined,
          touchAction: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: SW / 2 - 18 + bx,
            top: SH / 2 - 140 + by,
            width: 36,
            height: 280,
            background: IVORY,
            boxShadow: `0 0 ${30 + glow * 40}px rgba(236,241,248,${0.5 + glow * 0.4})`,
            transform: `rotate(${(ang * 180) / Math.PI}deg)`,
            borderRadius: 4,
          }}
        />
        <svg width={SW} height={SH} style={{ position: "absolute", inset: 0, opacity: field, pointerEvents: "none" }}>
          <circle cx={SW / 2} cy={SH / 2} r={FIELD_R} stroke={AMBER} strokeWidth={2} strokeDasharray="8 8" fill={`rgba(255,181,71,${0.03 + pulse * 0.08})`} />
          <text x={SW / 2 + 110} y={SH / 2 - 130} fill={AMBER} fontFamily={FONT_CN} fontSize={20}>
            感受野
          </text>
          {ex.interactive && (
            <g opacity={0.8}>
              <circle cx={SW / 2 + bx} cy={SH / 2 + by} r={22} fill="none" stroke={CYAN} strokeWidth={2} />
              <text x={SW / 2 + bx + 30} y={SH / 2 + by + 6} fill={CYAN} fontFamily={FONT_CN} fontSize={16}>
                按住中心可移动
              </text>
            </g>
          )}
        </svg>
        <Mono at={{ x: 24, y: 20 }} size={14}>
          {ex.interactive ? "拖动旋转光条 · 按住中心拖动可移出感受野" : "猫眼前的屏幕 · 一根光条在旋转"}
        </Mono>
      </div>
      {/* oscilloscope */}
      <div style={{ position: "absolute", left: 880, top: 300, width: 880, height: SH, borderRadius: 16, background: `rgba(${6 + pulse * 30},${12 + pulse * 40},${10 + pulse * 20},0.92)`, border: `1px solid ${LIME}44`, overflow: "hidden" }}>
        <svg width={880} height={SH} style={{ position: "absolute", inset: 0 }}>
          {Array.from({ length: 11 }, (_, i) => (
            <line key={i} x1={i * 88} y1={0} x2={i * 88} y2={SH} stroke={LIME} strokeOpacity={0.07} />
          ))}
          <line x1={0} y1={SH / 2} x2={880} y2={SH / 2} stroke={LIME} strokeOpacity={0.35} />
          {spikeXs.map(({ x, seed }) => {
            const h = 120 + hash(seed) * 60;
            return <path key={seed} d={`M ${x - 3} ${SH / 2} L ${x} ${SH / 2 - h} L ${x + 4} ${SH / 2 + h * 0.35} L ${x + 7} ${SH / 2}`} stroke={LIME} strokeWidth={2.5} fill="none" style={{ filter: "drop-shadow(0 0 4px #A8FF60)" }} />;
          })}
        </svg>
        <Mono at={{ x: 24, y: 20 }} size={14} color={LIME}>
          {play && b > 0.5 ? `${NEURONS[play.neuron].name}的放电 · 声音来自扬声器` : "视觉皮层中一个神经元的放电"}
        </Mono>
        <div style={{ position: "absolute", right: 30, top: 14, fontFamily: FONT_DISPLAY, fontSize: play && b > 0.5 ? 34 : 20, fontWeight: 700, color: LIME }}>
          {play && b > 0.5 ? recent * 4 : Math.round(rate * 48)} <span style={{ fontSize: 16, fontFamily: FONT_MONO }}>次/秒</span>
        </div>
      </div>
      <Body size={30} at={{ x: 960, y: 830 }} center color={rate > 0.5 ? LIME : DIM} style={{ opacity: orient, whiteSpace: "nowrap" }}>
        {rate > 0.5 ? "▲ 光条竖直时：疯狂放电" : "光条倾斜时：几乎沉默"}
      </Body>
      {play && <TuningCurve play={play} blend={b} />}
      {play && ex.interactive && (
        <div style={{ position: "absolute", left: 160, top: 800, display: "flex", gap: 10, alignItems: "center", opacity: b }}>
          <span style={{ fontFamily: FONT_CN, fontSize: 20, color: DIM, marginRight: 6 }}>换一个神经元记录：</span>
          {NEURONS.map((n, i) => (
            <WorldButton key={n.id} on={play.neuron === i} color={LIME} onClick={() => setPlay({ ...play, neuron: i, samples: [] })}>
              {n.name}
            </WorldButton>
          ))}
        </div>
      )}
      <ExploreTask
        zone={ZONE}
        task="转动光条，找到让这个神经元“疯狂放电”的方向"
        sub={["把光条移出感受野试试", "换一个神经元，它喜欢的方向一样吗？"]}
        goal="测满 12 个角度，画出它的方向调谐曲线"
        done={!!play && play.samples.length >= 12 && play.samples.some(([, r]) => r > 0.9)}
      />
    </AbsoluteFill>
  );
};

/** Polar half-plot that fills in as the student sweeps the bar: the neuron's orientation tuning curve. */
const TuningCurve = ({ play, blend }: { play: Play; blend: number }) => {
  const CX = 1000;
  const CY = 1010;
  const R = 200;
  const pt = (deg: number, r: number) => {
    const a = Math.PI - (deg * Math.PI) / 180; // 0° (vertical bar) on the right … 180° on the left
    return [CX + Math.cos(a) * r * R, CY - Math.sin(a) * r * R];
  };
  const pts = [...play.samples].sort((a, b) => a[0] - b[0]);
  const path = pts.map(([d, r], i) => `${i ? "L" : "M"} ${pt(d, r).join(" ")}`).join(" ");
  const deg = (((play.ang * 180) / Math.PI) % 180 + 180) % 180;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: blend, pointerEvents: "none" }}>
      {[0.33, 0.66, 1].map((r) => (
        <path key={r} d={`M ${CX - r * R} ${CY} A ${r * R} ${r * R} 0 0 1 ${CX + r * R} ${CY}`} stroke={FAINT} fill="none" />
      ))}
      <line x1={CX - R} y1={CY} x2={CX + R} y2={CY} stroke={FAINT} />
      <line x1={CX} y1={CY} x2={pt(deg, 1.05)[0]} y2={pt(deg, 1.05)[1]} stroke={IVORY} strokeOpacity={0.5} strokeDasharray="4 6" />
      {path && <path d={path} stroke={LIME} strokeWidth={3} fill="none" style={{ filter: "drop-shadow(0 0 6px #A8FF60)" }} />}
      {pts.map(([d, r]) => (
        <circle key={d} cx={pt(d, r)[0]} cy={pt(d, r)[1]} r={4} fill={r > 0.5 ? LIME : CORAL} />
      ))}
      <text x={CX - R - 10} y={CY - R + 8} fill={DIM} fontFamily={FONT_CN} fontSize={18} textAnchor="start">
        你测出的方向调谐曲线 · 已测 {pts.length} 个角度
      </text>
      <text x={CX + R + 8} y={CY + 4} fill={DIM} fontFamily={FONT_MONO} fontSize={14}>
        0°
      </text>
      <text x={CX - 6} y={CY - R - 8} fill={DIM} fontFamily={FONT_MONO} fontSize={14}>
        90°
      </text>
      <text x={CX - R - 40} y={CY + 4} fill={DIM} fontFamily={FONT_MONO} fontSize={14}>
        180°
      </text>
    </svg>
  );
};

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, Img } from "remotion";
import { Backdrop } from "../components/Frame";
import { Show } from "../components/Show";
import { Pose, Stage3D, lerpPose, projector } from "../components/Stage3D";
import { Body, Heading, Mono, Panel } from "../components/ui";
import { ExploreTask, WorldSlider } from "../components/ExploreUI";
import { useExplore } from "../lib/explore";
import { sfx } from "../lib/sfx";
import { ease, fmtInt, hash, lerp, prog, rise } from "../lib/anim";
import { DATA, asset } from "../lib/data";
import { cue, lineEnd, scene } from "../lib/timeline";
import { AMBER, BG, CORAL, CYAN, DIM, FAINT, FONT_CN, FONT_DISPLAY, FONT_MONO, FONT_TITLE, IVORY, LIME } from "../lib/theme";

const S = scene("pixels");
const T_PHOTO = S.start + 1.6;
const T_SEE = cue("p1", "计算机眼里");
const T_NUM = cue("p2", "一大堆");
const T_RGB = cue("p3");
const T_RGB_SPLIT = cue("p3", "每个数字");
const T_COUNT = cue("p4");
const T_150K = cue("p4", "十五万");
const T_SHIFT = cue("p5");
const T_MOVE = cue("p5", "挪动");
const T_SEVEN = cue("p5", "七成");
const T_VARY = cue("p6");
const T_SAME = cue("p6", "可我们");
const T_Q = cue("p7");
const T_CONCEPT = cue("p7", "找到");

/* ── beat A: the photo, then the numbers behind it ─────────────────────── */
const EYE = { x: 13, y: 27 }; // top-left of the 16×9 window of the 64×64 grid
const CELL = 112;

const Photo = ({ t }: { t: number }) => {
  const enter = rise(t, T_PHOTO - 0.6, 1.0);
  const zoom = ease.inOutCubic(prog(t, T_NUM - 0.8, T_NUM + 0.6));
  const scan = prog(t, T_SEE, T_SEE + 1.6);
  // zoom toward the window centre (in image fractions)
  const fx = (EYE.x + 8) / 64;
  const fy = (EYE.y + 4.5) / 64;
  const size = 760;
  const scale = lerp(1, 64 * CELL / size, zoom);
  return (
    <AbsoluteFill style={{ opacity: enter }}>
      <div
        style={{
          position: "absolute",
          left: 960 - size / 2,
          top: 540 - size / 2 - 20,
          width: size,
          height: size,
          borderRadius: lerp(18, 0, zoom),
          overflow: "hidden",
          transformOrigin: `${fx * 100}% ${fy * 100}%`,
          transform: `translate(${(960 - (960 - size / 2 + fx * size)) * zoom}px, ${(540 - (520 - size / 2 + fy * size)) * zoom}px) scale(${scale})`,
          boxShadow: `0 40px 120px rgba(0,0,0,0.6)`,
        }}
      >
        <Img src={asset("cat.jpg")} style={{ width: "100%", height: "100%", imageRendering: zoom > 0.3 ? "pixelated" : "auto" }} />
        {scan > 0 && scan < 1 && <div style={{ position: "absolute", left: 0, right: 0, top: `${scan * 100}%`, height: 3, background: CYAN, boxShadow: `0 0 30px ${CYAN}` }} />}
      </div>
      <Mono at={{ x: 960, y: 960 }} center color={DIM} style={{ opacity: 1 - zoom }}>
        你看到的：一只猫
      </Mono>
    </AbsoluteFill>
  );
};

const NumberGrid = ({ t }: { t: number }) => {
  const show = rise(t, T_NUM - 0.1, 0.6);
  const split = rise(t, T_RGB_SPLIT - 0.3, 0.8);
  const ox = 960 - 8 * CELL;
  const oy = 540 - 4.5 * CELL;
  return (
    <AbsoluteFill style={{ opacity: show }}>
      {Array.from({ length: 9 * 16 }, (_, k) => {
        const cx = k % 16;
        const cy = Math.floor(k / 16);
        const [r, g, b] = DATA.rgb64[(EYE.y + cy) * 64 + EYE.x + cx];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const ink = lum > 140 ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.92)";
        const d = rise(t, T_NUM + hash(k) * 0.9, 0.4);
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: ox + cx * CELL,
              top: oy + cy * CELL,
              width: CELL,
              height: CELL,
              background: `rgb(${r},${g},${b})`,
              boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.35)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              fontFamily: FONT_MONO,
              fontWeight: 600,
              lineHeight: 1.15,
              opacity: 0.3 + 0.7 * d,
            }}
          >
            {[r, g, b].map((v, c) => (
              <span key={c} style={{ fontSize: 22, color: split > 0.01 ? [`rgba(255,${120 - 80 * split},${120 - 80 * split},1)`, "#8CFF8C", "#8CC8FF"][c] : ink, textShadow: split > 0.01 ? "0 0 6px rgba(0,0,0,0.9)" : "none", opacity: d }}>
                {v}
              </span>
            ))}
          </div>
        );
      })}
      <Panel at={{ x: 960, y: 960 }} center style={{ padding: "16px 34px", opacity: split, display: "flex", gap: 38 }} glow={CYAN}>
        {[
          ["R", "红", "#FF6E6E"],
          ["G", "绿", "#8CFF8C"],
          ["B", "蓝", "#8CC8FF"],
        ].map(([en, zh, c]) => (
          <span key={en} style={{ fontFamily: FONT_CN, fontSize: 28, color: c }}>
            <b style={{ fontFamily: FONT_DISPLAY }}>{en}</b> {zh}
          </span>
        ))}
        <span style={{ fontFamily: FONT_CN, fontSize: 28, color: IVORY }}>
          每个数 <b style={{ fontFamily: FONT_DISPLAY, color: AMBER }}>0 – 255</b>
        </span>
      </Panel>
    </AbsoluteFill>
  );
};

/* ── beat B: the photo as a 3D landscape of numbers, split into R/G/B ───── */
const N = 64;
const SP = 0.16;
const LAYER_GAP = 3.2;
const CH_COLOR = [new THREE.Color("#FF4D5E"), new THREE.Color("#5CFF7A"), new THREE.Color("#4DA6FF")];

const PIXELS = "pixels";
type PixelPlay = { shift: number; gain: number; hover: number | null; found: boolean };

/** The student's version of pixel i: moved `shift` cells right (uncovered cells keep their value) and brightened. */
const playedPixel = (i: number, pl: PixelPlay): number[] => {
  const x = i % N;
  const src = x - pl.shift >= 0 ? i - pl.shift : i;
  return DATA.rgb64[src].map((v) => Math.min(255, v * pl.gain));
};
const lumOf = (p: number[]) => (0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]) / 255;
const changedShare = (pl: PixelPlay) => {
  let n = 0;
  for (let i = 0; i < N * N; i++) if (Math.abs(lumOf(playedPixel(i, pl)) - lumOf(DATA.rgb64[i])) * 255 > 2) n++;
  return n / (N * N);
};
/** a pixel of the cat's blue eye */
const isEye = (i: number) => DATA.rgb64[i][2] > DATA.rgb64[i][0] + 40;

const Columns = ({ t, play, blend, onHover }: { t: number; play: PixelPlay | null; blend: number; onHover: (i: number | null) => void }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  const coral = useMemo(() => new THREE.Color(CORAL), []);
  const grow = ease.inOutCubic(prog(t, T_RGB + 0.2, T_RGB + 2.2));
  const split = ease.inOutCubic(prog(t, T_RGB_SPLIT + 0.4, T_RGB_SPLIT + 2.4));

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    for (let i = 0; i < N * N; i++) {
      const orig = DATA.rgb64[i];
      const px = play ? playedPixel(i, play) : orig;
      const changed = play ? Math.abs(lumOf(px) - lumOf(orig)) * 255 > 2 : false;
      const hovered = play?.hover === i;
      for (let c = 0; c < 3; c++) {
        const x = (i % N) - N / 2 + 0.5;
        const z = Math.floor(i / N) - N / 2 + 0.5;
        const h0 = 0.02 + lerp(lumOf(orig), orig[c] / 255, split) * 1.6 * grow;
        const h1 = 0.02 + lerp(lumOf(px), px[c] / 255, split) * 1.6 * grow;
        const h = lerp(h0, h1, blend) + (hovered ? 0.35 * blend : 0);
        const base = (1 - c) * LAYER_GAP * split;
        dummy.position.set(x * SP, base + h / 2, z * SP);
        dummy.scale.set(SP * (hovered ? 1.15 : 0.9), h, SP * (hovered ? 1.15 : 0.9));
        dummy.updateMatrix();
        mesh.setMatrixAt(c * N * N + i, dummy.matrix);
        const v = lerp(orig[c], px[c], blend) / 255;
        color.setRGB(px[0] / 255, px[1] / 255, px[2] / 255).lerp(CH_COLOR[c].clone().multiplyScalar(0.25 + v), split);
        if (changed) color.lerp(coral, 0.55 * blend);
        if (hovered) color.setRGB(1.6, 1.6, 1.6);
        mesh.setColorAt(c * N * N + i, color);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, 3 * N * N]}
      frustumCulled={false}
      onPointerMove={(e) => {
        if (!play || e.instanceId === undefined) return;
        e.stopPropagation();
        onHover(e.instanceId % (N * N));
      }}
      onPointerOut={() => play && onHover(null)}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.5} metalness={0.1} toneMapped={false} />
    </instancedMesh>
  );
};

const TOP: Pose = { position: [0, 16.5, 3.2], target: [0, 0, 0], fov: 40 };
const TILT: Pose = { position: [8.5, 8, 10], target: [0, 0.4, 0], fov: 40 };
const STACK: Pose = { position: [13, 5.5, 13], target: [0, 0.6, 0], fov: 42 };

const landscapePose = (t: number): Pose => {
  const a = ease.inOutCubic(prog(t, T_RGB + 0.2, T_RGB + 2.6));
  const b = ease.inOutCubic(prog(t, T_RGB_SPLIT + 0.4, T_RGB_SPLIT + 2.8));
  const p = lerpPose(lerpPose(TOP, TILT, a), STACK, b);
  const spin = (t - T_RGB) * 0.05;
  const [x, y, z] = p.position;
  return { ...p, position: [x * Math.cos(spin) - z * Math.sin(spin), y, x * Math.sin(spin) + z * Math.cos(spin)] };
};

const Landscape = ({ t }: { t: number }) => {
  const ex = useExplore(PIXELS);
  const [play, setPlay] = useState<PixelPlay | null>(null);
  useEffect(() => {
    if (ex.active && !play) setPlay({ shift: 0, gain: 1, hover: null, found: false });
    if (!ex.active && play) setPlay(null);
  }, [ex.active, play]);
  const blend = ex.blend;
  const live = !!play && ex.interactive;
  const share = useMemo(() => (play ? changedShare(play) : 0), [play?.shift, play?.gain]); // eslint-disable-line react-hooks/exhaustive-deps
  const lastHover = useRef<number | null>(null);
  const hover = (i: number | null) => {
    if (!play || i === lastHover.current) return;
    lastHover.current = i;
    if (i !== null) sfx.tick(((i % N) / N - 0.5) * 1.4);
    setPlay({ ...play, hover: i, found: play.found || (i !== null && isEye(i)) });
  };
  const set = (patch: Partial<PixelPlay>) => {
    if (!play) return;
    sfx.blip(500 + (patch.shift ?? play.shift) * 60 + (patch.gain ?? play.gain) * 200, 0.05);
    setPlay({ ...play, ...patch });
  };

  const pose = landscapePose(t);
  const proj = projector(pose);
  const split = rise(t, T_RGB_SPLIT + 1.6, 0.8);
  const count = rise(t, T_COUNT, 0.7);
  const hv = play?.hover ?? null;
  const hvPx = hv !== null && play ? playedPixel(hv, play).map(Math.round) : null;
  const hvAt = hv !== null ? proj(((hv % N) - N / 2 + 0.5) * SP, LAYER_GAP + 1.4, (Math.floor(hv / N) - N / 2 + 0.5) * SP) : null;
  return (
    <AbsoluteFill>
      <Stage3D pose={pose} bloom={0.6} threshold={0.7} zone={PIXELS}>
        <ambientLight intensity={0.35} />
        <directionalLight position={[5, 12, 6]} intensity={1.5} />
        <directionalLight position={[-6, 4, -4]} intensity={0.6} color={CYAN} />
        <Columns t={t} play={play} blend={blend} onHover={hover} />
      </Stage3D>
      {["R · 红", "G · 绿", "B · 蓝"].map((label, c) => {
        const p = proj(-N * SP * 0.5 - 0.4, (1 - c) * LAYER_GAP + 0.3, N * SP * 0.5);
        return (
          <Mono key={label} at={{ x: p.x - 150, y: p.y - 14 }} size={22} color={["#FF6E6E", "#8CFF8C", "#8CC8FF"][c]} style={{ opacity: split * (1 - count * 0.4) }}>
            {label}
          </Mono>
        );
      })}
      {hvPx && hvAt && live && (
        <div style={{ position: "absolute", left: hvAt.x, top: hvAt.y, transform: "translate(-50%, -100%)", pointerEvents: "none", padding: "10px 16px", borderRadius: 12, background: "rgba(4,6,12,0.88)", border: `1px solid ${isEye(hv!) ? LIME : FAINT}`, fontFamily: FONT_MONO, fontSize: 22, whiteSpace: "nowrap" }}>
          <div style={{ fontSize: 14, color: DIM }}>
            像素 ({hv! % N}, {Math.floor(hv! / N)}){isEye(hv!) ? " · 蓝眼睛！" : ""}
          </div>
          <span style={{ color: "#FF8C8C" }}>R {hvPx[0]}</span> <span style={{ color: "#8CFF8C" }}>G {hvPx[1]}</span> <span style={{ color: "#8CC8FF" }}>B {hvPx[2]}</span>
        </div>
      )}
      <div style={{ position: "absolute", right: 120, top: lerp(330, 210, blend), textAlign: "right", opacity: Math.max(count, blend) }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 44, color: DIM, fontWeight: 600 }}>
          224 <span style={{ color: FAINT }}>×</span> 224 <span style={{ color: FAINT }}>×</span> 3
        </div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: lerp(132, 92, blend), fontWeight: 800, color: AMBER, letterSpacing: -3, textShadow: `0 0 50px ${AMBER}55`, opacity: Math.max(rise(t, T_150K - 0.6, 0.3), blend) }}>
          {fmtInt(150528 * Math.max(ease.outCubic(prog(t, T_150K - 0.6, T_150K + 0.8)), blend))}
        </div>
        <div style={{ fontFamily: FONT_CN, fontSize: 32, color: IVORY, marginTop: 6 }}>个数字，组成一张小小的照片</div>
        {play && (
          <Panel style={{ marginTop: 28, padding: "20px 26px", width: 460, textAlign: "left", opacity: blend, pointerEvents: live ? "auto" : "none" }} glow={CORAL}>
            <WorldSlider label="把猫向右挪" value={play.shift} min={0} max={12} step={1} unit={(v) => `${(v * 3.5).toFixed(0)} px`} onChange={(v) => set({ shift: v })} />
            <WorldSlider label="换个光线（亮度）" value={play.gain} min={0.5} max={1.5} step={0.05} unit={(v) => `×${v.toFixed(2)}`} onChange={(v) => set({ gain: v })} />
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 6 }}>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 56, fontWeight: 800, color: CORAL }}>{(share * 100).toFixed(1)}%</span>
              <span style={{ fontFamily: FONT_CN, fontSize: 22, color: IVORY }}>的数字变了（红色柱子）</span>
            </div>
          </Panel>
        )}
      </div>
      <ExploreTask zone={PIXELS} task="鼠标扫过这片“像素山脉”，看看每根柱子背后的数字" sub={["拖动画面旋转", "把猫挪几个像素，看多少柱子变红"]} goal="在山脉里找到猫的蓝眼睛（蓝色远大于红色的像素）" done={!!play?.found} />
    </AbsoluteFill>
  );
};

/* ── beat C: shift six pixels, 70 % of the numbers change ───────────────── */
const Shift = ({ t }: { t: number }) => {
  const move = ease.inOutCubic(prog(t, T_MOVE, T_MOVE + 0.8));
  const diff = rise(t, T_SEVEN - 0.6, 0.8);
  const pct = DATA.shiftChanged * 100;
  const tile = 470;
  return (
    <AbsoluteFill>
      {[0, 1].map((k) => (
        <div key={k} style={{ position: "absolute", left: 170 + k * 520, top: 250, width: tile, height: tile, borderRadius: 14, overflow: "hidden", boxShadow: `0 0 0 1px ${FAINT}` }}>
          <Img src={asset("cat.jpg")} style={{ width: "100%", height: "100%", transform: k ? `translateX(${move * 14}px) scale(1.03)` : "scale(1.03)" }} />
        </div>
      ))}
      <Mono at={{ x: 170, y: 740 }} size={18}>原图</Mono>
      <Mono at={{ x: 690, y: 740 }} size={18} color={AMBER}>
        向右挪动 6 个像素 →
      </Mono>
      <div style={{ position: "absolute", left: 1250, top: 250, width: tile, height: tile, borderRadius: 14, overflow: "hidden", opacity: diff, boxShadow: `0 0 60px ${CORAL}44, 0 0 0 1px ${CORAL}88` }}>
        <Img src={asset("shift_diff.png")} style={{ width: "100%", height: "100%", filter: "sepia(1) saturate(4) hue-rotate(-40deg) brightness(1.1)" }} />
      </div>
      <Mono at={{ x: 1250, y: 740 }} size={18} color={CORAL} style={{ opacity: diff }}>
        两张图之间变化的数字
      </Mono>
      <div style={{ position: "absolute", left: 1250, top: 790, opacity: diff, display: "flex", alignItems: "baseline", gap: 16 }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 96, fontWeight: 800, color: CORAL }}>{(pct * ease.outCubic(prog(t, T_SEVEN - 0.5, T_SEVEN + 0.7))).toFixed(1)}%</span>
        <span style={{ fontFamily: FONT_CN, fontSize: 30, color: IVORY }}>的像素值变了</span>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <text x={1195} y={500} fill={DIM} fontFamily={FONT_DISPLAY} fontSize={60} textAnchor="middle" opacity={diff}>
          =
        </text>
      </svg>
    </AbsoluteFill>
  );
};

/* ── beat D: light, angle, occlusion — still the same cat ───────────────── */
const VARIANTS: Array<{ label: string; style: React.CSSProperties; occlude?: boolean }> = [
  { label: "换个光线", style: { filter: "brightness(0.38) contrast(1.2) saturate(0.7)" } },
  { label: "换个角度", style: { transform: "rotate(-28deg) scale(1.45)" } },
  { label: "躲到沙发后面", style: {}, occlude: true },
  { label: "换个姿势", style: { transform: "scaleX(-1) scale(1.9) translate(10%, 18%)" } },
];

const Variants = ({ t }: { t: number }) => {
  const same = rise(t, T_SAME, 0.7);
  return (
    <AbsoluteFill>
      {VARIANTS.map((v, i) => {
        const k = rise(t, T_VARY + i * 0.55, 0.6);
        const x = 190 + i * 400;
        return (
          <div key={v.label} style={{ position: "absolute", left: x, top: 260, opacity: k, transform: `translateY(${(1 - k) * 40}px)` }}>
            <div style={{ width: 340, height: 340, borderRadius: 14, overflow: "hidden", position: "relative", boxShadow: `0 0 0 1px ${FAINT}` }}>
              <Img src={asset("cat.jpg")} style={{ width: "100%", height: "100%", ...v.style }} />
              {v.occlude && (
                <div style={{ position: "absolute", left: -20, right: -20, top: "52%", bottom: -20, borderRadius: "60px 60px 0 0", background: "linear-gradient(180deg, #6B4A3A, #3E2A20)", boxShadow: "0 -10px 30px rgba(0,0,0,0.5)" }} />
              )}
            </div>
            <Body size={28} style={{ marginTop: 20, textAlign: "center" }}>
              {v.label}
            </Body>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 190, width: 1540, top: 720, height: 2, background: `linear-gradient(90deg, transparent, ${LIME}, transparent)`, opacity: same, transform: `scaleX(${same})` }} />
      <Heading size={54} at={{ x: 960, y: 800 }} center color={LIME} style={{ opacity: same }}>
        都是同一只猫
      </Heading>
    </AbsoluteFill>
  );
};

/* ── beat E: 150,528 numbers → ? → "猫" ─────────────────────────────────── */
const Question = ({ t }: { t: number }) => {
  const q = rise(t, T_Q + 0.6, 0.8);
  const concept = rise(t, T_CONCEPT, 0.9);
  const cols = 34;
  return (
    <AbsoluteFill>
      {/* streams of digits pouring toward the question mark */}
      {Array.from({ length: cols }, (_, c) => {
        const x = 80 + c * 32;
        const speed = 120 + hash(c) * 160;
        return (
          <div key={c} style={{ position: "absolute", left: x, top: 0, fontFamily: FONT_MONO, fontSize: 18, lineHeight: "26px", color: CYAN, opacity: 0.25 + 0.4 * hash(c + 9), transform: `translateY(${(((t - T_Q) * speed) % 260) - 260}px)` }}>
            {Array.from({ length: 52 }, (_, r) => (
              <div key={r}>{Math.floor(hash(c * 97 + r) * 256)}</div>
            ))}
          </div>
        );
      })}
      <AbsoluteFill style={{ background: `linear-gradient(90deg, transparent 0%, ${BG}DD 62%, ${BG} 100%)` }} />
      <div style={{ position: "absolute", left: 1180, top: 300, textAlign: "center", width: 560 }}>
        <div style={{ fontFamily: FONT_MONO, fontSize: 26, color: CYAN, opacity: rise(t, T_Q, 0.6) }}>150,528 个变来变去的数字</div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 200, fontWeight: 800, color: AMBER, opacity: q * (1 - concept * 0.7), transform: `scale(${0.7 + 0.3 * ease.outBack(q)})`, textShadow: `0 0 80px ${AMBER}66`, lineHeight: 1.2 }}>
          ?
        </div>
        <div style={{ fontFamily: FONT_TITLE, fontSize: 120, fontWeight: 700, color: IVORY, marginTop: -40, opacity: concept, filter: `blur(${(1 - concept) * 12}px)`, letterSpacing: 10 }}>
          “猫”
        </div>
        <div style={{ fontFamily: FONT_CN, fontSize: 28, color: DIM, opacity: concept }}>一个概念</div>
      </div>
    </AbsoluteFill>
  );
};

export const Pixels = ({ t }: { t: number }) => (
  <AbsoluteFill style={{ background: BG }}>
    <Backdrop grid={0.03} />
    <Show t={t} from={S.start} to={T_RGB + 0.6} fadeIn={0.3}>
      <Photo t={t} />
      <Show t={t} from={T_NUM - 0.3} to={T_RGB + 0.6} fadeIn={0.4}>
        <NumberGrid t={t} />
      </Show>
    </Show>
    <Show t={t} from={T_RGB} to={T_SHIFT + 0.1} fadeIn={0.6}>
      <Landscape t={t} />
    </Show>
    <Show t={t} from={T_SHIFT - 0.3} to={T_VARY + 0.1}>
      <Shift t={t} />
    </Show>
    <Show t={t} from={T_VARY - 0.2} to={T_Q + 0.2}>
      <Variants t={t} />
    </Show>
    <Show t={t} from={T_Q - 0.1} to={S.end}>
      <Question t={t} />
    </Show>
    <Mono at={{ x: 960, y: 1040 }} center size={11} color={FAINT} style={{ opacity: prog(t, T_PHOTO, T_PHOTO + 1) * (1 - prog(t, lineEnd("p1"), lineEnd("p1") + 1)) }}>
      PHOTO · PIXABAY / WIKIMEDIA COMMONS · CC0
    </Mono>
  </AbsoluteFill>
);

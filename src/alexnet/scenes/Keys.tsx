import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { AbsoluteFill, Img } from "remotion";
import { Backdrop } from "../components/Frame";
import { Show } from "../components/Show";
import { Pose, Stage3D } from "../components/Stage3D";
import { Body, Heading, Mono, Panel } from "../components/ui";
import { ease, fmtInt, hash, lerp, prog, rise, wobble } from "../lib/anim";
import { DATA, asset } from "../lib/data";
import { cue, scene } from "../lib/timeline";
import { AMBER, BG, CORAL, CYAN, DIM, FAINT, FONT_CN, FONT_DISPLAY, FONT_MONO, FONT_TITLE, IVORY, LIME, VIOLET } from "../lib/theme";

const S = scene("keys");
const T_K1 = cue("k1");
const T_THREE = cue("k1", "三把钥匙");
const T_K2 = cue("k2");
const T_IMAGENET = cue("k2", "ImageNet");
const T_14M = cue("k2", "超过一千四百万");
const T_SUBSET = cue("k2", "比赛使用");
const T_K3 = cue("k3");
const T_MEMO = cue("k3", "一个有");
const T_K4 = cue("k4");
const T_CPU = cue("k4", "CPU");
const T_GPU = cue("k4", "原本为游戏");
const T_PARALLEL = cue("k4", "天生擅长");
const T_K5 = cue("k5");
const T_3GB = cue("k5", "3GB");
const T_SPLIT = cue("k5", "一劈两半");
const T_EXCHANGE = cue("k5", "交换信息");
const T_K6 = cue("k6");
const T_K7 = cue("k7");
const T_DIVIDE = cue("k7", "分了工");
const T_GRAY = cue("k7", "黑白的边缘");
const T_COLOR = cue("k7", "彩色的斑块");
const T_K8 = cue("k8");
const T_K9 = cue("k9");
const T_CROP = cue("k9", "随机裁剪");
const T_FLIP = cue("k9", "水平翻转");
const T_JITTER = cue("k9", "调整颜色");
const T_2048 = cue("k9", "两千多倍");
const T_K10 = cue("k10");
const T_REST = cue("k10", "休息");
const T_K11 = cue("k11");
const T_ENSEMBLE = cue("k11", "这就好像");
const T_MERGE = cue("k11", "集合在一起");

const KEYS = [
  { zh: "数据", en: "DATA", color: CYAN, icon: "▦" },
  { zh: "算力", en: "COMPUTE", color: AMBER, icon: "⚡" },
  { zh: "技巧", en: "TRICKS", color: LIME, icon: "✦" },
];

/** A small key glyph. */
const KeyIcon = ({ color, size = 90 }: { color: string; size?: number }) => (
  <svg width={size} height={size * 0.5} viewBox="0 0 180 90">
    <circle cx={40} cy={45} r={30} fill="none" stroke={color} strokeWidth={10} />
    <path d="M 70 45 L 170 45 M 140 45 L 140 72 M 160 45 L 160 64" stroke={color} strokeWidth={10} strokeLinecap="round" />
  </svg>
);

/* ── k1: three keys ────────────────────────────────────────────────────── */
const ThreeKeys = ({ t, active = -1, compact = 0 }: { t: number; active?: number; compact?: number }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: lerp(420, 120, compact), display: "flex", justifyContent: "center", gap: lerp(110, 50, compact), transform: `scale(${lerp(1, 0.55, compact)})`, transformOrigin: "50% 0%" }}>
    {KEYS.map((k, i) => {
      const kk = rise(t, T_K1 + 1.5 + i * 0.25, 0.6) * (0.45 + 0.55 * rise(t, T_THREE + i * 0.2, 0.4));
      const on = active === -1 || active === i;
      return (
        <div key={k.en} style={{ width: 330, padding: "34px 0", textAlign: "center", borderRadius: 22, border: `2px solid ${on ? k.color : FAINT}`, background: on ? `${k.color}12` : "transparent", opacity: kk * (on ? 1 : 0.35), transform: `translateY(${(1 - kk) * 40}px)`, boxShadow: on && active === i ? `0 0 60px ${k.color}55` : "none" }}>
          <KeyIcon color={k.color} />
          <div style={{ fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 64, color: IVORY, marginTop: 14 }}>{k.zh}</div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 18, color: k.color, letterSpacing: 6, marginTop: 6 }}>
            0{i + 1} · {k.en}
          </div>
        </div>
      );
    })}
  </div>
);

/* ── k2: ImageNet — a wall of a million pictures ───────────────────────── */
const WALL = 64;
const VARIANTS = 16;
/** 16 procedural "photos": soft colour blobs on a gradient, so close-up tiles all look different. */
const TILE_TEXTURES = Array.from({ length: VARIANTS }, (_, v) => {
  const n = 48;
  const data = new Uint8Array(n * n * 4);
  const blobs = Array.from({ length: 4 }, (_, k) => ({
    x: hash(v * 31 + k * 7) * n,
    y: hash(v * 17 + k * 13) * n,
    r: 6 + hash(v * 5 + k * 3) * 16,
    c: [hash(v * 3 + k) * 255, hash(v * 7 + k * 2) * 255, hash(v * 11 + k * 5) * 255],
  }));
  const sky = [120 + hash(v * 2) * 120, 120 + hash(v * 4) * 120, 120 + hash(v * 6) * 135];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      let col = sky.map((c) => c * (0.55 + 0.45 * (1 - y / n)));
      for (const b of blobs) {
        const w = Math.exp(-((x - b.x) ** 2 + (y - b.y) ** 2) / (b.r * b.r));
        col = col.map((c, i) => c * (1 - w) + b.c[i] * w);
      }
      // mostly luminance: the per-tile tint carries the colour so the wall still reads as the cat from afar
      const lum = 0.3 * col[0] + 0.59 * col[1] + 0.11 * col[2];
      col = col.map((c) => lum + (c - lum) * 0.35);
      const noise = (hash(v * 1000 + y * n + x) - 0.5) * 24;
      data.set([...col.map((c) => Math.max(0, Math.min(255, c + noise))), 255], (y * n + x) * 4);
    }
  const tex = new THREE.DataTexture(data, n, n);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
});

const WallTiles = ({ variant }: { variant: number }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const ids = Array.from({ length: WALL * WALL }, (_, i) => i).filter((i) => Math.floor(hash(i * 1.37) * VARIANTS) === variant);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const d = new THREE.Object3D();
    const c = new THREE.Color();
    ids.forEach((i, k) => {
      const x = i % WALL;
      const y = Math.floor(i / WALL);
      d.position.set((x - WALL / 2) * 0.2, (WALL / 2 - y) * 0.2, (hash(i * 3) - 0.5) * 0.15);
      d.rotation.set(0, 0, (hash(i * 7) - 0.5) * 0.08);
      d.scale.setScalar(0.18);
      d.updateMatrix();
      m.setMatrixAt(k, d.matrix);
      const [r, g, b] = DATA.rgb64[i];
      // every tile is "a different photo", tinted so that from afar the wall reads as the cat
      c.setRGB((r / 255) * 1.35, (g / 255) * 1.35, (b / 255) * 1.35);
      m.setColorAt(k, c);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, ids.length]} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={TILE_TEXTURES[variant]} toneMapped={false} />
    </instancedMesh>
  );
};

const ImageNetWall = ({ t }: { t: number }) => {
  const pull = ease.inOutCubic(prog(t, T_K2 + 0.5, T_14M + 2.6));
  const pose: Pose = { position: [lerp(-1.3, 0, pull) + wobble(t * 0.2, 1) * 0.1, lerp(1.1, 0, pull), lerp(1.6, 16, pull)], target: [lerp(-1.3, 0, pull), lerp(1.1, 0, pull), 0], fov: 40 };
  const count = rise(t, T_14M - 0.3, 0.5);
  const sub = rise(t, T_SUBSET, 0.6);
  return (
    <AbsoluteFill>
      <Stage3D pose={pose} bloom={0.4} threshold={0.8}>
        {TILE_TEXTURES.map((_, v) => (
          <WallTiles key={v} variant={v} />
        ))}
      </Stage3D>
      <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(4,6,12,0.9) 0%, rgba(4,6,12,0.55) 34%, transparent 60%)", opacity: count }} />
      <div style={{ position: "absolute", left: 120, top: 250 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 72, fontWeight: 800, color: CYAN, opacity: rise(t, T_IMAGENET, 0.5) }}>ImageNet</div>
        <Mono size={18} style={{ marginTop: 6, opacity: rise(t, T_IMAGENET, 0.5) }}>
          李飞飞团队 · 2009 · 人工标注
        </Mono>
        <div style={{ opacity: count, marginTop: 40 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 96, fontWeight: 800, color: IVORY }}>{fmtInt(14197122 * ease.outCubic(prog(t, T_14M - 0.3, T_14M + 1.6)))}</div>
          <Body size={28} color={DIM}>
            张图片 · 2 万多个类别
          </Body>
        </div>
        <Panel style={{ marginTop: 40, padding: "20px 28px", opacity: sub }} glow={CYAN}>
          <Mono size={15} color={CYAN}>
            ILSVRC 比赛用的子集
          </Mono>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 44, color: IVORY, marginTop: 8 }}>
            1000 <span style={{ fontFamily: FONT_CN, fontSize: 24, color: DIM }}>类</span> · 1,281,167 <span style={{ fontFamily: FONT_CN, fontSize: 24, color: DIM }}>张训练图</span>
          </div>
        </Panel>
      </div>
    </AbsoluteFill>
  );
};

/* ── k3: dataset sizes as areas ────────────────────────────────────────── */
const SETS = [
  { name: "Caltech-101", year: 2004, n: 9146, color: DIM },
  { name: "PASCAL VOC", year: 2010, n: 10103, color: DIM },
  { name: "CIFAR-10", year: 2009, n: 60000, color: AMBER },
  { name: "ILSVRC 2012", year: 2012, n: 1281167, color: CYAN },
];

const Datasets = ({ t }: { t: number }) => {
  const big = 680;
  const memo = rise(t, T_MEMO, 0.6);
  let x = 160;
  return (
    <AbsoluteFill>
      {SETS.map((d, i) => {
        const side = big * Math.sqrt(d.n / 1281167);
        const k = rise(t, T_K3 + 0.2 + i * 0.4, i === 3 ? 1.2 : 0.5, ease.outCubic);
        const left = x;
        x += Math.max(side, 150) + 50;
        return (
          <div key={d.name} style={{ position: "absolute", left, top: 820 - side * k, opacity: Math.min(1, k * 3) }}>
            <div style={{ width: side, height: side * k, background: `${d.color}33`, border: `2px solid ${d.color}` }} />
            <div style={{ position: "absolute", left: 0, top: side * k + 14, whiteSpace: "nowrap" }}>
              <div style={{ fontFamily: FONT_MONO, fontSize: 18, color: d.color === DIM ? IVORY : d.color }}>{d.name}</div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: DIM }}>{fmtInt(d.n)}</div>
            </div>
          </div>
        );
      })}
      <Panel at={{ x: 1300, y: 300 }} style={{ width: 500, padding: "28px 34px", opacity: memo }} glow={CORAL}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 40, color: IVORY }}>
          6000 万 <span style={{ fontFamily: FONT_CN, fontSize: 24, color: DIM }}>参数</span>
        </div>
        <div style={{ fontFamily: FONT_CN, fontSize: 28, color: DIM, margin: "10px 0" }}>+ 几万张图</div>
        <div style={{ fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 46, color: CORAL }}>= 死记硬背</div>
      </Panel>
      <Mono at={{ x: 160, y: 170 }} size={16} style={{ opacity: rise(t, T_K3, 0.5) }}>
        面积 = 图片数量
      </Mono>
    </AbsoluteFill>
  );
};

/* ── k4: a few strong cores vs. hundreds of small ones ─────────────────── */
const TASKS = 2048;
const Cores = ({ t }: { t: number }) => {
  const cpuIn = rise(t, T_K4 + 0.4, 0.6) * (0.4 + 0.6 * rise(t, T_CPU - 0.2, 0.5));
  const gpuIn = rise(t, T_K4 + 0.8, 0.6) * (0.4 + 0.6 * rise(t, T_GPU, 0.5));
  const run = Math.max(0, t - (T_PARALLEL - 0.3));
  const cpuDone = Math.min(TASKS, Math.floor(run * 4 * 6));
  const gpuDone = Math.min(TASKS, Math.floor(run * 512 * 1.2));
  const wave = (run * 1.2) % 1;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 160, top: 260, opacity: cpuIn }}>
        <Mono size={18} color={IVORY}>
          CPU · 少数几个强大的核心
        </Mono>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 200px)", gap: 20, marginTop: 24 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ height: 160, borderRadius: 14, border: `2px solid ${IVORY}66`, background: run > 0 && Math.floor(run * 6 + i) % 2 === 0 ? "rgba(236,241,248,0.18)" : "rgba(236,241,248,0.05)", display: "flex", justifyContent: "center", alignItems: "center", fontFamily: FONT_MONO, fontSize: 20, color: DIM }}>
              CORE {i + 1}
            </div>
          ))}
        </div>
        <Progress label="完成" done={cpuDone} color={IVORY} />
      </div>
      <div style={{ position: "absolute", left: 820, top: 260, opacity: gpuIn }}>
        <Mono size={18} color={AMBER}>
          GPU · GTX 580 · 512 个小核心
        </Mono>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(32, 26px)", gap: 3, marginTop: 24 }}>
          {Array.from({ length: 512 }, (_, i) => {
            const col = i % 32;
            const lit = run > 0 && gpuDone < TASKS ? Math.exp(-(((col / 32 - wave + 1) % 1) * 6)) : 0;
            return <div key={i} style={{ height: 18, borderRadius: 3, background: AMBER, opacity: 0.12 + 0.88 * lit }} />;
          })}
        </div>
        <Progress label="完成" done={gpuDone} color={AMBER} />
      </div>
      <Body size={28} at={{ x: 960, y: 860 }} center color={AMBER} style={{ opacity: rise(t, T_PARALLEL, 0.6), whiteSpace: "nowrap" }}>
        训练神经网络 = 海量相同的矩阵乘法 → 正适合 GPU 并行
      </Body>
    </AbsoluteFill>
  );
};

const Progress = ({ label, done, color }: { label: string; done: number; color: string }) => (
  <div style={{ marginTop: 26, width: 420 }}>
    <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FONT_MONO, fontSize: 16, color: DIM }}>
      <span>{label}</span>
      <span style={{ color }}>
        {fmtInt(done)} / {fmtInt(TASKS)}
      </span>
    </div>
    <div style={{ height: 10, marginTop: 8, background: "rgba(255,255,255,0.06)", borderRadius: 5 }}>
      <div style={{ width: `${(done / TASKS) * 100}%`, height: "100%", background: color, borderRadius: 5 }} />
    </div>
  </div>
);

/* ── k5–k6: the network split across two GPUs ──────────────────────────── */
const COLS = [
  { name: "卷积1", h: 190, w: 40 },
  { name: "卷积2", h: 150, w: 64 },
  { name: "卷积3", h: 110, w: 84 },
  { name: "卷积4", h: 110, w: 84 },
  { name: "卷积5", h: 110, w: 64 },
  { name: "全连接6", h: 190, w: 22 },
  { name: "全连接7", h: 190, w: 22 },
];
const CROSS = new Set([2, 5, 6]); // layers that take input from BOTH GPUs

const TwoGpus = ({ t }: { t: number }) => {
  const split = ease.inOutCubic(prog(t, T_SPLIT - 0.3, T_SPLIT + 0.9));
  const cross = rise(t, T_EXCHANGE - 0.3, 0.7);
  const days = rise(t, T_K6 - 0.2, 0.6);
  const X0 = 440;
  const DX = 180;
  const yTop = lerp(480, 320, split);
  const yBot = lerp(480, 660, split);
  return (
    <AbsoluteFill>
      {/* the two cards */}
      {[0, 1].map((g) => (
        <div key={g} style={{ position: "absolute", left: 120, top: (g ? yBot : yTop) - 70, width: 240, height: 140, borderRadius: 14, border: `2px solid ${g ? VIOLET : CYAN}`, background: `${g ? VIOLET : CYAN}14`, opacity: rise(t, T_K5, 0.6), padding: "20px 22px" }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 22, color: g ? VIOLET : CYAN }}>GPU {g + 1}</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, color: IVORY, marginTop: 8 }}>GTX 580</div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 18, color: rise(t, T_3GB, 0.4) > 0.5 ? CORAL : DIM, marginTop: 6 }}>显存 3 GB</div>
        </div>
      ))}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {COLS.map((c, i) => {
          if (i === 0) return null;
          const x0 = X0 + (i - 1) * DX + COLS[i - 1].w;
          const x1 = X0 + i * DX;
          return (
            <g key={i}>
              <line x1={x0} y1={yTop} x2={x1} y2={yTop} stroke={CYAN} strokeWidth={2} opacity={0.5} />
              <line x1={x0} y1={yBot} x2={x1} y2={yBot} stroke={VIOLET} strokeWidth={2} opacity={0.5} />
              {CROSS.has(i) && (
                <g opacity={cross * split}>
                  <line x1={x0} y1={yTop} x2={x1} y2={yBot} stroke={AMBER} strokeWidth={3} strokeDasharray="8 6" strokeDashoffset={-(t * 40) % 14} />
                  <line x1={x0} y1={yBot} x2={x1} y2={yTop} stroke={AMBER} strokeWidth={3} strokeDasharray="8 6" strokeDashoffset={-(t * 40) % 14} />
                </g>
              )}
            </g>
          );
        })}
      </svg>
      {COLS.map((c, i) =>
        [0, 1].map((g) => {
          const y = g ? yBot : yTop;
          const h = c.h * lerp(1.3, 1, split);
          return (
            <div key={`${i}-${g}`} style={{ position: "absolute", left: X0 + i * DX, top: y - h / 2, width: c.w, height: h, borderRadius: 4, border: `2px solid ${g ? VIOLET : CYAN}`, background: `${g ? VIOLET : CYAN}22`, opacity: rise(t, T_K5 + 0.3 + i * 0.1, 0.4) * (g === 1 ? Math.min(1, split * 2 + 0.0001) : 1) }} />
          );
        }),
      )}
      {COLS.map((c, i) => (
        <Mono key={c.name} at={{ x: X0 + i * DX + c.w / 2, y: 820 }} center size={15} style={{ opacity: rise(t, T_K5 + 0.3, 0.5) }}>
          {c.name}
        </Mono>
      ))}
      <Body size={26} at={{ x: 1320, y: 150 }} color={AMBER} style={{ opacity: cross, whiteSpace: "nowrap" }}>
        - - - 只在这几层交换信息
      </Body>
      {/* five to six days */}
      <Panel at={{ x: 1560, y: 330 }} style={{ width: 280, padding: "24px 26px", opacity: days, textAlign: "center" }} glow={AMBER}>
        <Mono size={15}>训练时间</Mono>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 80, fontWeight: 800, color: AMBER, lineHeight: 1.1 }}>
          {Math.min(6, 1 + Math.floor(prog(t, T_K6, T_K7 - 0.2) * 6))}
        </div>
        <Body size={24} color={IVORY}>
          天 · 5 ~ 6 天
        </Body>
        <svg width={220} height={70} style={{ marginTop: 8 }}>
          <path d={Array.from({ length: 41 }, (_, i) => `${i ? "L" : "M"} ${i * 5.5} ${10 + 50 * Math.exp(-i / 9) + 4 * (hash(i) - 0.5)}`).join(" ")} stroke={LIME} strokeWidth={2.5} fill="none" strokeDasharray={260} strokeDashoffset={260 * (1 - prog(t, T_K6, T_K7))} />
        </svg>
        <Mono size={12}>LOSS ↓</Mono>
      </Panel>
    </AbsoluteFill>
  );
};

/* ── k7: the kernels on the two GPUs specialised ───────────────────────── */
const ORDER = DATA.filterSaturation.map((s, i) => ({ s, i })).sort((a, b) => a.s - b.s);
const RANK = new Map(ORDER.map((o, r) => [o.i, r]));
const FT = 66;
const FPAD = 6;
const FATLAS = 8 * (FT + FPAD) + FPAD;

const Specialise = ({ t }: { t: number }) => {
  const sort = ease.inOutCubic(prog(t, T_DIVIDE - 0.4, T_DIVIDE + 1.4));
  const tile = 74;
  const gap = 8;
  return (
    <AbsoluteFill>
      {Array.from({ length: 64 }, (_, k) => {
        const r = Math.floor(k / 8);
        const c = k % 8;
        const rank = RANK.get(k) ?? 0;
        const group = rank < 32 ? 0 : 1;
        const gi = rank % 32;
        const fromX = 960 - 4 * (tile + gap) + c * (tile + gap);
        const fromY = 230 + r * (tile + gap);
        const toX = (group === 0 ? 220 : 1060) + (gi % 8) * (tile + gap);
        const toY = 300 + Math.floor(gi / 8) * (tile + gap);
        const hl = group === 0 ? rise(t, T_GRAY, 0.5) : rise(t, T_COLOR, 0.5);
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: lerp(fromX, toX, sort),
              top: lerp(fromY, toY, sort),
              width: tile,
              height: tile,
              borderRadius: 5,
              backgroundImage: `url(${asset("filters.png")})`,
              backgroundSize: `${(FATLAS / FT) * tile}px ${(FATLAS / FT) * tile}px`,
              backgroundPosition: `-${((FPAD + c * (FT + FPAD)) / FT) * tile}px -${((FPAD + r * (FT + FPAD)) / FT) * tile}px`,
              imageRendering: "pixelated",
              boxShadow: hl > 0.5 ? `0 0 0 2px ${group ? VIOLET : CYAN}` : "none",
            }}
          />
        );
      })}
      {[0, 1].map((g) => (
        <div key={g} style={{ position: "absolute", left: g ? 1060 : 220, top: 210, opacity: sort }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 22, color: g ? VIOLET : CYAN }}>GPU {g + 1}</div>
          <div style={{ fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 36, color: IVORY, marginTop: 4, opacity: g ? rise(t, T_COLOR, 0.5) : rise(t, T_GRAY, 0.5) }}>{g ? "大多是彩色的斑块" : "大多是黑白的边缘"}</div>
        </div>
      ))}
      <Mono at={{ x: 960, y: 1000 }} center size={13} color={DIM} style={{ opacity: sort }}>
        示意：原论文中两块 GPU 自发分工；此处用训练好的卷积核按“色彩饱和度”分成两组来呈现这一现象
      </Mono>
    </AbsoluteFill>
  );
};

/* ── k9: data augmentation ─────────────────────────────────────────────── */
const Augment = ({ t }: { t: number }) => {
  const size = 480;
  const X = 180;
  const Y = 290;
  const crop = rise(t, T_CROP, 0.4);
  const ci = Math.floor(Math.max(0, t - T_CROP) * 2.2);
  const cx = hash(ci * 3.1) * (size - size * 0.875);
  const cy = hash(ci * 5.7) * (size - size * 0.875);
  const many = rise(t, T_2048 - 1.2, 0.6);
  const grid = 10;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: X, top: Y, width: size, height: size, borderRadius: 12, overflow: "hidden" }}>
        <Img src={asset("cat.jpg")} style={{ width: "100%", height: "100%" }} />
        <div style={{ position: "absolute", inset: 0, boxShadow: `inset 0 0 0 ${crop > 0 ? 0 : 0}px` }} />
        {crop > 0 && <div style={{ position: "absolute", left: cx, top: cy, width: size * 0.875, height: size * 0.875, border: `3px solid ${AMBER}`, boxShadow: "0 0 0 2000px rgba(0,0,0,0.5)" }} />}
      </div>
      <Mono at={{ x: X, y: Y + size + 20 }} size={16} color={AMBER} style={{ opacity: crop }}>
        256×256 中随机裁出 224×224
      </Mono>
      {/* resulting variants */}
      <div style={{ position: "absolute", left: 760, top: Y - 20, display: "grid", gridTemplateColumns: `repeat(${grid}, 92px)`, gap: 8 }}>
        {Array.from({ length: grid * 5 }, (_, i) => {
          const k = rise(t, T_CROP + 0.3 + i * (i < 10 ? 0.25 : 0.06), 0.3);
          const flip = t > T_FLIP && hash(i * 7) > 0.5;
          const jit = t > T_JITTER ? (hash(i * 13) - 0.5) * 50 : 0;
          const bright = t > T_JITTER ? 0.75 + hash(i * 17) * 0.5 : 1;
          return (
            <div key={i} style={{ width: 92, height: 92, borderRadius: 6, overflow: "hidden", opacity: k }}>
              <Img
                src={asset("cat.jpg")}
                style={{ width: "100%", height: "100%", transform: `scale(1.15) translate(${(hash(i * 3) - 0.5) * 12}%, ${(hash(i * 5) - 0.5) * 12}%) scaleX(${flip ? -1 : 1})`, filter: `hue-rotate(${jit}deg) brightness(${bright})` }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 760, top: 830, display: "flex", gap: 30, fontFamily: FONT_CN, fontSize: 26, color: IVORY }}>
        <span style={{ opacity: rise(t, T_CROP, 0.4) }}>✂ 随机裁剪</span>
        <span style={{ opacity: rise(t, T_FLIP, 0.4) }}>⇋ 水平翻转</span>
        <span style={{ opacity: rise(t, T_JITTER, 0.4) }}>◐ 调整颜色</span>
        <span style={{ opacity: many, fontFamily: FONT_DISPLAY, fontWeight: 800, color: LIME, fontSize: 40, marginTop: -10 }}>× 2048</span>
      </div>
    </AbsoluteFill>
  );
};

/* ── k10–k11: dropout and the ensemble it implies ──────────────────────── */
const DLAYERS = [5, 8, 8, 4];
const DX = 260;
const dNodes = DLAYERS.flatMap((n, l) => Array.from({ length: n }, (_, i) => ({ l, i, x: 960 + (l - 1.5) * DX, y: 540 + (i - (n - 1) / 2) * 76 })));

const Dropout = ({ t }: { t: number }) => {
  const on = t >= T_REST - 0.2;
  const epoch = Math.floor(Math.max(0, t - (T_REST - 0.2)) / 0.55);
  const dropped = (l: number, i: number) => on && (l === 1 || l === 2) && hash(epoch * 97 + l * 13 + i * 7) < 0.5;
  const ens = ease.inOutCubic(prog(t, T_ENSEMBLE, T_ENSEMBLE + 1.2));
  const merge = ease.inOutCubic(prog(t, T_MERGE - 0.4, T_MERGE + 0.8));
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: 1 - ens * (1 - merge) }}>
        {dNodes.map((a) =>
          dNodes
            .filter((b) => b.l === a.l + 1)
            .map((b) => {
              const off = (dropped(a.l, a.i) || dropped(b.l, b.i)) && merge < 0.5;
              return <line key={`${a.l}${a.i}-${b.i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={off ? "transparent" : CYAN} strokeOpacity={0.35} strokeWidth={1.5} />;
            }),
        )}
        {dNodes.map((n) => {
          const off = dropped(n.l, n.i) && merge < 0.5;
          return (
            <g key={`${n.l}-${n.i}`}>
              <circle cx={n.x} cy={n.y} r={22} fill={off ? "rgba(255,255,255,0.04)" : n.l === 0 ? CYAN : n.l === 3 ? AMBER : IVORY} stroke={off ? FAINT : "none"} strokeDasharray="4 4" opacity={off ? 1 : 0.9} />
              {off && <text x={n.x} y={n.y + 8} textAnchor="middle" fontSize={22} fill={CORAL} fontFamily={FONT_MONO}>×</text>}
            </g>
          );
        })}
      </svg>
      {/* three thinned sub-networks peel off, then merge back */}
      {ens > 0 &&
        [0, 1, 2].map((s) => {
          const dx = (s - 1) * 520 * (1 - merge);
          return (
            <svg key={s} width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: ens * (1 - merge), transform: `translateX(${dx}px) scale(${lerp(0.45, 1, merge)})`, transformOrigin: "50% 50%" }}>
              {dNodes.map((n) => {
                const off = (n.l === 1 || n.l === 2) && hash(s * 997 + n.l * 13 + n.i * 7) < 0.5;
                return <circle key={`${n.l}-${n.i}`} cx={n.x} cy={n.y} r={22} fill={off ? "transparent" : [CYAN, VIOLET, LIME][s]} stroke={off ? FAINT : "none"} opacity={0.85} />;
              })}
            </svg>
          );
        })}
      <Heading size={52} at={{ x: 960, y: 160 }} center color={IVORY} style={{ opacity: rise(t, T_K10, 0.6) }}>
        Dropout <span style={{ fontFamily: FONT_CN, fontSize: 30, color: DIM }}>随机让一半神经元“休息”</span>
      </Heading>
      <Body size={30} at={{ x: 960, y: 900 }} center color={LIME} style={{ opacity: rise(t, T_ENSEMBLE, 0.6), whiteSpace: "nowrap" }}>
        {merge > 0.5 ? "合在一起：相当于许多网络的“集体智慧”" : "每次训练：一个不同的“瘦”网络"}
      </Body>
    </AbsoluteFill>
  );
};

export const Keys = ({ t }: { t: number }) => (
  <AbsoluteFill style={{ background: BG }}>
    <Backdrop grid={0.03} />
    <Show t={t} from={S.start} to={T_K2 + 0.3} fadeIn={0.3}>
      <ThreeKeys t={t} />
      <Heading size={48} at={{ x: 960, y: 230 }} center color={DIM} style={{ opacity: rise(t, T_K1 + 0.5, 0.6) }}>
        既然想法早就有了，为什么偏偏是 2012 年？
      </Heading>
    </Show>
    <Show t={t} from={T_K2 - 0.2} to={T_K3 + 0.2}>
      <ImageNetWall t={t} />
    </Show>
    <Show t={t} from={T_K3 - 0.1} to={T_K4 + 0.1}>
      <Datasets t={t} />
    </Show>
    <Show t={t} from={T_K4 - 0.1} to={T_K5 + 0.1}>
      <Cores t={t} />
    </Show>
    <Show t={t} from={T_K5 - 0.1} to={T_K7 + 0.1}>
      <TwoGpus t={t} />
    </Show>
    <Show t={t} from={T_K7 - 0.1} to={T_K8 + 0.1}>
      <Specialise t={t} />
    </Show>
    <Show t={t} from={T_K8 - 0.1} to={T_K9 + 0.2}>
      <ThreeKeys t={t} active={2} />
    </Show>
    <Show t={t} from={T_K9 - 0.1} to={T_K10 + 0.1}>
      <Augment t={t} />
    </Show>
    <Show t={t} from={T_K10 - 0.1} to={S.end}>
      <Dropout t={t} />
    </Show>
  </AbsoluteFill>
);

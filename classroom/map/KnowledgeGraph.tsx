import { PointerEvent as RPointerEvent, forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import { Simulation, SimulationLinkDatum, SimulationNodeDatum, forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from "d3-force";
import { Progress } from "../progress/mastery";
import type { KnowledgeNode } from "./graph";
import { STATUS_COLOR_LIGHT, nodeStatus } from "./status";
import { CHAPTERS, Chapter, subRel } from "./universe";

/**
 * Light 2D concept graph: big nodes (chapters) with labelled prerequisite arrows; an expanded chapter shows its
 * sub-topics around it. Force layout (d3-force) seeded from a hand layout so it always opens in the same shape.
 * Pan by dragging the background, zoom with the wheel, drag nodes to rearrange.
 */

export type GraphApi = { zoomBy: (f: number) => void; fit: () => void; focus: (id: string) => void };

type GNode = SimulationNodeDatum & {
  id: string;
  kind: "chapter" | "topic";
  chapter: Chapter;
  node?: KnowledgeNode;
  index: number;
  title: string;
  color: string;
  r: number;
  ax: number;
  ay: number;
};
type GLink = SimulationLinkDatum<GNode> & { id: string; label?: string; kind: "needs" | "contains" };
/** d3 swaps link ends from ids to node objects once the force runs; read either. */
const endId = (e: GLink["source"]) => (typeof e === "object" ? (e as GNode).id : String(e));

/** Hand layout of the big nodes (graph pixels): vision across the top, sequence along the bottom, generative between. */
const ANCHOR: Record<string, [number, number]> = {
  alexnet: [0, 0],
  vgg: [-120, -330],
  googlenet: [200, -360],
  resnet: [480, -250],
  vit: [800, -260],
  rnn: [-80, 360],
  attention: [260, 400],
  transformer: [560, 230],
  llm: [880, 330],
  generative: [420, 20],
  diffusion: [760, 20],
};

const mix = (hex: string, k: number) => {
  // blend toward white by k
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * k));
  return `rgb(${c.join(",")})`;
};

type Props = {
  progress: Progress;
  expanded: Set<string>;
  visible: (c: Chapter) => boolean;
  query: string;
  selected: string | null;
  recommended: string | null;
  onPick: (id: string, kind: "chapter" | "topic") => void;
};

export const KnowledgeGraph = forwardRef<GraphApi, Props>(({ progress, expanded, visible, query, selected, recommended, onPick }, ref) => {
  const svg = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState({ x: 400, y: 300, k: 0.8 });
  const [, redraw] = useReducer((x: number) => x + 1, 0);
  const [hover, setHover] = useState<string | null>(null);
  const sim = useRef<Simulation<GNode, GLink> | null>(null);
  const known = useRef(new Map<string, GNode>());
  const fitted = useRef(false);

  /* ── graph data for the current filters and expansions ── */
  const { nodes, links } = useMemo(() => {
    const shown = CHAPTERS.filter(visible);
    const ids = new Set(shown.map((c) => c.id));
    const nodes: GNode[] = [];
    const links: GLink[] = [];
    const reuse = (n: GNode) => {
      const old = known.current.get(n.id);
      if (old) Object.assign(n, { x: old.x, y: old.y, vx: old.vx, vy: old.vy });
      known.current.set(n.id, n);
      nodes.push(n);
    };
    shown.forEach((c, ci) => {
      const [ax, ay] = ANCHOR[c.id] ?? [0, 0];
      reuse({ id: c.id, kind: "chapter", chapter: c, index: ci, title: c.title, color: c.color, r: c.lesson ? 24 : 20, ax, ay, x: ax, y: ay });
      c.needs.filter((id) => ids.has(id)).forEach((id) => links.push({ id: `${id}>${c.id}`, source: id, target: c.id, label: c.rel[id], kind: "needs" }));
      if (!expanded.has(c.id)) return;
      c.children.forEach((n, i) => {
        const a = (i / c.children.length) * Math.PI * 2 - Math.PI / 2;
        const ox = ax + Math.cos(a) * 190;
        const oy = ay + Math.sin(a) * 190;
        // new topics burst out of their chapter
        const parent = known.current.get(c.id);
        reuse({ id: n.id, kind: "topic", chapter: c, node: n, index: i, title: n.title, color: mix(c.color, 0.25), r: 13, ax: ox, ay: oy, x: (parent?.x ?? ax) + Math.cos(a) * 8, y: (parent?.y ?? ay) + Math.sin(a) * 8 });
        links.push({ id: `${c.id}>${n.id}`, source: c.id, target: n.id, kind: "contains" });
        n.needs.forEach((id) => links.push({ id: `${id}>${n.id}`, source: id, target: n.id, label: subRel(id, n.id), kind: "needs" }));
      });
    });
    return { nodes, links };
  }, [visible, expanded]);

  /* ── simulation ── */
  useEffect(() => {
    const s =
      sim.current ??
      forceSimulation<GNode, GLink>()
        .alphaDecay(0.035)
        .velocityDecay(0.42)
        .on("tick", redraw);
    sim.current = s;
    s.nodes(nodes)
      .force(
        "link",
        forceLink<GNode, GLink>(links)
          .id((d) => d.id)
          .distance((l) => (l.kind === "contains" ? 175 : (l.source as GNode).kind === "topic" ? 130 : 240))
          .strength((l) => (l.kind === "contains" ? 0.5 : (l.source as GNode).kind === "topic" ? 0.35 : 0.08)),
      )
      .force("charge", forceManyBody<GNode>().strength((d) => (d.kind === "chapter" ? -1000 : -420)))
      .force("collide", forceCollide<GNode>().radius((d) => d.r + (d.kind === "chapter" ? 50 : 46)))
      .force("x", forceX<GNode>((d) => d.ax).strength((d) => (d.kind === "chapter" ? 0.09 : 0.02)))
      .force("y", forceY<GNode>((d) => d.ay).strength((d) => (d.kind === "chapter" ? 0.09 : 0.02)));
    if (!fitted.current) {
      // settle the first layout off-screen so the page opens on a calm graph
      s.alpha(1).stop();
      for (let i = 0; i < 320; i++) s.tick();
      redraw();
    } else s.alpha(0.7).restart();
    return () => void s.stop();
  }, [nodes, links]);

  /* ── viewport ── */
  useLayoutEffect(() => {
    const el = svg.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const fitTo = (list: GNode[], pad = 70, maxK = 1.15) => {
    if (!list.length) return;
    const xs = list.map((n) => n.x ?? 0);
    const ys = list.map((n) => n.y ?? 0);
    const x0 = Math.min(...xs) - 40;
    const x1 = Math.max(...xs) + 130; // labels sit to the right
    const y0 = Math.min(...ys) - 40;
    const y1 = Math.max(...ys) + 40;
    const k = Math.min(maxK, (size.w - pad * 2) / (x1 - x0), (size.h - pad * 2) / (y1 - y0));
    setView({ k, x: size.w / 2 - ((x0 + x1) / 2) * k, y: size.h / 2 - ((y0 + y1) / 2) * k });
  };
  useEffect(() => {
    if (fitted.current || size.w < 50 || !nodes.length) return;
    fitted.current = true;
    fitTo(nodes);
  });

  useImperativeHandle(ref, () => ({
    zoomBy: (f) =>
      setView((v) => {
        const k = Math.max(0.25, Math.min(2.6, v.k * f));
        const cx = size.w / 2;
        const cy = size.h / 2;
        return { k, x: cx - ((cx - v.x) / v.k) * k, y: cy - ((cy - v.y) / v.k) * k };
      }),
    fit: () => fitTo(nodes),
    focus: (id) => {
      const n = nodes.find((x) => x.id === id);
      if (!n) return;
      const group = n.kind === "chapter" && expanded.has(n.id) ? nodes.filter((x) => x.id === n.id || x.chapter.id === n.id) : [n, ...nodes.filter((x) => links.some((l) => (endId(l.source) === id && endId(l.target) === x.id) || (endId(l.target) === id && endId(l.source) === x.id)))];
      fitTo(group, 90, 1.05);
    },
  }));

  // wheel zoom around the cursor (non-passive so the page does not scroll)
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      setView((v) => {
        const k = Math.max(0.25, Math.min(2.6, v.k * Math.exp(-e.deltaY * 0.0016)));
        return { k, x: px - ((px - v.x) / v.k) * k, y: py - ((py - v.y) / v.k) * k };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  /* ── pointer: pan the background, drag a node, click to pick ── */
  const drag = useRef<{ kind: "pan" | "node"; id?: string; sx: number; sy: number; vx: number; vy: number; moved: boolean } | null>(null);
  const toGraph = (e: { clientX: number; clientY: number }) => {
    const r = svg.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left - view.x) / view.k, y: (e.clientY - r.top - view.y) / view.k };
  };
  const onDown = (e: RPointerEvent<SVGSVGElement>) => {
    const target = (e.target as Element).closest("[data-node]");
    const id = target?.getAttribute("data-node") ?? undefined;
    svg.current?.setPointerCapture(e.pointerId);
    drag.current = { kind: id ? "node" : "pan", id, sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, moved: false };
  };
  const onMove = (e: RPointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 4) d.moved = true;
    if (!d.moved) return;
    if (d.kind === "pan") return setView((v) => ({ ...v, x: d.vx + e.clientX - d.sx, y: d.vy + e.clientY - d.sy }));
    const n = nodes.find((x) => x.id === d.id);
    if (!n) return;
    const p = toGraph(e);
    n.fx = p.x;
    n.fy = p.y;
    sim.current?.alphaTarget(0.25).restart();
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.kind === "node") {
      const n = nodes.find((x) => x.id === d.id);
      if (n && d.moved) {
        // a dragged node stays where it was put
        n.ax = n.fx ?? n.ax;
        n.ay = n.fy ?? n.ay;
        n.fx = null;
        n.fy = null;
        sim.current?.alphaTarget(0);
      } else if (n) onPick(n.id, n.kind);
    }
  };

  /* ── highlight sets ── */
  const q = query.trim().toLowerCase();
  const matches = q ? new Set(nodes.filter((n) => n.title.toLowerCase().includes(q) || (n.node?.en ?? n.chapter.en).toLowerCase().includes(q)).map((n) => n.id)) : null;
  const focusId = hover ?? selected;
  const near = useMemo(() => {
    if (!focusId) return null;
    const s = new Set([focusId]);
    links.forEach((l) => {
      const a = endId(l.source);
      const b = endId(l.target);
      if (a === focusId) s.add(b);
      if (b === focusId) s.add(a);
    });
    return s;
  }, [focusId, links]);
  const lit = (id: string) => (matches ? matches.has(id) : near ? near.has(id) : true);

  const colors = useMemo(() => [...new Set(nodes.map((n) => n.color))], [nodes]);
  const gid = (c: string) => `g-${c.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg ref={svg} className="kg-svg" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <defs>
        <pattern id="kg-dots" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.1" fill="#e6eaf2" />
        </pattern>
        <marker id="kg-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 1 L9 5 L0 9 z" fill="#9aa5b8" />
        </marker>
        <filter id="kg-blur" x="-1" y="-1" width="3" height="3">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        {colors.map((c) => (
          <radialGradient key={c} id={gid(c)} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={0.95} />
            <stop offset="28%" stopColor={c} stopOpacity={0.75} />
            <stop offset="100%" stopColor={c} />
          </radialGradient>
        ))}
      </defs>
      <rect width="100%" height="100%" fill="url(#kg-dots)" />
      <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
        {links.map((l) => {
          const a = l.source as GNode;
          const b = l.target as GNode;
          if (a.x === undefined || b.x === undefined) return null;
          const dx = b.x - a.x;
          const dy = (b.y ?? 0) - (a.y ?? 0);
          const len = Math.hypot(dx, dy) || 1;
          const ux = dx / len;
          const uy = dy / len;
          const sx = a.x + ux * (a.r + 4);
          const sy = (a.y ?? 0) + uy * (a.r + 4);
          const ex = b.x - ux * (b.r + 6);
          const ey = (b.y ?? 0) - uy * (b.r + 6);
          // gentle bend, always to the same side of the travel direction
          const bend = l.kind === "contains" ? 0 : Math.min(40, len * 0.12);
          const cx = (sx + ex) / 2 - uy * bend;
          const cy = (sy + ey) / 2 + ux * bend;
          const mx = 0.25 * sx + 0.5 * cx + 0.25 * ex;
          const my = 0.25 * sy + 0.5 * cy + 0.25 * ey;
          const on = lit(a.id) && lit(b.id);
          return (
            <g key={l.id} className={`kg-link ${l.kind}`} opacity={on ? 1 : 0.18}>
              <path d={`M${sx},${sy} Q${cx},${cy} ${ex},${ey}`} markerEnd={l.kind === "needs" ? "url(#kg-arrow)" : undefined} />
              {l.label && (
                <text x={mx} y={my} dy="0.35em" textAnchor="middle">
                  {l.label}
                </text>
              )}
            </g>
          );
        })}
        {nodes.map((n) => {
          if (n.x === undefined) return null;
          const st = n.node ? nodeStatus(progress, n.node) : null;
          const ring = st && st !== "locked" && st !== "new" ? STATUS_COLOR_LIGHT[st] : null;
          const dim = st === "locked";
          const on = lit(n.id);
          const sel = selected === n.id;
          const count = n.kind === "chapter" && !expanded.has(n.id) ? n.chapter.children.length : 0;
          return (
            <g
              key={n.id}
              data-node={n.id}
              className={`kg-node ${n.kind}${sel ? " selected" : ""}${hover === n.id ? " hover" : ""}`}
              transform={`translate(${n.x},${n.y})`}
              opacity={on ? (dim ? 0.78 : 1) : 0.22}
              onPointerEnter={() => setHover(n.id)}
              onPointerLeave={() => setHover((h) => (h === n.id ? null : h))}
            >
              <circle className="halo" r={n.r * 1.55} fill={n.color} filter="url(#kg-blur)" />
              {recommended === n.id && <circle className="pulse" r={n.r + 6} stroke={n.color} />}
              {sel && <circle r={n.r + 7} fill="none" stroke={n.color} strokeWidth={2} strokeDasharray="4 4" />}
              <circle className="body" r={n.r} fill={`url(#${gid(n.color)})`} />
              {ring && <circle r={n.r + 3.5} fill="none" stroke={ring} strokeWidth={2.5} />}
              {matches?.has(n.id) && <circle r={n.r + 9} fill="none" stroke="#f59e0b" strokeWidth={2.5} />}
              <text className="label" x={n.r + 10} dy="0.35em">
                {n.title}
                {count > 0 && <tspan className="count"> {count}</tspan>}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
});
KnowledgeGraph.displayName = "KnowledgeGraph";

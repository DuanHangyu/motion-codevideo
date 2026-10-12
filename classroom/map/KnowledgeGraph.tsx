import { PointerEvent as RPointerEvent, forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import { Simulation, SimulationLinkDatum, SimulationNodeDatum, forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from "d3-force";
import { Progress } from "../progress/mastery";
import type { KnowledgeNode } from "./graph";
import { STATUS_COLOR_LIGHT, nodeStatus } from "./status";
import { CHAPTERS, Chapter, TRACKS, TrackId, subRel } from "./universe";

/**
 * Light 2D concept graph. Big nodes (chapters) sit on track lanes laid out roughly by year; arrows name the relation.
 * An expanded chapter shows its sub-topics around it. d3-force keeps the hand layout but resolves overlaps.
 * Drag the background to pan, the wheel to zoom, a node to move it; click to pick.
 */

export type GraphApi = { zoomBy: (f: number) => void; fit: () => void; focus: (id: string) => void };

type GNode = SimulationNodeDatum & {
  id: string;
  kind: "chapter" | "topic";
  chapter: Chapter;
  node?: KnowledgeNode;
  order: number;
  title: string;
  color: string;
  r: number;
  ax: number;
  ay: number;
};
type GLink = SimulationLinkDatum<GNode> & { id: string; label?: string; kind: "needs" | "contains"; color: string };

/** d3 swaps link ends from ids to node objects once the force runs; read either. */
const endId = (e: GLink["source"]) => (typeof e === "object" ? (e as GNode).id : String(e));

/** Hand layout → graph units (compressed so the whole course fits at a readable zoom). */
const SX = 0.82;
const SY = 0.62;
const TOPIC_RING = 125;
/** Edge relation labels appear on their own from this zoom up; highlighted edges always show theirs. */
const LABEL_ZOOM = 1.05;

const DEGREE: Record<string, number> = {};
CHAPTERS.forEach((c) => {
  DEGREE[c.id] = (DEGREE[c.id] ?? 0) + c.needs.length;
  c.needs.forEach((id) => (DEGREE[id] = (DEGREE[id] ?? 0) + 1));
});
const chapterRadius = (c: Chapter) => (c.lesson ? 21 : 9 + Math.min(9, (DEGREE[c.id] ?? 0) * 1.7));

const tint = (hex: string, k: number) => {
  // blend toward white by k
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * k));
  return `rgb(${c.join(",")})`;
};
const safeId = (c: string) => c.replace(/[^a-z0-9]/gi, "");

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
  const [view, setView] = useState({ x: 0, y: 0, k: 0.8 });
  const [tick, redraw] = useReducer((x: number) => x + 1, 0);
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
      if (old) Object.assign(n, { x: old.x, y: old.y, vx: old.vx, vy: old.vy, ax: old.ax, ay: old.ay });
      known.current.set(n.id, n);
      nodes.push(n);
    };
    // entrance order follows the timeline, left to right
    const order = [...shown].sort((a, b) => a.at[0] - b.at[0]).map((c) => c.id);
    shown.forEach((c) => {
      const ax = c.at[0] * SX;
      const ay = c.at[1] * SY;
      reuse({ id: c.id, kind: "chapter", chapter: c, order: order.indexOf(c.id), title: c.title, color: c.color, r: chapterRadius(c), ax, ay, x: ax, y: ay });
      c.needs.filter((id) => ids.has(id)).forEach((id) => links.push({ id: `${id}>${c.id}`, source: id, target: c.id, label: c.rel[id], kind: "needs", color: CHAPTERS.find((x) => x.id === id)!.color }));
      if (!expanded.has(c.id)) return;
      const parent = known.current.get(c.id);
      const px = parent?.x ?? ax;
      const py = parent?.y ?? ay;
      c.children.forEach((n, i) => {
        const a = (i / c.children.length) * Math.PI * 2 - Math.PI / 2;
        // new topics burst out of their chapter and settle on a ring around it
        reuse({ id: n.id, kind: "topic", chapter: c, node: n, order: i, title: n.title, color: tint(c.color, 0.22), r: 8.5, ax: px + Math.cos(a) * TOPIC_RING, ay: py + Math.sin(a) * TOPIC_RING, x: px + Math.cos(a) * 6, y: py + Math.sin(a) * 6 });
        links.push({ id: `${c.id}>${n.id}`, source: c.id, target: n.id, kind: "contains", color: c.color });
        n.needs.forEach((id) => links.push({ id: `${id}>${n.id}`, source: id, target: n.id, label: subRel(id, n.id), kind: "needs", color: c.color }));
      });
    });
    return { nodes, links };
  }, [visible, expanded]);

  /* ── simulation: hand layout as springs, forces only to untangle ── */
  useEffect(() => {
    const s = sim.current ?? forceSimulation<GNode, GLink>().alphaDecay(0.04).velocityDecay(0.45).on("tick", redraw);
    sim.current = s;
    s.nodes(nodes)
      .force(
        "link",
        forceLink<GNode, GLink>(links)
          .id((d) => d.id)
          .distance((l) => (l.kind === "contains" ? TOPIC_RING : (l.source as GNode).kind === "topic" ? 90 : 170))
          .strength((l) => (l.kind === "contains" ? 0.6 : (l.source as GNode).kind === "topic" ? 0.25 : 0.02)),
      )
      .force("charge", forceManyBody<GNode>().strength((d) => (d.kind === "chapter" ? -260 : -140)).distanceMax(260))
      .force("collide", forceCollide<GNode>().radius((d) => d.r + (d.kind === "chapter" ? 34 : 26)).strength(0.9))
      .force("x", forceX<GNode>((d) => d.ax).strength((d) => (d.kind === "chapter" ? 0.28 : 0.04)))
      .force("y", forceY<GNode>((d) => d.ay).strength((d) => (d.kind === "chapter" ? 0.28 : 0.04)));
    if (!fitted.current) {
      // settle the first layout off-screen so the page opens on a calm graph
      s.alpha(1).stop();
      for (let i = 0; i < 300; i++) s.tick();
      redraw();
    } else s.alpha(0.6).restart();
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

  const fitTo = (list: GNode[], maxK = 1.15) => {
    if (!list.length || size.w < 50) return;
    const xs = list.map((n) => n.x ?? 0);
    const ys = list.map((n) => n.y ?? 0);
    const x0 = Math.min(...xs) - 50;
    const x1 = Math.max(...xs) + 140; // labels sit to the right
    const y0 = Math.min(...ys) - 50;
    const y1 = Math.max(...ys) + 50;
    // leave room for the toolbar above and the legend below
    const top = 76;
    const bottom = 64;
    const k = Math.min(maxK, (size.w - 60) / (x1 - x0), (size.h - top - bottom) / (y1 - y0));
    setView({ k, x: size.w / 2 - ((x0 + x1) / 2) * k, y: top + (size.h - top - bottom) / 2 - ((y0 + y1) / 2) * k });
  };
  // keep the whole graph framed while the card settles or the window resizes, until the user takes the camera
  const userMoved = useRef(false);
  useEffect(() => {
    if (size.w < 50 || !nodes.length) return;
    fitted.current = true;
    if (!userMoved.current) fitTo(nodes);
  }, [size.w, size.h]); // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(ref, () => ({
    zoomBy: (f) =>
      (userMoved.current = true) &&
      setView((v) => {
        const k = Math.max(0.25, Math.min(2.6, v.k * f));
        const cx = size.w / 2;
        const cy = size.h / 2;
        return { k, x: cx - ((cx - v.x) / v.k) * k, y: cy - ((cy - v.y) / v.k) * k };
      }),
    fit: () => {
      userMoved.current = false;
      fitTo(nodes);
    },
    focus: (id) => {
      const n = nodes.find((x) => x.id === id);
      if (!n) return;
      const linked = (x: GNode) => links.some((l) => (endId(l.source) === id && endId(l.target) === x.id) || (endId(l.target) === id && endId(l.source) === x.id));
      const group = n.kind === "chapter" && expanded.has(n.id) ? nodes.filter((x) => x.id === n.id || x.chapter.id === n.id) : [n, ...nodes.filter(linked)];
      userMoved.current = true;
      fitTo(group, 1.25);
    },
  }));

  // wheel zoom around the cursor (non-passive so the page does not scroll)
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      userMoved.current = true;
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
    const id = (e.target as Element).closest("[data-node]")?.getAttribute("data-node") ?? undefined;
    try {
      svg.current?.setPointerCapture(e.pointerId);
    } catch {
      // a released pointer cannot be captured; dragging still works without capture
    }
    drag.current = { kind: id ? "node" : "pan", id, sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, moved: false };
  };
  const onMove = (e: RPointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 4) d.moved = true;
    if (!d.moved) return;
    userMoved.current = true;
    if (d.kind === "pan") return setView((v) => ({ ...v, x: d.vx + e.clientX - d.sx, y: d.vy + e.clientY - d.sy }));
    const n = nodes.find((x) => x.id === d.id);
    if (!n) return;
    const p = toGraph(e);
    n.fx = p.x;
    n.fy = p.y;
    sim.current?.alphaTarget(0.2).restart();
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.kind !== "node") return;
    const n = nodes.find((x) => x.id === d.id);
    if (!n) return;
    if (!d.moved) return onPick(n.id, n.kind);
    // a dragged node stays where it was put
    n.ax = n.fx ?? n.ax;
    n.ay = n.fy ?? n.ay;
    n.fx = null;
    n.fy = null;
    sim.current?.alphaTarget(0);
  };

  /* ── highlight sets ── */
  const q = query.trim().toLowerCase();
  const matches = q ? new Set(nodes.filter((n) => n.title.toLowerCase().includes(q) || (n.node?.en ?? n.chapter.en).toLowerCase().includes(q)).map((n) => n.id)) : null;
  // hover isolates a node's neighbourhood; a selection only lights its edges, it does not grey the rest out
  const hoverSet = useMemo(() => {
    if (!hover) return null;
    const s = new Set([hover]);
    links.forEach((l) => {
      const a = endId(l.source);
      const b = endId(l.target);
      if (a === hover) s.add(b);
      if (b === hover) s.add(a);
    });
    return s;
  }, [hover, links]);
  const nodeOpacity = (id: string) => (matches ? (matches.has(id) ? 1 : 0.18) : hoverSet ? (hoverSet.has(id) ? 1 : 0.22) : 1);
  const focusId = hover ?? selected;
  const edgeLit = (a: string, b: string) => !!focusId && (a === focusId || b === focusId);

  /* ── track territories: a soft wash behind each lane (follows the live layout) ── */
  const territories = useMemo(() => {
    const out: Array<{ id: TrackId; cx: number; cy: number; rx: number; ry: number; lx: number; ly: number }> = [];
    (Object.keys(TRACKS) as TrackId[]).forEach((t) => {
      const list = nodes.filter((n) => n.kind === "chapter" && n.chapter.track === t && n.x !== undefined);
      if (!list.length) return;
      const xs = list.map((n) => n.x!);
      const ys = list.map((n) => n.y!);
      const x0 = Math.min(...xs);
      const x1 = Math.max(...xs);
      const y0 = Math.min(...ys);
      const y1 = Math.max(...ys);
      out.push({ id: t, cx: (x0 + x1) / 2 + 40, cy: (y0 + y1) / 2, rx: (x1 - x0) / 2 + 150, ry: (y1 - y0) / 2 + 80, lx: x0 - 30, ly: y0 - 44 });
    });
    return out;
  }, [nodes, tick]);

  const colors = useMemo(() => [...new Set([...nodes.map((n) => n.color), ...links.map((l) => l.color)])], [nodes, links]);
  const showLabels = view.k >= LABEL_ZOOM;
  // semantic zoom: zoomed out, text and dots keep a readable on-screen size instead of shrinking with the graph
  const ls = Math.min(1.7, Math.max(1, 0.95 / view.k));
  const rs = Math.sqrt(ls);

  return (
    <svg ref={svg} className="kg-svg" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <defs>
        <pattern id="kg-dots" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.05" fill="#e3e8f1" />
        </pattern>
        <filter id="kg-blur" x="-1" y="-1" width="3" height="3">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id="kg-wash" x="-0.5" y="-0.5" width="2" height="2">
          <feGaussianBlur stdDeviation="40" />
        </filter>
        {colors.map((c) => (
          <g key={c}>
            <radialGradient id={`g-${safeId(c)}`} cx="34%" cy="30%" r="78%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity={0.95} />
              <stop offset="30%" stopColor={c} stopOpacity={0.8} />
              <stop offset="100%" stopColor={c} />
            </radialGradient>
            <marker id={`a-${safeId(c)}`} viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
              <path d="M0 1.2 L9 5 L0 8.8 z" fill={c} />
            </marker>
          </g>
        ))}
      </defs>
      <rect width="100%" height="100%" fill="url(#kg-dots)" />
      <g transform={`translate(${view.x},${view.y}) scale(${view.k})`} style={{ ["--ls" as string]: ls }}>
        <g className="kg-territories">
          {territories.map((t) => (
            <g key={t.id}>
              <ellipse cx={t.cx} cy={t.cy} rx={t.rx} ry={t.ry} fill={TRACKS[t.id].color} opacity={0.075} filter="url(#kg-wash)" />

            </g>
          ))}
        </g>
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
          const ex = b.x - ux * (b.r + 5);
          const ey = (b.y ?? 0) - uy * (b.r + 5);
          // gentle bend, always to the same side of the travel direction
          const bend = l.kind === "contains" ? 0 : Math.min(36, len * 0.14);
          const cx = (sx + ex) / 2 - uy * bend;
          const cy = (sy + ey) / 2 + ux * bend;
          const mx = 0.25 * sx + 0.5 * cx + 0.25 * ex;
          const my = 0.25 * sy + 0.5 * cy + 0.25 * ey;
          const lit = edgeLit(a.id, b.id);
          const faded = matches ? !(matches.has(a.id) || matches.has(b.id)) : hoverSet ? !lit : false;
          return (
            <g key={l.id} className={`kg-link ${l.kind}${lit ? " lit" : ""}`} opacity={faded ? 0.12 : 1} style={{ ["--c" as string]: l.color }}>
              <path d={`M${sx},${sy} Q${cx},${cy} ${ex},${ey}`} markerEnd={l.kind === "needs" ? `url(#a-${safeId(l.color)})` : undefined} />
              {l.label && (lit || showLabels) && (
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
          const sel = selected === n.id;
          const open = n.kind === "chapter" && !!n.chapter.lesson;
          const count = n.kind === "chapter" && !expanded.has(n.id) ? n.chapter.children.length : 0;
          return (
            <g
              key={n.id}
              data-node={n.id}
              className={`kg-node ${n.kind}${sel ? " selected" : ""}${hover === n.id ? " hover" : ""}${open ? " open" : ""}${st === "locked" ? " locked" : ""}`}
              transform={`translate(${n.x},${n.y})`}
              opacity={nodeOpacity(n.id)}
              onPointerEnter={() => setHover(n.id)}
              onPointerLeave={() => setHover((h) => (h === n.id ? null : h))}
            >
              <g className="in" transform={`scale(${rs})`} style={{ animationDelay: `${n.kind === "chapter" ? 80 + n.order * 45 : n.order * 35}ms` }}>
                <circle className="halo" r={n.r * 1.7} fill={n.color} filter="url(#kg-blur)" />
                {recommended === n.id && <circle className="pulse" r={n.r + 6} stroke={n.color} />}
                {open && <circle r={n.r + 6} fill="none" stroke={n.color} strokeOpacity={0.35} strokeWidth={1.5} />}
                {sel && <circle className="sel" r={n.r + (open ? 11 : 7)} stroke={n.color} />}
                <circle className="body" r={n.r} fill={`url(#g-${safeId(n.color)})`} />
                {ring && <circle r={n.r + 3} fill="none" stroke={ring} strokeWidth={2.5} />}
                {matches?.has(n.id) && <circle r={n.r + 9} fill="none" stroke="#f59e0b" strokeWidth={2.5} />}
                <text className="label" x={(n.r * rs) / ls + 9} dy="0.35em" transform={`scale(${ls / rs})`}>
                  {n.title}
                  {count > 0 && <tspan className="count"> {count}</tspan>}
                </text>
                {open && (
                  <text className="badge" x={(n.r * rs) / ls + 9} y={(n.r * rs) / ls + 6} transform={`scale(${ls / rs})`}>
                    ▶ 可进入课堂
                  </text>
                )}
              </g>
            </g>
          );
        })}
      </g>
    </svg>
  );
});
KnowledgeGraph.displayName = "KnowledgeGraph";

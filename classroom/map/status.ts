import { Progress, Status, get, status } from "../progress/mastery";
import type { KnowledgeNode } from "./graph";

/** Mastery colours on the dark lesson page. */
export const STATUS_COLOR: Record<Status, string> = { new: "#8fa0c8", learning: "#3ce0ff", review: "#ff5470", mastered: "#a8ff60" };
/** Mastery colours on the light pages (home, knowledge graph). */
export const STATUS_COLOR_LIGHT: Record<Status, string> = { new: "#94a3b8", learning: "#3b82f6", review: "#f43f5e", mastered: "#22c55e" };

/** A sub-topic without a lesson yet is "locked". */
export const nodeStatus = (p: Progress, n: KnowledgeNode): Status | "locked" => (n.span ? status(get(p, n.id)) : "locked");

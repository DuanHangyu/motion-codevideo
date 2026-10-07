import { useSyncExternalStore } from "react";

/** Minimal hash router: #/map, #/lesson/alexnet?node=conv&t=241 */
export type Route = { path: string[]; query: URLSearchParams };

const parse = (): Route => {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const [p, q = ""] = raw.split("?");
  return { path: p.split("/").filter(Boolean), query: new URLSearchParams(q) };
};

let current = parse();
const listeners = new Set<() => void>();
window.addEventListener("hashchange", () => {
  current = parse();
  listeners.forEach((l) => l());
});

export const useRoute = (): Route =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );

export const go = (to: string) => {
  window.location.hash = to.startsWith("#") ? to : `#${to}`;
};

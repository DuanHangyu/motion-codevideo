/** Directory the classroom is served from, without a trailing slash ("" at the site root). */
export const staticBaseFor = (href: string): string =>
  new URL(".", href).pathname.replace(/\/$/, "");

export const installStaticBase = (): void => {
  // Remotion's staticFile() resolves against the site root unless a static base is set, so a
  // classroom deployed under a sub-path (e.g. inside PolyPilot) must set it before rendering.
  const base = staticBaseFor(window.location.href);
  if (base) window.remotion_staticBase = base;
};

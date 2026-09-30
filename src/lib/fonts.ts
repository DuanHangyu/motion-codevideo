import { staticFile } from "remotion";

const FACES: Array<[string, string, string]> = [
  ["Unbounded", "fonts/Unbounded.ttf", "200 900"],
  ["JetBrains Mono", "fonts/JetBrainsMono.ttf", "100 800"],
];

let loading: Promise<void> | null = null;

/** Loads the two brand typefaces once; safe to call from many components. */
export const loadFonts = (): Promise<void> => {
  loading ??= Promise.all(
    FACES.map(async ([family, file, weight]) => {
      const face = new FontFace(family, `url(${staticFile(file)}) format("truetype")`, { weight });
      document.fonts.add(await face.load());
    }),
  ).then(() => undefined);
  return loading;
};

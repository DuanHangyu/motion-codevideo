// Render stills of the AlexNet lesson at given times (seconds) and tile them into one contact sheet.
// usage: node scripts/alexnet-stills.mjs out/stills/name 12.5 30 61.2 ...
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

const [prefix, ...times] = process.argv.slice(2);
if (!prefix || times.length === 0) throw new Error("usage: alexnet-stills.mjs <out-prefix> <sec>...");
mkdirSync(path.dirname(prefix), { recursive: true });

const serveUrl = await bundle({ entryPoint: path.resolve("src/alexnet/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id: "AlexNet", chromiumOptions: { gl: "angle" } });

const files = [];
for (const s of times) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(Number(s) * composition.fps));
  const output = `${prefix}-${String(s).replace(".", "_")}.jpg`;
  const t0 = Date.now();
  await renderStill({ composition, serveUrl, frame, output, imageFormat: "jpeg", jpegQuality: 85, chromiumOptions: { gl: "angle" } });
  console.log(`${s}s (frame ${frame}) → ${output}  ${Date.now() - t0}ms`);
  files.push(output);
}

// contact sheet: 2 columns of 960×540 tiles
const sheet = `${prefix}-sheet.jpg`;
const inputs = files.flatMap((f) => ["-i", f]);
const cols = Math.min(2, files.length);
const layout = files.map((_, i) => `${(i % cols) * 960}_${Math.floor(i / cols) * 540}`).join("|");
const scaled = files.map((_, i) => `[${i}:v]scale=960:540[v${i}]`).join(";");
const stack = files.length === 1 ? `[v0]copy` : `${files.map((_, i) => `[v${i}]`).join("")}xstack=inputs=${files.length}:layout=${layout}:fill=black`;
execFileSync("ffmpeg", ["-y", "-v", "error", ...inputs, "-filter_complex", `${scaled};${stack}`, "-frames:v", "1", "-q:v", "3", sheet]);
console.log("sheet →", sheet);

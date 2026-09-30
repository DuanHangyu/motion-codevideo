// Snapshot this project's own source so the "code" scene can show the real thing.
import { readFileSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (p.includes("generated")) return [];
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const files = [...walk(join(root, "src")), join(root, "audio", "music.py"), join(root, "audio", "tts.py")]
  .filter((p) => /\.(tsx?|py)$/.test(p))
  .map((p) => ({ name: relative(root, p), lines: readFileSync(p, "utf8").split("\n") }));

const featured = ["src/components/ParticleField.tsx", "src/scenes/World.tsx", "audio/music.py", "src/scenes/Materials.tsx"];
const ordered = [...featured.map((n) => files.find((f) => f.name === n)).filter(Boolean), ...files.filter((f) => !featured.includes(f.name))];
const totalLines = files.reduce((n, f) => n + f.lines.length, 0);

writeFileSync(join(root, "src", "generated", "source.json"), JSON.stringify({ totalLines, fileCount: files.length, files: ordered }));
console.log(`embedded ${files.length} files, ${totalLines} lines`);

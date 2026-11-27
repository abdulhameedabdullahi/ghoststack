// Draws an original 16x16 pixel ghost (black on white) and writes three PNG icons.
// Built-in Node modules only. Output is deterministic. Run with: npm run icons
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { encodeGrey } from "./pngEncoder.mjs";

const GHOST = [
  ".....######.....",
  "...##########...",
  "..############..",
  "..############..",
  "..###.####.###..",
  "..##..####..##..",
  "..###.####.###..",
  "..############..",
  "..############..",
  "..####....####..",
  "..############..",
  "..############..",
  "..############..",
  "..############..",
  "..###.#..#.###..",
  "..#...####...#..",
];
const GRID = 16;

// size: image side in pixels. block: pixels per ghost cell. The ghost is centred.
const ICONS = [
  { file: "icon-192.png", size: 192, block: 10 }, // ghost 160px, 16px margin
  { file: "icon-512.png", size: 512, block: 26 }, // ghost 416px, 48px margin
  { file: "icon-maskable-512.png", size: 512, block: 25 }, // ghost 400px = inside central 80% (409.6px)
];

function draw({ size, block }) {
  const pixels = new Uint8Array(size * size).fill(255);
  const offset = (size - GRID * block) / 2;
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      if (GHOST[gy][gx] !== "#") continue;
      for (let y = 0; y < block; y++) {
        for (let x = 0; x < block; x++) {
          pixels[(offset + gy * block + y) * size + offset + gx * block + x] = 0;
        }
      }
    }
  }
  return pixels;
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");
mkdirSync(outDir, { recursive: true });
for (const icon of ICONS) {
  writeFileSync(join(outDir, icon.file), encodeGrey(icon.size, icon.size, draw(icon)));
  console.log(`Wrote public/icons/${icon.file}`);
}

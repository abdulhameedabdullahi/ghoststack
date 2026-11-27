// Draws an original 16x16 pixel ghost (black on white) and writes three PNG icons.
// Built-in Node modules only. Output is deterministic. Run with: npm run icons
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

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

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([length, typeBytes, data, crc]);
}

function encodePng(size, pixels) {
  // pixels: Uint8Array of size*size grey values (0 = black, 255 = white)
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // colour type: greyscale
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // no interlace
  const raw = Buffer.alloc((size + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size + 1);
    raw[row] = 0; // filter: none
    for (let x = 0; x < size; x++) raw[row + 1 + x] = pixels[y * size + x];
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

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
  writeFileSync(join(outDir, icon.file), encodePng(icon.size, draw(icon)));
  console.log(`Wrote public/icons/${icon.file}`);
}

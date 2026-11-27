/**
 * GhostStack brand asset generator.
 * Run: node scripts/generate-brand.mjs
 * No external deps — Node built-ins + pngEncoder.mjs only.
 *
 * Grid data duplicated from src/brand/logoGrids.ts (TypeScript cannot be
 * imported in .mjs).  Keep both files in sync.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { encodeRgba } from "./pngEncoder.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BRAND_DIR = join(ROOT, "brand");
const SOCIAL_DIR = join(BRAND_DIR, "social");
const PUBLIC_DIR = join(ROOT, "public");

mkdirSync(BRAND_DIR, { recursive: true });
mkdirSync(SOCIAL_DIR, { recursive: true });
mkdirSync(PUBLIC_DIR, { recursive: true });

// ── Grid data (must stay in sync with src/brand/logoGrids.ts) ───────────────

const GHOST_GRID = [
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

const MARK_CARD_FOLD = [
  ".#...........#..",
  ".#...........#..",
  ".#..........#...",
  ".############...",
  "............##..",
];

const MARK_GRID = [...GHOST_GRID.slice(0, 14), ...MARK_CARD_FOLD];

const GLYPHS = {
  " ": ["....", "....", "....", "....", "...."],
  ".": ["....", "....", "....", ".##.", ".##."],
  ":": ["....", ".##.", "....", ".##.", "...."],
  A:   [".##.", "#..#", "####", "#..#", "#..#"],
  B:   ["###.", "#..#", "###.", "#..#", "###."],
  C:   [".##.", "#...", "#...", "#...", ".##."],
  E:   ["####", "#...", "###.", "#...", "####"],
  F:   ["####", "#...", "###.", "#...", "#..."],
  G:   [".##.", "#...", "#.##", "#..#", ".###"],
  H:   ["#..#", "#..#", "####", "#..#", "#..#"],
  I:   ["####", ".##.", ".##.", ".##.", "####"],
  K:   ["#..#", "#.#.", "##..", "#.#.", "#..#"],
  L:   ["#...", "#...", "#...", "#...", "####"],
  N:   ["#..#", "##.#", "#.##", "#..#", "#..#"],
  O:   [".##.", "#..#", "#..#", "#..#", ".##."],
  P:   ["###.", "#..#", "###.", "#...", "#..."],
  R:   ["###.", "#..#", "###.", "#.#.", "#..#"],
  S:   [".###", "#...", ".##.", "...#", "###."],
  T:   ["####", ".##.", ".##.", ".##.", ".##."],
  U:   ["#..#", "#..#", "#..#", "#..#", ".##."],
  W:   ["#..#", "#..#", "#.##", "##.#", "#..#"],
  Y:   ["#..#", "#..#", ".##.", ".##.", ".##."],
  "0": [".##.", "#..#", "#..#", "#..#", ".##."],
  "2": [".##.", "...#", ".##.", "#...", "####"],
  "6": [".##.", "#...", "###.", "#..#", ".##."],
};

const COIN_TILE = [".#.", "###", ".#."];

// ── Colours ──────────────────────────────────────────────────────────────────

const MIDNIGHT  = [7, 5, 15, 255];
const MOONLIGHT = [216, 196, 255, 255];
const GOLD      = [212, 160, 48, 255];
const WHITE     = [255, 255, 255, 255];
const BLACK     = [0, 0, 0, 255];
const TRANSPARENT = [0, 0, 0, 0];

// ── SVG helpers ──────────────────────────────────────────────────────────────

function gridToSvgPath(grid, ox = 0, oy = 0) {
  const parts = [];
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y];
    let x = 0;
    while (x < row.length) {
      if (row[x] === "#") {
        let run = 0;
        while (x + run < row.length && row[x + run] === "#") run++;
        parts.push(`M${ox + x},${oy + y}h${run}v1h-${run}z`);
        x += run;
      } else {
        x++;
      }
    }
  }
  return parts.join("");
}

function wmSvgPath() {
  const text = "GHOSTSTACK";
  const parts = [];
  let cx = 0;
  for (const ch of text) {
    const g = GLYPHS[ch];
    if (g) {
      parts.push(gridToSvgPath(g, cx, 0));
      cx += 5;
    }
  }
  return parts.join("");
}

function svgFile(viewBox, body, extraAttrs = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" shape-rendering="crispEdges"${extraAttrs}>\n${body}\n</svg>\n`;
}

// ── SVG assets (Commit B) ────────────────────────────────────────────────────

function writeMarkSvg(colour) {
  const fill = colour === "white" ? "#ffffff" : "#000000";
  const path = gridToSvgPath(MARK_GRID);
  const w = 16, h = 19;
  const body = `<path fill="${fill}" d="${path}"/>`;
  writeFileSync(join(BRAND_DIR, `ghoststack-mark-${colour}.svg`), svgFile(`0 0 ${w} ${h}`, body));
  console.log(`Wrote brand/ghoststack-mark-${colour}.svg`);
}

function writeMarkColourSvg() {
  const path = gridToSvgPath(MARK_GRID);
  const body = `<path fill="currentColor" d="${path}"/>`;
  writeFileSync(join(BRAND_DIR, "ghoststack-mark.svg"), svgFile("0 0 16 19", body, ' class="ghoststack-mark"'));
  console.log("Wrote brand/ghoststack-mark.svg");
}

function writeWordmarkSvg() {
  const path = wmSvgPath();
  const body = `<path fill="currentColor" d="${path}"/>`;
  writeFileSync(join(BRAND_DIR, "ghoststack-wordmark.svg"), svgFile("0 0 49 5", body));
  console.log("Wrote brand/ghoststack-wordmark.svg");
}

function writeLogoSvg() {
  const markPath = gridToSvgPath(MARK_GRID);
  const wmPath = wmSvgPath();
  // Lockup: mark (16×19) + wordmark at 2× scale (98×10) with gap of 4px
  // Total: 16 + 4 + 98 = 118 wide, 20 tall (wordmark centred on mark height)
  const body = [
    `<path fill="currentColor" d="${markPath}"/>`,
    `<g transform="translate(20,5) scale(2)"><path fill="currentColor" d="${wmPath}"/></g>`,
  ].join("\n");
  writeFileSync(join(BRAND_DIR, "ghoststack-logo.svg"), svgFile("0 0 118 19", body));
  console.log("Wrote brand/ghoststack-logo.svg");
}

function writeLogoStackedSvg() {
  const markPath = gridToSvgPath(MARK_GRID);
  const wmPath = wmSvgPath();
  // Stacked: mark centred over wordmark (2× scale = 98px wide)
  // mark 16 wide → offset (98-16)/2 = 41 to centre; gap 4px; total height 19+4+10=33
  const body = [
    `<g transform="translate(41,0)"><path fill="currentColor" d="${markPath}"/></g>`,
    `<g transform="translate(0,23) scale(2)"><path fill="currentColor" d="${wmPath}"/></g>`,
  ].join("\n");
  writeFileSync(join(BRAND_DIR, "ghoststack-logo-stacked.svg"), svgFile("0 0 98 33", body));
  console.log("Wrote brand/ghoststack-logo-stacked.svg");
}

function writeFaviconSvg() {
  // 16×16 favicon: ghost body rows 0-13 only (no card fold — too small)
  const path = gridToSvgPath(GHOST_GRID);
  const body = [
    `<rect width="16" height="16" fill="#07050f"/>`,
    `<path fill="#d8c4ff" d="${path}"/>`,
  ].join("\n");
  writeFileSync(join(PUBLIC_DIR, "favicon.svg"), svgFile("0 0 16 16", body));
  console.log("Wrote public/favicon.svg");
}

// ── RGBA PNG helpers ─────────────────────────────────────────────────────────

function makeCanvas(w, h, bg = MIDNIGHT) {
  const pixels = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    pixels[i * 4]     = bg[0];
    pixels[i * 4 + 1] = bg[1];
    pixels[i * 4 + 2] = bg[2];
    pixels[i * 4 + 3] = bg[3];
  }
  return pixels;
}

function setPixel(pixels, w, x, y, colour) {
  if (x < 0 || y < 0 || x >= w || y >= Math.floor(pixels.length / (w * 4))) return;
  const i = (y * w + x) * 4;
  pixels[i]     = colour[0];
  pixels[i + 1] = colour[1];
  pixels[i + 2] = colour[2];
  pixels[i + 3] = colour[3];
}

function drawGrid(pixels, w, grid, ox, oy, scale, colour) {
  for (let gy = 0; gy < grid.length; gy++) {
    for (let gx = 0; gx < grid[gy].length; gx++) {
      if (grid[gy][gx] !== "#") continue;
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          setPixel(pixels, w, ox + gx * scale + sx, oy + gy * scale + sy, colour);
        }
      }
    }
  }
}

function drawText(pixels, w, text, ox, oy, scale, colour) {
  let cx = ox;
  for (const ch of text.toUpperCase()) {
    const g = GLYPHS[ch] ?? GLYPHS[" "];
    drawGrid(pixels, w, g, cx, oy, scale, colour);
    cx += (g[0].length + 1) * scale;
  }
}

function writePng(path, w, h, pixels) {
  writeFileSync(path, encodeRgba(w, h, pixels));
  console.log(`Wrote ${path.replace(ROOT + "\\", "").replace(ROOT + "/", "")}`);
}

// ── Icon PNGs (Commit C) ──────────────────────────────────────────────────────

function writeIconPng(filename, size, blockSize, withCoin = false) {
  const pixels = makeCanvas(size, size, MIDNIGHT);
  const offset = Math.round((size - 16 * blockSize) / 2);
  drawGrid(pixels, size, GHOST_GRID, offset, offset, blockSize, MOONLIGHT);
  if (withCoin) {
    // Gold coin on ghost's lower-right cheek — 3×3, 1 block each
    const coinX = offset + 11 * blockSize;
    const coinY = offset + 11 * blockSize;
    drawGrid(pixels, size, COIN_TILE, coinX, coinY, blockSize, GOLD);
  }
  const iconsDir = join(PUBLIC_DIR, "icons");
  mkdirSync(iconsDir, { recursive: true });
  writePng(join(iconsDir, filename), size, size, pixels);
}

function writeFavicon32() {
  const size = 32;
  const block = 1;
  const pixels = makeCanvas(size, size, MIDNIGHT);
  const offset = Math.round((size - 16 * block) / 2);
  drawGrid(pixels, size, GHOST_GRID, offset, offset, block, MOONLIGHT);
  writePng(join(PUBLIC_DIR, "favicon-32.png"), size, size, pixels);
}

function writeAppleTouchIcon() {
  const size = 180;
  const block = 9;
  const pixels = makeCanvas(size, size, MIDNIGHT);
  const offset = Math.round((size - 16 * block) / 2);
  drawGrid(pixels, size, GHOST_GRID, offset, offset, block, MOONLIGHT);
  drawGrid(pixels, size, COIN_TILE, offset + 11 * block, offset + 11 * block, block, GOLD);
  writePng(join(PUBLIC_DIR, "apple-touch-icon.png"), size, size, pixels);
}

// ── Social PNGs (Commit D) ────────────────────────────────────────────────────

function drawSocialBase(w, h, title, subtitle) {
  const pixels = makeCanvas(w, h, MIDNIGHT);
  // Ghost mark (Direction C): 19 rows × 16 cols at 8× scale = 128×152, left side
  const markScale = 8;
  const markW = 16 * markScale;
  const markH = 19 * markScale;
  const markX = Math.round(w * 0.08);
  const markY = Math.round((h - markH) / 2);
  drawGrid(pixels, w, MARK_GRID, markX, markY, markScale, MOONLIGHT);
  // Gold coin on mark
  drawGrid(pixels, w, COIN_TILE, markX + 11 * markScale, markY + 11 * markScale, markScale, GOLD);
  // Text block: title at 3× glyph scale, subtitle at 2×
  const textX = markX + markW + Math.round(w * 0.06);
  const titleScale = 3;
  const subScale = 2;
  const glyphH = 5;
  const titleY = Math.round(h / 2) - (glyphH * titleScale + 4 + glyphH * subScale) / 2;
  drawText(pixels, w, title, textX, titleY, titleScale, MOONLIGHT);
  if (subtitle) {
    drawText(pixels, w, subtitle, textX, titleY + glyphH * titleScale + 4, subScale, GOLD);
  }
  return pixels;
}

function writeSocialImages() {
  const configs = [
    { file: "og-image-1200x630.png",             w: 1200, h: 630  },
    { file: "github-social-preview-1280x640.png", w: 1280, h: 640  },
    { file: "devpost-thumbnail-1200x800.png",     w: 1200, h: 800  },
    { file: "youtube-thumbnail-1280x720.png",     w: 1280, h: 720  },
    { file: "intro-card-1920x1080.png",           w: 1920, h: 1080 },
    { file: "outro-card-1920x1080.png",           w: 1920, h: 1080 },
  ];
  for (const { file, w, h } of configs) {
    const pixels = drawSocialBase(w, h, "GHOSTSTACK", "RAISE YOUR SHOP.");
    writePng(join(SOCIAL_DIR, file), w, h, pixels);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log("Generating GhostStack brand assets…\n");

// B — SVG logos
writeMarkColourSvg();
writeMarkSvg("black");
writeMarkSvg("white");
writeWordmarkSvg();
writeLogoSvg();
writeLogoStackedSvg();
writeFaviconSvg();

// C — Icon PNGs
writeFavicon32();
writeAppleTouchIcon();
writeIconPng("icon-192.png",  192, 10, true);
writeIconPng("icon-512.png",  512, 26, true);
writeIconPng("icon-maskable-512.png", 512, 25, true);

// D — Social PNGs
writeSocialImages();

// Also serve OG image from public/ so the meta tag resolves at runtime
const ogPixels = drawSocialBase(1200, 630, "GHOSTSTACK", "RAISE YOUR SHOP.");
writePng(join(PUBLIC_DIR, "og-image.png"), 1200, 630, ogPixels);

console.log("\nDone.");


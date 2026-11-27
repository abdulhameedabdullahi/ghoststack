/**
 * Brand asset integrity checker.
 * Run: node scripts/check-brand.mjs
 * Exits 0 on success, 1 on any failure.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let failures = 0;

function fail(msg) {
  console.error(`  FAIL  ${msg}`);
  failures++;
}

function ok(msg) {
  console.log(`  ok    ${msg}`);
}

function requireFile(rel) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) { fail(`missing: ${rel}`); return false; }
  ok(`exists: ${rel}`);
  return true;
}

function requireSize(rel, maxBytes) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) return;
  const bytes = statSync(p).size;
  if (bytes > maxBytes) fail(`${rel} is ${bytes}b, max ${maxBytes}b`);
  else ok(`size ok: ${rel} (${bytes}b)`);
}

function requirePngDimensions(rel, w, h) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) return;
  const buf = readFileSync(p);
  if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) {
    fail(`${rel} is not a valid PNG`); return;
  }
  const pw = buf.readUInt32BE(16);
  const ph = buf.readUInt32BE(20);
  if (pw !== w || ph !== h) fail(`${rel} is ${pw}×${ph}, expected ${w}×${h}`);
  else ok(`dims ok: ${rel} (${pw}×${ph})`);
}

function requireSvgClean(rel) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) return;
  const src = readFileSync(p, "utf8");
  if (src.includes("<script")) fail(`${rel} contains <script>`);
  else if (/(?:href|src|url)\s*=\s*["']https?:/.test(src)) fail(`${rel} contains external resource URL`);
  else ok(`svg clean: ${rel}`);
}

function requireStringInFile(rel, needle, label) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) return;
  const src = readFileSync(p, "utf8");
  if (!src.includes(needle)) fail(`${rel} missing "${label ?? needle}"`);
  else ok(`string ok: ${rel} ⊇ "${label ?? needle}"`);
}

console.log("\nChecking GhostStack brand assets…\n");

// SVG logos
for (const f of [
  "brand/ghoststack-mark.svg",
  "brand/ghoststack-mark-black.svg",
  "brand/ghoststack-mark-white.svg",
  "brand/ghoststack-wordmark.svg",
  "brand/ghoststack-logo.svg",
  "brand/ghoststack-logo-stacked.svg",
]) {
  if (requireFile(f)) requireSvgClean(f);
}

// Favicon SVG
if (requireFile("public/favicon.svg")) requireSvgClean("public/favicon.svg");

// Icon PNGs — dimensions
requireFile("public/favicon-32.png");
requirePngDimensions("public/favicon-32.png", 32, 32);

requireFile("public/apple-touch-icon.png");
requirePngDimensions("public/apple-touch-icon.png", 180, 180);

requireFile("public/icons/icon-192.png");
requirePngDimensions("public/icons/icon-192.png", 192, 192);

requireFile("public/icons/icon-512.png");
requirePngDimensions("public/icons/icon-512.png", 512, 512);

requireFile("public/icons/icon-maskable-512.png");
requirePngDimensions("public/icons/icon-maskable-512.png", 512, 512);

// Social PNGs — dimensions + max 250 KB
const socialFiles = [
  ["brand/social/og-image-1200x630.png",             1200, 630,  250_000],
  ["brand/social/github-social-preview-1280x640.png", 1280, 640,  250_000],
  ["brand/social/devpost-thumbnail-1200x800.png",     1200, 800,  250_000],
  ["brand/social/youtube-thumbnail-1280x720.png",     1280, 720,  250_000],
  ["brand/social/intro-card-1920x1080.png",           1920, 1080, 250_000],
  ["brand/social/outro-card-1920x1080.png",           1920, 1080, 250_000],
];
for (const [f, w, h, maxB] of socialFiles) {
  if (requireFile(f)) {
    requirePngDimensions(f, w, h);
    requireSize(f, maxB);
  }
}

// index.html: title, theme-color, OG tags, tagline
requireStringInFile("index.html", "GhostStack", "brand name in index.html");
requireStringInFile("index.html", "Raise your shop.", "tagline in index.html");

// manifest: description
requireStringInFile("public/site.webmanifest", "GhostStack", "brand name in manifest");

// src/brand/brand.ts: constants
requireStringInFile("src/brand/brand.ts", "GhostStack", "BRAND_NAME");
requireStringInFile("src/brand/brand.ts", "Raise your shop.", "BRAND_TAGLINE");
requireStringInFile("src/brand/brand.ts", "Kobo", "MASCOT_NAME");

// docs
requireStringInFile("docs/BRAND.md", "GhostStack", "brand name in BRAND.md");
requireStringInFile("docs/BRAND.md", "Raise your shop.", "tagline in BRAND.md");
requireStringInFile("README.md", "GhostStack", "brand name in README");
requireStringInFile("README.md", "Raise your shop.", "tagline in README");

console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) failed.`}\n`);
process.exit(failures > 0 ? 1 : 0);

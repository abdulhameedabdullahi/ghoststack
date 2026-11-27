/**
 * Pixel-grid source of truth for every brand shape.
 * The generator (scripts/generate-brand.mjs) contains identical data inline
 * because it cannot import TypeScript directly.  Keep both in sync.
 */
import { GHOST_GRID } from "../components/ghostGrid";

/** Card-fold bottom extension: replaces the wavy ghost feet (rows 14-15) with a
 *  folded index-card corner (Direction C, the chosen mark direction). */
export const MARK_CARD_FOLD: readonly string[] = [
  ".#...........#..",  // row 14: left edge x=1, right edge x=13
  ".#...........#..",  // row 15: left edge x=1, right edge x=13
  ".#..........#...",  // row 16: left edge x=1, fold step x=12
  ".############...",  // row 17: card bottom bar x=1-12
  "............##..",  // row 18: fold bottom x=12-13
];

/** Full mark grid: ghost body rows 0-13 (from GHOST_GRID) + card-fold base. */
export const MARK_GRID: readonly string[] = [
  ...GHOST_GRID.slice(0, 14),
  ...MARK_CARD_FOLD,
];

/** Wordmark glyphs, 4 columns × 5 rows, "#" = filled. */
export const WORDMARK_GLYPHS: Readonly<Record<string, readonly string[]>> = {
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

/** 3×3 gold coin tile (diamond). Placed on the ghost's right cheek in icons. */
export const COIN_TILE: readonly string[] = [".#.", "###", ".#."];

/** 8×8 abstract border pattern tile (checkerboard → 45° diamond when tiled). */
export const PATTERN_TILE: readonly string[] = [
  "#.#.#.#.",
  ".#.#.#.#",
  "#.#.#.#.",
  ".#.#.#.#",
  "#.#.#.#.",
  ".#.#.#.#",
  "#.#.#.#.",
  ".#.#.#.#",
];
